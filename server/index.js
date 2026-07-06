// index.js — the API server.
// Run with: npm install && npm start   (from inside the /server folder)

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { db, modelFromRow, serviceFromRow, submissionFromRow, categoryFromRow, subscriberFromRow } = require('./db');
const email = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

app.use(cors());                 // allow the Angular dev server (localhost:4200)
app.use(express.json());

// serve uploaded photos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// multer: store application photos on disk
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });
const uploadVideo = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ---- auth helpers ------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

const fileUrl = (req, filename) =>
  filename ? `${req.protocol}://${req.get('host')}/uploads/${filename}` : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function activeSubscribers() {
  return db.prepare('SELECT * FROM email_subscribers WHERE active = 1').all();
}

function notifyNewModel(model) {
  if (!model.published) return;
  const subs = activeSubscribers();
  if (!subs.length) return;
  email.notifySubscribers(subs, (sub) =>
    email.sendNewModelNotice(sub.email, sub.unsubscribeToken, model),
  ).catch((err) => console.error('[email] new model notify failed:', err));
}

function digitalsNameSlug(name) {
  return (name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ============================================================
// PUBLIC MODELS
// ============================================================
app.get('/api/models', (req, res) => {
  const { category, branch } = req.query;
  let sql = 'SELECT * FROM models WHERE published = 1';
  const params = [];
  if (branch === 'men' || branch === 'women') {
    sql += ' AND branch = ?';
    params.push(branch);
  }
  if (category !== undefined) {
    if (category === '') {
      sql += " AND (category = '' OR category IS NULL)";
    } else {
      sql += ' AND category = ?';
      params.push(category);
    }
  }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(modelFromRow));
});

app.get('/api/models/digitals/:path', (req, res) => {
  const path = req.params.path;
  if (!path.endsWith('digitals') || path.length <= 8) {
    return res.status(404).json({ error: 'Not found' });
  }
  const nameSlug = path.slice(0, -8);
  const rows = db.prepare('SELECT * FROM models WHERE published = 1').all();
  const model = rows
    .map(modelFromRow)
    .find((m) => digitalsNameSlug(m.name) === nameSlug);
  if (!model) return res.status(404).json({ error: 'Not found' });
  res.json(model);
});

app.get('/api/models/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(modelFromRow(row));
});

// ============================================================
// PUBLIC CATEGORIES
// ============================================================
app.get('/api/categories', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM model_categories WHERE published = 1 ORDER BY sortOrder ASC, name ASC',
  ).all();
  res.json(rows.map(categoryFromRow));
});

// ============================================================
// ADMIN MODELS (auth required)
// ============================================================
app.get('/api/admin/models', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM models ORDER BY name').all();
  res.json(rows.map(modelFromRow));
});

app.post('/api/admin/models', requireAuth, (req, res) => {
  const m = req.body;
  db.prepare(`
    INSERT INTO models (id, name, branch, category, height, bust, waist, hips, shoeSize,
      hair, eyes, city, outOfTown, instagram, coverImage, gallery, digitals,
      pdfUrl, introVideoUrl, catwalkVideoUrl, published)
    VALUES (@id, @name, @branch, @category, @height, @bust, @waist, @hips, @shoeSize,
      @hair, @eyes, @city, @outOfTown, @instagram, @coverImage, @gallery, @digitals,
      @pdfUrl, @introVideoUrl, @catwalkVideoUrl, @published)
  `).run(serializeModel(m));
  res.json({ ok: true });
  notifyNewModel(m);
});

app.put('/api/admin/models/:id', requireAuth, (req, res) => {
  const prev = db.prepare('SELECT published FROM models WHERE id = ?').get(req.params.id);
  const m = { ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE models SET name=@name, branch=@branch, category=@category, height=@height, bust=@bust,
      waist=@waist, hips=@hips, shoeSize=@shoeSize, hair=@hair, eyes=@eyes,
      city=@city, outOfTown=@outOfTown, instagram=@instagram,
      coverImage=@coverImage, gallery=@gallery, digitals=@digitals,
      pdfUrl=@pdfUrl, introVideoUrl=@introVideoUrl, catwalkVideoUrl=@catwalkVideoUrl,
      published=@published
    WHERE id=@id
  `).run(serializeModel(m));
  res.json({ ok: true });
  if (m.published && !prev?.published) notifyNewModel(m);
});

app.delete('/api/admin/models/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM models WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ============================================================
// ADMIN CATEGORIES (auth required)
// ============================================================
app.get('/api/admin/categories', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM model_categories ORDER BY sortOrder ASC, name ASC',
  ).all();
  res.json(rows.map(categoryFromRow));
});

app.post('/api/admin/categories', requireAuth, (req, res) => {
  const c = req.body;
  db.prepare(`
    INSERT INTO model_categories (id, name, sortOrder, published)
    VALUES (@id, @name, @sortOrder, @published)
  `).run(serializeCategory(c));
  res.json({ ok: true });
});

app.put('/api/admin/categories/:id', requireAuth, (req, res) => {
  const c = { ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE model_categories SET name=@name, sortOrder=@sortOrder, published=@published
    WHERE id=@id
  `).run(serializeCategory(c));
  res.json({ ok: true });
});

app.delete('/api/admin/categories/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const inUse = db.prepare('SELECT COUNT(*) AS c FROM models WHERE category = ?').get(id).c;
  if (inUse > 0) {
    return res.status(400).json({ error: `${inUse} model(s) still use this category` });
  }
  db.prepare('DELETE FROM model_categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

function serializeCategory(c) {
  return {
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder ?? 0,
    published: c.published ? 1 : 0,
  };
}

function serializeModel(m) {
  return {
    id: m.id,
    name: m.name,
    branch: m.branch === 'men' ? 'men' : 'women',
    category: m.category || '',
    height: m.height ?? null,
    bust: m.bust ?? null,
    waist: m.waist ?? null,
    hips: m.hips ?? null,
    shoeSize: m.shoeSize ?? null,
    hair: m.hair ?? null,
    eyes: m.eyes ?? null,
    city: m.city ?? null,
    outOfTown: m.outOfTown ? 1 : 0,
    instagram: m.instagram ?? null,
    coverImage: m.coverImage,
    gallery: JSON.stringify(m.gallery || []),
    digitals: JSON.stringify(m.digitals || []),
    pdfUrl: m.pdfUrl ?? null,
    introVideoUrl: m.introVideoUrl ?? null,
    catwalkVideoUrl: m.catwalkVideoUrl ?? null,
    published: m.published ? 1 : 0,
  };
}

// ============================================================
// APPLICATIONS (become a model) — public, multipart with 4 photos
// ============================================================
const shotFields = upload.fields([
  { name: 'fullShot', maxCount: 1 },
  { name: 'halfShot', maxCount: 1 },
  { name: 'closeupShot', maxCount: 1 },
  { name: 'profileShot', maxCount: 1 },
]);

app.post('/api/applications', shotFields, (req, res) => {
  const b = req.body;
  const f = req.files || {};
  const pick = (k) => (f[k] && f[k][0] ? fileUrl(req, f[k][0].filename) : null);
  db.prepare(`
    INSERT INTO applications (firstName, lastName, dateOfBirth, email, phone,
      instagram, height, fullShotUrl, halfShotUrl, closeupShotUrl, profileShotUrl)
    VALUES (@firstName, @lastName, @dateOfBirth, @email, @phone,
      @instagram, @height, @fullShotUrl, @halfShotUrl, @closeupShotUrl, @profileShotUrl)
  `).run({
    firstName: b.firstName,
    lastName: b.lastName || null,
    dateOfBirth: b.dateOfBirth || null,
    email: b.email,
    phone: b.phone || null,
    instagram: b.instagram || null,
    height: b.height ? Number(b.height) : null,
    fullShotUrl: pick('fullShot'),
    halfShotUrl: pick('halfShot'),
    closeupShotUrl: pick('closeupShot'),
    profileShotUrl: pick('profileShot'),
  });
  res.json({ ok: true });
});

app.get('/api/admin/applications', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM applications ORDER BY createdAt DESC').all());
});

// ============================================================
// BOOKINGS — public JSON
// ============================================================
app.post('/api/bookings', (req, res) => {
  const b = req.body;
  db.prepare(`
    INSERT INTO bookings (modelId, clientName, company, email, phone,
      jobType, dates, location, budget, message)
    VALUES (@modelId, @clientName, @company, @email, @phone,
      @jobType, @dates, @location, @budget, @message)
  `).run({
    modelId: b.modelId || null,
    clientName: b.clientName,
    company: b.company || null,
    email: b.email,
    phone: b.phone || null,
    jobType: b.jobType || null,
    dates: b.dates || null,
    location: b.location || null,
    budget: b.budget || null,
    message: b.message || null,
  });
  res.json({ ok: true });
});

app.get('/api/admin/bookings', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all());
});

// ============================================================
// SERVICES — public + admin
// ============================================================
app.get('/api/services', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM service_items WHERE published = 1 ORDER BY sortOrder ASC, title ASC',
  ).all();
  res.json(rows.map(serviceFromRow));
});

app.get('/api/services/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM service_items WHERE id = ? AND published = 1').get(req.params.id);
  if (!row || !row.formEnabled) return res.status(404).json({ error: 'Not found' });
  res.json(serviceFromRow(row));
});

app.post('/api/service-submissions', (req, res) => {
  const { serviceId, data } = req.body || {};
  const service = db.prepare('SELECT * FROM service_items WHERE id = ?').get(serviceId);
  if (!service || !service.formEnabled) return res.status(400).json({ error: 'Invalid service' });
  db.prepare(`
    INSERT INTO service_submissions (serviceId, serviceTitle, data)
    VALUES (@serviceId, @serviceTitle, @data)
  `).run({
    serviceId,
    serviceTitle: service.formTitle || service.title,
    data: JSON.stringify(data || {}),
  });
  res.json({ ok: true });
});

app.get('/api/admin/services', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM service_items ORDER BY sortOrder ASC, title ASC').all();
  res.json(rows.map(serviceFromRow));
});

app.post('/api/admin/services', requireAuth, (req, res) => {
  const s = req.body;
  db.prepare(`
    INSERT INTO service_items (id, type, title, subtitle, badge, description, ctaLabel, ctaUrl,
      sortOrder, published, formEnabled, formTitle, backgroundImage, formFields)
    VALUES (@id, @type, @title, @subtitle, @badge, @description, @ctaLabel, @ctaUrl,
      @sortOrder, @published, @formEnabled, @formTitle, @backgroundImage, @formFields)
  `).run(serializeService(s));
  res.json({ ok: true });
});

app.put('/api/admin/services/:id', requireAuth, (req, res) => {
  const s = { ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE service_items SET type=@type, title=@title, subtitle=@subtitle, badge=@badge,
      description=@description, ctaLabel=@ctaLabel, ctaUrl=@ctaUrl,
      sortOrder=@sortOrder, published=@published, formEnabled=@formEnabled,
      formTitle=@formTitle, backgroundImage=@backgroundImage, formFields=@formFields
    WHERE id=@id
  `).run(serializeService(s));
  res.json({ ok: true });
});

app.delete('/api/admin/services/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM service_items WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM service_submissions WHERE serviceId = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/service-submissions', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM service_submissions ORDER BY createdAt DESC').all();
  res.json(rows.map(submissionFromRow));
});

// ============================================================
// NEWSLETTER — public subscribe/unsubscribe + admin management
// ============================================================
app.post('/api/newsletter/subscribe', (req, res) => {
  const raw = (req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(raw)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  const source = (req.body?.source || 'footer').slice(0, 64);
  const existing = db.prepare('SELECT * FROM email_subscribers WHERE email = ?').get(raw);

  if (existing) {
    if (!existing.active) {
      db.prepare('UPDATE email_subscribers SET active = 1, subscribedAt = datetime(\'now\') WHERE id = ?')
        .run(existing.id);
      email.sendWelcome(raw, existing.unsubscribeToken).catch((err) =>
        console.error('[email] welcome resubscribe failed:', err),
      );
    }
    return res.json({ ok: true });
  }

  const token = email.generateToken();
  db.prepare(`
    INSERT INTO email_subscribers (email, unsubscribeToken, source)
    VALUES (?, ?, ?)
  `).run(raw, token, source);
  email.sendWelcome(raw, token).catch((err) =>
    console.error('[email] welcome failed:', err),
  );
  res.json({ ok: true });
});

app.post('/api/newsletter/unsubscribe', (req, res) => {
  const token = (req.body?.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Invalid unsubscribe link' });
  const row = db.prepare('SELECT * FROM email_subscribers WHERE unsubscribeToken = ?').get(token);
  if (!row) return res.status(404).json({ error: 'Subscription not found' });
  db.prepare('UPDATE email_subscribers SET active = 0 WHERE id = ?').run(row.id);
  res.json({ ok: true, email: row.email });
});

app.get('/api/admin/subscribers', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM email_subscribers WHERE active = 1 ORDER BY subscribedAt DESC',
  ).all();
  res.json(rows.map(subscriberFromRow));
});

app.delete('/api/admin/subscribers/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE email_subscribers SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/newsletter/send', requireAuth, async (req, res) => {
  const subject = (req.body?.subject || '').trim();
  const message = (req.body?.message || '').trim();
  if (!subject) return res.status(400).json({ error: 'Subject is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const subs = activeSubscribers();
  if (!subs.length) return res.status(400).json({ error: 'No active subscribers' });

  try {
    const result = await email.notifySubscribers(subs, (sub) =>
      email.sendBroadcast(sub.email, sub.unsubscribeToken, subject, message),
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[email] broadcast failed:', err);
    res.status(500).json({ error: 'Failed to send newsletter' });
  }
});

app.get('/api/admin/email-status', requireAuth, (req, res) => {
  res.json({ configured: email.isConfigured(), siteUrl: email.siteUrl() });
});

app.post('/api/admin/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: fileUrl(req, req.file.filename) });
});

app.post('/api/admin/upload-file', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: fileUrl(req, req.file.filename) });
});

app.post('/api/admin/upload-video', requireAuth, uploadVideo.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: fileUrl(req, req.file.filename) });
});

function serializeService(s) {
  const formEnabled = !!s.formEnabled;
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: s.subtitle ?? null,
    badge: s.badge ?? null,
    description: s.description ?? null,
    ctaLabel: s.ctaLabel || (formEnabled ? 'Submit' : null),
    ctaUrl: formEnabled && s.id ? `/services/${s.id}/book` : (s.ctaUrl ?? null),
    sortOrder: s.sortOrder ?? 0,
    published: s.published ? 1 : 0,
    formEnabled: formEnabled ? 1 : 0,
    formTitle: s.formTitle ?? null,
    backgroundImage: s.backgroundImage ?? null,
    formFields: JSON.stringify(s.formFields || []),
  };
}

// ============================================================
// OPTIONAL: serve the built Angular frontend (production mode).
// After `ng build`, this lets ONE server host both API and site.
// In dev you don't need this — you run `ng serve` separately.
// ============================================================
const frontendDist = path.join(__dirname, '..', 'dist', 'ille-angular', 'browser');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log('Serving built frontend from', frontendDist);
}

app.listen(PORT, () => {
  console.log(`ille API running on http://localhost:${PORT}`);
});

// index.js — the API server.
// Run with: npm install && npm start   (from inside the /server folder)

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const {
  query,
  initDb,
  modelFromRow,
  serviceFromRow,
  submissionFromRow,
  categoryFromRow,
  subscriberFromRow,
} = require('./db');
const email = require('./email');
const {
  normalizeMediaRef,
  normalizeMediaRefList,
  storeFile,
  fetchMedia,
} = require('./media');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage, limits: { fileSize: 25 * 1024 * 1024 } });
const uploadVideo = multer({ storage: memoryStorage, limits: { fileSize: 100 * 1024 * 1024 } });

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

// ============================================================
// MEDIA (binary stored in PostgreSQL)
// ============================================================
app.get('/api/media/:id', async (req, res) => {
  const media = await fetchMedia(query, req.params.id);
  if (!media) return res.status(404).send('Not found');
  res.setHeader('Content-Type', media.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(media.data);
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function activeSubscribers() {
  const { rows } = await query('SELECT * FROM email_subscribers WHERE active = TRUE');
  return rows;
}

function notifyNewModel(model) {
  if (!model.published) return;
  activeSubscribers().then((subs) => {
    if (!subs.length) return;
    email.notifySubscribers(subs, (sub) =>
      email.sendNewModelNotice(sub.email, sub.unsubscribeToken, model),
    ).catch((err) => console.error('[email] new model notify failed:', err));
  });
}

function digitalsNameSlug(name) {
  return (name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** node-pg sends JS arrays as PostgreSQL array literals; JSONB columns need JSON text. */
function jsonb(value, fallback = null) {
  const v = value ?? fallback;
  return JSON.stringify(v);
}

function normalizeUrlArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((item) => item != null && String(item).trim()).map(String);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      if (s.startsWith('[') && s.endsWith(']')) {
        return s
          .slice(1, -1)
          .split(',')
          .map((u) => u.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    }
    return s.includes(',') ? s.split(',').map((u) => u.trim()).filter(Boolean) : [s];
  }
  return [];
}

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  const { email: loginEmail, password } = req.body || {};
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [loginEmail]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ============================================================
// PUBLIC MODELS
// ============================================================
app.get('/api/models', async (req, res) => {
  const { category, branch } = req.query;
  let sql = 'SELECT * FROM models WHERE published = TRUE';
  const params = [];
  if (branch === 'men' || branch === 'women') {
    params.push(branch);
    sql += ` AND branch = $${params.length}`;
  }
  if (category !== undefined) {
    if (category === '') {
      sql += " AND (category = '' OR category IS NULL)";
    } else {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
  }
  sql += ' ORDER BY name';
  const { rows } = await query(sql, params);
  res.json(rows.map(modelFromRow));
});

app.get('/api/models/digitals/:path', async (req, res) => {
  const digitalsPath = req.params.path;
  if (!digitalsPath.endsWith('digitals') || digitalsPath.length <= 8) {
    return res.status(404).json({ error: 'Not found' });
  }
  const nameSlug = digitalsPath.slice(0, -8);
  const { rows } = await query('SELECT * FROM models WHERE published = TRUE');
  const model = rows
    .map(modelFromRow)
    .find((m) => digitalsNameSlug(m.name) === nameSlug);
  if (!model) return res.status(404).json({ error: 'Not found' });
  res.json(model);
});

app.get('/api/models/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM models WHERE id = $1', [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(modelFromRow(row));
});

// ============================================================
// PUBLIC CATEGORIES
// ============================================================
app.get('/api/categories', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM model_categories WHERE published = TRUE ORDER BY "sortOrder" ASC, name ASC',
  );
  res.json(rows.map(categoryFromRow));
});

// ============================================================
// ADMIN MODELS (auth required)
// ============================================================
app.get('/api/admin/models', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM models ORDER BY name');
  res.json(rows.map(modelFromRow));
});

app.post('/api/admin/models', requireAuth, async (req, res) => {
  try {
    const m = req.body;
    const s = serializeModel(m);
    await query(`
      INSERT INTO models (id, name, branch, category, height, bust, waist, hips, "shoeSize",
        hair, eyes, city, "outOfTown", instagram, "coverImage", gallery, digitals,
        "pdfUrl", "introVideoUrl", "catwalkVideoUrl", published)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      s.id, s.name, s.branch, s.category, s.height, s.bust, s.waist, s.hips, s.shoeSize,
      s.hair, s.eyes, s.city, s.outOfTown, s.instagram, s.coverImage, s.gallery, s.digitals,
      s.pdfUrl, s.introVideoUrl, s.catwalkVideoUrl, s.published,
    ]);
    res.json({ ok: true });
    notifyNewModel(m);
  } catch (err) {
    console.error('POST /api/admin/models failed:', err);
    res.status(500).json({ error: err.message || 'Failed to save model' });
  }
});

app.put('/api/admin/models/:id', requireAuth, async (req, res) => {
  try {
    const { rows: prevRows } = await query('SELECT published FROM models WHERE id = $1', [req.params.id]);
    const prev = prevRows[0];
    const m = { ...req.body, id: req.params.id };
    const s = serializeModel(m);
    await query(`
      UPDATE models SET name=$1, branch=$2, category=$3, height=$4, bust=$5,
        waist=$6, hips=$7, "shoeSize"=$8, hair=$9, eyes=$10,
        city=$11, "outOfTown"=$12, instagram=$13,
        "coverImage"=$14, gallery=$15, digitals=$16,
        "pdfUrl"=$17, "introVideoUrl"=$18, "catwalkVideoUrl"=$19,
        published=$20
      WHERE id=$21
    `, [
      s.name, s.branch, s.category, s.height, s.bust, s.waist, s.hips, s.shoeSize,
      s.hair, s.eyes, s.city, s.outOfTown, s.instagram, s.coverImage, s.gallery, s.digitals,
      s.pdfUrl, s.introVideoUrl, s.catwalkVideoUrl, s.published, s.id,
    ]);
    res.json({ ok: true });
    if (m.published && !prev?.published) notifyNewModel(m);
  } catch (err) {
    console.error('PUT /api/admin/models failed:', err);
    res.status(500).json({ error: err.message || 'Failed to save model' });
  }
});

app.delete('/api/admin/models/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM models WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ============================================================
// ADMIN CATEGORIES (auth required)
// ============================================================
app.get('/api/admin/categories', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM model_categories ORDER BY "sortOrder" ASC, name ASC',
  );
  res.json(rows.map(categoryFromRow));
});

app.post('/api/admin/categories', requireAuth, async (req, res) => {
  const c = serializeCategory(req.body);
  await query(`
    INSERT INTO model_categories (id, name, "sortOrder", published)
    VALUES ($1, $2, $3, $4)
  `, [c.id, c.name, c.sortOrder, c.published]);
  res.json({ ok: true });
});

app.put('/api/admin/categories/:id', requireAuth, async (req, res) => {
  const c = serializeCategory({ ...req.body, id: req.params.id });
  await query(`
    UPDATE model_categories SET name=$1, "sortOrder"=$2, published=$3
    WHERE id=$4
  `, [c.name, c.sortOrder, c.published, c.id]);
  res.json({ ok: true });
});

app.delete('/api/admin/categories/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { rows } = await query('SELECT COUNT(*)::int AS c FROM models WHERE category = $1', [id]);
  const inUse = rows[0].c;
  if (inUse > 0) {
    return res.status(400).json({ error: `${inUse} model(s) still use this category` });
  }
  await query('DELETE FROM model_categories WHERE id = $1', [id]);
  res.json({ ok: true });
});

function serializeCategory(c) {
  return {
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder ?? 0,
    published: !!c.published,
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
    outOfTown: !!m.outOfTown,
    instagram: m.instagram ?? null,
    coverImage: normalizeMediaRef(m.coverImage),
    gallery: jsonb(normalizeMediaRefList(normalizeUrlArray(m.gallery))),
    digitals: jsonb(normalizeMediaRefList(normalizeUrlArray(m.digitals))),
    pdfUrl: normalizeMediaRef(m.pdfUrl),
    introVideoUrl: normalizeMediaRef(m.introVideoUrl),
    catwalkVideoUrl: normalizeMediaRef(m.catwalkVideoUrl),
    published: !!m.published,
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

app.post('/api/applications', shotFields, async (req, res) => {
  const b = req.body;
  const f = req.files || {};
  const pick = async (k) => (f[k]?.[0] ? storeFile(query, f[k][0]) : null);
  await query(`
    INSERT INTO applications ("firstName", "lastName", "dateOfBirth", email, phone,
      instagram, height, "fullShotUrl", "halfShotUrl", "closeupShotUrl", "profileShotUrl")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    b.firstName,
    b.lastName || null,
    b.dateOfBirth || null,
    b.email,
    b.phone || null,
    b.instagram || null,
    b.height ? Number(b.height) : null,
    await pick('fullShot'),
    await pick('halfShot'),
    await pick('closeupShot'),
    await pick('profileShot'),
  ]);
  res.json({ ok: true });
});

app.get('/api/admin/applications', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM applications ORDER BY "createdAt" DESC');
  res.json(rows);
});

// ============================================================
// BOOKINGS — public JSON
// ============================================================
app.post('/api/bookings', async (req, res) => {
  const b = req.body;
  await query(`
    INSERT INTO bookings ("modelId", "clientName", company, email, phone,
      "jobType", dates, location, budget, message)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    b.modelId || null,
    b.clientName,
    b.company || null,
    b.email,
    b.phone || null,
    b.jobType || null,
    b.dates || null,
    b.location || null,
    b.budget || null,
    b.message || null,
  ]);
  res.json({ ok: true });
});

app.get('/api/admin/bookings', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM bookings ORDER BY "createdAt" DESC');
  res.json(rows);
});

// ============================================================
// SERVICES — public + admin
// ============================================================
app.get('/api/services', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM service_items WHERE published = TRUE ORDER BY "sortOrder" ASC, title ASC',
  );
  res.json(rows.map(serviceFromRow));
});

app.get('/api/services/:id', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM service_items WHERE id = $1 AND published = TRUE',
    [req.params.id],
  );
  const row = rows[0];
  if (!row || !row.formEnabled) return res.status(404).json({ error: 'Not found' });
  res.json(serviceFromRow(row));
});

app.post('/api/service-submissions', async (req, res) => {
  const { serviceId, data } = req.body || {};
  const { rows } = await query('SELECT * FROM service_items WHERE id = $1', [serviceId]);
  const service = rows[0];
  if (!service || !service.formEnabled) return res.status(400).json({ error: 'Invalid service' });
  await query(`
    INSERT INTO service_submissions ("serviceId", "serviceTitle", data)
    VALUES ($1, $2, $3)
  `, [serviceId, service.formTitle || service.title, jsonb(data, {})]);
  res.json({ ok: true });
});

app.get('/api/admin/services', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM service_items ORDER BY "sortOrder" ASC, title ASC',
  );
  res.json(rows.map(serviceFromRow));
});

app.post('/api/admin/services', requireAuth, async (req, res) => {
  const s = serializeService(req.body);
  await query(`
    INSERT INTO service_items (id, type, title, subtitle, badge, description, "ctaLabel", "ctaUrl",
      "sortOrder", published, "formEnabled", "formTitle", "backgroundImage", "formFields")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [
    s.id, s.type, s.title, s.subtitle, s.badge, s.description, s.ctaLabel, s.ctaUrl,
    s.sortOrder, s.published, s.formEnabled, s.formTitle, s.backgroundImage, s.formFields,
  ]);
  res.json({ ok: true });
});

app.put('/api/admin/services/:id', requireAuth, async (req, res) => {
  const s = serializeService({ ...req.body, id: req.params.id });
  await query(`
    UPDATE service_items SET type=$1, title=$2, subtitle=$3, badge=$4,
      description=$5, "ctaLabel"=$6, "ctaUrl"=$7,
      "sortOrder"=$8, published=$9, "formEnabled"=$10,
      "formTitle"=$11, "backgroundImage"=$12, "formFields"=$13
    WHERE id=$14
  `, [
    s.type, s.title, s.subtitle, s.badge, s.description, s.ctaLabel, s.ctaUrl,
    s.sortOrder, s.published, s.formEnabled, s.formTitle, s.backgroundImage, s.formFields,
    s.id,
  ]);
  res.json({ ok: true });
});

app.delete('/api/admin/services/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  await query('DELETE FROM service_items WHERE id = $1', [id]);
  await query('DELETE FROM service_submissions WHERE "serviceId" = $1', [id]);
  res.json({ ok: true });
});

app.get('/api/admin/service-submissions', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM service_submissions ORDER BY "createdAt" DESC');
  res.json(rows.map(submissionFromRow));
});

// ============================================================
// NEWSLETTER — public subscribe/unsubscribe + admin management
// ============================================================
app.post('/api/newsletter/subscribe', async (req, res) => {
  const raw = (req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(raw)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  const source = (req.body?.source || 'footer').slice(0, 64);
  const { rows } = await query('SELECT * FROM email_subscribers WHERE email = $1', [raw]);
  const existing = rows[0];

  if (existing) {
    if (!existing.active) {
      await query(
        'UPDATE email_subscribers SET active = TRUE, "subscribedAt" = NOW() WHERE id = $1',
        [existing.id],
      );
      email.sendWelcome(raw, existing.unsubscribeToken).catch((err) =>
        console.error('[email] welcome resubscribe failed:', err),
      );
    }
    return res.json({ ok: true });
  }

  const token = email.generateToken();
  await query(
    'INSERT INTO email_subscribers (email, "unsubscribeToken", source) VALUES ($1, $2, $3)',
    [raw, token, source],
  );
  email.sendWelcome(raw, token).catch((err) =>
    console.error('[email] welcome failed:', err),
  );
  res.json({ ok: true });
});

app.post('/api/newsletter/unsubscribe', async (req, res) => {
  const token = (req.body?.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Invalid unsubscribe link' });
  const { rows } = await query(
    'SELECT * FROM email_subscribers WHERE "unsubscribeToken" = $1',
    [token],
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Subscription not found' });
  await query('UPDATE email_subscribers SET active = FALSE WHERE id = $1', [row.id]);
  res.json({ ok: true, email: row.email });
});

app.get('/api/admin/subscribers', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM email_subscribers WHERE active = TRUE ORDER BY "subscribedAt" DESC',
  );
  res.json(rows.map(subscriberFromRow));
});

app.delete('/api/admin/subscribers/:id', requireAuth, async (req, res) => {
  await query('UPDATE email_subscribers SET active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/admin/newsletter/send', requireAuth, async (req, res) => {
  const subject = (req.body?.subject || '').trim();
  const message = (req.body?.message || '').trim();
  if (!subject) return res.status(400).json({ error: 'Subject is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const subs = await activeSubscribers();
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

app.post('/api/admin/upload', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const url = await storeFile(query, req.file);
    res.json({ url });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

app.post('/api/admin/upload-file', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const url = await storeFile(query, req.file);
    res.json({ url });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

app.post('/api/admin/upload-video', requireAuth, uploadVideo.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const url = await storeFile(query, req.file);
    res.json({ url });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Try a smaller image (max 25 MB).'
      : err.message;
    return res.status(400).json({ error: message });
  }
  if (err) {
    console.error('Unhandled request error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
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
    published: !!s.published,
    formEnabled,
    formTitle: s.formTitle ?? null,
    backgroundImage: normalizeMediaRef(s.backgroundImage),
    formFields: jsonb(Array.isArray(s.formFields) ? s.formFields : [], []),
  };
}

// ============================================================
// OPTIONAL: serve the built Angular frontend (production mode).
// ============================================================
const frontendDist = path.join(__dirname, '..', 'dist', 'ille-angular', 'browser');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log('Serving built frontend from', frontendDist);
}

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`ille API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

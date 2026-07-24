// db.js — PostgreSQL: schema migration, seed data, and row<->object helpers.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { normalizeMediaRef, normalizeMediaRefList, migrateRefToDb, migrateRefListToDb } = require('./media');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ille.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'illeadmin';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required (see server/.env.example)');
}

const useSsl =
  process.env.NODE_ENV === 'production' || databaseUrl.includes('render.com');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  keepAlive: true,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  // Large media inserts (videos) can be slow; allow generous per-statement time.
  statement_timeout: 120000,
});

// Prevents a dropped idle connection from crashing the whole process.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error (idle client):', err.message);
});

function isConnectionDropError(err) {
  const msg = String(err && err.message).toLowerCase();
  return (
    msg.includes('connection terminated') ||
    msg.includes('connection reset') ||
    err?.code === 'ECONNRESET' ||
    err?.code === '57P01' // admin_shutdown
  );
}

async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    // A single transparent retry covers a stale/dropped pooled connection.
    if (isConnectionDropError(err)) {
      console.warn('DB connection dropped mid-query — retrying once:', err.message);
      return pool.query(text, params);
    }
    throw err;
  }
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function modelFromRow(row) {
  if (!row) return null;
  let branch = row.branch;
  let category = row.category ?? '';
  if (!branch) {
    if (category === 'men') {
      branch = 'men';
      category = '';
    } else if (category === 'women') {
      branch = 'women';
      category = '';
    } else {
      branch = 'women';
    }
  }
  return {
    ...row,
    branch,
    category,
    outOfTown: !!row.outOfTown,
    published: !!row.published,
    coverImage: normalizeMediaRef(row.coverImage),
    gallery: normalizeMediaRefList(parseJson(row.gallery, [])),
    digitals: normalizeMediaRefList(parseJson(row.digitals, [])),
    pdfUrl: normalizeMediaRef(row.pdfUrl),
    introVideoUrl: normalizeMediaRef(row.introVideoUrl),
    catwalkVideoUrl: normalizeMediaRef(row.catwalkVideoUrl),
  };
}

function serviceFromRow(row) {
  if (!row) return null;
  return {
    ...row,
    published: !!row.published,
    formEnabled: !!row.formEnabled,
    formFields: (() => {
      const parsed = parseJson(row.formFields, []);
      return Array.isArray(parsed) ? parsed : [];
    })(),
    backgroundImage: normalizeMediaRef(row.backgroundImage),
  };
}

function submissionFromRow(row) {
  if (!row) return null;
  return {
    ...row,
    data: parseJson(row.data, {}),
  };
}

function categoryFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    published: !!row.published,
  };
}

function subscriberFromRow(row) {
  if (!row) return null;
  const rawSource = row.source || 'footer';
  const [baseSource, topicPart] = String(rawSource).split(':');
  return {
    id: row.id,
    email: row.email,
    topic: topicPart === 'community' ? 'community' : 'models',
    active: !!row.active,
    source: baseSource || 'footer',
    subscribedAt: row.subscribedAt,
  };
}

function siteFormFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    rules: parseJson(row.rules, []),
    submitLabel: row.submitLabel || 'Submit',
    formFields: (() => {
      const parsed = parseJson(row.formFields, []);
      return Array.isArray(parsed) ? parsed : [];
    })(),
  };
}

function applicationFromRow(row, extraData) {
  if (!row) return null;
  const data = parseJson(extraData, {});
  return {
    id: row.id,
    firstName: row.firstName ?? data.firstName,
    lastName: row.lastName ?? data.lastName,
    dateOfBirth: row.dateOfBirth ?? data.dateOfBirth,
    email: row.email ?? data.email,
    phone: row.phone ?? data.phone,
    instagram: row.instagram ?? data.instagram,
    height: row.height ?? (data.height ? Number(data.height) : undefined),
    fullShotUrl: row.fullShotUrl ?? data.fullShot,
    halfShotUrl: row.halfShotUrl ?? data.halfShot,
    closeupShotUrl: row.closeupShotUrl ?? data.closeupShot,
    profileShotUrl: row.profileShotUrl ?? data.profileShot,
    data,
    createdAt: row.createdAt,
  };
}

function bookingFromRow(row, extraData) {
  if (!row) return null;
  const data = parseJson(extraData, {});
  return {
    id: row.id,
    modelId: row.modelId ?? data.modelId,
    clientName: row.clientName ?? data.clientName,
    company: row.company ?? data.company,
    email: row.email ?? data.email,
    phone: row.phone ?? data.phone,
    jobType: row.jobType ?? data.jobType,
    dates: row.dates ?? data.dates,
    location: row.location ?? data.location,
    budget: row.budget ?? data.budget,
    message: row.message ?? data.message,
    data,
    createdAt: row.createdAt,
  };
}

async function seedAdmin(client) {
  const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  if (rows.length) return;
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await client.query(
    'INSERT INTO users (email, "passwordHash") VALUES ($1, $2)',
    [ADMIN_EMAIL, hash],
  );
  console.log(`Seeded admin login -> ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

async function seedCategories(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM model_categories');
  if (rows[0].c > 0) return;

  const seedCategories = [
    ['women', 'Women', 0, true],
    ['men', 'Men', 2, true],
  ];
  for (const [id, name, sortOrder, published] of seedCategories) {
    await client.query(
      'INSERT INTO model_categories (id, name, "sortOrder", published) VALUES ($1, $2, $3, $4)',
      [id, name, sortOrder, published],
    );
  }
  console.log(`Seeded ${seedCategories.length} model categories.`);
}

async function seedServices(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM service_items');
  if (rows[0].c > 0) return;

  const seedServices = [
    ['heading-events', 'events_heading', 'Upcoming Events', null, null, null, null, null, 0, true, false, null, null, '[]'],
    ['model-camp', 'program', 'Model Camp', 'model edition', 'Soon', null, null, null, 1, true, false, null, null, '[]'],
    ['heading-services', 'services_heading', 'Discover our services', null, null, null, null, null, 2, true, false, null, null, '[]'],
  ];
  for (const row of seedServices) {
    await client.query(
      `INSERT INTO service_items (id, type, title, subtitle, badge, description, "ctaLabel", "ctaUrl",
        "sortOrder", published, "formEnabled", "formTitle", "backgroundImage", "formFields")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      row,
    );
  }
  console.log(`Seeded ${seedServices.length} service items.`);
}

const DEFAULT_SITE_FORMS = {
  'become-a-model': {
    rules: [
      'No make-up or hair products — we must see your natural beauty.',
      'Phone pictures are fine; use natural light.',
      'Submit natural, non-professional pictures only.',
      'Applications missing any requested info will not be reviewed.',
    ],
    submitLabel: 'Submit Application',
    formFields: [
      { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
      { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
      { id: 'dateOfBirth', type: 'date', label: 'Date of Birth', width: 'half', rowGroup: 'dob-h', sortOrder: 2, required: true },
      { id: 'height', type: 'number', label: 'Height (cm)', width: 'half', rowGroup: 'dob-h', sortOrder: 3, required: true },
      { id: 'email', type: 'email', label: 'Email', width: 'half', rowGroup: 'contact', sortOrder: 4, required: true },
      { id: 'phone', type: 'phone', label: 'Phone', width: 'half', rowGroup: 'contact', sortOrder: 5, required: true },
      { id: 'instagram', type: 'text', label: 'Instagram', placeholder: '@username', width: 'full', sortOrder: 6, required: true },
      { id: 'fullShot', type: 'file', label: 'Full Shot', width: 'half', rowGroup: 'shots1', sortOrder: 7, required: true },
      { id: 'halfShot', type: 'file', label: 'Half Shot', width: 'half', rowGroup: 'shots1', sortOrder: 8, required: true },
      { id: 'closeupShot', type: 'file', label: 'Close-up Shot', width: 'half', rowGroup: 'shots2', sortOrder: 9, required: true },
      { id: 'profileShot', type: 'file', label: 'Profile Shot', width: 'half', rowGroup: 'shots2', sortOrder: 10, required: true },
    ],
  },
  'book-a-model': {
    rules: [],
    submitLabel: 'Send Enquiry',
    formFields: [
      { id: 'clientName', type: 'text', label: 'Your Name', width: 'half', rowGroup: 'row1', sortOrder: 0, required: true },
      { id: 'company', type: 'text', label: 'Company / Brand', width: 'half', rowGroup: 'row1', sortOrder: 1, required: false },
      { id: 'email', type: 'email', label: 'Email', width: 'half', rowGroup: 'row2', sortOrder: 2, required: true },
      { id: 'phone', type: 'phone', label: 'Phone', width: 'half', rowGroup: 'row2', sortOrder: 3, required: true },
      {
        id: 'jobType', type: 'dropdown', label: 'Job Type', width: 'half', rowGroup: 'row3', sortOrder: 4, required: true,
        options: ['Editorial', 'Campaign', 'Runway / Show', 'E-commerce', 'Lookbook', 'Event / Appearance'],
      },
      { id: 'location', type: 'text', label: 'Location', width: 'half', rowGroup: 'row3', sortOrder: 5, required: true },
      { id: 'dates', type: 'text', label: 'Dates', placeholder: 'e.g. 12–14 July', width: 'half', rowGroup: 'row4', sortOrder: 6, required: true },
      { id: 'budget', type: 'text', label: 'Budget', placeholder: 'Optional', width: 'half', rowGroup: 'row4', sortOrder: 7, required: false },
      {
        id: 'message', type: 'textarea', label: 'Details',
        placeholder: "Tell us about the project, usage, and which models you're interested in.",
        width: 'full', sortOrder: 8, required: true,
      },
    ],
  },
};

async function seedSiteForms(client) {
  for (const [id, config] of Object.entries(DEFAULT_SITE_FORMS)) {
    const { rows } = await client.query('SELECT id FROM site_forms WHERE id = $1', [id]);
    if (rows.length) continue;
    await client.query(
      `INSERT INTO site_forms (id, rules, "formFields", "submitLabel")
       VALUES ($1, $2, $3, $4)`,
      [id, JSON.stringify(config.rules), JSON.stringify(config.formFields), config.submitLabel],
    );
  }
}

function isOwnershipError(err) {
  return err && err.code === '42501';
}

async function migrateLegacyMedia(client) {
  const uploadsDir = path.join(__dirname, 'uploads');
  const queryFn = (text, params) => client.query(text, params);
  let updated = 0;

  try {
    const { rows: models } = await client.query(
      'SELECT id, "coverImage", gallery, digitals, "pdfUrl", "introVideoUrl", "catwalkVideoUrl" FROM models',
    );
    for (const row of models) {
      const coverImage = await migrateRefToDb(queryFn, uploadsDir, row.coverImage);
      const gallery = await migrateRefListToDb(queryFn, uploadsDir, parseJson(row.gallery, []));
      const digitals = await migrateRefListToDb(queryFn, uploadsDir, parseJson(row.digitals, []));
      const pdfUrl = await migrateRefToDb(queryFn, uploadsDir, row.pdfUrl);
      const introVideoUrl = await migrateRefToDb(queryFn, uploadsDir, row.introVideoUrl);
      const catwalkVideoUrl = await migrateRefToDb(queryFn, uploadsDir, row.catwalkVideoUrl);
      const changed =
        row.coverImage !== coverImage ||
        JSON.stringify(parseJson(row.gallery, [])) !== JSON.stringify(gallery) ||
        JSON.stringify(parseJson(row.digitals, [])) !== JSON.stringify(digitals) ||
        row.pdfUrl !== pdfUrl ||
        row.introVideoUrl !== introVideoUrl ||
        row.catwalkVideoUrl !== catwalkVideoUrl;
      if (!changed) continue;
      await client.query(
        `UPDATE models SET "coverImage"=$2, gallery=$3, digitals=$4,
          "pdfUrl"=$5, "introVideoUrl"=$6, "catwalkVideoUrl"=$7 WHERE id=$1`,
        [
          row.id,
          coverImage,
          JSON.stringify(gallery),
          JSON.stringify(digitals),
          pdfUrl,
          introVideoUrl,
          catwalkVideoUrl,
        ],
      );
      updated++;
    }
  } catch (err) {
    if (!isOwnershipError(err)) throw err;
    console.warn('Skipping models media migration (insufficient table ownership).');
  }

  try {
    const { rows: services } = await client.query(
      'SELECT id, "backgroundImage" FROM service_items WHERE "backgroundImage" IS NOT NULL',
    );
    for (const row of services) {
      const bg = await migrateRefToDb(queryFn, uploadsDir, row.backgroundImage);
      if (bg === row.backgroundImage) continue;
      await client.query('UPDATE service_items SET "backgroundImage"=$2 WHERE id=$1', [row.id, bg]);
      updated++;
    }
  } catch (err) {
    if (!isOwnershipError(err)) throw err;
    console.warn('Skipping service media migration (insufficient table ownership).');
  }

  try {
    const shotCols = ['fullShotUrl', 'halfShotUrl', 'closeupShotUrl', 'profileShotUrl'];
    const { rows: apps } = await client.query(
      `SELECT id, ${shotCols.map((c) => `"${c}"`).join(', ')} FROM applications`,
    );
    for (const row of apps) {
      const updates = {};
      for (const col of shotCols) {
        const next = await migrateRefToDb(queryFn, uploadsDir, row[col]);
        if (next !== row[col]) updates[col] = next;
      }
      if (!Object.keys(updates).length) continue;
      const sets = Object.keys(updates).map((col, i) => `"${col}"=$${i + 2}`).join(', ');
      await client.query(
        `UPDATE applications SET ${sets} WHERE id=$1`,
        [row.id, ...Object.values(updates)],
      );
      updated++;
    }
  } catch (err) {
    if (!isOwnershipError(err)) throw err;
    console.warn('Skipping applications media migration (insufficient table ownership).');
  }

  if (updated) {
    console.log(`Migrated legacy file paths into database media (${updated} record(s)).`);
  }
}

async function initDb() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await query(sql);
    } catch (err) {
      if (isOwnershipError(err)) {
        console.warn(`Skipping migration ${file} (insufficient table ownership).`);
        continue;
      }
      throw err;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedAdmin(client);
    await seedCategories(client);
    await seedServices(client);
    await seedSiteForms(client);
    await migrateLegacyMedia(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  initDb,
  modelFromRow,
  serviceFromRow,
  submissionFromRow,
  categoryFromRow,
  subscriberFromRow,
  siteFormFromRow,
  applicationFromRow,
  bookingFromRow,
  ADMIN_EMAIL,
};

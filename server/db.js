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
});

async function query(text, params = []) {
  return pool.query(text, params);
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
    formFields: parseJson(row.formFields, []),
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
  return {
    id: row.id,
    email: row.email,
    topic: row.topic || 'models',
    active: !!row.active,
    source: row.source || 'footer',
    subscribedAt: row.subscribedAt,
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

async function migrateLegacyMedia(client) {
  const uploadsDir = path.join(__dirname, 'uploads');
  const queryFn = (text, params) => client.query(text, params);
  let updated = 0;

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

  const { rows: services } = await client.query(
    'SELECT id, "backgroundImage" FROM service_items WHERE "backgroundImage" IS NOT NULL',
  );
  for (const row of services) {
    const bg = await migrateRefToDb(queryFn, uploadsDir, row.backgroundImage);
    if (bg === row.backgroundImage) continue;
    await client.query('UPDATE service_items SET "backgroundImage"=$2 WHERE id=$1', [row.id, bg]);
    updated++;
  }

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

  if (updated) {
    console.log(`Migrated legacy file paths into database media (${updated} record(s)).`);
  }
}

async function initDb() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await query(sql);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedAdmin(client);
    await seedCategories(client);
    await seedServices(client);
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
  ADMIN_EMAIL,
};

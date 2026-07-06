// db.js — SQLite database: schema, seed data, and row<->object helpers.
// SQLite is just a single file (ille.db) created next to this script.

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'ille.db'));
db.pragma('journal_mode = WAL');

// ---- schema -------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    height INTEGER,
    bust INTEGER,
    waist INTEGER,
    hips INTEGER,
    shoeSize INTEGER,
    hair TEXT,
    eyes TEXT,
    city TEXT,
    outOfTown INTEGER NOT NULL DEFAULT 0,
    instagram TEXT,
    coverImage TEXT NOT NULL,
    gallery TEXT NOT NULL DEFAULT '[]',
    published INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT,
    dateOfBirth TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    instagram TEXT,
    height INTEGER,
    fullShotUrl TEXT,
    halfShotUrl TEXT,
    closeupShotUrl TEXT,
    profileShotUrl TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modelId TEXT,
    clientName TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    jobType TEXT,
    dates TEXT,
    location TEXT,
    budget TEXT,
    message TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    badge TEXT,
    description TEXT,
    ctaLabel TEXT,
    ctaUrl TEXT,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    formEnabled INTEGER NOT NULL DEFAULT 0,
    formTitle TEXT,
    backgroundImage TEXT,
    formFields TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS service_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceId TEXT NOT NULL,
    serviceTitle TEXT NOT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS model_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    imageUrl TEXT,
    published INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS email_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    unsubscribeToken TEXT UNIQUE NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'footer',
    subscribedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(ddl);
}

ensureColumn('service_items', 'formEnabled', 'ALTER TABLE service_items ADD COLUMN formEnabled INTEGER NOT NULL DEFAULT 0');
ensureColumn('service_items', 'formTitle', 'ALTER TABLE service_items ADD COLUMN formTitle TEXT');
ensureColumn('service_items', 'backgroundImage', 'ALTER TABLE service_items ADD COLUMN backgroundImage TEXT');
ensureColumn('service_items', 'formFields', `ALTER TABLE service_items ADD COLUMN formFields TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('models', 'digitals', `ALTER TABLE models ADD COLUMN digitals TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('models', 'pdfUrl', 'ALTER TABLE models ADD COLUMN pdfUrl TEXT');
ensureColumn('models', 'introVideoUrl', 'ALTER TABLE models ADD COLUMN introVideoUrl TEXT');
ensureColumn('models', 'catwalkVideoUrl', 'ALTER TABLE models ADD COLUMN catwalkVideoUrl TEXT');
ensureColumn('models', 'branch', `ALTER TABLE models ADD COLUMN branch TEXT NOT NULL DEFAULT 'women'`);

// Legacy rows stored men/women in category — split into branch + sub-category.
db.prepare(`UPDATE models SET branch = 'men', category = '' WHERE category = 'men'`).run();
db.prepare(`UPDATE models SET branch = 'women', category = '' WHERE category = 'women'`).run();

// ---- seed the admin user -----------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ille.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'illeadmin';

const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO users (email, passwordHash) VALUES (?, ?)').run(ADMIN_EMAIL, hash);
  console.log(`Seeded admin login -> ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

// ---- seed model categories (only if table is empty) --------
const categoryCount = db.prepare('SELECT COUNT(*) AS c FROM model_categories').get().c;
if (categoryCount === 0) {
  const seedCategories = [
    ['women', 'Women', 0, 1],
    // ['new-faces', 'New Faces', 1, 1],
    ['men', 'Men', 2, 1],
  ];
  const insertCategory = db.prepare(`
    INSERT INTO model_categories (id, name, sortOrder, published)
    VALUES (?, ?, ?, ?)
  `);
  const txCategories = db.transaction(() => {
    for (const row of seedCategories) insertCategory.run(...row);
  });
  txCategories();
  console.log(`Seeded ${seedCategories.length} model categories.`);
}

// ---- mappers ------------------------------------------------
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
    gallery: JSON.parse(row.gallery || '[]'),
    digitals: JSON.parse(row.digitals || '[]'),
  };
}

function serviceFromRow(row) {
  if (!row) return null;
  return {
    ...row,
    published: !!row.published,
    formEnabled: !!row.formEnabled,
    formFields: JSON.parse(row.formFields || '[]'),
  };
}

function submissionFromRow(row) {
  if (!row) return null;
  return {
    ...row,
    data: JSON.parse(row.data || '{}'),
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
    active: !!row.active,
    source: row.source || 'footer',
    subscribedAt: row.subscribedAt,
  };
}

// ---- seed service items (only if table is empty) -----------
const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM service_items').get().c;
if (serviceCount === 0) {
  const seedServices = [
    ['heading-events', 'events_heading', 'Upcoming Events', null, null, null, null, null, 0, 1, 0, null, null, '[]'],
    ['model-camp', 'program', 'Model Camp', 'model edition', 'Soon', null, null, null, 1, 1, 0, null, null, '[]'],
    ['heading-services', 'services_heading', 'Discover our services', null, null, null, null, null, 2, 1, 0, null, null, '[]'],
  ];
  const insertService = db.prepare(`
    INSERT INTO service_items (id, type, title, subtitle, badge, description, ctaLabel, ctaUrl, sortOrder, published, formEnabled, formTitle, backgroundImage, formFields)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const txServices = db.transaction(() => {
    for (const row of seedServices) insertService.run(...row);
  });
  txServices();
  console.log(`Seeded ${seedServices.length} service items.`);
}

module.exports = {
  db,
  modelFromRow,
  serviceFromRow,
  submissionFromRow,
  categoryFromRow,
  subscriberFromRow,
  ADMIN_EMAIL,
};

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

// ---- seed the admin user -----------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ille.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'illeadmin';

const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO users (email, passwordHash) VALUES (?, ?)').run(ADMIN_EMAIL, hash);
  console.log(`Seeded admin login -> ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

// ---- seed sample models (only if table is empty) -----------
const count = db.prepare('SELECT COUNT(*) AS c FROM models').get().c;
if (count === 0) {
  const sample = [
    ['amara-okafor', 'Amara Okafor', 'women', 178, 'Beirut', 0],
    ['lia-fontaine', 'Lia Fontaine', 'women', 176, 'Paris', 1],
    ['noor-haddad', 'Noor Haddad', 'women', 174, 'Beirut', 0],
    ['sofia-marchetti', 'Sofia Marchetti', 'women', 180, 'Milan', 1],
    ['karim-saliba', 'Karim Saliba', 'men', 187, 'Beirut', 0],
    ['luca-romano', 'Luca Romano', 'men', 189, 'Rome', 1],
    ['jad-khoury', 'Jad Khoury', 'men', 185, 'Beirut', 0],
    ['elif-demir', 'Elif Demir', 'new-faces', 177, 'Istanbul', 1],
    ['maya-rizk', 'Maya Rizk', 'new-faces', 175, 'Beirut', 0],
  ];
  const insert = db.prepare(`
    INSERT INTO models (id, name, category, height, bust, waist, hips, shoeSize,
      hair, eyes, city, outOfTown, instagram, coverImage, gallery, digitals,
      pdfUrl, introVideoUrl, catwalkVideoUrl, published)
    VALUES (@id, @name, @category, @height, 84, 61, 89, 40,
      'Brown', 'Brown', @city, @outOfTown, '@'||@id, @coverImage, @gallery, @digitals,
      NULL, NULL, NULL, 1)
  `);
  const tx = db.transaction(() => {
    for (const [id, name, category, height, city, oot] of sample) {
      insert.run({
        id, name, category, height, city, outOfTown: oot,
        coverImage: `https://picsum.photos/seed/${id}/640/880`,
        gallery: JSON.stringify([
          `https://picsum.photos/seed/${id}-g1/640/960`,
          `https://picsum.photos/seed/${id}-g2/640/960`,
          `https://picsum.photos/seed/${id}-g3/640/960`,
          `https://picsum.photos/seed/${id}-g4/640/960`,
        ]),
        digitals: JSON.stringify([
          `https://picsum.photos/seed/${id}-d1/640/960`,
          `https://picsum.photos/seed/${id}-d2/640/960`,
          `https://picsum.photos/seed/${id}-d3/640/960`,
          `https://picsum.photos/seed/${id}-d4/640/960`,
        ]),
      });
    }
  });
  tx();
  console.log(`Seeded ${sample.length} sample models.`);
}

// ---- mappers ------------------------------------------------
function modelFromRow(row) {
  if (!row) return null;
  return {
    ...row,
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

const GUIDANCE_FIELDS = JSON.stringify([
  { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
  { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
  { id: 'email', type: 'email', label: 'Email', width: 'full', sortOrder: 2, required: true },
  { id: 'phone', type: 'phone', label: 'Phone Number', width: 'full', sortOrder: 3, required: true },
  {
    id: 'session-info',
    type: 'info',
    label: '',
    helpText:
      'Advanced guidance consultation is more complex to improve the skills you already have. It is recommended for people who already know posing and want to take their skills to the next level.',
    width: 'full',
    sortOrder: 4,
    required: false,
  },
  {
    id: 'session',
    type: 'radio',
    label: 'Select Session',
    options: ['LIVE SESSION', 'ONLINE SESSION'],
    width: 'full',
    sortOrder: 5,
    required: true,
  },
  { id: 'instagram', type: 'text', label: 'Instagram', placeholder: '@username', width: 'full', sortOrder: 6, required: true },
]);

// ---- seed service items (only if table is empty) -----------
const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM service_items').get().c;
if (serviceCount === 0) {
  const seedServices = [
    ['heading-events', 'events_heading', 'Upcoming Events', null, null, null, null, null, 0, 1, 0, null, null, '[]'],
    ['model-camp', 'program', 'Model Camp', 'model edition', 'Soon', null, null, null, 1, 1, 0, null, null, '[]'],
    ['one-on-one', 'promo', 'Book your one on one session', null, null, null, 'Submit', '/services/one-on-one/book', 2, 1, 1, 'One on One Session', 'https://picsum.photos/seed/oneonone/1920/1080', JSON.stringify([
      { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
      { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
      { id: 'email', type: 'email', label: 'Email', width: 'full', sortOrder: 2, required: true },
      { id: 'phone', type: 'phone', label: 'Phone Number', width: 'full', sortOrder: 3, required: true },
      { id: 'preferredDate', type: 'date', label: 'Preferred Date', width: 'half', rowGroup: 'schedule', sortOrder: 4, required: true },
      { id: 'preferredTime', type: 'time', label: 'Preferred Time', width: 'half', rowGroup: 'schedule', sortOrder: 5, required: true },
      { id: 'notes', type: 'textarea', label: 'Notes', width: 'full', sortOrder: 6, required: true },
    ])],
    ['heading-services', 'services_heading', 'Discover our services', null, null, null, null, null, 3, 1, 0, null, null, '[]'],
    ['posing', 'offering', 'Posing', null, null, null, null, null, 4, 1, 0, null, null, '[]'],
    ['catwalk', 'offering', 'Catwalk', null, null, null, null, null, 5, 1, 0, null, null, '[]'],
    ['facial-expressions', 'offering', 'Facial Expressions', null, null, null, null, null, 6, 1, 0, null, null, '[]'],
    ['body-movement', 'offering', 'Body Movement', null, null, null, null, null, 7, 1, 0, null, null, '[]'],
    ['flexibility-posture', 'offering', 'Flexibility and Posture', null, null, null, null, null, 8, 1, 0, null, null, '[]'],
    ['guidance-consultation', 'promo', 'Book Your Guidance Consultation', null, null, null, 'Submit', '/services/guidance-consultation/book', 9, 1, 1, 'Guidance Consultation', 'https://picsum.photos/seed/guidance/1920/1080', GUIDANCE_FIELDS],
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
} else {
  db.prepare(`
    UPDATE service_items SET formEnabled = 1, formTitle = 'Guidance Consultation',
      backgroundImage = COALESCE(backgroundImage, 'https://picsum.photos/seed/guidance/1920/1080'),
      formFields = CASE WHEN formFields = '[]' OR formFields IS NULL THEN ? ELSE formFields END,
      ctaUrl = '/services/guidance-consultation/book'
    WHERE id = 'guidance-consultation'
  `).run(GUIDANCE_FIELDS);
  db.prepare(`
    UPDATE service_items SET formEnabled = 1, formTitle = 'One on One Session',
      ctaUrl = '/services/one-on-one/book'
    WHERE id = 'one-on-one' AND (formFields = '[]' OR formFields IS NULL)
  `).run();
}

module.exports = { db, modelFromRow, serviceFromRow, submissionFromRow, ADMIN_EMAIL };

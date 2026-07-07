CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'women',
  category TEXT NOT NULL DEFAULT '',
  height INTEGER,
  bust INTEGER,
  waist INTEGER,
  hips INTEGER,
  "shoeSize" INTEGER,
  hair TEXT,
  eyes TEXT,
  city TEXT,
  "outOfTown" BOOLEAN NOT NULL DEFAULT FALSE,
  instagram TEXT,
  "coverImage" TEXT NOT NULL,
  gallery JSONB NOT NULL DEFAULT '[]',
  digitals JSONB NOT NULL DEFAULT '[]',
  "pdfUrl" TEXT,
  "introVideoUrl" TEXT,
  "catwalkVideoUrl" TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "dateOfBirth" TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  height INTEGER,
  "fullShotUrl" TEXT,
  "halfShotUrl" TEXT,
  "closeupShotUrl" TEXT,
  "profileShotUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  "modelId" TEXT,
  "clientName" TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  "jobType" TEXT,
  dates TEXT,
  location TEXT,
  budget TEXT,
  message TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  description TEXT,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  "formEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "formTitle" TEXT,
  "backgroundImage" TEXT,
  "formFields" JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS service_submissions (
  id SERIAL PRIMARY KEY,
  "serviceId" TEXT NOT NULL,
  "serviceTitle" TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS email_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "unsubscribeToken" TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT DEFAULT 'footer',
  "subscribedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

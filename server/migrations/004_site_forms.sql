-- Editable Become a Model / Book a Model form configs.
-- Uses side tables (no ALTER on applications/bookings) because some DB roles
-- are not owners of those tables (same pattern as 003_twin_models.sql).

CREATE TABLE IF NOT EXISTS site_forms (
  id TEXT PRIMARY KEY,
  rules JSONB NOT NULL DEFAULT '[]',
  "formFields" JSONB NOT NULL DEFAULT '[]',
  "submitLabel" TEXT NOT NULL DEFAULT 'Submit',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_extras (
  application_id INTEGER PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS booking_extras (
  booking_id INTEGER PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'
);

-- Admin-created public form pages (title + fields + URL, optional menu).

CREATE TABLE IF NOT EXISTS custom_forms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "showInMenu" BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  rules JSONB NOT NULL DEFAULT '[]',
  "formFields" JSONB NOT NULL DEFAULT '[]',
  "submitLabel" TEXT NOT NULL DEFAULT 'Submit',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_form_submissions (
  id SERIAL PRIMARY KEY,
  "formId" TEXT NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "formTitle" TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_form_submissions_form_idx
  ON custom_form_submissions ("formId", "createdAt" DESC);

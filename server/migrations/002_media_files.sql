CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  filename TEXT,
  mime_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

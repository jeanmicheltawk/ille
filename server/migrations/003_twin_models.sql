-- Twin models: one profile can represent twins with a second Instagram and a
-- second set of measurements.
--
-- NOTE: some environments run with a DB role that is NOT the owner of the
-- `models` table, so `ALTER TABLE models ...` fails with "must be owner of
-- table models". Instead of altering the existing table we keep the twin data
-- in a separate side table (creating new tables is permitted) and merge it in
-- at the application layer.
CREATE TABLE IF NOT EXISTS model_extras (
  model_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'
);

ALTER TABLE email_subscribers
  ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'models';

UPDATE email_subscribers
SET topic = 'models'
WHERE topic IS NULL OR topic = '';

ALTER TABLE email_subscribers
  DROP CONSTRAINT IF EXISTS email_subscribers_email_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_subscribers_email_topic_key'
  ) THEN
    ALTER TABLE email_subscribers
      ADD CONSTRAINT email_subscribers_email_topic_key UNIQUE (email, topic);
  END IF;
END $$;

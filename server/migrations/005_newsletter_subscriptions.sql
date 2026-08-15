-- One row per email+topic so the same address can join both lists.
-- A new table is used because some environments cannot ALTER email_subscribers
-- (role is not table owner). Creating tables is permitted.
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'models',
  "unsubscribeToken" TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT DEFAULT 'footer',
  "subscribedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscriptions_email_topic_key UNIQUE (email, topic)
);

INSERT INTO newsletter_subscriptions (email, topic, "unsubscribeToken", active, source, "subscribedAt")
SELECT
  e.email,
  CASE WHEN e.source LIKE '%:community%' THEN 'community' ELSE 'models' END,
  e."unsubscribeToken",
  e.active,
  CASE
    WHEN position(':' in COALESCE(e.source, '')) > 0 THEN split_part(e.source, ':', 1)
    ELSE COALESCE(NULLIF(e.source, ''), 'footer')
  END,
  e."subscribedAt"
FROM email_subscribers e
WHERE NOT EXISTS (
  SELECT 1 FROM newsletter_subscriptions n
  WHERE n.email = e.email
    AND n.topic = CASE WHEN e.source LIKE '%:community%' THEN 'community' ELSE 'models' END
)
AND NOT EXISTS (
  SELECT 1 FROM newsletter_subscriptions n
  WHERE n."unsubscribeToken" = e."unsubscribeToken"
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'newsletter_subscribers'
  ) THEN
    ALTER TABLE newsletter_subscribers
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT;

    UPDATE newsletter_subscribers
    SET name = COALESCE(NULLIF(TRIM(name), ''), 'Newsletter Subscriber')
    WHERE name IS NULL OR TRIM(name) = '';

    UPDATE newsletter_subscribers
    SET email = CONCAT('legacy-subscriber-', id, '@invalid.local')
    WHERE email IS NULL OR TRIM(email) = '';

    ALTER TABLE newsletter_subscribers
      ALTER COLUMN name SET NOT NULL,
      ALTER COLUMN email SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
      ON newsletter_subscribers (email);
  END IF;
END $$;

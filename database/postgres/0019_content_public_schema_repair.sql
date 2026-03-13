DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS service TEXT,
      ADD COLUMN IF NOT EXISTS school_name TEXT,
      ADD COLUMN IF NOT EXISTS contact_name TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS teachers INTEGER,
      ADD COLUMN IF NOT EXISTS grades TEXT,
      ADD COLUMN IF NOT EXISTS challenges TEXT,
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS preferred_date TEXT,
      ADD COLUMN IF NOT EXISTS preferred_time TEXT;

    UPDATE bookings
    SET
      service = COALESCE(NULLIF(service, ''), 'Legacy booking'),
      school_name = COALESCE(NULLIF(school_name, ''), 'Legacy school'),
      contact_name = COALESCE(NULLIF(contact_name, ''), 'Legacy contact'),
      email = COALESCE(NULLIF(email, ''), 'legacy-booking-' || id || '@invalid.local'),
      phone = COALESCE(NULLIF(phone, ''), 'unknown'),
      teachers = COALESCE(teachers, 0),
      grades = COALESCE(NULLIF(grades, ''), 'Unknown'),
      challenges = COALESCE(NULLIF(challenges, ''), 'Imported placeholder booking record.'),
      location = COALESCE(NULLIF(location, ''), 'Unknown'),
      preferred_date = COALESCE(NULLIF(preferred_date, ''), '1970-01-01'),
      preferred_time = COALESCE(NULLIF(preferred_time, ''), '00:00');

    ALTER TABLE bookings
      ALTER COLUMN service SET NOT NULL,
      ALTER COLUMN school_name SET NOT NULL,
      ALTER COLUMN contact_name SET NOT NULL,
      ALTER COLUMN email SET NOT NULL,
      ALTER COLUMN phone SET NOT NULL,
      ALTER COLUMN teachers SET NOT NULL,
      ALTER COLUMN grades SET NOT NULL,
      ALTER COLUMN challenges SET NOT NULL,
      ALTER COLUMN location SET NOT NULL,
      ALTER COLUMN preferred_date SET NOT NULL,
      ALTER COLUMN preferred_time SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contacts'
  ) THEN
    ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS type TEXT,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS organization TEXT,
      ADD COLUMN IF NOT EXISTS message TEXT;

    UPDATE contacts
    SET
      type = COALESCE(NULLIF(type, ''), 'legacy'),
      name = COALESCE(NULLIF(name, ''), 'Legacy contact'),
      email = COALESCE(NULLIF(email, ''), 'legacy-contact-' || id || '@invalid.local'),
      message = COALESCE(NULLIF(message, ''), 'Imported placeholder contact record.');

    ALTER TABLE contacts
      ALTER COLUMN type SET NOT NULL,
      ALTER COLUMN name SET NOT NULL,
      ALTER COLUMN email SET NOT NULL,
      ALTER COLUMN message SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'download_leads'
  ) THEN
    ALTER TABLE download_leads
      ADD COLUMN IF NOT EXISTS resource_slug TEXT,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS organization TEXT;

    UPDATE download_leads
    SET
      resource_slug = COALESCE(NULLIF(resource_slug, ''), 'legacy-resource'),
      name = COALESCE(NULLIF(name, ''), 'Legacy download lead'),
      email = COALESCE(NULLIF(email, ''), 'legacy-download-' || id || '@invalid.local');

    ALTER TABLE download_leads
      ALTER COLUMN resource_slug SET NOT NULL,
      ALTER COLUMN name SET NOT NULL,
      ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;

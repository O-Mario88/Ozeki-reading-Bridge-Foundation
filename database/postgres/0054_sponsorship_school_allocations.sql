-- Migration 0054: Sponsorship → School Allocation Ledger
-- Creates true referential integrity between sponsorships/donations and the
-- specific schools they fund, enabling donor-outcome chains.
--
-- 2026-05-06: this migration depends on the `sponsorships` and `donations`
-- tables, which are NOT created by any database/postgres/*.sql file — they
-- come from the runtime endpoint /api/migrate/sponsorships against legacy
-- databases. On a fresh Railway-style bootstrap they don't exist when 0054
-- runs, so the FK + trigger setup blew up the whole bootstrap (failedFile
-- with appliedBeforeFailure list of 56 files).
--
-- Restructured fix:
--   1. Create the allocations table unconditionally (no FK clauses inline)
--   2. Add the sponsorship_id / donation_id foreign keys *after* the fact,
--      only when their upstream tables exist
--   3. Create indexes unconditionally (table is always present now)
--   4. Create the trigger function and trigger only when sponsorships exists
--
-- This is fully idempotent: re-running after /api/migrate/sponsorships has
-- created the upstream tables fills in the FKs and trigger correctly.

CREATE TABLE IF NOT EXISTS sponsorship_school_allocations (
  id SERIAL PRIMARY KEY,
  sponsorship_id INTEGER,
  donation_id INTEGER,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  allocation_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  allocation_currency TEXT NOT NULL DEFAULT 'UGX',
  allocation_method TEXT NOT NULL DEFAULT 'equal_split'
    CHECK (allocation_method IN ('direct', 'equal_split', 'enrollment_weighted', 'manual')),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allocated_by_user_id INTEGER REFERENCES portal_users(id),
  notes TEXT,
  CHECK (sponsorship_id IS NOT NULL OR donation_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ssa_sponsorship ON sponsorship_school_allocations(sponsorship_id);
CREATE INDEX IF NOT EXISTS idx_ssa_donation ON sponsorship_school_allocations(donation_id);
CREATE INDEX IF NOT EXISTS idx_ssa_school ON sponsorship_school_allocations(school_id);

-- Add FKs to sponsorships / donations only when those upstream tables exist.
-- The constraint name pattern matches what Postgres would generate inline so
-- a later DROP TABLE CASCADE behaves the same way.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sponsorships'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sponsorship_school_allocations_sponsorship_id_fkey'
    ) THEN
      ALTER TABLE sponsorship_school_allocations
        ADD CONSTRAINT sponsorship_school_allocations_sponsorship_id_fkey
        FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'donations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sponsorship_school_allocations_donation_id_fkey'
    ) THEN
      ALTER TABLE sponsorship_school_allocations
        ADD CONSTRAINT sponsorship_school_allocations_donation_id_fkey
        FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Auto-allocation function + trigger only when the sponsorships table exists.
-- The function references columns on sponsorships and would fail to compile
-- otherwise. Built via dynamic EXECUTE so plpgsql doesn't plan-check column
-- references at function-definition time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sponsorships'
  ) THEN
    RAISE NOTICE '[0054] sponsorships table absent — skipping auto_allocate_sponsorship function + trigger. Re-run bootstrap after /api/migrate/sponsorships.';
    RETURN;
  END IF;

  EXECUTE $f$
    CREATE OR REPLACE FUNCTION auto_allocate_sponsorship(target_sponsorship_id INTEGER)
    RETURNS INTEGER AS $body$
    DECLARE
      sp RECORD;
      school_count INTEGER;
      per_school NUMERIC(14,2);
      r RECORD;
    BEGIN
      SELECT s.id, s.sponsorship_type, s.sponsorship_target_name, s.district, s.region,
             s.sub_region, s.school_id, s.amount, s.currency
      INTO sp
      FROM sponsorships s
      WHERE s.id = target_sponsorship_id AND s.payment_status = 'Completed';

      IF NOT FOUND THEN RETURN 0; END IF;

      IF sp.school_id IS NOT NULL THEN
        INSERT INTO sponsorship_school_allocations
          (sponsorship_id, school_id, allocation_amount, allocation_currency, allocation_method)
        VALUES (sp.id, sp.school_id, sp.amount, sp.currency, 'direct')
        ON CONFLICT DO NOTHING;
        RETURN 1;
      END IF;

      IF sp.district IS NOT NULL AND sp.district <> '' THEN
        SELECT COUNT(*) INTO school_count FROM schools_directory
        WHERE district = sp.district AND program_status = 'active';
        IF school_count > 0 THEN
          per_school := ROUND(sp.amount / school_count, 2);
          FOR r IN SELECT id FROM schools_directory
                   WHERE district = sp.district AND program_status = 'active'
          LOOP
            INSERT INTO sponsorship_school_allocations
              (sponsorship_id, school_id, allocation_amount, allocation_currency, allocation_method)
            VALUES (sp.id, r.id, per_school, sp.currency, 'equal_split')
            ON CONFLICT DO NOTHING;
          END LOOP;
          RETURN school_count;
        END IF;
      END IF;

      IF sp.region IS NOT NULL AND sp.region <> '' THEN
        SELECT COUNT(*) INTO school_count FROM schools_directory
        WHERE region = sp.region AND program_status = 'active';
        IF school_count > 0 THEN
          per_school := ROUND(sp.amount / school_count, 2);
          FOR r IN SELECT id FROM schools_directory
                   WHERE region = sp.region AND program_status = 'active'
          LOOP
            INSERT INTO sponsorship_school_allocations
              (sponsorship_id, school_id, allocation_amount, allocation_currency, allocation_method)
            VALUES (sp.id, r.id, per_school, sp.currency, 'equal_split')
            ON CONFLICT DO NOTHING;
          END LOOP;
          RETURN school_count;
        END IF;
      END IF;

      RETURN 0;
    END;
    $body$ LANGUAGE plpgsql;
  $f$;

  EXECUTE $f$
    CREATE OR REPLACE FUNCTION trg_auto_allocate_sponsorship()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.payment_status = 'Completed' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'Completed') THEN
        PERFORM auto_allocate_sponsorship(NEW.id);
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
  $f$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_sponsorship_allocation ON sponsorships';
  EXECUTE $f$
    CREATE TRIGGER trg_sponsorship_allocation
    AFTER INSERT OR UPDATE OF payment_status ON sponsorships
    FOR EACH ROW EXECUTE FUNCTION trg_auto_allocate_sponsorship()
  $f$;
END $$;

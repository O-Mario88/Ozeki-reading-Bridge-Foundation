-- Migration 0054: Sponsorship → School Allocation Ledger
-- Creates true referential integrity between sponsorships/donations and the
-- specific schools they fund, enabling donor-outcome chains.
--
-- 2026-05-06 amendment: this migration depends on the `sponsorships` and
-- `donations` tables, which are NOT created by any database/postgres/*.sql
-- file — they were originally provisioned by the runtime endpoint
-- /api/migrate/sponsorships against legacy databases. On a fresh
-- Railway-style bootstrap those tables don't exist when this file runs, so
-- the FK + trigger setup blew up the whole bootstrap (commit 3c21739e
-- chased the same kind of ordering bug in 0031). The migration is now
-- wrapped in conditional checks: if the upstream tables are missing, the
-- whole thing is a no-op. Once /api/migrate/sponsorships (or a future SQL
-- file that creates the rich sponsorships schema) has run, re-running the
-- bootstrap will pick up the allocations on the second pass.

DO $$
DECLARE
  has_sponsorships BOOLEAN;
  has_donations BOOLEAN;
BEGIN
  has_sponsorships := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sponsorships'
  );
  has_donations := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'donations'
  );

  IF NOT has_sponsorships AND NOT has_donations THEN
    RAISE NOTICE
      '[0054_sponsorship_school_allocations] sponsorships and donations tables not present — skipping. Run /api/migrate/sponsorships then re-run bootstrap to create the allocations ledger.';
    RETURN;
  END IF;

  -- Build the FK clauses dynamically so we only reference tables that exist.
  -- Postgres EXECUTE pattern lets us assemble the CREATE TABLE as a string.
  EXECUTE format(
    $f$
      CREATE TABLE IF NOT EXISTS sponsorship_school_allocations (
        id SERIAL PRIMARY KEY,
        sponsorship_id INTEGER %s,
        donation_id INTEGER %s,
        school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
        allocation_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        allocation_currency TEXT NOT NULL DEFAULT 'UGX',
        allocation_method TEXT NOT NULL DEFAULT 'equal_split'
          CHECK (allocation_method IN ('direct', 'equal_split', 'enrollment_weighted', 'manual')),
        allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        allocated_by_user_id INTEGER REFERENCES portal_users(id),
        notes TEXT,
        CHECK (sponsorship_id IS NOT NULL OR donation_id IS NOT NULL)
      )
    $f$,
    CASE WHEN has_sponsorships THEN 'REFERENCES sponsorships(id) ON DELETE CASCADE' ELSE '' END,
    CASE WHEN has_donations THEN 'REFERENCES donations(id) ON DELETE CASCADE' ELSE '' END
  );
END $$;

CREATE INDEX IF NOT EXISTS idx_ssa_sponsorship ON sponsorship_school_allocations(sponsorship_id);
CREATE INDEX IF NOT EXISTS idx_ssa_donation ON sponsorship_school_allocations(donation_id);
CREATE INDEX IF NOT EXISTS idx_ssa_school ON sponsorship_school_allocations(school_id);

-- Auto-allocation function: when a sponsorship is paid, split across schools in scope.
-- Only created when the sponsorships table exists — the function references columns
-- on sponsorships and would fail at parse time otherwise.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sponsorships') THEN
    RAISE NOTICE '[0054] skipping auto_allocate_sponsorship function — sponsorships table absent';
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

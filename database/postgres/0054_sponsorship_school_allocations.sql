-- Migration 0054: Sponsorship → School Allocation Ledger
-- Creates true referential integrity between sponsorships/donations and the
-- specific schools they fund, enabling donor-outcome chains.

CREATE TABLE IF NOT EXISTS sponsorship_school_allocations (
  id SERIAL PRIMARY KEY,
  sponsorship_id INTEGER REFERENCES sponsorships(id) ON DELETE CASCADE,
  donation_id INTEGER REFERENCES donations(id) ON DELETE CASCADE,
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

-- Auto-allocation function: when a sponsorship is paid, split across schools in scope
CREATE OR REPLACE FUNCTION auto_allocate_sponsorship(target_sponsorship_id INTEGER)
RETURNS INTEGER AS $$
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

  -- Case 1: direct school sponsorship
  IF sp.school_id IS NOT NULL THEN
    INSERT INTO sponsorship_school_allocations
      (sponsorship_id, school_id, allocation_amount, allocation_currency, allocation_method)
    VALUES (sp.id, sp.school_id, sp.amount, sp.currency, 'direct')
    ON CONFLICT DO NOTHING;
    RETURN 1;
  END IF;

  -- Case 2: district sponsorship → equal split across active schools in district
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

  -- Case 3: region/sub-region sponsorship → split across active schools in geography
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
$$ LANGUAGE plpgsql;

-- Trigger: auto-allocate whenever a sponsorship is marked Completed
CREATE OR REPLACE FUNCTION trg_auto_allocate_sponsorship()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'Completed' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'Completed') THEN
    PERFORM auto_allocate_sponsorship(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sponsorship_allocation ON sponsorships;
CREATE TRIGGER trg_sponsorship_allocation
AFTER INSERT OR UPDATE OF payment_status ON sponsorships
FOR EACH ROW EXECUTE FUNCTION trg_auto_allocate_sponsorship();

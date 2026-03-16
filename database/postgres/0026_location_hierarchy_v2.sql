-- Location Hierarchy Enhancement: Country -> Region -> Sub-Region -> District -> Parish -> School

-- 1. Country
CREATE TABLE IF NOT EXISTS geo_countries (
    id SERIAL PRIMARY KEY,
    iso_code VARCHAR(3) UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure Uganda exists
INSERT INTO geo_countries (iso_code, name) VALUES ('UGA', 'Uganda') ON CONFLICT DO NOTHING;

-- 2. Region (Linked to Country)
ALTER TABLE geo_regions ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES geo_countries(id);
UPDATE geo_regions SET country_id = (SELECT id FROM geo_countries WHERE iso_code = 'UGA') WHERE country_id IS NULL;
ALTER TABLE geo_regions ALTER COLUMN country_id SET NOT NULL;

-- 3. Sub-Region (Linked to Region)
-- Table already exists: geo_subregions(id, subregion_id, region_id, name)
-- Ensure region_id is NOT NULL
ALTER TABLE geo_subregions ALTER COLUMN region_id SET NOT NULL;

-- 4. District (Linked to Sub-Region)
-- Table already exists: geo_districts(id, district_id, subregion_id, region_id, name)
-- Ensure subregion_id is NOT NULL
ALTER TABLE geo_districts ALTER COLUMN subregion_id SET NOT NULL;

-- 5. Parish (Linked to District)
-- The user request skips Sub-County in the direct hierarchy (District -> Parish).
-- Current schema has: Parish -> Sub-County -> District.
-- We will add district_id directly to Parish if not present and make it the primary parent for the 6-level filter.
ALTER TABLE geo_parishes ADD COLUMN IF NOT EXISTS district_id_direct INTEGER REFERENCES geo_districts(id);
-- Backfill district_id_direct from existing subcounty mapping if possible
UPDATE geo_parishes p SET district_id_direct = p.district_id WHERE district_id_direct IS NULL;

-- 6. School (Linked to Parish)
ALTER TABLE schools_directory ADD COLUMN IF NOT EXISTS parish_id INTEGER REFERENCES geo_parishes(id);
-- Backfill parish_id if names match (best effort)
UPDATE schools_directory s SET parish_id = p.id FROM geo_parishes p WHERE s.parish = p.name AND s.parish_id IS NULL;

-- Indexing for Universal Filtering
CREATE INDEX IF NOT EXISTS idx_geo_regions_country ON geo_regions(country_id);
CREATE INDEX IF NOT EXISTS idx_geo_subregions_region ON geo_subregions(region_id);
CREATE INDEX IF NOT EXISTS idx_geo_districts_subregion ON geo_districts(subregion_id);
CREATE INDEX IF NOT EXISTS idx_geo_parishes_district ON geo_parishes(district_id_direct);
CREATE INDEX IF NOT EXISTS idx_schools_parish ON schools_directory(parish_id);

-- Enforce Domain Linkage: school_id on key tables
-- We check and add/modify school_id as required on mentioned entities.
-- assessment_records already has school_id.
-- coaching_visits already has school_id.
-- training_sessions already has school_name, but we should ensure school_id exists.
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools_directory(id);
ALTER TABLE training_participants ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools_directory(id);

-- Helper View for Universal Location Expansion
-- This view allows joining any school_id to its full hierarchy.
CREATE OR REPLACE VIEW v_school_hierarchy AS
SELECT 
    s.id AS school_id,
    s.name AS school_name,
    p.id AS parish_id,
    p.name AS parish_name,
    d.id AS district_id,
    d.name AS district_name,
    sr.id AS sub_region_id,
    sr.name AS sub_region_name,
    r.id AS region_id,
    r.name AS region_name,
    c.id AS country_id,
    c.name AS country_name
FROM schools_directory s
LEFT JOIN geo_parishes p ON s.parish_id = p.id
LEFT JOIN geo_districts d ON p.district_id_direct = d.id
LEFT JOIN geo_subregions sr ON d.subregion_id = sr.id
LEFT JOIN geo_regions r ON sr.region_id = r.id
LEFT JOIN geo_countries c ON r.country_id = c.id;

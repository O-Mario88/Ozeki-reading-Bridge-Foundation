-- Migration 0064: Cost-per-beneficiary peer benchmarks (Phase 1 / Sprint 6).
--
-- Backs the public "Cost-per-Beneficiary" page on /transparency/finance.
-- Each row is a single peer-organisation figure cited from a public source
-- (annual report, J-PAL brief, GiveWell review, etc.) so the audience can
-- compare Ozeki's cost ratios against credible external benchmarks.
--
-- Notes:
--   * cost_per_unit_usd is stored in USD because that's how almost every
--     cited figure is published; the page renders Ozeki's UGX figure
--     converted at a stable heuristic.
--   * source_url + source_year are mandatory — every benchmark must be
--     defensibly traceable to a primary source.
--   * Seeded with three widely-cited Africa/India literacy benchmarks so
--     the page has something credible to render on day one. SuperAdmins
--     can extend the table from the portal later.

CREATE TABLE IF NOT EXISTS cost_peer_benchmarks (
  id BIGSERIAL PRIMARY KEY,
  metric_key TEXT NOT NULL CHECK (metric_key IN (
    'cost_per_learner_reached',
    'cost_per_learner_improved',
    'cost_per_teacher_trained'
  )),
  peer_org_name TEXT NOT NULL,
  region TEXT,
  cost_per_unit_usd NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  source_url TEXT NOT NULL,
  source_year INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_peer_benchmarks_metric
  ON cost_peer_benchmarks (metric_key, display_order)
  WHERE is_active IS TRUE;

COMMENT ON TABLE cost_peer_benchmarks IS
  'Public peer-organisation cost-per-beneficiary benchmarks shown on /transparency/finance for honest comparison.';
COMMENT ON COLUMN cost_peer_benchmarks.cost_per_unit_usd IS
  'Cost per beneficiary in USD as published by the cited source.';
COMMENT ON COLUMN cost_peer_benchmarks.source_url IS
  'Primary source URL — required for defensibility.';

-- Seed canonical entries. ON CONFLICT-style guard: only insert when the
-- table is empty so re-running migration bootstrap doesn't duplicate.
INSERT INTO cost_peer_benchmarks (
  metric_key, peer_org_name, region, cost_per_unit_usd, notes, source_url, source_year, display_order
)
SELECT * FROM (VALUES
  ('cost_per_learner_improved', 'Teaching at the Right Level (Pratham, India)', 'India', 5.00,
   'Per child achieving reading-level proficiency in TaRL camps.',
   'https://www.povertyactionlab.org/case-study/teaching-at-the-right-level', 2018, 10),
  ('cost_per_learner_improved', 'TaRL Africa (J-PAL/Pratham partnership)', 'Sub-Saharan Africa', 8.00,
   'Cited cost-per-learner-improved across multi-country rollouts.',
   'https://www.povertyactionlab.org/initiative/teaching-right-level-africa', 2022, 20),
  ('cost_per_learner_reached', 'Building Tomorrow Uganda', 'Uganda', 25.00,
   'Cost per child enrolled in their Roots foundational-literacy programme.',
   'https://www.buildingtomorrow.org/our-impact', 2023, 30),
  ('cost_per_learner_reached', 'Save the Children — Literacy Boost', 'Multi-country (Africa/Asia)', 38.00,
   'Average cost per child reached across published Literacy Boost programme reports.',
   'https://www.savethechildren.org/us/about-us/resource-library/literacy-boost', 2021, 40),
  ('cost_per_teacher_trained', 'Pratham (India)', 'India', 90.00,
   'Cost per teacher trained in TaRL methodology, multi-day cohort.',
   'https://www.povertyactionlab.org/case-study/teaching-at-the-right-level', 2018, 10),
  ('cost_per_teacher_trained', 'Building Tomorrow Uganda', 'Uganda', 120.00,
   'Per Roots Fellow / teacher trained, full programme cycle.',
   'https://www.buildingtomorrow.org/our-impact', 2023, 20)
) AS seed(metric_key, peer_org_name, region, cost_per_unit_usd, notes, source_url, source_year, display_order)
WHERE NOT EXISTS (SELECT 1 FROM cost_peer_benchmarks);

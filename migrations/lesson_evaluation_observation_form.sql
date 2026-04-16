-- ============================================================================
-- Migration: Lesson Evaluation — Teacher Phonics & Reading Observation Form
-- 
-- This migration:
-- 1. Adds new columns to lesson_evaluations for the updated observation form
-- 2. Clears old evaluation data (user requested clean slate)
-- 3. Resets improvement baselines
-- ============================================================================

BEGIN;

-- ─── Step 1: Add new columns to lesson_evaluations ──────────────────────────

ALTER TABLE lesson_evaluations
  ADD COLUMN IF NOT EXISTS lesson_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS observer_name_text text,
  ADD COLUMN IF NOT EXISTS lesson_structure_json text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS strengths_list_json text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS areas_for_development_list_json text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS action_plan_json text,
  ADD COLUMN IF NOT EXISTS post_observation_rating text;

-- ─── Step 2: Clear old evaluation data (user requested removal) ─────────────
-- Old records use the legacy 6-domain / 21-item schema which is incompatible.

DELETE FROM lesson_evaluation_items;
DELETE FROM lesson_evaluations;

-- ─── Step 3: Reset improvement tracking baselines ───────────────────────────
-- These tables hold cached comparisons based on old domain keys.

-- Reset teacher support status if it exists
DELETE FROM teacher_support_status WHERE TRUE;

-- Reset school support status if it exists  
DELETE FROM school_support_status WHERE TRUE;

COMMIT;

-- ─── Verification ───────────────────────────────────────────────────────────
-- Run these queries to verify the migration:
--
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'lesson_evaluations' 
-- ORDER BY ordinal_position;
--
-- SELECT COUNT(*) FROM lesson_evaluations;     -- Should be 0
-- SELECT COUNT(*) FROM lesson_evaluation_items; -- Should be 0

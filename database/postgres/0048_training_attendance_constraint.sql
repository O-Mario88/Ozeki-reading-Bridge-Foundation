-- Add unique constraint to support upsert-style attendance tracking.
-- Allows ON CONFLICT (session_id, teacher_user_id) for join/leave events.
-- teacher_user_id can be NULL (school-level rows); partial index covers non-null case.
--
-- Bulletproofed with a DO block because CREATE UNIQUE INDEX IF NOT EXISTS can
-- still error if a constraint (sharing pg's relation namespace) uses the same
-- name — observed in production during Amplify deployment.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_online_training_participants_session_teacher'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_online_training_participants_session_teacher'
  ) THEN
    CREATE UNIQUE INDEX uq_online_training_participants_session_teacher
      ON online_training_participants (session_id, teacher_user_id)
      WHERE teacher_user_id IS NOT NULL;
  END IF;
END $$;

-- Add unique constraint to support upsert-style attendance tracking.
-- Allows ON CONFLICT (session_id, teacher_user_id) for join/leave events.
-- teacher_user_id can be NULL (school-level rows); partial index covers non-null case.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_online_training_participants_session_teacher'
  ) THEN
    CREATE UNIQUE INDEX uq_online_training_participants_session_teacher
      ON online_training_participants (session_id, teacher_user_id)
      WHERE teacher_user_id IS NOT NULL;
  END IF;
END $$;

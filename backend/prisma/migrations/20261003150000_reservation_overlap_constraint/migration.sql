CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "stay" TSTZRANGE
  GENERATED ALWAYS AS (tstzrange("startAt", "endAt", '[)')) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservations_no_overlap'
      AND conrelid = 'reservations'::regclass
  ) THEN
    ALTER TABLE "reservations"
      ADD CONSTRAINT "reservations_no_overlap"
      EXCLUDE USING gist (
        "slotId" WITH =,
        "stay" WITH &&
      ) WHERE (status NOT IN ('REJECTED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'));
  END IF;
END $$;
-- Prisma's schema DSL can't express a GiST exclusion constraint, so this is applied as a
-- one-off SQL script after the initial `prisma migrate dev`:
--
--   psql "$DATABASE_URL" -f prisma/sql/add-reservation-overlap-constraint.sql
--
-- It is the database-level guarantee that no slot ever ends up with two overlapping,
-- non-cancelled reservations - the application-level check in reservations.service.ts
-- is for a fast, friendly error; this constraint is what actually prevents the double
-- booking under a race condition.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stay tstzrange GENERATED ALWAYS AS (tstzrange("startAt", "endAt", '[)')) STORED;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    "slotId" WITH =,
    stay WITH &&
  ) WHERE (status NOT IN ('REJECTED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'));

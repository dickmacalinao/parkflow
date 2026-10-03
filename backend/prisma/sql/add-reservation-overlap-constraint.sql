-- Prisma's schema DSL can't express a GiST exclusion constraint, so this is applied as a
-- one-off SQL script after the initial `prisma migrate dev`:
--
--   psql "$DATABASE_URL" -f prisma/sql/add-reservation-overlap-constraint.sql
--
-- It is the database-level guarantee that no slot ever ends up with two overlapping,
-- non-cancelled reservations - the application-level check in reservations.service.ts
-- is for a fast, friendly error; this constraint is what actually prevents the double
-- booking under a race condition.
--
-- IMPORTANT: this requires reservations.startAt/endAt to be `timestamptz`
-- (see @db.Timestamptz(6) on those fields in schema.prisma), not Prisma's default bare
-- `timestamp`. A generated column built from `timestamp` columns fails with
-- "generation expression is not immutable", because the implicit timestamp->timestamptz
-- cast Postgres would have to perform depends on the session's TimeZone setting, which
-- disqualifies it from being used in a generated column. If you hit that error, the fix
-- is the column type, not this script.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Safe to re-run: drop both objects first in case an earlier attempt partially applied.
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap;
ALTER TABLE reservations DROP COLUMN IF EXISTS stay;

ALTER TABLE reservations
  ADD COLUMN stay tstzrange GENERATED ALWAYS AS (tstzrange("startAt", "endAt", '[)')) STORED;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    "slotId" WITH =,
    stay WITH &&
  ) WHERE (status NOT IN ('REJECTED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'));

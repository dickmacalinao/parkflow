ALTER TABLE "users" ADD COLUMN "propertyId" TEXT;

UPDATE "users" AS u
SET "propertyId" = COALESCE(
  (
    SELECT p."id" FROM "properties" AS p
    WHERE p."ownerId" = u."id" AND p."deletedAt" IS NULL
    ORDER BY p."createdAt", p."id" LIMIT 1
  ),
  (
    SELECT pm."propertyId" FROM "property_managers" AS pm
    JOIN "properties" AS p ON p."id" = pm."propertyId"
    WHERE pm."userId" = u."id" AND p."deletedAt" IS NULL
    ORDER BY pm."invitedAt", pm."propertyId" LIMIT 1
  ),
  (
    SELECT r."propertyId" FROM "reservations" AS r
    JOIN "properties" AS p ON p."id" = r."propertyId"
    WHERE r."requestedById" = u."id" AND p."deletedAt" IS NULL
    ORDER BY r."createdAt" DESC LIMIT 1
  ),
  (
    SELECT vp."propertyId" FROM "visitor_passes" AS vp
    JOIN "properties" AS p ON p."id" = vp."propertyId"
    WHERE vp."hostUserId" = u."id" AND p."deletedAt" IS NULL
    ORDER BY vp."createdAt" DESC LIMIT 1
  ),
  (
    SELECT p."id" FROM "properties" AS p
    WHERE p."deletedAt" IS NULL
    ORDER BY CASE WHEN p."status" = 'ACTIVE' THEN 0 ELSE 1 END, p."createdAt", p."id"
    LIMIT 1
  )
)
WHERE u."role" <> 'SUPER_ADMIN';

UPDATE "users" SET "propertyId" = NULL WHERE "role" = 'SUPER_ADMIN';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "users"
    WHERE "role" <> 'SUPER_ADMIN' AND "propertyId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot assign every non-Super Admin: create at least one property and assign existing users before applying this migration.';
  END IF;
END $$;

ALTER TABLE "users"
  ADD CONSTRAINT "users_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_property_assignment_role_check"
  CHECK (("role" = 'SUPER_ADMIN' AND "propertyId" IS NULL) OR ("role" <> 'SUPER_ADMIN' AND "propertyId" IS NOT NULL));

CREATE INDEX "users_propertyId_idx" ON "users"("propertyId");
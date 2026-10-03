ALTER TABLE "users" DROP CONSTRAINT "users_property_assignment_role_check";

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM (
  'SUPER_ADMIN',
  'PROPERTY_MANAGER',
  'PROPERTY_OWNER',
  'TENANT',
  'VISITOR',
  'PARKING_ATTENDANT'
);

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role"::text = 'SYSTEM_ADMIN' THEN 'PROPERTY_MANAGER'
      ELSE "role"::text
    END
  )::"Role";

DROP TYPE "Role_old";

ALTER TABLE "users"
  ADD CONSTRAINT "users_property_assignment_role_check"
  CHECK (("role" = 'SUPER_ADMIN' AND "propertyId" IS NULL) OR ("role" <> 'SUPER_ADMIN' AND "propertyId" IS NOT NULL));
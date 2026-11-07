ALTER TABLE "public"."parking_slots"
  ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "availableDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "availableFromDate" DATE,
  ADD COLUMN "availableToDate" DATE,
  ADD COLUMN "availableStartTime" TEXT,
  ADD COLUMN "availableEndTime" TEXT;

-- Owner slots were bookable before this feature; keep them shared so existing behaviour is unchanged.
UPDATE "public"."parking_slots" SET "isShared" = true WHERE "ownerUserId" IS NOT NULL;

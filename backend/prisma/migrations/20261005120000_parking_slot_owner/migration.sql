ALTER TABLE "parking_slots"
  ADD COLUMN "ownerUserId" TEXT;

ALTER TABLE "parking_slots"
  ADD CONSTRAINT "parking_slots_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "parking_slots_ownerUserId_idx" ON "parking_slots"("ownerUserId");
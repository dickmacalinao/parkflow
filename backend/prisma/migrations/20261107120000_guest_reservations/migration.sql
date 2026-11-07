ALTER TABLE "reservations" ALTER COLUMN "requestedById" DROP NOT NULL;
ALTER TABLE "reservations"
  ADD COLUMN "guestName" TEXT,
  ADD COLUMN "guestEmail" TEXT,
  ADD COLUMN "guestPhone" TEXT,
  ADD COLUMN "guestPlate" TEXT;
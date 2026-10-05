CREATE TYPE "SlotApprovalStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');

ALTER TABLE "parking_slots"
  ADD COLUMN "approvalStatus" "SlotApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approvalReason" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;
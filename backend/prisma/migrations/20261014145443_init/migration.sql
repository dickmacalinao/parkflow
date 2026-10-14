/*
  Warnings:

  - You are about to drop the column `stay` on the `reservations` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "stay";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fbUrl" TEXT;

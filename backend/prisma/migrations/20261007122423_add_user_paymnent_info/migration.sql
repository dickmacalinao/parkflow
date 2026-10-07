/*
  Warnings:
  - Adding the paymentInfo column to the users table
*/

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "paymentInfo" TEXT;

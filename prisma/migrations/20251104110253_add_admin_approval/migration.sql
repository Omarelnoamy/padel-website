-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminType" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true;

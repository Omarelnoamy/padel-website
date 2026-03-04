/*
  Warnings:

  - You are about to drop the column `player1` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `player2` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `highlights` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `maxParticipants` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `prize` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `registrationFee` on the `Tournament` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[registrationId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registrationId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tournamentId,player1Id,player2Id]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `player1Id` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `player2Id` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizerId` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prizes` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationDeadline` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationPrice` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationStartDate` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `termsAndConditions` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournamentLevel` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournamentSystem` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Team" DROP CONSTRAINT "Team_userId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "courtId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "paymentProof" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "registrationId" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "player1",
DROP COLUMN "player2",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "player1Id" TEXT NOT NULL,
ADD COLUMN     "player2Id" TEXT NOT NULL,
ADD COLUMN     "registrationId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "category",
DROP COLUMN "highlights",
DROP COLUMN "maxParticipants",
DROP COLUMN "prize",
DROP COLUMN "registrationFee",
ADD COLUMN     "adminApprovedAt" TIMESTAMP(3),
ADD COLUMN     "adminApprovedById" TEXT,
ADD COLUMN     "adminRejectedAt" TIMESTAMP(3),
ADD COLUMN     "adminRejectionReason" TEXT,
ADD COLUMN     "clubApprovedAt" TIMESTAMP(3),
ADD COLUMN     "clubApprovedById" TEXT,
ADD COLUMN     "clubRejectedAt" TIMESTAMP(3),
ADD COLUMN     "clubRejectionReason" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "maxTeams" INTEGER,
ADD COLUMN     "organizerId" TEXT NOT NULL,
ADD COLUMN     "prizes" TEXT NOT NULL,
ADD COLUMN     "rankCategoryId" TEXT,
ADD COLUMN     "registrationDeadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "registrationPrice" INTEGER NOT NULL,
ADD COLUMN     "registrationStartDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "termsAndConditions" TEXT NOT NULL,
ADD COLUMN     "tournamentLevel" TEXT NOT NULL,
ADD COLUMN     "tournamentSystem" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "OrganizerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankCategory" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "partnerId" TEXT,
    "playerPoints" INTEGER NOT NULL,
    "playerCategory" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityCheckedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "needsPartner" BOOLEAN NOT NULL DEFAULT false,
    "partnerRequestId" TEXT,
    "teamId" TEXT,
    "paymentId" TEXT,
    "paymentMethod" TEXT,
    "paymentProof" TEXT,
    "paymentApprovedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequest" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedPartnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isAutoMatch" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "organizerMediated" BOOLEAN NOT NULL DEFAULT false,
    "organizerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerProfile_userId_key" ON "OrganizerProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganizerProfile_userId_idx" ON "OrganizerProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganizerProfile_isApproved_idx" ON "OrganizerProfile"("isApproved");

-- CreateIndex
CREATE INDEX "RankCategory_organizerId_idx" ON "RankCategory"("organizerId");

-- CreateIndex
CREATE INDEX "RankCategory_minPoints_maxPoints_idx" ON "RankCategory"("minPoints", "maxPoints");

-- CreateIndex
CREATE UNIQUE INDEX "RankCategory_organizerId_name_key" ON "RankCategory"("organizerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_partnerRequestId_key" ON "TournamentRegistration"("partnerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_teamId_key" ON "TournamentRegistration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_paymentId_key" ON "TournamentRegistration"("paymentId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_idx" ON "TournamentRegistration"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_playerId_idx" ON "TournamentRegistration"("playerId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_status_idx" ON "TournamentRegistration"("status");

-- CreateIndex
CREATE INDEX "TournamentRegistration_teamId_idx" ON "TournamentRegistration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_playerId_key" ON "TournamentRegistration"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_partnerId_key" ON "TournamentRegistration"("tournamentId", "partnerId");

-- CreateIndex
CREATE INDEX "PartnerRequest_tournamentId_idx" ON "PartnerRequest"("tournamentId");

-- CreateIndex
CREATE INDEX "PartnerRequest_requesterId_idx" ON "PartnerRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PartnerRequest_status_idx" ON "PartnerRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRequest_tournamentId_requesterId_key" ON "PartnerRequest"("tournamentId", "requesterId");

-- CreateIndex
CREATE INDEX "Match_courtId_idx" ON "Match"("courtId");

-- CreateIndex
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_registrationId_key" ON "Payment"("registrationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_registrationId_idx" ON "Payment"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_registrationId_key" ON "Team"("registrationId");

-- CreateIndex
CREATE INDEX "Team_player1Id_idx" ON "Team"("player1Id");

-- CreateIndex
CREATE INDEX "Team_player2Id_idx" ON "Team"("player2Id");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tournamentId_player1Id_player2Id_key" ON "Team"("tournamentId", "player1Id", "player2Id");

-- CreateIndex
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");

-- CreateIndex
CREATE INDEX "Tournament_locationId_idx" ON "Tournament"("locationId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_rankCategoryId_idx" ON "Tournament"("rankCategoryId");

-- CreateIndex
CREATE INDEX "Tournament_registrationStartDate_registrationDeadline_idx" ON "Tournament"("registrationStartDate", "registrationDeadline");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "OrganizerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_rankCategoryId_fkey" FOREIGN KEY ("rankCategoryId") REFERENCES "RankCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_clubApprovedById_fkey" FOREIGN KEY ("clubApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_adminApprovedById_fkey" FOREIGN KEY ("adminApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankCategory" ADD CONSTRAINT "RankCategory_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "OrganizerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_partnerRequestId_fkey" FOREIGN KEY ("partnerRequestId") REFERENCES "PartnerRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_requestedPartnerId_fkey" FOREIGN KEY ("requestedPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

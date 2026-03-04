-- CreateTable
CREATE TABLE "FixedBooking" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT,
    "createdById" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedBooking_courtId_dayOfWeek_status_idx" ON "FixedBooking"("courtId", "dayOfWeek", "status");

-- CreateIndex
CREATE INDEX "FixedBooking_locationId_status_idx" ON "FixedBooking"("locationId", "status");

-- CreateIndex
CREATE INDEX "FixedBooking_userId_status_idx" ON "FixedBooking"("userId", "status");

-- CreateIndex
CREATE INDEX "FixedBooking_createdById_idx" ON "FixedBooking"("createdById");

-- CreateIndex
CREATE INDEX "FixedBooking_status_startDate_endDate_idx" ON "FixedBooking"("status", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "FixedBooking" ADD CONSTRAINT "FixedBooking_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBooking" ADD CONSTRAINT "FixedBooking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBooking" ADD CONSTRAINT "FixedBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBooking" ADD CONSTRAINT "FixedBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

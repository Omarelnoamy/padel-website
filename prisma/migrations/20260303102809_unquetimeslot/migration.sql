/*
  Warnings:

  - A unique constraint covering the columns `[courtId,date,startTime]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Booking_courtId_date_startTime_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_courtId_date_startTime_key" ON "Booking"("courtId", "date", "startTime");

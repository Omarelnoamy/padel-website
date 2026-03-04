-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'regular';

-- CreateIndex
CREATE INDEX "Booking_category_idx" ON "Booking"("category");

-- AlterTable
ALTER TABLE "FixedBooking" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'regular';

-- CreateIndex
CREATE INDEX "FixedBooking_category_idx" ON "FixedBooking"("category");

-- AlterTable
ALTER TABLE "BookingPayment" ADD COLUMN     "payerName" TEXT,
ADD COLUMN     "payerPhone" TEXT;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "instapayPhone" TEXT;

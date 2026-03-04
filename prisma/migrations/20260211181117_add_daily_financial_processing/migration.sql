-- CreateTable
CREATE TABLE "DailyFinancialProcessing" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "operationalDate" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "totalCash" INTEGER NOT NULL DEFAULT 0,
    "totalVisa" INTEGER NOT NULL DEFAULT 0,
    "totalInstapay" INTEGER NOT NULL DEFAULT 0,
    "totalOnline" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyFinancialProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyFinancialProcessing_locationId_idx" ON "DailyFinancialProcessing"("locationId");

-- CreateIndex
CREATE INDEX "DailyFinancialProcessing_operationalDate_idx" ON "DailyFinancialProcessing"("operationalDate");

-- CreateIndex
CREATE INDEX "DailyFinancialProcessing_processedAt_idx" ON "DailyFinancialProcessing"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFinancialProcessing_locationId_operationalDate_key" ON "DailyFinancialProcessing"("locationId", "operationalDate");

-- AddForeignKey
ALTER TABLE "DailyFinancialProcessing" ADD CONSTRAINT "DailyFinancialProcessing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "OrderAdjustmentSaleItem" ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderAdjustmentSaleItemDiscount" (
    "id" TEXT NOT NULL,
    "adjustmentSaleItemId" TEXT NOT NULL,
    "discountId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAdjustmentSaleItemDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAdjustmentSaleItemDiscount_adjustmentSaleItemId_idx" ON "OrderAdjustmentSaleItemDiscount"("adjustmentSaleItemId");

-- AddForeignKey
ALTER TABLE "OrderAdjustmentSaleItemDiscount" ADD CONSTRAINT "OrderAdjustmentSaleItemDiscount_adjustmentSaleItemId_fkey" FOREIGN KEY ("adjustmentSaleItemId") REFERENCES "OrderAdjustmentSaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustmentSaleItemDiscount" ADD CONSTRAINT "OrderAdjustmentSaleItemDiscount_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'EMPLOYEE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "salespersonId" TEXT;

-- AlterTable
ALTER TABLE "OrderAdjustment" ADD COLUMN     "salespersonId" TEXT;

-- CreateIndex
CREATE INDEX "Order_salespersonId_createdAt_idx" ON "Order"("salespersonId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderAdjustment_salespersonId_createdAt_idx" ON "OrderAdjustment"("salespersonId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

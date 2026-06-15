/*
  Warnings:

  - You are about to drop the column `productId` on the `SupplierProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[supplierId,variantId]` on the table `SupplierProduct` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `variantId` to the `SupplierProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SupplierProduct" DROP CONSTRAINT "SupplierProduct_productId_fkey";

-- DropIndex
DROP INDEX "SupplierProduct_supplierId_productId_key";

-- AlterTable
ALTER TABLE "SupplierProduct" DROP COLUMN "productId",
ADD COLUMN     "variantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SupplierProduct_variantId_idx" ON "SupplierProduct"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_variantId_key" ON "SupplierProduct"("supplierId", "variantId");

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

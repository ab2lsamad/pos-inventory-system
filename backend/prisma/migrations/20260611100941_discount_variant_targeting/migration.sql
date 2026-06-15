-- CreateTable
CREATE TABLE "DiscountVariant" (
    "discountId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,

    CONSTRAINT "DiscountVariant_pkey" PRIMARY KEY ("discountId","variantId")
);

-- CreateIndex
CREATE INDEX "DiscountVariant_variantId_idx" ON "DiscountVariant"("variantId");

-- AddForeignKey
ALTER TABLE "DiscountVariant" ADD CONSTRAINT "DiscountVariant_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountVariant" ADD CONSTRAINT "DiscountVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

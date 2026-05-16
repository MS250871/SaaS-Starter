/*
  Warnings:

  - A unique constraint covering the columns `[provider_invoice_id]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_price_id]` on the table `Price` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "provider_invoice_id" TEXT;

-- AlterTable
ALTER TABLE "Price" ADD COLUMN     "provider_price_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_provider_invoice_id_key" ON "Invoice"("provider_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "Price_provider_price_id_key" ON "Price"("provider_price_id");

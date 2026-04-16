/*
  Warnings:

  - You are about to drop the column `platform_role` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the `WorkspaceSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SIGNUP', 'UPGRADE', 'DOWNGRADE', 'RENEWAL', 'ONE_TIME', 'ADDON');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID', 'EXPIRED', 'TRIALING');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('USER_REQUEST', 'DUPLICATE', 'FRAUD', 'PAYMENT_ERROR', 'UPGRADE_ADJUSTMENT', 'DOWNGRADE_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD');

-- DropForeignKey
ALTER TABLE "WorkspaceSubscription" DROP CONSTRAINT "WorkspaceSubscription_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceSubscription" DROP CONSTRAINT "WorkspaceSubscription_workspace_id_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "platform_role";

-- DropTable
DROP TABLE "WorkspaceSubscription";

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan_id" UUID,
    "type" "ProductType" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "interval" "BillingInterval",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "price_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "provider" "PaymentProvider" NOT NULL,
    "provider_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "price_id" UUID,
    "subscription_id" UUID,
    "type" "PaymentType" NOT NULL DEFAULT 'ONE_TIME',
    "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "provider_order_id" TEXT,
    "provider_payment_id" TEXT,
    "provider_signature" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "metadata" JSONB,
    "captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "request_payload" JSONB,
    "response_payload" JSONB,
    "status" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "billing_address" JSONB,
    "shipping_address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID,
    "price_id" UUID,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "metadata" JSONB,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "RefundReason" DEFAULT 'USER_REQUEST',
    "notes" TEXT,
    "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "provider_refund_id" TEXT,
    "metadata" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_plan_id_idx" ON "Product"("plan_id");

-- CreateIndex
CREATE INDEX "Product_is_active_idx" ON "Product"("is_active");

-- CreateIndex
CREATE INDEX "Price_product_id_idx" ON "Price"("product_id");

-- CreateIndex
CREATE INDEX "Price_product_id_is_active_idx" ON "Price"("product_id", "is_active");

-- CreateIndex
CREATE INDEX "Subscription_workspace_id_idx" ON "Subscription"("workspace_id");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_identity_id_status_idx" ON "Subscription"("identity_id", "status");

-- CreateIndex
CREATE INDEX "Subscription_customer_id_status_idx" ON "Subscription"("customer_id", "status");

-- CreateIndex
CREATE INDEX "Subscription_price_id_idx" ON "Subscription"("price_id");

-- CreateIndex
CREATE INDEX "Payment_workspace_id_idx" ON "Payment"("workspace_id");

-- CreateIndex
CREATE INDEX "Payment_provider_payment_id_idx" ON "Payment"("provider_payment_id");

-- CreateIndex
CREATE INDEX "Payment_payment_status_created_at_idx" ON "Payment"("payment_status", "created_at");

-- CreateIndex
CREATE INDEX "Payment_identity_id_created_at_idx" ON "Payment"("identity_id", "created_at");

-- CreateIndex
CREATE INDEX "Payment_customer_id_created_at_idx" ON "Payment"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "Payment_subscription_id_idx" ON "Payment"("subscription_id");

-- CreateIndex
CREATE INDEX "PaymentAttempt_payment_id_idx" ON "PaymentAttempt"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "Invoice_workspace_id_idx" ON "Invoice"("workspace_id");

-- CreateIndex
CREATE INDEX "Invoice_identity_id_created_at_idx" ON "Invoice"("identity_id", "created_at");

-- CreateIndex
CREATE INDEX "Invoice_customer_id_created_at_idx" ON "Invoice"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoice_id_idx" ON "InvoiceItem"("invoice_id");

-- CreateIndex
CREATE INDEX "Refund_payment_id_idx" ON "Refund"("payment_id");

-- CreateIndex
CREATE INDEX "Refund_provider_refund_id_idx" ON "Refund"("provider_refund_id");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "Price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "Price"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "Price"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[provider_order_id]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_payment_id]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_id,attempt_number]` on the table `PaymentAttempt` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_refund_id]` on the table `Refund` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_subscription_id]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `target_type` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `context_type` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('IDENTITY', 'CUSTOMER', 'BOTH', 'WORKSPACE', 'PLATFORM');

-- CreateEnum
CREATE TYPE "SupportContextType" AS ENUM ('PLATFORM', 'WORKSPACE', 'CUSTOMER');

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_workspace_id_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "target_type" "NotificationTargetType" NOT NULL,
ALTER COLUMN "workspace_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "context_type" "SupportContextType" NOT NULL,
ADD COLUMN     "created_by_customer_id" UUID,
ALTER COLUMN "workspace_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportTicketMessage" ADD COLUMN     "senderCustomerId" TEXT,
ADD COLUMN     "senderIdentityId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_workspace_id_created_at_idx" ON "Invoice"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_order_id_key" ON "Payment"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_payment_id_key" ON "Payment"("provider_payment_id");

-- CreateIndex
CREATE INDEX "Payment_workspace_id_payment_status_idx" ON "Payment"("workspace_id", "payment_status");

-- CreateIndex
CREATE INDEX "Payment_identity_id_payment_status_idx" ON "Payment"("identity_id", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_payment_id_attempt_number_key" ON "PaymentAttempt"("payment_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_provider_refund_id_key" ON "Refund"("provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_provider_subscription_id_key" ON "Subscription"("provider_subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_workspace_id_status_idx" ON "Subscription"("workspace_id", "status");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_created_by_customer_id_fkey" FOREIGN KEY ("created_by_customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

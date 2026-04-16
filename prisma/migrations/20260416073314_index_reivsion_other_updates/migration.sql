/*
  Warnings:

  - You are about to drop the column `senderCustomerId` on the `SupportTicketMessage` table. All the data in the column will be lost.
  - You are about to drop the column `senderIdentityId` on the `SupportTicketMessage` table. All the data in the column will be lost.
  - You are about to drop the column `sender_id` on the `SupportTicketMessage` table. All the data in the column will be lost.
  - The primary key for the `WorkspaceRolePermission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `WorkspaceRolePermission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "SupportTicketMessage" DROP CONSTRAINT "SupportTicketMessage_workspace_id_fkey";

-- DropIndex
DROP INDEX "Identity_email_idx";

-- DropIndex
DROP INDEX "Payment_provider_payment_id_idx";

-- DropIndex
DROP INDEX "Refund_provider_refund_id_idx";

-- DropIndex
DROP INDEX "UserPermission_identity_id_workspace_id_permission_id_key";

-- DropIndex
DROP INDEX "Workspace_slug_idx";

-- AlterTable
ALTER TABLE "SupportTicketMessage" DROP COLUMN "senderCustomerId",
DROP COLUMN "senderIdentityId",
DROP COLUMN "sender_id",
ADD COLUMN     "sender_customer_id" UUID,
ADD COLUMN     "sender_identity_id" UUID,
ALTER COLUMN "workspace_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkspaceRolePermission" DROP CONSTRAINT "WorkspaceRolePermission_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "WorkspaceRolePermission_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Invoice_payment_id_idx" ON "Invoice"("payment_id");

-- CreateIndex
CREATE INDEX "Notification_workspace_id_created_at_idx" ON "Notification"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "Notification_recipient_identity_id_is_read_created_at_idx" ON "Notification"("recipient_identity_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "Notification_recipient_customer_id_is_read_created_at_idx" ON "Notification"("recipient_customer_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "Notification_workspace_id_is_read_created_at_idx" ON "Notification"("workspace_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "PaymentAttempt_payment_id_created_at_idx" ON "PaymentAttempt"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "PlatformMembership_identity_id_isActive_idx" ON "PlatformMembership"("identity_id", "isActive");

-- CreateIndex
CREATE INDEX "RolePermission_permission_id_idx" ON "RolePermission"("permission_id");

-- CreateIndex
CREATE INDEX "Session_workspace_id_is_active_created_at_idx" ON "Session"("workspace_id", "is_active", "created_at");

-- CreateIndex
CREATE INDEX "SupportTicket_workspace_id_status_idx" ON "SupportTicket"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_workspace_id_created_at_idx" ON "SupportTicket"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "SupportTicket_context_type_created_at_idx" ON "SupportTicket"("context_type", "created_at");

-- CreateIndex
CREATE INDEX "SupportTicket_created_by_idx" ON "SupportTicket"("created_by");

-- CreateIndex
CREATE INDEX "SupportTicket_created_by_customer_id_idx" ON "SupportTicket"("created_by_customer_id");

-- CreateIndex
CREATE INDEX "SupportTicket_assigned_to_idx" ON "SupportTicket"("assigned_to");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_workspace_id_created_at_idx" ON "SupportTicketMessage"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_sender_identity_id_created_at_idx" ON "SupportTicketMessage"("sender_identity_id", "created_at");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_sender_customer_id_created_at_idx" ON "SupportTicketMessage"("sender_customer_id", "created_at");

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_sender_identity_id_fkey" FOREIGN KEY ("sender_identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_sender_customer_id_fkey" FOREIGN KEY ("sender_customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

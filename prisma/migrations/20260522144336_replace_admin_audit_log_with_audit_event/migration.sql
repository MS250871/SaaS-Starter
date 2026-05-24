/*
  Warnings:

  - You are about to drop the `AdminAuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AuditScope" AS ENUM ('PLATFORM', 'WORKSPACE', 'CUSTOMER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('IDENTITY', 'CUSTOMER', 'API_KEY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTH', 'GOVERNANCE', 'CATALOG', 'BILLING', 'WORKSPACE', 'CUSTOMER', 'SUPPORT', 'NOTIFICATION', 'ROUTING', 'MEDIA', 'INTEGRATION', 'ENTITLEMENT', 'SECURITY', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditSource" ADD VALUE 'WORKSPACE_APP';
ALTER TYPE "AuditSource" ADD VALUE 'CUSTOMER_APP';
ALTER TYPE "AuditSource" ADD VALUE 'AUTH';
ALTER TYPE "AuditSource" ADD VALUE 'WEBHOOK';
ALTER TYPE "AuditSource" ADD VALUE 'JOB';

-- DropForeignKey
ALTER TABLE "AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_admin_identity_id_fkey";

-- DropForeignKey
ALTER TABLE "AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_workspace_id_fkey";

-- DropTable
DROP TABLE "AdminAuditLog";

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "scope" "AuditScope" NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "source" "AuditSource" NOT NULL DEFAULT 'ADMIN_PANEL',
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "description" TEXT,
    "reason" TEXT,
    "workspace_id" UUID,
    "customer_id" UUID,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_identity_id" UUID,
    "actor_customer_id" UUID,
    "actor_api_key_id" UUID,
    "session_id" UUID,
    "actor_email" TEXT,
    "actor_name" TEXT,
    "actor_platform_role" TEXT,
    "actor_workspace_role" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_path" TEXT,
    "request_method" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_created_at_idx" ON "AuditEvent"("created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_scope_created_at_idx" ON "AuditEvent"("scope", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_category_created_at_idx" ON "AuditEvent"("category", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_source_created_at_idx" ON "AuditEvent"("source", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_outcome_created_at_idx" ON "AuditEvent"("outcome", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_severity_created_at_idx" ON "AuditEvent"("severity", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_workspace_id_created_at_idx" ON "AuditEvent"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_customer_id_created_at_idx" ON "AuditEvent"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_action_created_at_idx" ON "AuditEvent"("action", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_type_entity_id_idx" ON "AuditEvent"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_identity_id_created_at_idx" ON "AuditEvent"("actor_identity_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_customer_id_created_at_idx" ON "AuditEvent"("actor_customer_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_api_key_id_created_at_idx" ON "AuditEvent"("actor_api_key_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_session_id_idx" ON "AuditEvent"("session_id");

-- CreateIndex
CREATE INDEX "AuditEvent_request_id_idx" ON "AuditEvent"("request_id");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_identity_id_fkey" FOREIGN KEY ("actor_identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_customer_id_fkey" FOREIGN KEY ("actor_customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_api_key_id_fkey" FOREIGN KEY ("actor_api_key_id") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

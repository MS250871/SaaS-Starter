-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaJobStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "job_id" TEXT,
    "processing_key" TEXT,
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cdn_url" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADING',
    "checksum" TEXT,
    "metadata" JSONB,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "workspace_id" UUID,
    "identity_id" UUID,
    "customer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaJob" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" "MediaJobStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "MediaJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_status_next_retry_at_idx" ON "WebhookEvent"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "WebhookEvent_workspace_id_idx" ON "WebhookEvent"("workspace_id");

-- CreateIndex
CREATE INDEX "WebhookEvent_identity_id_idx" ON "WebhookEvent"("identity_id");

-- CreateIndex
CREATE INDEX "WebhookEvent_customer_id_idx" ON "WebhookEvent"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_external_id_key" ON "WebhookEvent"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_processing_key_key" ON "OutboxEvent"("processing_key");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_next_retry_at_idx" ON "OutboxEvent"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_scheduled_at_idx" ON "OutboxEvent"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_locked_at_idx" ON "OutboxEvent"("status", "locked_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_scheduled_at_idx" ON "OutboxEvent"("scheduled_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_locked_at_idx" ON "OutboxEvent"("locked_at");

-- CreateIndex
CREATE INDEX "Media_workspace_id_idx" ON "Media"("workspace_id");

-- CreateIndex
CREATE INDEX "Media_identity_id_idx" ON "Media"("identity_id");

-- CreateIndex
CREATE INDEX "Media_customer_id_idx" ON "Media"("customer_id");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storage_key_key" ON "Media"("storage_key");

-- CreateIndex
CREATE INDEX "FileAttachment_entityType_entityId_idx" ON "FileAttachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FileAttachment_media_id_idx" ON "FileAttachment"("media_id");

-- CreateIndex
CREATE INDEX "FileAttachment_workspace_id_idx" ON "FileAttachment"("workspace_id");

-- CreateIndex
CREATE INDEX "MediaJob_media_id_idx" ON "MediaJob"("media_id");

-- CreateIndex
CREATE INDEX "MediaJob_status_idx" ON "MediaJob"("status");

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaJob" ADD CONSTRAINT "MediaJob_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

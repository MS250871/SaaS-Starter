/*
  Warnings:

  - You are about to drop the column `planId` on the `WorkspaceSubscription` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('PLAN', 'MANUAL', 'SYSTEM');

-- AlterTable
ALTER TABLE "WorkspaceSubscription" DROP COLUMN "planId",
ADD COLUMN     "plan_id" UUID,
ADD COLUMN     "provider_plan_id" TEXT,
ADD COLUMN     "provider_price_id" TEXT,
ALTER COLUMN "provider_subscription_id" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimitDefinition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimitDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanLimit" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "limit_definition_id" UUID NOT NULL,
    "value_int" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceFeatureOverride" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "source" "EntitlementSource" NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceFeatureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceLimitOverride" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "limit_definition_id" UUID NOT NULL,
    "value_int" INTEGER NOT NULL,
    "source" "EntitlementSource" NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceLimitOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE INDEX "Plan_is_active_idx" ON "Plan"("is_active");

-- CreateIndex
CREATE INDEX "Plan_sort_order_idx" ON "Plan"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE INDEX "Feature_category_is_active_idx" ON "Feature"("category", "is_active");

-- CreateIndex
CREATE INDEX "Feature_sort_order_idx" ON "Feature"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "LimitDefinition_key_key" ON "LimitDefinition"("key");

-- CreateIndex
CREATE INDEX "LimitDefinition_is_active_idx" ON "LimitDefinition"("is_active");

-- CreateIndex
CREATE INDEX "LimitDefinition_unit_idx" ON "LimitDefinition"("unit");

-- CreateIndex
CREATE INDEX "LimitDefinition_sort_order_idx" ON "LimitDefinition"("sort_order");

-- CreateIndex
CREATE INDEX "PlanFeature_feature_id_idx" ON "PlanFeature"("feature_id");

-- CreateIndex
CREATE INDEX "PlanFeature_plan_id_is_enabled_idx" ON "PlanFeature"("plan_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_plan_id_feature_id_key" ON "PlanFeature"("plan_id", "feature_id");

-- CreateIndex
CREATE INDEX "PlanLimit_limit_definition_id_idx" ON "PlanLimit"("limit_definition_id");

-- CreateIndex
CREATE INDEX "PlanLimit_plan_id_idx" ON "PlanLimit"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimit_plan_id_limit_definition_id_key" ON "PlanLimit"("plan_id", "limit_definition_id");

-- CreateIndex
CREATE INDEX "WorkspaceFeatureOverride_workspace_id_idx" ON "WorkspaceFeatureOverride"("workspace_id");

-- CreateIndex
CREATE INDEX "WorkspaceFeatureOverride_feature_id_idx" ON "WorkspaceFeatureOverride"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceFeatureOverride_workspace_id_feature_id_key" ON "WorkspaceFeatureOverride"("workspace_id", "feature_id");

-- CreateIndex
CREATE INDEX "WorkspaceLimitOverride_workspace_id_idx" ON "WorkspaceLimitOverride"("workspace_id");

-- CreateIndex
CREATE INDEX "WorkspaceLimitOverride_limit_definition_id_idx" ON "WorkspaceLimitOverride"("limit_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLimitOverride_workspace_id_limit_definition_id_key" ON "WorkspaceLimitOverride"("workspace_id", "limit_definition_id");

-- AddForeignKey
ALTER TABLE "WorkspaceSubscription" ADD CONSTRAINT "WorkspaceSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLimit" ADD CONSTRAINT "PlanLimit_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLimit" ADD CONSTRAINT "PlanLimit_limit_definition_id_fkey" FOREIGN KEY ("limit_definition_id") REFERENCES "LimitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFeatureOverride" ADD CONSTRAINT "WorkspaceFeatureOverride_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFeatureOverride" ADD CONSTRAINT "WorkspaceFeatureOverride_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLimitOverride" ADD CONSTRAINT "WorkspaceLimitOverride_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLimitOverride" ADD CONSTRAINT "WorkspaceLimitOverride_limit_definition_id_fkey" FOREIGN KEY ("limit_definition_id") REFERENCES "LimitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

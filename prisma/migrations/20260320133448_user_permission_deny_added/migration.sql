-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- AlterTable
ALTER TABLE "UserPermission" ADD COLUMN     "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW';

-- CreateIndex
CREATE INDEX "UserPermission_identity_id_workspace_id_effect_idx" ON "UserPermission"("identity_id", "workspace_id", "effect");

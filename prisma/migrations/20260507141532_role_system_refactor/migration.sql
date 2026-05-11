/*
  Warnings:

  - You are about to drop the column `role` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `PlatformInvite` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `PlatformMembership` table. All the data in the column will be lost.
  - You are about to drop the column `platform_role` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `workspace_role` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `workspace_role` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `WorkspaceInvite` table. All the data in the column will be lost.
  - You are about to drop the column `workspace_role` on the `WorkspaceRolePermission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[identity_id,role_definition_id]` on the table `PlatformMembership` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role_definition_id,permission_id]` on the table `RolePermission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workspace_id,role_definition_id,permission_id]` on the table `WorkspaceRolePermission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role_definition_id` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_key` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_definition_id` to the `PlatformInvite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_key` to the `PlatformInvite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_definition_id` to the `PlatformMembership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_key` to the `PlatformMembership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_definition_id` to the `RolePermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_definition_id` to the `WorkspaceInvite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_key` to the `WorkspaceInvite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_definition_id` to the `WorkspaceRolePermission` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('WORKSPACE', 'PLATFORM');

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" UUID NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "system_key" TEXT,
    "hierarchy_rank" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_assignable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- Drop objects that still depend on enum-era role columns/functions.
DROP POLICY IF EXISTS platformmembership_insert ON "PlatformMembership";
DROP INDEX IF EXISTS one_owner_per_workspace;

ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS session_role_snapshot_check;
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS role_permission_xor_check;

-- DropIndex
DROP INDEX "Membership_workspace_id_role_idx";

-- DropIndex
DROP INDEX "PlatformMembership_identity_id_role_key";

-- DropIndex
DROP INDEX "RolePermission_platform_role_idx";

-- DropIndex
DROP INDEX "RolePermission_platform_role_permission_id_key";

-- DropIndex
DROP INDEX "RolePermission_workspace_role_idx";

-- DropIndex
DROP INDEX "RolePermission_workspace_role_permission_id_key";

-- DropIndex
DROP INDEX "WorkspaceRolePermission_workspace_id_workspace_role_idx";

-- DropIndex
DROP INDEX "WorkspaceRolePermission_workspace_id_workspace_role_permiss_key";

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "role_definition_id" UUID NOT NULL,
ADD COLUMN     "role_key" TEXT NOT NULL,
ADD COLUMN     "role_system_key" TEXT;

-- AlterTable
ALTER TABLE "PlatformInvite" ADD COLUMN     "role_definition_id" UUID NOT NULL,
ADD COLUMN     "role_key" TEXT NOT NULL,
ADD COLUMN     "role_system_key" TEXT;

-- AlterTable
ALTER TABLE "PlatformMembership" ADD COLUMN     "role_definition_id" UUID NOT NULL,
ADD COLUMN     "role_key" TEXT NOT NULL,
ADD COLUMN     "role_system_key" TEXT;

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "role_definition_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "workspace_role_definition_id" UUID,
ADD COLUMN     "workspace_role_key" TEXT,
ADD COLUMN     "workspace_role_system_key" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceInvite" ADD COLUMN     "role_definition_id" UUID NOT NULL,
ADD COLUMN     "role_key" TEXT NOT NULL,
ADD COLUMN     "role_system_key" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceRolePermission" ADD COLUMN     "role_definition_id" UUID NOT NULL;

CREATE OR REPLACE FUNCTION app.can_manage_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR EXISTS (
        SELECT 1
        FROM "Membership" m
        WHERE m.workspace_id = p_workspace_id
          AND m.identity_id = app.current_identity_id()
          AND m.is_active = true
          AND m.role_system_key IN ('WORKSPACE_OWNER', 'WORKSPACE_ADMIN')
      );
$$;

CREATE POLICY platformmembership_insert
ON "PlatformMembership"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (
    identity_id = app.current_identity_id()
    AND EXISTS (
      SELECT 1
      FROM "PlatformInvite" pi
      JOIN "Identity" i
        ON i.id = app.current_identity_id()
      WHERE pi.email = i.email
        AND pi.role_definition_id = "PlatformMembership".role_definition_id
        AND pi.status = 'PENDING'
    )
  )
);

-- Old columns can be dropped after the replacement policy/function exists.
ALTER TABLE "Membership" DROP COLUMN "role";
ALTER TABLE "PlatformInvite" DROP COLUMN "role";
ALTER TABLE "PlatformMembership" DROP COLUMN "role";
ALTER TABLE "RolePermission" DROP COLUMN "platform_role", DROP COLUMN "workspace_role";
ALTER TABLE "Session" DROP COLUMN "workspace_role";
ALTER TABLE "WorkspaceInvite" DROP COLUMN "role";
ALTER TABLE "WorkspaceRolePermission" DROP COLUMN "workspace_role";

-- DropEnum
DROP TYPE "PlatformRole";

-- DropEnum
DROP TYPE "WorkspaceRole";

-- CreateIndex
CREATE INDEX "RoleDefinition_scope_is_active_idx" ON "RoleDefinition"("scope", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_scope_key_key" ON "RoleDefinition"("scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_scope_system_key_key" ON "RoleDefinition"("scope", "system_key");

-- CreateIndex
CREATE INDEX "Membership_workspace_id_role_definition_id_idx" ON "Membership"("workspace_id", "role_definition_id");

-- CreateIndex
CREATE INDEX "Membership_workspace_id_role_system_key_idx" ON "Membership"("workspace_id", "role_system_key");

-- CreateIndex
CREATE INDEX "PlatformInvite_role_definition_id_idx" ON "PlatformInvite"("role_definition_id");

-- CreateIndex
CREATE INDEX "PlatformMembership_identity_id_role_system_key_idx" ON "PlatformMembership"("identity_id", "role_system_key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMembership_identity_id_role_definition_id_key" ON "PlatformMembership"("identity_id", "role_definition_id");

-- CreateIndex
CREATE INDEX "RolePermission_role_definition_id_idx" ON "RolePermission"("role_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_definition_id_permission_id_key" ON "RolePermission"("role_definition_id", "permission_id");

-- CreateIndex
CREATE INDEX "Session_workspace_role_definition_id_idx" ON "Session"("workspace_role_definition_id");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspace_id_role_definition_id_idx" ON "WorkspaceInvite"("workspace_id", "role_definition_id");

-- CreateIndex
CREATE INDEX "WorkspaceRolePermission_workspace_id_role_definition_id_idx" ON "WorkspaceRolePermission"("workspace_id", "role_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRolePermission_workspace_id_role_definition_id_per_key" ON "WorkspaceRolePermission"("workspace_id", "role_definition_id", "permission_id");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workspace_role_definition_id_fkey" FOREIGN KEY ("workspace_role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvite" ADD CONSTRAINT "PlatformInvite_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformMembership" ADD CONSTRAINT "PlatformMembership_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRolePermission" ADD CONSTRAINT "WorkspaceRolePermission_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

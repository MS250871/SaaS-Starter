/*
  Warnings:

  - The values [BILLING,SUPPORT,NONE] on the enum `PlatformRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [MEMBER,GUEST] on the enum `WorkspaceRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlatformRole_new" AS ENUM ('PLATFORM_ADMIN', 'BILLING_AGENT', 'SUPPORT_AGENT', 'PLATFORM_STAFF');
ALTER TABLE "Session" ALTER COLUMN "platform_role" TYPE "PlatformRole_new" USING ("platform_role"::text::"PlatformRole_new");
ALTER TABLE "RolePermission" ALTER COLUMN "platform_role" TYPE "PlatformRole_new" USING ("platform_role"::text::"PlatformRole_new");
ALTER TYPE "PlatformRole" RENAME TO "PlatformRole_old";
ALTER TYPE "PlatformRole_new" RENAME TO "PlatformRole";
DROP TYPE "public"."PlatformRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WorkspaceRole_new" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'VIEWER');
ALTER TABLE "public"."Membership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."WorkspaceInvite" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING ("role"::text::"WorkspaceRole_new");
ALTER TABLE "WorkspaceInvite" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING ("role"::text::"WorkspaceRole_new");
ALTER TABLE "Session" ALTER COLUMN "workspace_role" TYPE "WorkspaceRole_new" USING ("workspace_role"::text::"WorkspaceRole_new");
ALTER TABLE "RolePermission" ALTER COLUMN "workspace_role" TYPE "WorkspaceRole_new" USING ("workspace_role"::text::"WorkspaceRole_new");
ALTER TABLE "WorkspaceRolePermission" ALTER COLUMN "workspace_role" TYPE "WorkspaceRole_new" USING ("workspace_role"::text::"WorkspaceRole_new");
ALTER TYPE "WorkspaceRole" RENAME TO "WorkspaceRole_old";
ALTER TYPE "WorkspaceRole_new" RENAME TO "WorkspaceRole";
DROP TYPE "public"."WorkspaceRole_old";
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'STAFF';
ALTER TABLE "WorkspaceInvite" ALTER COLUMN "role" SET DEFAULT 'STAFF';
COMMIT;

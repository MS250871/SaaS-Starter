/*
  Warnings:

  - The `status` column on the `WorkspaceInvite` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "WorkspaceInvite" DROP COLUMN "status",
ADD COLUMN     "status" "InviteStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PlatformInvite" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "invited_by" UUID,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformMembership" (
    "id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvite_token_key" ON "PlatformInvite"("token");

-- CreateIndex
CREATE INDEX "PlatformInvite_email_status_idx" ON "PlatformInvite"("email", "status");

-- CreateIndex
CREATE INDEX "PlatformInvite_token_idx" ON "PlatformInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMembership_identity_id_role_key" ON "PlatformMembership"("identity_id", "role");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspace_id_status_idx" ON "WorkspaceInvite"("workspace_id", "status");

-- AddForeignKey
ALTER TABLE "PlatformInvite" ADD CONSTRAINT "PlatformInvite_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformMembership" ADD CONSTRAINT "PlatformMembership_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

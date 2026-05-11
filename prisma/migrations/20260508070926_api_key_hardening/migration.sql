/*
  Warnings:

  - A unique constraint covering the columns `[key_hash]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "key_hash" TEXT,
ADD COLUMN     "key_prefix" TEXT,
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'API Key',
ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "key" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_hash_key" ON "ApiKey"("key_hash");

-- CreateIndex
CREATE INDEX "ApiKey_workspace_id_created_at_idx" ON "ApiKey"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "ApiKey_workspace_id_last_used_at_idx" ON "ApiKey"("workspace_id", "last_used_at");

-- CreateIndex
CREATE INDEX "ApiKey_created_by_idx" ON "ApiKey"("created_by");

-- CreateIndex
CREATE INDEX "ApiKey_key_prefix_idx" ON "ApiKey"("key_prefix");

-- RenameIndex
ALTER INDEX "WorkspaceDomainDnsRecord_workspace_domain_id_type_host_expected" RENAME TO "WorkspaceDomainDnsRecord_workspace_domain_id_type_host_expe_key";

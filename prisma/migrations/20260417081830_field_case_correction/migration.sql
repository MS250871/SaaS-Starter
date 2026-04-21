/*
  Warnings:

  - You are about to drop the column `entityId` on the `FileAttachment` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `FileAttachment` table. All the data in the column will be lost.
  - Added the required column `entity_id` to the `FileAttachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_type` to the `FileAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FileAttachment_entityType_entityId_idx";

-- AlterTable
ALTER TABLE "FileAttachment" DROP COLUMN "entityId",
DROP COLUMN "entityType",
ADD COLUMN     "entity_id" TEXT NOT NULL,
ADD COLUMN     "entity_type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FileAttachment_entity_type_entity_id_idx" ON "FileAttachment"("entity_type", "entity_id");

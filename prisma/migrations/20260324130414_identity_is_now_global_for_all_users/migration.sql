/*
  Warnings:

  - You are about to drop the column `customer_id` on the `AuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `customer_id` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `customer_id` on the `Session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workspace_id,identity_id]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Made the column `identity_id` on table `AuthAccount` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `identity_id` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Made the column `identity_id` on table `OAuthAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `identity_id` on table `Session` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AuthAccount" DROP CONSTRAINT "AuthAccount_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "AuthAccount" DROP CONSTRAINT "AuthAccount_identity_id_fkey";

-- DropForeignKey
ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_identity_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_identity_id_fkey";

-- DropIndex
DROP INDEX "AuthAccount_customer_id_idx";

-- DropIndex
DROP INDEX "Customer_email_workspace_id_key";

-- DropIndex
DROP INDEX "Customer_phone_workspace_id_key";

-- DropIndex
DROP INDEX "Customer_workspace_id_email_idx";

-- DropIndex
DROP INDEX "OAuthAccount_customer_id_idx";

-- AlterTable
ALTER TABLE "AuthAccount" DROP COLUMN "customer_id",
ALTER COLUMN "identity_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "identity_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "OAuthAccount" DROP COLUMN "customer_id",
ALTER COLUMN "identity_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "customer_id",
ALTER COLUMN "identity_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AuthAccount_identity_id_type_idx" ON "AuthAccount"("identity_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_workspace_id_identity_id_key" ON "Customer"("workspace_id", "identity_id");

-- CreateIndex
CREATE INDEX "Session_workspace_id_idx" ON "Session"("workspace_id");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

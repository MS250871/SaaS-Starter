/*
  Warnings:

  - A unique constraint covering the columns `[verification_id]` on the table `OtpRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `verification_id` to the `OtpRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OtpRequest" DROP COLUMN "verification_id",
ADD COLUMN     "verification_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OtpRequest_verification_id_key" ON "OtpRequest"("verification_id");

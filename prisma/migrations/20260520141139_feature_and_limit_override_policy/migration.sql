-- CreateEnum
CREATE TYPE "EntitlementOverridePolicy" AS ENUM ('NEVER', 'PLATFORM_ONLY');

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "override_policy" "EntitlementOverridePolicy" NOT NULL DEFAULT 'PLATFORM_ONLY';

-- AlterTable
ALTER TABLE "LimitDefinition" ADD COLUMN     "override_policy" "EntitlementOverridePolicy" NOT NULL DEFAULT 'PLATFORM_ONLY';

CREATE TYPE "WorkspaceDomainType" AS ENUM ('SUBDOMAIN', 'CUSTOM');
CREATE TYPE "WorkspaceDomainStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'DISABLED');
CREATE TYPE "WorkspaceDomainRoutingMode" AS ENUM ('CNAME', 'APEX_A');
CREATE TYPE "DnsRecordType" AS ENUM ('A', 'AAAA', 'CNAME', 'TXT', 'CAA', 'MX');
CREATE TYPE "DomainVerificationPurpose" AS ENUM ('OWNERSHIP', 'ROUTING');

ALTER TABLE "WorkspaceDomain"
ADD COLUMN "type" "WorkspaceDomainType" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN "routing_mode" "WorkspaceDomainRoutingMode" NOT NULL DEFAULT 'CNAME',
ADD COLUMN "status" "WorkspaceDomainStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
ADD COLUMN "target" TEXT,
ADD COLUMN "verification_token" TEXT,
ADD COLUMN "verified_at" TIMESTAMP(3),
ADD COLUMN "last_checked_at" TIMESTAMP(3),
ADD COLUMN "last_verification_error" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "WorkspaceDomain"
SET "status" = CASE
  WHEN "is_verified" = true THEN 'VERIFIED'::"WorkspaceDomainStatus"
  ELSE 'PENDING_VERIFICATION'::"WorkspaceDomainStatus"
END,
"verified_at" = CASE
  WHEN "is_verified" = true THEN "created_at"
  ELSE NULL
END;

CREATE TABLE "WorkspaceDomainDnsRecord" (
  "id" UUID NOT NULL,
  "workspace_domain_id" UUID NOT NULL,
  "type" "DnsRecordType" NOT NULL,
  "purpose" "DomainVerificationPurpose" NOT NULL,
  "host" TEXT NOT NULL,
  "expected_value" TEXT NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "is_matched" BOOLEAN NOT NULL DEFAULT false,
  "matched_value" TEXT,
  "last_checked_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkspaceDomainDnsRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceDomain_verification_token_key"
ON "WorkspaceDomain"("verification_token");

CREATE INDEX "WorkspaceDomain_workspace_id_status_idx"
ON "WorkspaceDomain"("workspace_id", "status");

CREATE UNIQUE INDEX "WorkspaceDomainDnsRecord_workspace_domain_id_type_host_expected_value_key"
ON "WorkspaceDomainDnsRecord"("workspace_domain_id", "type", "host", "expected_value");

CREATE INDEX "WorkspaceDomainDnsRecord_workspace_domain_id_purpose_idx"
ON "WorkspaceDomainDnsRecord"("workspace_domain_id", "purpose");

ALTER TABLE "WorkspaceDomainDnsRecord"
ADD CONSTRAINT "WorkspaceDomainDnsRecord_workspace_domain_id_fkey"
FOREIGN KEY ("workspace_domain_id")
REFERENCES "WorkspaceDomain"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "WorkspaceDomain" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "WorkspaceDomainDnsRecord" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "WorkspaceDomainDnsRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceDomainDnsRecord" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspacedomaindnsrecord_select ON "WorkspaceDomainDnsRecord";
CREATE POLICY workspacedomaindnsrecord_select
ON "WorkspaceDomainDnsRecord"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "WorkspaceDomain" d
    WHERE d.id = workspace_domain_id
      AND app.can_view_workspace(d.workspace_id)
  )
);

DROP POLICY IF EXISTS workspacedomaindnsrecord_insert ON "WorkspaceDomainDnsRecord";
CREATE POLICY workspacedomaindnsrecord_insert
ON "WorkspaceDomainDnsRecord"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "WorkspaceDomain" d
    WHERE d.id = workspace_domain_id
      AND app.can_manage_workspace(d.workspace_id)
  )
);

DROP POLICY IF EXISTS workspacedomaindnsrecord_update ON "WorkspaceDomainDnsRecord";
CREATE POLICY workspacedomaindnsrecord_update
ON "WorkspaceDomainDnsRecord"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "WorkspaceDomain" d
    WHERE d.id = workspace_domain_id
      AND app.can_manage_workspace(d.workspace_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "WorkspaceDomain" d
    WHERE d.id = workspace_domain_id
      AND app.can_manage_workspace(d.workspace_id)
  )
);

DROP POLICY IF EXISTS workspacedomaindnsrecord_delete ON "WorkspaceDomainDnsRecord";
CREATE POLICY workspacedomaindnsrecord_delete
ON "WorkspaceDomainDnsRecord"
FOR DELETE
USING (
  app.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM "WorkspaceDomain" d
    WHERE d.id = workspace_domain_id
      AND app.can_manage_workspace(d.workspace_id)
  )
);

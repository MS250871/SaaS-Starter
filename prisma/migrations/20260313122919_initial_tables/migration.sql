-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'GUEST');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'BILLING', 'SUPPORT', 'NONE');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'SIGNUP', 'INVITE', 'PASSWORD_RESET', 'MFA');

-- CreateEnum
CREATE TYPE "SessionEndReason" AS ENUM ('LOGOUT', 'EXPIRED', 'REVOKED', 'REPLACED');

-- CreateEnum
CREATE TYPE "PermissionSource" AS ENUM ('manual', 'inherited', 'system');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('admin_panel', 'api', 'system');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('info', 'warning', 'error');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_say');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "default_domain" TEXT,
    "primary_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceDomain" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSubscription" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subscription_id" UUID,
    "planId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "invited_by" UUID,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "themes" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" TEXT,
    "phone" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "identity_id" UUID,
    "customer_id" UUID,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" UUID NOT NULL,
    "identity_id" UUID,
    "customer_id" UUID,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "external_id" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "scopes" TEXT[],
    "created_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" UUID NOT NULL,
    "auth_account_id" UUID NOT NULL,
    "workspace_id" UUID,
    "verification_id" TEXT,
    "otp_purpose" "OtpPurpose" NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "resend_count" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "identity_id" UUID,
    "customer_id" UUID,
    "workspace_id" UUID,
    "membership_id" UUID,
    "platform_role" "PlatformRole" NOT NULL DEFAULT 'NONE',
    "workspace_role" "WorkspaceRole",
    "ip" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "device_id" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "ended_reason" "SessionEndReason",
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "entity" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "workspace_id" UUID,
    "permission_id" UUID NOT NULL,
    "granted_by" UUID,
    "revoked_by" UUID,
    "source" "PermissionSource" NOT NULL DEFAULT 'manual',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "admin_identity_id" UUID NOT NULL,
    "workspace_id" UUID,
    "admin_email" TEXT,
    "admin_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "description" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "source" "AuditSource" NOT NULL DEFAULT 'admin_panel',
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by" UUID,
    "assigned_to" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "recipient_identity_id" UUID,
    "recipient_customer_id" UUID,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_is_active_idx" ON "Workspace"("is_active");

-- CreateIndex
CREATE INDEX "Workspace_created_at_idx" ON "Workspace"("created_at");

-- CreateIndex
CREATE INDEX "Workspace_primary_email_idx" ON "Workspace"("primary_email");

-- CreateIndex
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceDomain_workspace_id_is_primary_idx" ON "WorkspaceDomain"("workspace_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceDomain_domain_key" ON "WorkspaceDomain"("domain");

-- CreateIndex
CREATE INDEX "Membership_identity_id_idx" ON "Membership"("identity_id");

-- CreateIndex
CREATE INDEX "Membership_workspace_id_role_idx" ON "Membership"("workspace_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_workspace_id_identity_id_key" ON "Membership"("workspace_id", "identity_id");

-- CreateIndex
CREATE INDEX "WorkspaceSubscription_workspace_id_status_idx" ON "WorkspaceSubscription"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSubscription_provider_provider_subscription_id_key" ON "WorkspaceSubscription"("provider", "provider_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspace_id_status_idx" ON "WorkspaceInvite"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_token_workspace_id_idx" ON "WorkspaceInvite"("token", "workspace_id");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_workspace_id_idx" ON "WorkspaceInvite"("email", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspace_id_key" ON "WorkspaceSettings"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_email_key" ON "Identity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_phone_key" ON "Identity"("phone");

-- CreateIndex
CREATE INDEX "Identity_email_idx" ON "Identity"("email");

-- CreateIndex
CREATE INDEX "AuthAccount_identity_id_idx" ON "AuthAccount"("identity_id");

-- CreateIndex
CREATE INDEX "AuthAccount_customer_id_idx" ON "AuthAccount"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_type_value_key" ON "AuthAccount"("type", "value");

-- CreateIndex
CREATE INDEX "OAuthAccount_identity_id_idx" ON "OAuthAccount"("identity_id");

-- CreateIndex
CREATE INDEX "OAuthAccount_customer_id_idx" ON "OAuthAccount"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_provider_account_id_key" ON "OAuthAccount"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "Customer_workspace_id_email_idx" ON "Customer"("workspace_id", "email");

-- CreateIndex
CREATE INDEX "Customer_workspace_id_idx" ON "Customer"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_workspace_id_key" ON "Customer"("email", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_workspace_id_is_active_idx" ON "ApiKey"("workspace_id", "is_active");

-- CreateIndex
CREATE INDEX "OtpRequest_auth_account_id_otp_purpose_created_at_idx" ON "OtpRequest"("auth_account_id", "otp_purpose", "created_at");

-- CreateIndex
CREATE INDEX "OtpRequest_expires_at_idx" ON "OtpRequest"("expires_at");

-- CreateIndex
CREATE INDEX "Session_identity_id_is_active_created_at_idx" ON "Session"("identity_id", "is_active", "created_at");

-- CreateIndex
CREATE INDEX "Session_is_active_expires_at_idx" ON "Session"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "Session_device_id_idx" ON "Session"("device_id");

-- CreateIndex
CREATE INDEX "Session_membership_id_idx" ON "Session"("membership_id");

-- CreateIndex
CREATE INDEX "Permission_entity_is_active_idx" ON "Permission"("entity", "is_active");

-- CreateIndex
CREATE INDEX "Permission_workspace_id_idx" ON "Permission"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_workspace_id_key_key" ON "Permission"("workspace_id", "key");

-- CreateIndex
CREATE INDEX "UserPermission_permission_id_idx" ON "UserPermission"("permission_id");

-- CreateIndex
CREATE INDEX "UserPermission_identity_id_workspace_id_idx" ON "UserPermission"("identity_id", "workspace_id");

-- CreateIndex
CREATE INDEX "UserPermission_expires_at_idx" ON "UserPermission"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_identity_id_workspace_id_permission_id_key" ON "UserPermission"("identity_id", "workspace_id", "permission_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_admin_identity_id_idx" ON "AdminAuditLog"("admin_identity_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entity_type_entity_id_idx" ON "AdminAuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_workspace_id_created_at_idx" ON "AdminAuditLog"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_created_at_idx" ON "AdminAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_severity_idx" ON "AdminAuditLog"("severity");

-- AddForeignKey
ALTER TABLE "WorkspaceDomain" ADD CONSTRAINT "WorkspaceDomain_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSubscription" ADD CONSTRAINT "WorkspaceSubscription_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpRequest" ADD CONSTRAINT "OtpRequest_auth_account_id_fkey" FOREIGN KEY ("auth_account_id") REFERENCES "AuthAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpRequest" ADD CONSTRAINT "OtpRequest_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_admin_identity_id_fkey" FOREIGN KEY ("admin_identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_identity_id_fkey" FOREIGN KEY ("recipient_identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_customer_id_fkey" FOREIGN KEY ("recipient_customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

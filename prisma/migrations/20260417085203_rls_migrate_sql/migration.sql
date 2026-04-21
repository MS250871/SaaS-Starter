-- ============================================================
-- RLS MIGRATION (Neon/PostgreSQL + Prisma raw SQL)
-- Assumes app.* variables are already set via SET LOCAL in a transaction.
-- Global/reference tables intentionally left without RLS:
-- Permission, RolePermission, PlatformInvite, PlatformMembership,
-- Plan, Feature, LimitDefinition, PlanFeature, PlanLimit, Product, Price
-- WebhookEvent, OutboxEvent, AdminAuditLog, Media, FileAttachment, MediaJob
-- ============================================================

/* =========================================================
   SCHEMA + RLS HELPERS
========================================================= */
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_identity_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.identity_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.customer_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.workspace_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_membership_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.membership_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_platform_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.platform_role', true), '');
$$;

CREATE OR REPLACE FUNCTION app.current_actor_type()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.actor_type', true), '');
$$;

CREATE OR REPLACE FUNCTION app.is_system_actor()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(app.current_actor_type(), '') = 'system';
$$;

CREATE OR REPLACE FUNCTION app.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('app.is_platform_admin', true), '') = 'true'
      OR coalesce(app.current_platform_role(), '') = 'PLATFORM_ADMIN';
$$;

CREATE OR REPLACE FUNCTION app.is_platform_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(app.current_platform_role(), '') IN
    ('PLATFORM_ADMIN', 'BILLING_AGENT', 'SUPPORT_AGENT', 'PLATFORM_STAFF')
     OR app.is_platform_admin();
$$;

CREATE OR REPLACE FUNCTION app.is_platform_billing()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR coalesce(app.current_platform_role(), '') = 'BILLING_AGENT';
$$;

CREATE OR REPLACE FUNCTION app.is_platform_support()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR coalesce(app.current_platform_role(), '') = 'SUPPORT_AGENT';
$$;

CREATE OR REPLACE FUNCTION app.can_view_workspace(p_workspace_id uuid)
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
      );
$$;

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
          AND m.role IN ('OWNER', 'ADMIN')
      );
$$;

CREATE OR REPLACE FUNCTION app.can_view_identity(p_identity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR p_identity_id = app.current_identity_id()
      OR EXISTS (
        SELECT 1
        FROM "Membership" m
        WHERE m.identity_id = p_identity_id
          AND m.workspace_id = app.current_workspace_id()
          AND m.is_active = true
      )
      OR EXISTS (
        SELECT 1
        FROM "Customer" c
        WHERE c.identity_id = p_identity_id
          AND c.workspace_id = app.current_workspace_id()
      );
$$;

CREATE OR REPLACE FUNCTION app.can_view_customer(p_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR p_customer_id = app.current_customer_id()
      OR EXISTS (
        SELECT 1
        FROM "Customer" c
        WHERE c.id = p_customer_id
          AND c.identity_id = app.current_identity_id()
      )
      OR EXISTS (
        SELECT 1
        FROM "Customer" c
        WHERE c.id = p_customer_id
          AND app.can_view_workspace(c.workspace_id)
      );
$$;

CREATE OR REPLACE FUNCTION app.can_access_billing(
  p_workspace_id uuid,
  p_identity_id uuid,
  p_customer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR app.is_platform_billing()
      OR app.is_system_actor()
      OR (p_workspace_id IS NOT NULL AND app.can_view_workspace(p_workspace_id))
      OR (p_identity_id IS NOT NULL AND p_identity_id = app.current_identity_id())
      OR (p_customer_id IS NOT NULL AND p_customer_id = app.current_customer_id());
$$;

CREATE OR REPLACE FUNCTION app.can_access_support_ticket(
  p_workspace_id uuid,
  p_created_by_id uuid,
  p_created_by_customer_id uuid,
  p_assigned_to_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.is_platform_admin()
      OR app.is_platform_support()
      OR app.is_system_actor()
      OR (p_workspace_id IS NOT NULL AND app.can_view_workspace(p_workspace_id))
      OR p_created_by_id = app.current_identity_id()
      OR p_created_by_customer_id = app.current_customer_id()
      OR p_assigned_to_id = app.current_identity_id();
$$;

/* =========================================================
   ENABLE / FORCE RLS
========================================================= */
ALTER TABLE "Identity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Identity" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AuthAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthAccount" FORCE ROW LEVEL SECURITY;

ALTER TABLE "OAuthAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OAuthAccount" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkspaceDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceDomain" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkspaceSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceSettings" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" FORCE ROW LEVEL SECURITY;

ALTER TABLE "OtpRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpRequest" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkspaceInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceInvite" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkspaceRolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceRolePermission" FORCE ROW LEVEL SECURITY;

ALTER TABLE "UserPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPermission" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" FORCE ROW LEVEL SECURITY;

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" FORCE ROW LEVEL SECURITY;

ALTER TABLE "SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicketMessage" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkspaceFeatureOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceFeatureOverride" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkspaceLimitOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceLimitOverride" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttempt" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;

ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Refund" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" FORCE ROW LEVEL SECURITY;

ALTER TABLE "OutboxEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutboxEvent" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Media" FORCE ROW LEVEL SECURITY;

ALTER TABLE "FileAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileAttachment" FORCE ROW LEVEL SECURITY;

ALTER TABLE "MediaJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaJob" FORCE ROW LEVEL SECURITY;

/* ========================================================= */

-- IDENTITY

DROP POLICY IF EXISTS identity_select ON "Identity";
CREATE POLICY identity_select
ON "Identity"
FOR SELECT
USING (app.can_view_identity(id));

DROP POLICY IF EXISTS identity_insert ON "Identity";
CREATE POLICY identity_insert
ON "Identity"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.is_platform_admin());

DROP POLICY IF EXISTS identity_update ON "Identity";
CREATE POLICY identity_update
ON "Identity"
FOR UPDATE
USING (
  id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

-- AUTH ACCOUNT

DROP POLICY IF EXISTS authaccount_select ON "AuthAccount";
CREATE POLICY authaccount_select
ON "AuthAccount"
FOR SELECT
USING (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS authaccount_insert ON "AuthAccount";
CREATE POLICY authaccount_insert
ON "AuthAccount"
FOR INSERT
WITH CHECK (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS authaccount_update ON "AuthAccount";
CREATE POLICY authaccount_update
ON "AuthAccount"
FOR UPDATE
USING (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

-- OAUTH ACCOUNT

DROP POLICY IF EXISTS oauthaccount_select ON "OAuthAccount";
CREATE POLICY oauthaccount_select
ON "OAuthAccount"
FOR SELECT
USING (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS oauthaccount_insert ON "OAuthAccount";
CREATE POLICY oauthaccount_insert
ON "OAuthAccount"
FOR INSERT
WITH CHECK (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS oauthaccount_update ON "OAuthAccount";
CREATE POLICY oauthaccount_update
ON "OAuthAccount"
FOR UPDATE
USING (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  identity_id = app.current_identity_id()
  OR app.is_system_actor()
  OR app.is_platform_admin()
);

-- OTP REQUEST

DROP POLICY IF EXISTS otprequest_select ON "OtpRequest";
CREATE POLICY otprequest_select
ON "OtpRequest"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM "AuthAccount" a
    WHERE a.id = auth_account_id
      AND a.identity_id = app.current_identity_id()
  )
);

DROP POLICY IF EXISTS otprequest_insert ON "OtpRequest";
CREATE POLICY otprequest_insert
ON "OtpRequest"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM "AuthAccount" a
    WHERE a.id = auth_account_id
      AND a.identity_id = app.current_identity_id()
  )
);

DROP POLICY IF EXISTS otprequest_update ON "OtpRequest";
CREATE POLICY otprequest_update
ON "OtpRequest"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM "AuthAccount" a
    WHERE a.id = auth_account_id
      AND a.identity_id = app.current_identity_id()
  )
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM "AuthAccount" a
    WHERE a.id = auth_account_id
      AND a.identity_id = app.current_identity_id()
  )
);

-- OTP REQUEST DELETE (system cleanup after verification)

DROP POLICY IF EXISTS otprequest_delete ON "OtpRequest";
CREATE POLICY otprequest_delete
ON "OtpRequest"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

-- SESSION

DROP POLICY IF EXISTS session_select ON "Session";
CREATE POLICY session_select
ON "Session"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR identity_id = app.current_identity_id()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
);

DROP POLICY IF EXISTS session_insert ON "Session";
CREATE POLICY session_insert
ON "Session"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR identity_id = app.current_identity_id()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
);

DROP POLICY IF EXISTS session_update ON "Session";
CREATE POLICY session_update
ON "Session"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR identity_id = app.current_identity_id()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR identity_id = app.current_identity_id()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
);

-- SESSION DELETE (logout / revoke sessions)

DROP POLICY IF EXISTS session_delete ON "Session";
CREATE POLICY session_delete
ON "Session"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR identity_id = app.current_identity_id()
);

-- WORKSPACE

DROP POLICY IF EXISTS workspace_select ON "Workspace";
CREATE POLICY workspace_select
ON "Workspace"
FOR SELECT
USING (app.can_view_workspace(id));

DROP POLICY IF EXISTS workspace_insert ON "Workspace";
CREATE POLICY workspace_insert
ON "Workspace"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.is_platform_admin());

DROP POLICY IF EXISTS workspace_update ON "Workspace";
CREATE POLICY workspace_update
ON "Workspace"
FOR UPDATE
USING (app.can_manage_workspace(id))
WITH CHECK (app.can_manage_workspace(id));

-- WORKSPACE DOMAIN

DROP POLICY IF EXISTS workspacedomain_select ON "WorkspaceDomain";
CREATE POLICY workspacedomain_select
ON "WorkspaceDomain"
FOR SELECT
USING (app.can_view_workspace(workspace_id));

DROP POLICY IF EXISTS workspacedomain_insert ON "WorkspaceDomain";
CREATE POLICY workspacedomain_insert
ON "WorkspaceDomain"
FOR INSERT
WITH CHECK (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacedomain_update ON "WorkspaceDomain";
CREATE POLICY workspacedomain_update
ON "WorkspaceDomain"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- WORKSPACE DOMAIN DELETE (tenant config cleanup)

DROP POLICY IF EXISTS workspacedomain_delete ON "WorkspaceDomain";
CREATE POLICY workspacedomain_delete
ON "WorkspaceDomain"
FOR DELETE
USING (
  app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
);

-- WORKSPACE SETTINGS

DROP POLICY IF EXISTS workspacesettings_select ON "WorkspaceSettings";
CREATE POLICY workspacesettings_select
ON "WorkspaceSettings"
FOR SELECT
USING (app.can_view_workspace(workspace_id));

DROP POLICY IF EXISTS workspacesettings_insert ON "WorkspaceSettings";
CREATE POLICY workspacesettings_insert
ON "WorkspaceSettings"
FOR INSERT
WITH CHECK (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacesettings_update ON "WorkspaceSettings";
CREATE POLICY workspacesettings_update
ON "WorkspaceSettings"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- MEMBERSHIP

DROP POLICY IF EXISTS membership_select ON "Membership";
CREATE POLICY membership_select
ON "Membership"
FOR SELECT
USING (
  identity_id = app.current_identity_id()
  OR app.can_view_workspace(workspace_id)
);

DROP POLICY IF EXISTS membership_insert ON "Membership";
CREATE POLICY membership_insert
ON "Membership"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS membership_update ON "Membership";
CREATE POLICY membership_update
ON "Membership"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- MEMBERSHIP DELETE (remove user from workspace)

DROP POLICY IF EXISTS membership_delete ON "Membership";
CREATE POLICY membership_delete
ON "Membership"
FOR DELETE
USING (
  app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
);

-- CUSTOMER

DROP POLICY IF EXISTS customer_select ON "Customer";
CREATE POLICY customer_select
ON "Customer"
FOR SELECT
USING (
  identity_id = app.current_identity_id()
  OR id = app.current_customer_id()
  OR app.can_view_workspace(workspace_id)
);

DROP POLICY IF EXISTS customer_insert ON "Customer";
CREATE POLICY customer_insert
ON "Customer"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.can_manage_workspace(workspace_id)
  OR identity_id = app.current_identity_id()
);

DROP POLICY IF EXISTS customer_update ON "Customer";
CREATE POLICY customer_update
ON "Customer"
FOR UPDATE
USING (
  id = app.current_customer_id()
  OR identity_id = app.current_identity_id()
  OR app.can_manage_workspace(workspace_id)
)
WITH CHECK (
  id = app.current_customer_id()
  OR identity_id = app.current_identity_id()
  OR app.can_manage_workspace(workspace_id)
);

-- WORKSPACE INVITES

DROP POLICY IF EXISTS workspaceinvite_select ON "WorkspaceInvite";
CREATE POLICY workspaceinvite_select
ON "WorkspaceInvite"
FOR SELECT
USING (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspaceinvite_insert ON "WorkspaceInvite";
CREATE POLICY workspaceinvite_insert
ON "WorkspaceInvite"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspaceinvite_update ON "WorkspaceInvite";
CREATE POLICY workspaceinvite_update
ON "WorkspaceInvite"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- WORKSPACE INVITE DELETE (cancel / revoke invite)

DROP POLICY IF EXISTS workspaceinvite_delete ON "WorkspaceInvite";
CREATE POLICY workspaceinvite_delete
ON "WorkspaceInvite"
FOR DELETE
USING (
  app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
);

-- API KEYS

DROP POLICY IF EXISTS apikey_select ON "ApiKey";
CREATE POLICY apikey_select
ON "ApiKey"
FOR SELECT
USING (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS apikey_insert ON "ApiKey";
CREATE POLICY apikey_insert
ON "ApiKey"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS apikey_update ON "ApiKey";
CREATE POLICY apikey_update
ON "ApiKey"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- API KEY DELETE (revoke key)

DROP POLICY IF EXISTS apikey_delete ON "ApiKey";
CREATE POLICY apikey_delete
ON "ApiKey"
FOR DELETE
USING (
  app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
);

-- WORKSPACE ROLE PERMISSIONS

DROP POLICY IF EXISTS workspacerolepermission_select ON "WorkspaceRolePermission";
CREATE POLICY workspacerolepermission_select
ON "WorkspaceRolePermission"
FOR SELECT
USING (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacerolepermission_insert ON "WorkspaceRolePermission";
CREATE POLICY workspacerolepermission_insert
ON "WorkspaceRolePermission"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacerolepermission_update ON "WorkspaceRolePermission";
CREATE POLICY workspacerolepermission_update
ON "WorkspaceRolePermission"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));


-- USER PERMISSIONS 

DROP POLICY IF EXISTS userpermission_select ON "UserPermission";
CREATE POLICY userpermission_select
ON "UserPermission"
FOR SELECT
USING (
  identity_id = app.current_identity_id()
  OR app.can_manage_workspace(workspace_id)
);

DROP POLICY IF EXISTS userpermission_insert ON "UserPermission";
CREATE POLICY userpermission_insert
ON "UserPermission"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS userpermission_update ON "UserPermission";
CREATE POLICY userpermission_update
ON "UserPermission"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- ADMIN AUDIT LOG

DROP POLICY IF EXISTS adminauditlog_select ON "AdminAuditLog";
CREATE POLICY adminauditlog_select
ON "AdminAuditLog"
FOR SELECT
USING (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
);

DROP POLICY IF EXISTS adminauditlog_insert ON "AdminAuditLog";
CREATE POLICY adminauditlog_insert
ON "AdminAuditLog"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.is_platform_admin());

-- SUPPORT TICKETS 

DROP POLICY IF EXISTS supportticket_select ON "SupportTicket";
CREATE POLICY supportticket_select
ON "SupportTicket"
FOR SELECT
USING (
  app.can_access_support_ticket(
    workspace_id,
    created_by,
    created_by_customer_id,
    assigned_to
  )
);

DROP POLICY IF EXISTS supportticket_insert ON "SupportTicket";
CREATE POLICY supportticket_insert
ON "SupportTicket"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_support()
  OR app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
  OR created_by = app.current_identity_id()
  OR created_by_customer_id = app.current_customer_id()
);

DROP POLICY IF EXISTS supportticket_update ON "SupportTicket";
CREATE POLICY supportticket_update
ON "SupportTicket"
FOR UPDATE
USING (
  app.is_platform_support()
  OR app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
  OR created_by = app.current_identity_id()
  OR created_by_customer_id = app.current_customer_id()
  OR assigned_to = app.current_identity_id()
)
WITH CHECK (
  app.is_platform_support()
  OR app.is_platform_admin()
  OR app.can_manage_workspace(workspace_id)
  OR created_by = app.current_identity_id()
  OR created_by_customer_id = app.current_customer_id()
  OR assigned_to = app.current_identity_id()
);

-- SUPPORT TICKET MESSAGES

DROP POLICY IF EXISTS supportticketmessage_select ON "SupportTicketMessage";
CREATE POLICY supportticketmessage_select
ON "SupportTicketMessage"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "SupportTicket" t
    WHERE t.id = ticket_id
      AND app.can_access_support_ticket(
        t.workspace_id,
        t.created_by,
        t.created_by_customer_id,
        t.assigned_to
      )
  )
);

DROP POLICY IF EXISTS supportticketmessage_insert ON "SupportTicketMessage";
CREATE POLICY supportticketmessage_insert
ON "SupportTicketMessage"
FOR INSERT
WITH CHECK (
    (
  (
    sender_type = 'IDENTITY'
    AND sender_identity_id = app.current_identity_id()
    AND sender_customer_id IS NULL
  )
  OR
  (
    sender_type = 'CUSTOMER'
    AND sender_customer_id = app.current_customer_id()
    AND sender_identity_id IS NULL
  )
  OR
  (
    sender_type = 'SYSTEM'
    AND sender_identity_id IS NULL
    AND sender_customer_id IS NULL
   )
 )
AND EXISTS (
  SELECT 1
  FROM "SupportTicket" t
  WHERE t.id = ticket_id
    AND app.can_access_support_ticket(
      t.workspace_id,
      t.created_by,
      t.created_by_customer_id,
      t.assigned_to
    )
  )
);

DROP POLICY IF EXISTS supportticketmessage_update ON "SupportTicketMessage";
CREATE POLICY supportticketmessage_update
ON "SupportTicketMessage"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "SupportTicket" t
    WHERE t.id = ticket_id
      AND (
        app.is_platform_support()
        OR app.is_platform_admin()
        OR app.can_manage_workspace(t.workspace_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "SupportTicket" t
    WHERE t.id = ticket_id
      AND (
        app.is_platform_support()
        OR app.is_platform_admin()
        OR app.can_manage_workspace(t.workspace_id)
      )
  )
);

-- NOTIFICATIONS

DROP POLICY IF EXISTS notification_select ON "Notification";
CREATE POLICY notification_select
ON "Notification"
FOR SELECT
USING (
  app.is_platform_staff()
  OR recipient_identity_id = app.current_identity_id()
  OR recipient_customer_id = app.current_customer_id()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
);

DROP POLICY IF EXISTS notification_insert ON "Notification";
CREATE POLICY notification_insert
ON "Notification"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_staff()
  OR recipient_identity_id = app.current_identity_id()
  OR recipient_customer_id = app.current_customer_id()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
);

DROP POLICY IF EXISTS notification_update ON "Notification";
CREATE POLICY notification_update
ON "Notification"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_staff()
  OR recipient_identity_id = app.current_identity_id()
  OR recipient_customer_id = app.current_customer_id()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_staff()
  OR recipient_identity_id = app.current_identity_id()
  OR recipient_customer_id = app.current_customer_id()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
);

-- NOTIFICATION (optional user cleanup)

DROP POLICY IF EXISTS notification_delete ON "Notification";

CREATE POLICY notification_delete
ON "Notification"
FOR DELETE
USING (
  app.is_platform_admin()
  OR app.is_system_actor()
  OR recipient_identity_id = app.current_identity_id()
  OR recipient_customer_id = app.current_customer_id()
);

-- WORKSPACE FEATURE OVERRIDES

DROP POLICY IF EXISTS workspacefeatureoverride_select ON "WorkspaceFeatureOverride";
CREATE POLICY workspacefeatureoverride_select
ON "WorkspaceFeatureOverride"
FOR SELECT
USING (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacefeatureoverride_insert ON "WorkspaceFeatureOverride";
CREATE POLICY workspacefeatureoverride_insert
ON "WorkspaceFeatureOverride"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacefeatureoverride_update ON "WorkspaceFeatureOverride";
CREATE POLICY workspacefeatureoverride_update
ON "WorkspaceFeatureOverride"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- WORKSPACE LIMIT OVERRIDES

DROP POLICY IF EXISTS workspacelimitoverride_select ON "WorkspaceLimitOverride";
CREATE POLICY workspacelimitoverride_select
ON "WorkspaceLimitOverride"
FOR SELECT
USING (app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacelimitoverride_insert ON "WorkspaceLimitOverride";
CREATE POLICY workspacelimitoverride_insert
ON "WorkspaceLimitOverride"
FOR INSERT
WITH CHECK (app.is_system_actor() OR app.can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS workspacelimitoverride_update ON "WorkspaceLimitOverride";
CREATE POLICY workspacelimitoverride_update
ON "WorkspaceLimitOverride"
FOR UPDATE
USING (app.can_manage_workspace(workspace_id))
WITH CHECK (app.can_manage_workspace(workspace_id));

-- SUBSCRIPTIONS

DROP POLICY IF EXISTS subscription_select ON "Subscription";
CREATE POLICY subscription_select
ON "Subscription"
FOR SELECT
USING (
  app.can_access_billing(workspace_id, identity_id, customer_id)
);

DROP POLICY IF EXISTS subscription_insert ON "Subscription";
CREATE POLICY subscription_insert
ON "Subscription"
FOR INSERT
WITH CHECK (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_system_actor()
);

DROP POLICY IF EXISTS subscription_update ON "Subscription";
CREATE POLICY subscription_update
ON "Subscription"
FOR UPDATE
USING (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_platform_billing()
  OR app.is_system_actor()
)
WITH CHECK (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_platform_billing()
  OR app.is_system_actor()
);

-- PAYMENTS

DROP POLICY IF EXISTS payment_select ON "Payment";
CREATE POLICY payment_select
ON "Payment"
FOR SELECT
USING (
  app.can_access_billing(workspace_id, identity_id, customer_id)
);

DROP POLICY IF EXISTS payment_insert ON "Payment";
CREATE POLICY payment_insert
ON "Payment"
FOR INSERT
WITH CHECK (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_system_actor()
);

DROP POLICY IF EXISTS payment_update ON "Payment";
CREATE POLICY payment_update
ON "Payment"
FOR UPDATE
USING (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_platform_billing()
  OR app.is_system_actor()
)
WITH CHECK (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_platform_billing()
  OR app.is_system_actor()
);

-- PAYMENT ATTEMPTS

DROP POLICY IF EXISTS paymentattempt_select ON "PaymentAttempt";
CREATE POLICY paymentattempt_select
ON "PaymentAttempt"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
);

DROP POLICY IF EXISTS paymentattempt_insert ON "PaymentAttempt";
CREATE POLICY paymentattempt_insert
ON "PaymentAttempt"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
);

DROP POLICY IF EXISTS paymentattempt_update ON "PaymentAttempt";
CREATE POLICY paymentattempt_update
ON "PaymentAttempt"
FOR UPDATE
USING (
  app.is_system_actor()
  OR EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
)
WITH CHECK (
  app.is_system_actor()
  OR EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
);

-- INVOICES

DROP POLICY IF EXISTS invoice_select ON "Invoice";
CREATE POLICY invoice_select
ON "Invoice"
FOR SELECT
USING (
  app.can_access_billing(workspace_id, identity_id, customer_id)
);

DROP POLICY IF EXISTS invoice_insert ON "Invoice";
CREATE POLICY invoice_insert
ON "Invoice"
FOR INSERT
WITH CHECK (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_system_actor()
);

DROP POLICY IF EXISTS invoice_update ON "Invoice";
CREATE POLICY invoice_update
ON "Invoice"
FOR UPDATE
USING (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_platform_billing()
  OR app.is_system_actor()
)
WITH CHECK (
  app.can_access_billing(workspace_id, identity_id, customer_id)
  OR app.is_platform_billing()
  OR app.is_system_actor()
);

-- INVOICE ITEMS

DROP POLICY IF EXISTS invoiceitem_select ON "InvoiceItem";
CREATE POLICY invoiceitem_select
ON "InvoiceItem"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Invoice" i
    WHERE i.id = invoice_id
      AND app.can_access_billing(i.workspace_id, i.identity_id, i.customer_id)
  )
);

DROP POLICY IF EXISTS invoiceitem_insert ON "InvoiceItem";
CREATE POLICY invoiceitem_insert
ON "InvoiceItem"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR EXISTS (
    SELECT 1
    FROM "Invoice" i
    WHERE i.id = invoice_id
      AND app.can_access_billing(i.workspace_id, i.identity_id, i.customer_id)
  )
);

DROP POLICY IF EXISTS invoiceitem_update ON "InvoiceItem";
CREATE POLICY invoiceitem_update
ON "InvoiceItem"
FOR UPDATE
USING (
  app.is_system_actor()
  OR EXISTS (
    SELECT 1
    FROM "Invoice" i
    WHERE i.id = invoice_id
      AND app.can_access_billing(i.workspace_id, i.identity_id, i.customer_id)
  )
)
WITH CHECK (
  app.is_system_actor()
  OR EXISTS (
    SELECT 1
    FROM "Invoice" i
    WHERE i.id = invoice_id
      AND app.can_access_billing(i.workspace_id, i.identity_id, i.customer_id)
  )
);

-- REFUNDS

DROP POLICY IF EXISTS refund_select ON "Refund";
CREATE POLICY refund_select
ON "Refund"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
);

DROP POLICY IF EXISTS refund_insert ON "Refund";
CREATE POLICY refund_insert
ON "Refund"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_billing()
  OR EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
);

DROP POLICY IF EXISTS refund_update ON "Refund";
CREATE POLICY refund_update
ON "Refund"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_billing()
  OR EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_billing()
  OR EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p.id = payment_id
      AND app.can_access_billing(p.workspace_id, p.identity_id, p.customer_id)
  )
);

-- WEBHOOK EVENTS

DROP POLICY IF EXISTS webhooks_select ON "WebhookEvent";
CREATE POLICY webhooks_select
ON "WebhookEvent"
FOR SELECT
USING (
  app.is_platform_admin()
  OR app.is_platform_billing()
);

DROP POLICY IF EXISTS webhooks_insert ON "WebhookEvent";
CREATE POLICY webhooks_insert
ON "WebhookEvent"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
);

DROP POLICY IF EXISTS webhooks_update ON "WebhookEvent";
CREATE POLICY webhooks_update
ON "WebhookEvent"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

-- OUTBOX EVENT

DROP POLICY IF EXISTS outbox_select ON "OutboxEvent";
CREATE POLICY outbox_select
ON "OutboxEvent"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS outbox_insert ON "OutboxEvent";
CREATE POLICY outbox_insert
ON "OutboxEvent"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
);

DROP POLICY IF EXISTS outbox_update ON "OutboxEvent";
CREATE POLICY outbox_update
ON "OutboxEvent"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

-- MEDIA

DROP POLICY IF EXISTS media_select ON "Media";
CREATE POLICY media_select
ON "Media"
FOR SELECT
USING (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
  OR customer_id = app.current_customer_id()
);

DROP POLICY IF EXISTS media_insert ON "Media";
CREATE POLICY media_insert
ON "Media"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
  OR customer_id = app.current_customer_id()
);

DROP POLICY IF EXISTS media_update ON "Media";
CREATE POLICY media_update
ON "Media"
FOR UPDATE
USING (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
)
WITH CHECK (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
);

-- FILE ATTACHMENT

DROP POLICY IF EXISTS fileattachment_select ON "FileAttachment";
CREATE POLICY fileattachment_select
ON "FileAttachment"
FOR SELECT
USING (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
  OR customer_id = app.current_customer_id()
);

DROP POLICY IF EXISTS fileattachment_insert ON "FileAttachment";
CREATE POLICY fileattachment_insert
ON "FileAttachment"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
);

DROP POLICY IF EXISTS fileattachment_update ON "FileAttachment";
CREATE POLICY fileattachment_update
ON "FileAttachment"
FOR UPDATE
USING (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
)
WITH CHECK (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
);

-- DELETE allowed for cleanup

DROP POLICY IF EXISTS fileattachment_delete ON "FileAttachment";
CREATE POLICY fileattachment_delete
ON "FileAttachment"
FOR DELETE
USING (
  app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_manage_workspace(workspace_id))
);

-- MEDIA JOB

DROP POLICY IF EXISTS mediajob_select ON "MediaJob";
CREATE POLICY mediajob_select
ON "MediaJob"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM "Media" m
    WHERE m.id = media_id
      AND (
        app.can_view_workspace(m.workspace_id)
        OR m.identity_id = app.current_identity_id()
        OR m.customer_id = app.current_customer_id()
      )
  )
);

DROP POLICY IF EXISTS mediajob_insert ON "MediaJob";
CREATE POLICY mediajob_insert
ON "MediaJob"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS mediajob_update ON "MediaJob";
CREATE POLICY mediajob_update
ON "MediaJob"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);
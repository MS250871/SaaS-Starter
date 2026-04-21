-- Align queue/audit tables with global processing and row-context ownership.

-- PLATFORM INVITES / MEMBERSHIPS

ALTER TABLE "PlatformInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformInvite" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PlatformMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformMembership" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platforminvite_select ON "PlatformInvite";
CREATE POLICY platforminvite_select
ON "PlatformInvite"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (
    status = 'PENDING'
    AND app.current_identity_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "Identity" i
      WHERE i.id = app.current_identity_id()
        AND i.email = "PlatformInvite".email
    )
  )
);

DROP POLICY IF EXISTS platforminvite_insert ON "PlatformInvite";
CREATE POLICY platforminvite_insert
ON "PlatformInvite"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS platforminvite_update ON "PlatformInvite";
CREATE POLICY platforminvite_update
ON "PlatformInvite"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (
    status = 'PENDING'
    AND app.current_identity_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "Identity" i
      WHERE i.id = app.current_identity_id()
        AND i.email = "PlatformInvite".email
    )
  )
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (
    status = 'ACCEPTED'
    AND app.current_identity_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "Identity" i
      WHERE i.id = app.current_identity_id()
        AND i.email = "PlatformInvite".email
    )
  )
);

DROP POLICY IF EXISTS platforminvite_delete ON "PlatformInvite";
CREATE POLICY platforminvite_delete
ON "PlatformInvite"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS platformmembership_select ON "PlatformMembership";
CREATE POLICY platformmembership_select
ON "PlatformMembership"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR identity_id = app.current_identity_id()
);

DROP POLICY IF EXISTS platformmembership_insert ON "PlatformMembership";
CREATE POLICY platformmembership_insert
ON "PlatformMembership"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
  OR (
    identity_id = app.current_identity_id()
    AND EXISTS (
      SELECT 1
      FROM "PlatformInvite" pi
      JOIN "Identity" i
        ON i.id = app.current_identity_id()
      WHERE pi.email = i.email
        AND pi.role = "PlatformMembership".role
        AND pi.status = 'PENDING'
    )
  )
);

DROP POLICY IF EXISTS platformmembership_update ON "PlatformMembership";
CREATE POLICY platformmembership_update
ON "PlatformMembership"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS platformmembership_delete ON "PlatformMembership";
CREATE POLICY platformmembership_delete
ON "PlatformMembership"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

-- WEBHOOK EVENTS

DROP POLICY IF EXISTS webhooks_select ON "WebhookEvent";
CREATE POLICY webhooks_select
ON "WebhookEvent"
FOR SELECT
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
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
  OR app.is_platform_admin()
  OR (workspace_id IS NOT NULL AND app.can_view_workspace(workspace_id))
  OR identity_id = app.current_identity_id()
  OR customer_id = app.current_customer_id()
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

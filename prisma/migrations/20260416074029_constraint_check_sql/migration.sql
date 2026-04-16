-- This is an empty migration.

/* =========================================================
   MEMBERSHIP - ONLY ONE OWNER PER WORKSPACE
========================================================= */
DROP INDEX IF EXISTS one_owner_per_workspace;

CREATE UNIQUE INDEX IF NOT EXISTS one_owner_per_workspace
ON "Membership" ("workspace_id")
WHERE role = 'OWNER';

/* =========================================================
    SESSION ROLE & MEMBERSHIP CONSISTENCY
========================================================= */
ALTER TABLE "Session"
DROP CONSTRAINT IF EXISTS session_role_snapshot_check;

ALTER TABLE "Session"
ADD CONSTRAINT session_role_snapshot_check
CHECK (
  (membership_id IS NULL AND workspace_role IS NULL)
  OR
  (membership_id IS NOT NULL AND workspace_role IS NOT NULL)
);

/* =========================================================
   SESSION CONTEXT CONSISTENCY (STRICT)
========================================================= */
ALTER TABLE "Session"
DROP CONSTRAINT IF EXISTS session_context_check;

ALTER TABLE "Session"
ADD CONSTRAINT session_context_check
CHECK (
  (
    -- B2C: identity-only session
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND membership_id IS NULL
  )
  OR
  (
    -- B2B / B2B2C: workspace session
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND membership_id IS NOT NULL
  )
);

/* =========================================================
   ONE PRIMARY DOMAIN PER WORKSPACE
========================================================= */
DROP INDEX IF EXISTS one_primary_domain_per_workspace;

CREATE UNIQUE INDEX IF NOT EXISTS one_primary_domain_per_workspace
ON "WorkspaceDomain" ("workspace_id")
WHERE is_primary = true;


/* =========================================================
   ROLE PERMISSION XOR CHECK
========================================================= */
ALTER TABLE "RolePermission"
DROP CONSTRAINT IF EXISTS role_permission_xor_check;

ALTER TABLE "RolePermission"
ADD CONSTRAINT role_permission_xor_check
CHECK (
  (platform_role IS NOT NULL AND workspace_role IS NULL)
  OR
  (platform_role IS NULL AND workspace_role IS NOT NULL)
);

/* =========================================================
   USER PERMISSION GLOBAL UNIQUE (workspace NULL)
========================================================= */
DROP INDEX IF EXISTS user_permission_global_unique;

CREATE UNIQUE INDEX IF NOT EXISTS user_permission_global_unique
ON "UserPermission" ("identity_id", "permission_id")
WHERE workspace_id IS NULL;


/* =========================================================
   USER PERMISSION WORKSPACE UNIQUE
========================================================= */
DROP INDEX IF EXISTS user_permission_workspace_unique;

CREATE UNIQUE INDEX IF NOT EXISTS user_permission_workspace_unique
ON "UserPermission" ("identity_id", "workspace_id", "permission_id")
WHERE workspace_id IS NOT NULL;


/* =========================================================
   USER PERMISSION STRICT CHECK & REVOKED CHECK
========================================================= */
ALTER TABLE "UserPermission"
DROP CONSTRAINT IF EXISTS user_permission_strict_check;

ALTER TABLE "UserPermission"
ADD CONSTRAINT user_permission_strict_check
CHECK (
  (
    is_temporary = true AND expires_at IS NOT NULL
  )
  OR
  (
    is_temporary = false AND expires_at IS NULL
  )
);

ALTER TABLE "UserPermission"
DROP CONSTRAINT IF EXISTS user_permission_revoked_check;

ALTER TABLE "UserPermission"
ADD CONSTRAINT user_permission_revoked_check
CHECK (
  revoked_at IS NULL OR is_active = false
);

/* =========================================================
   PAYMENT CONTEXT CHECK (ONLY ONE OWNER)
========================================================= */
ALTER TABLE "Payment"
DROP CONSTRAINT IF EXISTS payment_context_check;

ALTER TABLE "Payment"
ADD CONSTRAINT payment_context_check
CHECK (
  (
    -- B2C: only identity
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- B2B: workspace + identity
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- B2B2C: all three
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
);

/* =========================================================
   CUSTOMER MUST BELONG TO WORKSPACE
========================================================= */
ALTER TABLE "Payment"
DROP CONSTRAINT IF EXISTS payment_customer_workspace_check;

ALTER TABLE "Payment"
ADD CONSTRAINT payment_customer_workspace_check
CHECK (
  customer_id IS NULL
  OR workspace_id IS NOT NULL
);

/* =========================================================
   PAYMENT ATTEMPT UNIQUE PER PAYMENT
========================================================= */
DROP INDEX IF EXISTS payment_attempt_unique;

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_unique
ON "PaymentAttempt" ("payment_id", "attempt_number");


/* =========================================================
   SUBSCRIPTION CONTEXT CHECK
========================================================= */
ALTER TABLE "Subscription"
DROP CONSTRAINT IF EXISTS subscription_context_check;

ALTER TABLE "Subscription"
ADD CONSTRAINT subscription_context_check
CHECK (
  (
    -- B2C: only identity
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- B2B: workspace + identity
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- B2B2C: all three
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
);

/* =========================================================
   CUSTOMER MUST BELONG TO WORKSPACE
========================================================= */
ALTER TABLE "Subscription"
DROP CONSTRAINT IF EXISTS subscription_customer_workspace_check;

ALTER TABLE "Subscription"
ADD CONSTRAINT subscription_customer_workspace_check
CHECK (
  customer_id IS NULL
  OR workspace_id IS NOT NULL
);


/* =========================================================
   INVOICE CONTEXT CHECK
========================================================= */
ALTER TABLE "Invoice"
DROP CONSTRAINT IF EXISTS invoice_context_check;

ALTER TABLE "Invoice"
ADD CONSTRAINT invoice_context_check
CHECK (
  (
    -- B2C: only identity
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- B2B: workspace + identity
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- B2B2C: all three
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
);

/* =========================================================
   CUSTOMER MUST BELONG TO WORKSPACE
========================================================= */
ALTER TABLE "Invoice"
DROP CONSTRAINT IF EXISTS invoice_customer_workspace_check;

ALTER TABLE "Invoice"
ADD CONSTRAINT invoice_customer_workspace_check
CHECK (
  customer_id IS NULL
  OR workspace_id IS NOT NULL
);

/* =========================================================
   OTP ATTEMPTS SAFETY
========================================================= */
ALTER TABLE "OtpRequest"
DROP CONSTRAINT IF EXISTS otp_attempts_limit_check;

ALTER TABLE "OtpRequest"
ADD CONSTRAINT otp_attempts_limit_check
CHECK (attempts >= 0 AND attempts <= 5);

/* =========================================================
   OTP RESEND LIMIT
========================================================= */
ALTER TABLE "OtpRequest"
DROP CONSTRAINT IF EXISTS otp_resend_limit_check;

ALTER TABLE "OtpRequest"
ADD CONSTRAINT otp_resend_limit_check
CHECK (resend_count >= 0 AND resend_count <= 3);

/* =========================================================
   SUPPORT MESSAGE SENDER STRICT CHECK
========================================================= */
ALTER TABLE "SupportTicketMessage"
DROP CONSTRAINT IF EXISTS support_message_sender_check;

ALTER TABLE "SupportTicketMessage"
ADD CONSTRAINT support_message_sender_check
CHECK (
  (
    sender_type = 'IDENTITY'
    AND sender_identity_id IS NOT NULL
    AND sender_customer_id IS NULL
  )
  OR
  (
    sender_type = 'CUSTOMER'
    AND sender_customer_id IS NOT NULL
    AND sender_identity_id IS NULL
  )
  OR
  (
    sender_type = 'SYSTEM'
    AND sender_identity_id IS NULL
    AND sender_customer_id IS NULL
  )
);

/* =========================================================
   SUPPORT TICKET CREATOR CONSISTENCY
========================================================= */
ALTER TABLE "SupportTicket"
DROP CONSTRAINT IF EXISTS support_ticket_creator_check;

ALTER TABLE "SupportTicket"
ADD CONSTRAINT support_ticket_creator_check
CHECK (
  (
    context_type = 'PLATFORM'
    AND workspace_id IS NULL
    AND created_by IS NOT NULL
    AND created_by_customer_id IS NULL
  )
  OR
  (
    context_type = 'WORKSPACE'
    AND workspace_id IS NOT NULL
    AND created_by IS NOT NULL
    AND created_by_customer_id IS NULL
  )
  OR
  (
    context_type = 'CUSTOMER'
    AND workspace_id IS NOT NULL
    AND created_by_customer_id IS NOT NULL
    AND created_by IS NULL
  )
);

/* =========================================================
   NOTIFICATION TARGET CONSISTENCY
========================================================= */
ALTER TABLE "Notification"
DROP CONSTRAINT IF EXISTS notification_target_check;

ALTER TABLE "Notification"
ADD CONSTRAINT notification_target_check
CHECK (
  (
    target_type = 'IDENTITY'
    AND recipient_identity_id IS NOT NULL
    AND recipient_customer_id IS NULL
  )
  OR
  (
    target_type = 'CUSTOMER'
    AND recipient_customer_id IS NOT NULL
    AND recipient_identity_id IS NULL
  )
  OR
  (
    target_type = 'BOTH'
    AND recipient_identity_id IS NOT NULL
    AND recipient_customer_id IS NOT NULL
  )
  OR
  (
    target_type = 'WORKSPACE'
    AND workspace_id IS NOT NULL
    AND recipient_identity_id IS NULL
    AND recipient_customer_id IS NULL
  )
  OR
  (
    target_type = 'PLATFORM'
    AND workspace_id IS NULL
    AND recipient_identity_id IS NULL
    AND recipient_customer_id IS NULL
  )
);

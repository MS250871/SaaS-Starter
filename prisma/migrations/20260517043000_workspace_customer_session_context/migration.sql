/* =========================================================
   SESSION CONTEXT CONSISTENCY
   Add explicit workspace customer session support
========================================================= */
ALTER TABLE "Session"
ADD COLUMN "customer_id" UUID;

ALTER TABLE "Session"
DROP CONSTRAINT IF EXISTS session_context_check;

ALTER TABLE "Session"
ADD CONSTRAINT session_context_check
CHECK (
  (
    -- Identity-only session (platform or pre-workspace auth)
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
    AND membership_id IS NULL
  )
  OR
  (
    -- Workspace customer session
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
    AND membership_id IS NULL
  )
  OR
  (
    -- Workspace member/admin session
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
    AND membership_id IS NOT NULL
  )
);

ALTER TABLE "Session"
ADD CONSTRAINT "Session_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Session_customer_id_idx"
ON "Session"("customer_id");

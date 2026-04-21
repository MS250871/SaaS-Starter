-- This is an empty migration.
/* =========================================================
   WEBHOOK EVENT - ATTEMPTS SAFETY
========================================================= */
ALTER TABLE "WebhookEvent"
DROP CONSTRAINT IF EXISTS webhook_attempts_check;

ALTER TABLE "WebhookEvent"
ADD CONSTRAINT webhook_attempts_check
CHECK (attempts >= 0 AND attempts <= 10);


/* =========================================================
   WEBHOOK EVENT - CONTEXT VALIDATION
   (Webhook should belong to at least one context)
========================================================= */
ALTER TABLE "WebhookEvent"
DROP CONSTRAINT IF EXISTS webhook_context_check;

ALTER TABLE "WebhookEvent"
ADD CONSTRAINT webhook_context_check
CHECK (
    (
    -- SYSTEM webhook (no actor yet)
    identity_id IS NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    -- Workspace-level webhook
    identity_id IS NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
);


/* =========================================================
   OUTBOX EVENT - ATTEMPTS SAFETY
========================================================= */
ALTER TABLE "OutboxEvent"
DROP CONSTRAINT IF EXISTS outbox_attempts_check;

ALTER TABLE "OutboxEvent"
ADD CONSTRAINT outbox_attempts_check
CHECK (attempts >= 0 AND attempts <= 5);


/* =========================================================
   OUTBOX EVENT - LOCK SAFETY
   (Prevent stale locks far in future)
========================================================= */
ALTER TABLE "OutboxEvent"
DROP CONSTRAINT IF EXISTS outbox_lock_check;

ALTER TABLE "OutboxEvent"
ADD CONSTRAINT outbox_lock_check
CHECK (
  locked_at IS NULL
  OR locked_at <= now() + interval '1 hour'
);


/* =========================================================
   OUTBOX EVENT - CONTEXT VALIDATION (OPTIONAL BUT RECOMMENDED)
========================================================= */
ALTER TABLE "OutboxEvent"
DROP CONSTRAINT IF EXISTS outbox_context_check;

ALTER TABLE "OutboxEvent"
ADD CONSTRAINT outbox_context_check
CHECK (
  (
  identity_id IS NULL
  AND workspace_id IS NULL
  AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
);

/* =========================================================
    OUTBOX EVENT - PARTIAL INDEX FOR PENDING EVENTS
========================================================= */
DROP INDEX IF EXISTS outbox_pending_idx;
CREATE INDEX IF NOT EXISTS outbox_pending_idx
ON "OutboxEvent"(status, next_retry_at)
WHERE status = 'PENDING';

/* =========================================================
   MEDIA - FILE SIZE SAFETY
========================================================= */
ALTER TABLE "Media"
DROP CONSTRAINT IF EXISTS media_size_check;

ALTER TABLE "Media"
ADD CONSTRAINT media_size_check
CHECK (
  size > 0 AND size <= 10000000  -- 10 MB
);


/* =========================================================
   MEDIA - CONTEXT VALIDATION
========================================================= */
ALTER TABLE "Media"
DROP CONSTRAINT IF EXISTS media_context_check;

ALTER TABLE "Media"
ADD CONSTRAINT media_context_check
CHECK (
  (
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
  OR
  (
    identity_id IS NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
);


/* =========================================================
   FILE ATTACHMENT - CONTEXT VALIDATION
========================================================= */
ALTER TABLE "FileAttachment"
DROP CONSTRAINT IF EXISTS attachment_context_check;

ALTER TABLE "FileAttachment"
ADD CONSTRAINT attachment_context_check
CHECK (
  (
    identity_id IS NOT NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    identity_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND customer_id IS NOT NULL
  )
  OR
  (
    identity_id IS NULL
    AND workspace_id IS NULL
    AND customer_id IS NULL
  )
);


/* =========================================================
   FILE ATTACHMENT - ENTITY TYPE NOT EMPTY
========================================================= */
ALTER TABLE "FileAttachment"
DROP CONSTRAINT IF EXISTS attachment_entity_check;

ALTER TABLE "FileAttachment"
ADD CONSTRAINT attachment_entity_check
CHECK (length(entity_type) > 0);

/* =========================================================
   FILE ATTACHMENT - UNIQUE MEDIA PER ENTITY
========================================================= */
DROP INDEX IF EXISTS file_attachment_unique;
CREATE UNIQUE INDEX IF NOT EXISTS file_attachment_unique
ON "FileAttachment"(media_id, entity_type, entity_id);

/* =========================================================
   MEDIA JOB - VALID JOB TYPE
========================================================= */
ALTER TABLE "MediaJob"
DROP CONSTRAINT IF EXISTS media_job_type_check;

ALTER TABLE "MediaJob"
ADD CONSTRAINT media_job_type_check
CHECK (length(job_type) > 0);


/* =========================================================
   MEDIA JOB - PROCESSING CONSISTENCY
========================================================= */
ALTER TABLE "MediaJob"
DROP CONSTRAINT IF EXISTS media_job_processing_check;

ALTER TABLE "MediaJob"
ADD CONSTRAINT media_job_processing_check
CHECK (
  (status = 'PENDING' AND processed_at IS NULL)
  OR
  (status IN ('DONE', 'FAILED') AND processed_at IS NOT NULL)
);



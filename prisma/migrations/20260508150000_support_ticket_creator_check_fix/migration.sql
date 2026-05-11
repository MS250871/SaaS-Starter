ALTER TABLE "SupportTicket"
DROP CONSTRAINT IF EXISTS support_ticket_creator_check;

ALTER TABLE "SupportTicket"
ADD CONSTRAINT support_ticket_creator_check
CHECK (
  (
    context_type = 'PLATFORM'
    AND workspace_id IS NOT NULL
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

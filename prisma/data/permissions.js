export const PERMISSION_SEED = [
  /* ---------------- WORKSPACE ---------------- */
  {
    key: 'workspace.read',
    name: 'View Workspace',
    description: 'View workspace details and metadata.',
    entity: 'workspace',
  },
  {
    key: 'workspace.update',
    name: 'Update Workspace',
    description: 'Update workspace details.',
    entity: 'workspace',
  },
  {
    key: 'workspace.delete',
    name: 'Delete Workspace',
    description: 'Delete or archive a workspace.',
    entity: 'workspace',
  },

  /* ---------------- WORKSPACE SETTINGS ---------------- */
  {
    key: 'workspaceSettings.read',
    name: 'View Workspace Settings',
    description: 'View workspace settings and branding configuration.',
    entity: 'workspaceSettings',
  },
  {
    key: 'workspaceSettings.update',
    name: 'Update Workspace Settings',
    description: 'Update workspace settings and branding configuration.',
    entity: 'workspaceSettings',
  },

  /* ---------------- WORKSPACE DOMAIN ---------------- */
  {
    key: 'workspaceDomain.read',
    name: 'View Workspace Domains',
    description: 'View workspace domain configuration.',
    entity: 'workspaceDomain',
  },
  {
    key: 'workspaceDomain.create',
    name: 'Create Workspace Domain',
    description: 'Add a workspace domain or subdomain.',
    entity: 'workspaceDomain',
  },
  {
    key: 'workspaceDomain.update',
    name: 'Update Workspace Domain',
    description: 'Update workspace domain configuration.',
    entity: 'workspaceDomain',
  },
  {
    key: 'workspaceDomain.delete',
    name: 'Delete Workspace Domain',
    description: 'Remove a workspace domain.',
    entity: 'workspaceDomain',
  },
  {
    key: 'workspaceDomain.verify',
    name: 'Verify Workspace Domain',
    description: 'Verify ownership of a workspace domain.',
    entity: 'workspaceDomain',
  },
  {
    key: 'workspaceDomain.setPrimary',
    name: 'Set Primary Workspace Domain',
    description: 'Set the primary workspace domain.',
    entity: 'workspaceDomain',
  },

  /* ---------------- MEMBERSHIP ---------------- */
  {
    key: 'membership.read',
    name: 'View Memberships',
    description: 'View workspace memberships.',
    entity: 'membership',
  },
  {
    key: 'membership.create',
    name: 'Create Membership',
    description: 'Create a workspace membership.',
    entity: 'membership',
  },
  {
    key: 'membership.update',
    name: 'Update Membership',
    description: 'Update a workspace membership.',
    entity: 'membership',
  },
  {
    key: 'membership.delete',
    name: 'Delete Membership',
    description: 'Remove a workspace membership.',
    entity: 'membership',
  },
  {
    key: 'membership.invite',
    name: 'Invite Member',
    description: 'Invite a new member to the workspace.',
    entity: 'membership',
  },
  {
    key: 'membership.updateRole',
    name: 'Update Member Role',
    description: 'Change a member role in the workspace.',
    entity: 'membership',
  },
  {
    key: 'membership.activate',
    name: 'Activate Membership',
    description: 'Activate a workspace membership.',
    entity: 'membership',
  },
  {
    key: 'membership.deactivate',
    name: 'Deactivate Membership',
    description: 'Deactivate a workspace membership.',
    entity: 'membership',
  },

  /* ---------------- WORKSPACE INVITE ---------------- */
  {
    key: 'workspaceInvite.read',
    name: 'View Workspace Invites',
    description: 'View workspace invites.',
    entity: 'workspaceInvite',
  },
  {
    key: 'workspaceInvite.create',
    name: 'Create Workspace Invite',
    description: 'Create a workspace invite.',
    entity: 'workspaceInvite',
  },
  {
    key: 'workspaceInvite.update',
    name: 'Update Workspace Invite',
    description: 'Update workspace invite metadata.',
    entity: 'workspaceInvite',
  },
  {
    key: 'workspaceInvite.delete',
    name: 'Delete Workspace Invite',
    description: 'Delete a workspace invite.',
    entity: 'workspaceInvite',
  },
  {
    key: 'workspaceInvite.resend',
    name: 'Resend Workspace Invite',
    description: 'Resend a workspace invite.',
    entity: 'workspaceInvite',
  },
  {
    key: 'workspaceInvite.revoke',
    name: 'Revoke Workspace Invite',
    description: 'Revoke a workspace invite.',
    entity: 'workspaceInvite',
  },

  /* ---------------- CUSTOMER ---------------- */
  {
    key: 'customer.read',
    name: 'View Customers',
    description: 'View workspace customers.',
    entity: 'customer',
  },
  {
    key: 'customer.create',
    name: 'Create Customer',
    description: 'Create a customer in the workspace.',
    entity: 'customer',
  },
  {
    key: 'customer.update',
    name: 'Update Customer',
    description: 'Update a customer profile.',
    entity: 'customer',
  },
  {
    key: 'customer.delete',
    name: 'Delete Customer',
    description: 'Delete a customer.',
    entity: 'customer',
  },
  {
    key: 'customer.activate',
    name: 'Activate Customer',
    description: 'Activate a customer.',
    entity: 'customer',
  },
  {
    key: 'customer.deactivate',
    name: 'Deactivate Customer',
    description: 'Deactivate a customer.',
    entity: 'customer',
  },

  /* ---------------- IDENTITY ---------------- */
  {
    key: 'identity.read',
    name: 'View Identity',
    description: 'View identity details.',
    entity: 'identity',
  },
  {
    key: 'identity.update',
    name: 'Update Identity',
    description: 'Update identity details.',
    entity: 'identity',
  },
  {
    key: 'identity.deactivate',
    name: 'Deactivate Identity',
    description: 'Deactivate an identity.',
    entity: 'identity',
  },

  /* ---------------- API KEY ---------------- */
  {
    key: 'apiKey.read',
    name: 'View API Keys',
    description: 'View workspace API keys.',
    entity: 'apiKey',
  },
  {
    key: 'apiKey.create',
    name: 'Create API Key',
    description: 'Create a workspace API key.',
    entity: 'apiKey',
  },
  {
    key: 'apiKey.update',
    name: 'Update API Key',
    description: 'Update API key metadata.',
    entity: 'apiKey',
  },
  {
    key: 'apiKey.delete',
    name: 'Delete API Key',
    description: 'Delete an API key.',
    entity: 'apiKey',
  },
  {
    key: 'apiKey.rotate',
    name: 'Rotate API Key',
    description: 'Rotate an API key secret.',
    entity: 'apiKey',
  },
  {
    key: 'apiKey.revoke',
    name: 'Revoke API Key',
    description: 'Revoke an API key.',
    entity: 'apiKey',
  },

  /* ---------------- SUBSCRIPTION ---------------- */
  {
    key: 'subscription.read',
    name: 'View Subscriptions',
    description: 'View workspace subscriptions.',
    entity: 'subscription',
  },
  {
    key: 'subscription.create',
    name: 'Create Subscription',
    description: 'Create a subscription.',
    entity: 'subscription',
  },
  {
    key: 'subscription.update',
    name: 'Update Subscription',
    description: 'Update subscription details.',
    entity: 'subscription',
  },
  {
    key: 'subscription.cancel',
    name: 'Cancel Subscription',
    description: 'Cancel a subscription.',
    entity: 'subscription',
  },

  /* ---------------- PAYMENT ---------------- */
  {
    key: 'payment.read',
    name: 'View Payments',
    description: 'View payment history and details.',
    entity: 'payment',
  },
  {
    key: 'payment.create',
    name: 'Create Payment',
    description: 'Create or initiate a payment.',
    entity: 'payment',
  },
  {
    key: 'payment.refund',
    name: 'Refund Payment',
    description: 'Issue a refund for a payment.',
    entity: 'payment',
  },

  /* ---------------- INVOICE ---------------- */
  {
    key: 'invoice.read',
    name: 'View Invoices',
    description: 'View invoices.',
    entity: 'invoice',
  },
  {
    key: 'invoice.create',
    name: 'Create Invoice',
    description: 'Create an invoice.',
    entity: 'invoice',
  },
  {
    key: 'invoice.update',
    name: 'Update Invoice',
    description: 'Update invoice details.',
    entity: 'invoice',
  },
  {
    key: 'invoice.export',
    name: 'Export Invoice',
    description: 'Export an invoice.',
    entity: 'invoice',
  },

  /* ---------------- SUPPORT TICKET ---------------- */
  {
    key: 'supportTicket.read',
    name: 'View Support Tickets',
    description: 'View support tickets.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.create',
    name: 'Create Support Ticket',
    description: 'Create a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.update',
    name: 'Update Support Ticket',
    description: 'Update a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.delete',
    name: 'Delete Support Ticket',
    description: 'Delete a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.assign',
    name: 'Assign Support Ticket',
    description: 'Assign a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.reply',
    name: 'Reply To Support Ticket',
    description: 'Reply to a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.close',
    name: 'Close Support Ticket',
    description: 'Close a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.reopen',
    name: 'Reopen Support Ticket',
    description: 'Reopen a support ticket.',
    entity: 'supportTicket',
  },
  {
    key: 'supportTicket.internalNote',
    name: 'Add Internal Note',
    description: 'Add an internal note to a support ticket.',
    entity: 'supportTicket',
  },

  /* ---------------- NOTIFICATION ---------------- */
  {
    key: 'notification.read',
    name: 'View Notifications',
    description: 'View notifications.',
    entity: 'notification',
  },
  {
    key: 'notification.create',
    name: 'Create Notification',
    description: 'Create a notification.',
    entity: 'notification',
  },
  {
    key: 'notification.update',
    name: 'Update Notification',
    description: 'Update notification state.',
    entity: 'notification',
  },
  {
    key: 'notification.delete',
    name: 'Delete Notification',
    description: 'Delete a notification.',
    entity: 'notification',
  },
  {
    key: 'notification.markRead',
    name: 'Mark Notification Read',
    description: 'Mark a notification as read.',
    entity: 'notification',
  },

  /* ---------------- MEDIA ---------------- */
  {
    key: 'media.read',
    name: 'View Media',
    description: 'View media files and attachments.',
    entity: 'media',
  },
  {
    key: 'media.create',
    name: 'Create Media',
    description: 'Upload or create media.',
    entity: 'media',
  },
  {
    key: 'media.update',
    name: 'Update Media',
    description: 'Update media metadata.',
    entity: 'media',
  },
  {
    key: 'media.delete',
    name: 'Delete Media',
    description: 'Delete media files.',
    entity: 'media',
  },

  /* ---------------- FEATURE OVERRIDE ---------------- */
  {
    key: 'featureOverride.read',
    name: 'View Feature Overrides',
    description: 'View workspace feature overrides.',
    entity: 'featureOverride',
  },
  {
    key: 'featureOverride.create',
    name: 'Create Feature Override',
    description: 'Create a workspace feature override.',
    entity: 'featureOverride',
  },
  {
    key: 'featureOverride.update',
    name: 'Update Feature Override',
    description: 'Update a workspace feature override.',
    entity: 'featureOverride',
  },
  {
    key: 'featureOverride.delete',
    name: 'Delete Feature Override',
    description: 'Delete a workspace feature override.',
    entity: 'featureOverride',
  },

  /* ---------------- LIMIT OVERRIDE ---------------- */
  {
    key: 'limitOverride.read',
    name: 'View Limit Overrides',
    description: 'View workspace limit overrides.',
    entity: 'limitOverride',
  },
  {
    key: 'limitOverride.create',
    name: 'Create Limit Override',
    description: 'Create a workspace limit override.',
    entity: 'limitOverride',
  },
  {
    key: 'limitOverride.update',
    name: 'Update Limit Override',
    description: 'Update a workspace limit override.',
    entity: 'limitOverride',
  },
  {
    key: 'limitOverride.delete',
    name: 'Delete Limit Override',
    description: 'Delete a workspace limit override.',
    entity: 'limitOverride',
  },

  /* ---------------- PERMISSION ---------------- */
  {
    key: 'permission.read',
    name: 'View Permissions',
    description: 'View permission definitions.',
    entity: 'permission',
  },
  {
    key: 'permission.create',
    name: 'Create Permission',
    description: 'Create a permission definition.',
    entity: 'permission',
  },
  {
    key: 'permission.update',
    name: 'Update Permission',
    description: 'Update a permission definition.',
    entity: 'permission',
  },
  {
    key: 'permission.delete',
    name: 'Delete Permission',
    description: 'Delete a permission definition.',
    entity: 'permission',
  },
  {
    key: 'permission.grant',
    name: 'Grant Permission',
    description: 'Grant a permission to a user.',
    entity: 'permission',
  },
  {
    key: 'permission.revoke',
    name: 'Revoke Permission',
    description: 'Revoke a permission from a user.',
    entity: 'permission',
  },

  /* ---------------- ROLE ---------------- */
  {
    key: 'role.read',
    name: 'View Roles',
    description: 'View role definitions and assigned permissions.',
    entity: 'role',
  },
  {
    key: 'role.update',
    name: 'Update Roles',
    description: 'Update role permission mappings.',
    entity: 'role',
  },

  /* ---------------- AUDIT ---------------- */
  {
    key: 'audit.read',
    name: 'View Audit Logs',
    description: 'View audit logs.',
    entity: 'audit',
  },
  {
    key: 'audit.export',
    name: 'Export Audit Logs',
    description: 'Export audit logs.',
    entity: 'audit',
  },

  /* ---------------- PLATFORM WORKSPACE ---------------- */
  {
    key: 'platformWorkspace.read',
    name: 'View Platform Workspaces',
    description: 'View workspaces from the platform surface.',
    entity: 'platformWorkspace',
  },
  {
    key: 'platformWorkspace.update',
    name: 'Update Platform Workspace',
    description: 'Update workspace data from the platform surface.',
    entity: 'platformWorkspace',
  },
  {
    key: 'platformWorkspace.deactivate',
    name: 'Deactivate Platform Workspace',
    description: 'Deactivate a workspace from the platform surface.',
    entity: 'platformWorkspace',
  },

  /* ---------------- PLATFORM MEMBERSHIP ---------------- */
  {
    key: 'platformMembership.read',
    name: 'View Platform Memberships',
    description: 'View platform memberships.',
    entity: 'platformMembership',
  },
  {
    key: 'platformMembership.create',
    name: 'Create Platform Membership',
    description: 'Create a platform membership.',
    entity: 'platformMembership',
  },
  {
    key: 'platformMembership.update',
    name: 'Update Platform Membership',
    description: 'Update a platform membership.',
    entity: 'platformMembership',
  },
  {
    key: 'platformMembership.delete',
    name: 'Delete Platform Membership',
    description: 'Delete a platform membership.',
    entity: 'platformMembership',
  },

  /* ---------------- PLATFORM INVITE ---------------- */
  {
    key: 'platformInvite.read',
    name: 'View Platform Invites',
    description: 'View platform invites.',
    entity: 'platformInvite',
  },
  {
    key: 'platformInvite.create',
    name: 'Create Platform Invite',
    description: 'Create a platform invite.',
    entity: 'platformInvite',
  },
  {
    key: 'platformInvite.update',
    name: 'Update Platform Invite',
    description: 'Update a platform invite.',
    entity: 'platformInvite',
  },
  {
    key: 'platformInvite.delete',
    name: 'Delete Platform Invite',
    description: 'Delete a platform invite.',
    entity: 'platformInvite',
  },
  {
    key: 'platformInvite.resend',
    name: 'Resend Platform Invite',
    description: 'Resend a platform invite.',
    entity: 'platformInvite',
  },
  {
    key: 'platformInvite.revoke',
    name: 'Revoke Platform Invite',
    description: 'Revoke a platform invite.',
    entity: 'platformInvite',
  },

  /* ---------------- PLATFORM BILLING ---------------- */
  {
    key: 'platformBilling.read',
    name: 'View Platform Billing',
    description: 'View billing data from the platform surface.',
    entity: 'platformBilling',
  },
  {
    key: 'platformBilling.update',
    name: 'Update Platform Billing',
    description: 'Update billing data from the platform surface.',
    entity: 'platformBilling',
  },
  {
    key: 'platformBilling.refund',
    name: 'Refund Platform Payment',
    description: 'Refund payments from the platform surface.',
    entity: 'platformBilling',
  },

  /* ---------------- PLATFORM SUPPORT ---------------- */
  {
    key: 'platformSupport.read',
    name: 'View Platform Support',
    description: 'View support data from the platform surface.',
    entity: 'platformSupport',
  },
  {
    key: 'platformSupport.update',
    name: 'Update Platform Support',
    description: 'Update support data from the platform surface.',
    entity: 'platformSupport',
  },
  {
    key: 'platformSupport.assign',
    name: 'Assign Platform Support',
    description: 'Assign support items from the platform surface.',
    entity: 'platformSupport',
  },
  {
    key: 'platformSupport.reply',
    name: 'Reply From Platform Support',
    description: 'Reply to support items from the platform surface.',
    entity: 'platformSupport',
  },

  /* ---------------- PLATFORM AUDIT ---------------- */
  {
    key: 'platformAudit.read',
    name: 'View Platform Audit',
    description: 'View platform audit logs.',
    entity: 'platformAudit',
  },
  {
    key: 'platformAudit.export',
    name: 'Export Platform Audit',
    description: 'Export platform audit logs.',
    entity: 'platformAudit',
  },

  /* ---------------- PLATFORM PERMISSION ---------------- */
  {
    key: 'platformPermission.read',
    name: 'View Platform Permissions',
    description: 'View platform permission mappings.',
    entity: 'platformPermission',
  },
  {
    key: 'platformPermission.update',
    name: 'Update Platform Permissions',
    description: 'Update platform permission mappings.',
    entity: 'platformPermission',
  },
];

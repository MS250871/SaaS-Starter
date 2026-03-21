export const PERMISSION_SEED = [
  /* ---------------- WORKSPACE ---------------- */
  {
    key: 'workspace.create',
    name: 'Create Workspace',
    description: 'Create a new workspace',
    entity: 'workspace',
  },
  {
    key: 'workspace.read',
    name: 'View Workspace',
    description: 'View workspace details',
    entity: 'workspace',
  },
  {
    key: 'workspace.update',
    name: 'Update Workspace',
    description: 'Update workspace details',
    entity: 'workspace',
  },
  {
    key: 'workspace.delete',
    name: 'Delete Workspace',
    description: 'Delete a workspace',
    entity: 'workspace',
  },
  {
    key: 'workspace.manage',
    name: 'Manage Workspace',
    description: 'Full control over workspace',
    entity: 'workspace',
  },

  /* Workspace Domains */
  {
    key: 'workspace.domain.add',
    name: 'Add Domain',
    description: 'Add domain to workspace',
    entity: 'workspace',
  },
  {
    key: 'workspace.domain.remove',
    name: 'Remove Domain',
    description: 'Remove workspace domain',
    entity: 'workspace',
  },
  {
    key: 'workspace.domain.verify',
    name: 'Verify Domain',
    description: 'Verify workspace domain',
    entity: 'workspace',
  },
  {
    key: 'workspace.domain.setPrimary',
    name: 'Set Primary Domain',
    description: 'Set primary domain',
    entity: 'workspace',
  },

  /* Workspace Settings */
  {
    key: 'workspace.settings.read',
    name: 'View Settings',
    description: 'View workspace settings',
    entity: 'workspace',
  },
  {
    key: 'workspace.settings.update',
    name: 'Update Settings',
    description: 'Update workspace settings',
    entity: 'workspace',
  },

  {
    key: 'workspace.theme.update',
    name: 'Update Theme',
    description: 'Update workspace theme',
    entity: 'workspace',
  },
  {
    key: 'workspace.config.update',
    name: 'Update Config',
    description: 'Update workspace configuration',
    entity: 'workspace',
  },

  /* ---------------- MEMBERSHIP ---------------- */
  {
    key: 'membership.read',
    name: 'View Members',
    description: 'View workspace members',
    entity: 'membership',
  },
  {
    key: 'membership.invite',
    name: 'Invite Member',
    description: 'Invite user to workspace',
    entity: 'membership',
  },
  {
    key: 'membership.bulkInvite',
    name: 'Bulk Invite Members',
    description: 'Invite multiple users',
    entity: 'membership',
  },
  {
    key: 'membership.updateRole',
    name: 'Update Member Role',
    description: 'Change member role',
    entity: 'membership',
  },
  {
    key: 'membership.remove',
    name: 'Remove Member',
    description: 'Remove member from workspace',
    entity: 'membership',
  },
  {
    key: 'membership.activate',
    name: 'Activate Member',
    description: 'Activate membership',
    entity: 'membership',
  },
  {
    key: 'membership.deactivate',
    name: 'Deactivate Member',
    description: 'Deactivate membership',
    entity: 'membership',
  },

  /* ---------------- INVITES ---------------- */
  {
    key: 'invite.create',
    name: 'Create Invite',
    description: 'Create workspace invite',
    entity: 'invite',
  },
  {
    key: 'invite.bulkCreate',
    name: 'Bulk Create Invites',
    description: 'Create multiple invites',
    entity: 'invite',
  },
  {
    key: 'invite.resend',
    name: 'Resend Invite',
    description: 'Resend invitation',
    entity: 'invite',
  },
  {
    key: 'invite.revoke',
    name: 'Revoke Invite',
    description: 'Revoke invitation',
    entity: 'invite',
  },
  {
    key: 'invite.accept',
    name: 'Accept Invite',
    description: 'Accept invitation',
    entity: 'invite',
  },

  /* ---------------- IDENTITY ---------------- */
  {
    key: 'identity.read',
    name: 'View Identity',
    description: 'View identity details',
    entity: 'identity',
  },
  {
    key: 'identity.updateProfile',
    name: 'Update Profile',
    description: 'Update identity profile',
    entity: 'identity',
  },
  {
    key: 'identity.activate',
    name: 'Activate Identity',
    description: 'Activate identity',
    entity: 'identity',
  },
  {
    key: 'identity.deactivate',
    name: 'Deactivate Identity',
    description: 'Deactivate identity',
    entity: 'identity',
  },
  {
    key: 'identity.delete',
    name: 'Delete Identity',
    description: 'Delete identity',
    entity: 'identity',
  },
  {
    key: 'identity.changeEmail',
    name: 'Change Email',
    description: 'Change identity email',
    entity: 'identity',
  },
  {
    key: 'identity.changePhone',
    name: 'Change Phone',
    description: 'Change identity phone',
    entity: 'identity',
  },
  {
    key: 'identity.addAuthAccount',
    name: 'Add Auth Account',
    description: 'Add authentication method',
    entity: 'identity',
  },
  {
    key: 'identity.removeAuthAccount',
    name: 'Remove Auth Account',
    description: 'Remove authentication method',
    entity: 'identity',
  },

  /* ---------------- CUSTOMER ---------------- */
  {
    key: 'customer.read',
    name: 'View Customer',
    description: 'View customer details',
    entity: 'customer',
  },
  {
    key: 'customer.list',
    name: 'List Customers',
    description: 'List all customers',
    entity: 'customer',
  },
  {
    key: 'customer.updateProfile',
    name: 'Update Customer',
    description: 'Update customer profile',
    entity: 'customer',
  },
  {
    key: 'customer.activate',
    name: 'Activate Customer',
    description: 'Activate customer',
    entity: 'customer',
  },
  {
    key: 'customer.deactivate',
    name: 'Deactivate Customer',
    description: 'Deactivate customer',
    entity: 'customer',
  },
  {
    key: 'customer.delete',
    name: 'Delete Customer',
    description: 'Delete customer',
    entity: 'customer',
  },
  {
    key: 'customer.changeEmail',
    name: 'Change Email',
    description: 'Change customer email',
    entity: 'customer',
  },
  {
    key: 'customer.changePhone',
    name: 'Change Phone',
    description: 'Change customer phone',
    entity: 'customer',
  },
  {
    key: 'customer.addAuthAccount',
    name: 'Add Auth Account',
    description: 'Add auth method',
    entity: 'customer',
  },
  {
    key: 'customer.removeAuthAccount',
    name: 'Remove Auth Account',
    description: 'Remove auth method',
    entity: 'customer',
  },
  {
    key: 'customer.bulkCreate',
    name: 'Bulk Create Customers',
    description: 'Create customers in bulk',
    entity: 'customer',
  },

  /* ---------------- SESSION ---------------- */
  {
    key: 'session.read',
    name: 'View Session',
    description: 'View session',
    entity: 'session',
  },
  {
    key: 'session.list',
    name: 'List Sessions',
    description: 'List sessions',
    entity: 'session',
  },
  {
    key: 'session.terminate',
    name: 'Terminate Session',
    description: 'Terminate session',
    entity: 'session',
  },
  {
    key: 'session.terminateAll',
    name: 'Terminate All Sessions',
    description: 'Terminate all sessions',
    entity: 'session',
  },
  {
    key: 'session.revokeByDevice',
    name: 'Revoke by Device',
    description: 'Revoke device session',
    entity: 'session',
  },
  {
    key: 'session.revokeForMembership',
    name: 'Revoke Membership Sessions',
    description: 'Revoke sessions for membership',
    entity: 'session',
  },
  {
    key: 'session.refresh',
    name: 'Refresh Session',
    description: 'Refresh session token',
    entity: 'session',
  },

  /* ---------------- PERMISSION ---------------- */
  {
    key: 'permission.read',
    name: 'View Permissions',
    description: 'View permissions',
    entity: 'permission',
  },
  {
    key: 'permission.create',
    name: 'Create Permission',
    description: 'Create permission',
    entity: 'permission',
  },
  {
    key: 'permission.update',
    name: 'Update Permission',
    description: 'Update permission',
    entity: 'permission',
  },
  {
    key: 'permission.delete',
    name: 'Delete Permission',
    description: 'Delete permission',
    entity: 'permission',
  },
  {
    key: 'permission.grant',
    name: 'Grant Permission',
    description: 'Grant permission',
    entity: 'permission',
  },
  {
    key: 'permission.revoke',
    name: 'Revoke Permission',
    description: 'Revoke permission',
    entity: 'permission',
  },
  {
    key: 'permission.assignTemporary',
    name: 'Assign Temporary Permission',
    description: 'Assign temporary permission',
    entity: 'permission',
  },
  {
    key: 'permission.expireTemporary',
    name: 'Expire Temporary Permission',
    description: 'Expire temporary permission',
    entity: 'permission',
  },

  /* ---------------- ROLE ---------------- */
  {
    key: 'role.read',
    name: 'View Roles',
    description: 'View roles and their permissions',
    entity: 'role',
  },
  {
    key: 'role.updatePermissions',
    name: 'Update Role Permissions',
    description: 'Modify permissions assigned to a role',
    entity: 'role',
  },
  /* ---------------- WORKSPACE ROLE ---------------- */

  {
    key: 'workspaceRolePermission.read',
    name: 'View Workspace Role Permissions',
    description: 'View role permissions within workspace',
    entity: 'workspaceRolePermission',
  },
  {
    key: 'workspaceRolePermission.update',
    name: 'Update Workspace Role Permissions',
    description: 'Customize role permissions for workspace',
    entity: 'workspaceRolePermission',
  },

  {
    key: 'workspaceRolePermission.reset',
    name: 'Reset Workspace Role Permissions',
    description: 'Reset workspace role permissions to default',
    entity: 'workspaceRolePermission',
  },

  /* ---------------- API KEY ---------------- */
  {
    key: 'apikey.create',
    name: 'Create API Key',
    description: 'Create API key',
    entity: 'apikey',
  },
  {
    key: 'apikey.read',
    name: 'View API Key',
    description: 'View API key',
    entity: 'apikey',
  },
  {
    key: 'apikey.rotate',
    name: 'Rotate API Key',
    description: 'Rotate API key',
    entity: 'apikey',
  },
  {
    key: 'apikey.revoke',
    name: 'Revoke API Key',
    description: 'Revoke API key',
    entity: 'apikey',
  },
  {
    key: 'apikey.delete',
    name: 'Delete API Key',
    description: 'Delete API key',
    entity: 'apikey',
  },
  {
    key: 'apikey.list',
    name: 'List API Keys',
    description: 'List API keys',
    entity: 'apikey',
  },

  /* ---------------- SUBSCRIPTION ---------------- */
  {
    key: 'subscription.create',
    name: 'Create Subscription',
    description: 'Create subscription',
    entity: 'subscription',
  },
  {
    key: 'subscription.update',
    name: 'Update Subscription',
    description: 'Update subscription',
    entity: 'subscription',
  },
  {
    key: 'subscription.cancel',
    name: 'Cancel Subscription',
    description: 'Cancel subscription',
    entity: 'subscription',
  },
  {
    key: 'subscription.read',
    name: 'View Subscription',
    description: 'View subscription',
    entity: 'subscription',
  },
  {
    key: 'subscription.list',
    name: 'List Subscriptions',
    description: 'List subscriptions',
    entity: 'subscription',
  },

  /* ---------------- NOTIFICATION ---------------- */
  {
    key: 'notification.create',
    name: 'Create Notification',
    description: 'Create notification',
    entity: 'notification',
  },
  {
    key: 'notification.read',
    name: 'View Notification',
    description: 'View notification',
    entity: 'notification',
  },
  {
    key: 'notification.list',
    name: 'List Notifications',
    description: 'List notifications',
    entity: 'notification',
  },
  {
    key: 'notification.markRead',
    name: 'Mark Read',
    description: 'Mark notification as read',
    entity: 'notification',
  },
  {
    key: 'notification.markAllRead',
    name: 'Mark All Read',
    description: 'Mark all notifications as read',
    entity: 'notification',
  },
  {
    key: 'notification.delete',
    name: 'Delete Notification',
    description: 'Delete notification',
    entity: 'notification',
  },

  /* ---------------- SUPPORT ---------------- */
  {
    key: 'support.create',
    name: 'Create Ticket',
    description: 'Create support ticket',
    entity: 'support',
  },
  {
    key: 'support.assign',
    name: 'Assign Ticket',
    description: 'Assign support ticket',
    entity: 'support',
  },
  {
    key: 'support.updateStatus',
    name: 'Update Status',
    description: 'Update ticket status',
    entity: 'support',
  },
  {
    key: 'support.updatePriority',
    name: 'Update Priority',
    description: 'Update ticket priority',
    entity: 'support',
  },
  {
    key: 'support.reply',
    name: 'Reply to Ticket',
    description: 'Reply to support ticket',
    entity: 'support',
  },
  {
    key: 'support.internalNote',
    name: 'Internal Note',
    description: 'Add internal note',
    entity: 'support',
  },
  {
    key: 'support.delete',
    name: 'Delete Ticket',
    description: 'Delete support ticket',
    entity: 'support',
  },
  {
    key: 'support.close',
    name: 'Close Ticket',
    description: 'Close support ticket',
    entity: 'support',
  },
  {
    key: 'support.reopen',
    name: 'Reopen Ticket',
    description: 'Reopen support ticket',
    entity: 'support',
  },
  {
    key: 'support.list',
    name: 'List Tickets',
    description: 'List support tickets',
    entity: 'support',
  },
  {
    key: 'support.readMessages',
    name: 'Read Messages',
    description: 'Read ticket messages',
    entity: 'support',
  },

  /* ---------------- AUDIT ---------------- */
  {
    key: 'audit.read',
    name: 'View Audit Logs',
    description: 'View audit logs',
    entity: 'audit',
  },
  {
    key: 'audit.get',
    name: 'Get Audit Log',
    description: 'Get audit log detail',
    entity: 'audit',
  },
  {
    key: 'audit.export',
    name: 'Export Audit Logs',
    description: 'Export audit logs',
    entity: 'audit',
  },

  /* ---------------- PLATFORM ---------------- */
  {
    key: 'platform.admin',
    name: 'Platform Admin Access',
    description: 'Full platform access',
    entity: 'platform',
  },
  {
    key: 'platform.support',
    name: 'Platform Support Access',
    description: 'Support-level access',
    entity: 'platform',
  },
  {
    key: 'platform.billing',
    name: 'Platform Billing Access',
    description: 'Billing-level access',
    entity: 'platform',
  },
];

import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Workspace
 */
export const workspaceCrud = buildCud({
  model: 'Workspace',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const workspaceQueries = buildQueries({
  model: 'Workspace',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/**
 * Workspace Domains
 */
export const workspaceDomainCrud = buildCud({
  model: 'WorkspaceDomain',
  workspaceScoped: false,
  softDelete: false,
});

export const workspaceDomainQueries = buildQueries({
  model: 'WorkspaceDomain',
  workspaceScoped: false,
});

/**
 * Workspace Subscriptions
 */
export const workspaceSubscriptionCrud = buildCud({
  model: 'WorkspaceSubscription',
  workspaceScoped: false,
  softDelete: false,
});

export const workspaceSubscriptionQueries = buildQueries({
  model: 'WorkspaceSubscription',
  workspaceScoped: false,
});

/**
 * Workspace Invites
 */
export const workspaceInviteCrud = buildCud({
  model: 'WorkspaceInvite',
  workspaceScoped: true,
  softDelete: false,
});

export const workspaceInviteQueries = buildQueries({
  model: 'WorkspaceInvite',
  workspaceScoped: true,
});

/**
 * Workspace Settings
 */
export const workspaceSettingsCrud = buildCud({
  model: 'WorkspaceSettings',
  workspaceScoped: true,
  softDelete: false,
});

export const workspaceSettingsQueries = buildQueries({
  model: 'WorkspaceSettings',
  workspaceScoped: true,
});

/**
 * Membership (Identity ↔ Workspace)
 */
export const membershipCrud = buildCud({
  model: 'Membership',
  workspaceScoped: false,
  softDelete: false,
});

export const membershipQueries = buildQueries({
  model: 'Membership',
  workspaceScoped: false,
});

/**
 * API Keys
 */
export const apiKeyCrud = buildCud({
  model: 'ApiKey',
  workspaceScoped: true,
  activeField: 'isActive',
  softDelete: false,
});

export const apiKeyQueries = buildQueries({
  model: 'ApiKey',
  workspaceScoped: true,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

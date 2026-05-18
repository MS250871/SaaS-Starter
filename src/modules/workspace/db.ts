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

export const workspaceDomainDnsRecordCrud = buildCud({
  model: 'WorkspaceDomainDnsRecord',
  workspaceScoped: false,
  softDelete: false,
});

export const workspaceDomainDnsRecordQueries = buildQueries({
  model: 'WorkspaceDomainDnsRecord',
  workspaceScoped: false,
});

/**
 * Workspace Invites
 */
export const workspaceInviteCrud = buildCud({
  model: 'WorkspaceInvite',
  workspaceScoped: false,
  softDelete: false,
});

export const workspaceInviteQueries = buildQueries({
  model: 'WorkspaceInvite',
  workspaceScoped: false,
});

/**
 * Workspace Settings
 */
export const workspaceSettingsCrud = buildCud({
  model: 'WorkspaceSettings',
  workspaceScoped: false,
  softDelete: false,
});

export const workspaceSettingsQueries = buildQueries({
  model: 'WorkspaceSettings',
  workspaceScoped: false,
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

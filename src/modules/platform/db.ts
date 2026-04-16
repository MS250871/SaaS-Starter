import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Platform Invites
 */
export const platformInviteCrud = buildCud({
  model: 'PlatformInvite',
  workspaceScoped: false,
  softDelete: false,
});

export const platformInviteQueries = buildQueries({
  model: 'PlatformInvite',
  workspaceScoped: false,
});

/**
 * Platform Membership (Identity ↔ Platform Role)
 */
export const platformMembershipCrud = buildCud({
  model: 'PlatformMembership',
  workspaceScoped: false,
  softDelete: false,
});

export const platformMembershipQueries = buildQueries({
  model: 'PlatformMembership',
  workspaceScoped: false,
});

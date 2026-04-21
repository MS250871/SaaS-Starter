import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                                  MEDIA                                     */
/* -------------------------------------------------------------------------- */

export const mediaCrud = buildCud({
  model: 'Media',

  // Media can be identity-only, workspace-bound, customer-bound, or global.
  // Let RLS decide access instead of forcing workspace_id in the factory.
  workspaceScoped: false,

  // use status instead of isActive → no soft delete flag here
  softDelete: false,
  activeField: undefined,
});

export const mediaQueries = buildQueries({
  model: 'Media',

  workspaceScoped: false,
});

/* -------------------------------------------------------------------------- */
/*                             FILE ATTACHMENT                                */
/* -------------------------------------------------------------------------- */

export const fileAttachmentCrud = buildCud({
  model: 'FileAttachment',

  // File attachments inherit access from their related media/context.
  workspaceScoped: false,

  softDelete: false,
  activeField: undefined,

  // optional: prevent delete if used elsewhere (future guard)
  guards: [],
});

export const fileAttachmentQueries = buildQueries({
  model: 'FileAttachment',

  workspaceScoped: false,
});

/* -------------------------------------------------------------------------- */
/*                                MEDIA JOB                                   */
/* -------------------------------------------------------------------------- */

export const mediaJobCrud = buildCud({
  model: 'MediaJob',

  // ⚠️ IMPORTANT:
  // MediaJob does NOT have workspaceId directly
  // so DO NOT enable workspaceScoped

  workspaceScoped: false,

  softDelete: false,
  activeField: undefined,
});

export const mediaJobQueries = buildQueries({
  model: 'MediaJob',

  workspaceScoped: false,
});

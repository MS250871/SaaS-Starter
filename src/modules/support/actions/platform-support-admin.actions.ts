'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { logAdminAction } from '@/modules/audit/services/audit.services';
import {
  hasPermission,
} from '@/modules/permissions/services/permissions.services';
import { assertPlatformAccess } from '@/modules/platform/platform-admin-access';
import {
  addWorkspaceSupportTicketInternalNoteActionSchema,
  addWorkspaceSupportTicketReplyActionSchema,
  type AddWorkspaceSupportTicketInternalNoteActionInput,
  type AddWorkspaceSupportTicketReplyActionInput,
  createPlatformSupportTicketActionSchema,
  type CreatePlatformSupportTicketActionInput,
} from '@/modules/support/schema';
import { getSupportAttachmentFiles } from '@/modules/support/services/support-attachments.services';
import { addPlatformSupportTicketInternalNoteWorkflow } from '@/modules/support/workflows/add-platform-support-ticket-internal-note.workflow';
import { addPlatformSupportTicketReplyWorkflow } from '@/modules/support/workflows/add-platform-support-ticket-reply.workflow';
import { createPlatformSupportTicketWorkflow } from '@/modules/support/workflows/create-platform-support-ticket.workflow';
import { updatePlatformSupportTicketAssignmentWorkflow } from '@/modules/support/workflows/update-platform-support-ticket-assignment.workflow';
import { updatePlatformSupportTicketStatusWorkflow } from '@/modules/support/workflows/update-platform-support-ticket-status.workflow';

const supportStatusValues = ['open', 'in_progress', 'resolved', 'closed'] as const;

type SupportStatusValue = (typeof supportStatusValues)[number];

function isSupportStatus(value: string): value is SupportStatusValue {
  return supportStatusValues.includes(value as SupportStatusValue);
}

async function requirePlatformSupportSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAccess({
    roleSystemKeys: session.platformRoleSystemKeys ?? [],
    roleKeys: session.platformRoleKeys ?? [],
  });

  return session;
}

async function logSupportAdminAction(params: {
  session: Awaited<ReturnType<typeof requirePlatformSupportSession>>;
  action: string;
  entityId: string;
  description: string;
}) {
  const requestContext = getRequestContext();

  await logAdminAction({
    adminIdentityId: params.session.identityId,
    adminEmail: null,
    adminRole: params.session.platformRoleSystemKeys?.[0] ?? null,
    action: params.action,
    entityType: 'SupportTicket',
    entityId: params.entityId,
    description: params.description,
    ipAddress: requestContext.ip,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId,
  });
}

function assertCanReplyToSupportTicket(permissions: string[]) {
  if (
    hasPermission(permissions, 'platformSupport.reply') ||
    hasPermission(permissions, 'platformSupport.update') ||
    hasPermission(permissions, 'supportTicket.reply') ||
    hasPermission(permissions, 'supportTicket.update')
  ) {
    return;
  }

  throwError(ERR.FORBIDDEN, 'Permission denied: platformSupport.reply');
}

function assertCanAddSupportInternalNote(permissions: string[]) {
  if (
    hasPermission(permissions, 'platformSupport.update') ||
    hasPermission(permissions, 'supportTicket.internalNote') ||
    hasPermission(permissions, 'supportTicket.update')
  ) {
    return;
  }

  throwError(ERR.FORBIDDEN, 'Permission denied: platformSupport.update');
}

function assertCanCreatePlatformSupportTicket(permissions: string[]) {
  if (
    hasPermission(permissions, 'platformSupport.update') ||
    hasPermission(permissions, 'supportTicket.create')
  ) {
    return;
  }

  throwError(ERR.FORBIDDEN, 'Permission denied: platformSupport.update');
}

const createPlatformSupportTicketActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformSupportSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreatePlatformSupportTicketActionInput =
      createPlatformSupportTicketActionSchema.parse(raw);

    assertCanCreatePlatformSupportTicket(session.permissions);

    const result = await createPlatformSupportTicketWorkflow({
      workspaceId: parsed.workspaceId,
      createdById: session.identityId,
      title: parsed.title,
      body: parsed.body,
      priority: parsed.priority,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    await logSupportAdminAction({
      session,
      action: 'support.ticket.create',
      entityId: result.ticketId,
      description: `Platform escalation created for workspace ${result.workspaceName}.`,
    });

    return {
      ticketId: result.ticketId,
      workspaceId: result.workspaceId,
      successMessage: `Platform escalation created for ${result.workspaceName}.`,
    };
  },
);

const updatePlatformSupportTicketStatusActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformSupportSession();
    assertCanAddSupportInternalNote(session.permissions);

    const ticketId = String(formData.get('ticketId') ?? '').trim();
    const status = String(formData.get('status') ?? '').trim().toLowerCase();

    if (!ticketId) {
      throwError(ERR.INVALID_INPUT, 'Ticket ID is required');
    }

    if (!isSupportStatus(status)) {
      throwError(ERR.INVALID_INPUT, 'A valid ticket status is required');
    }

    const result = await updatePlatformSupportTicketStatusWorkflow({
      ticketId,
      status,
    });

    await logSupportAdminAction({
      session,
      action: 'support.ticket.status.update',
      entityId: result.ticketId,
      description: `Support ticket status updated to ${result.status}.`,
    });

    return {
      ticketId: result.ticketId,
      status: result.status,
      successMessage: `Ticket status updated to ${result.status}.`,
    };
  },
);

const updatePlatformSupportTicketAssignmentActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformSupportSession();
    if (
      !hasPermission(session.permissions, 'platformSupport.assign') &&
      !hasPermission(session.permissions, 'platformSupport.update')
    ) {
      throwError(ERR.FORBIDDEN, 'Permission denied: platformSupport.assign');
    }

    const ticketId = String(formData.get('ticketId') ?? '').trim();
    const assignedToIdRaw = String(formData.get('assignedToId') ?? '').trim();

    if (!ticketId) {
      throwError(ERR.INVALID_INPUT, 'Ticket ID is required');
    }

    const result = await updatePlatformSupportTicketAssignmentWorkflow({
      ticketId,
      assignedToId:
        !assignedToIdRaw || assignedToIdRaw === 'unassigned'
          ? null
          : assignedToIdRaw,
    });

    await logSupportAdminAction({
      session,
      action: result.assignedToId
        ? 'support.ticket.assignment.update'
        : 'support.ticket.assignment.clear',
      entityId: result.ticketId,
      description: result.assigneeName
        ? `Support ticket assigned to ${result.assigneeName}.`
        : 'Support ticket unassigned.',
    });

    return {
      ticketId: result.ticketId,
      assignedToId: result.assignedToId,
      assigneeName: result.assigneeName,
      successMessage: result.assigneeName
        ? `Ticket assigned to ${result.assigneeName}.`
        : 'Ticket unassigned successfully.',
    };
  },
);

const addPlatformSupportTicketReplyActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformSupportSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: AddWorkspaceSupportTicketReplyActionInput =
      addWorkspaceSupportTicketReplyActionSchema.parse(raw);

    assertCanReplyToSupportTicket(session.permissions);

    const result = await addPlatformSupportTicketReplyWorkflow({
      ticketId: parsed.ticketId,
      senderIdentityId: session.identityId,
      message: parsed.message,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    await logSupportAdminAction({
      session,
      action: 'support.ticket.reply.create',
      entityId: result.ticketId,
      description: `Platform reply added to support ticket ${result.title}.`,
    });

    return {
      ticketId: result.ticketId,
      messageId: result.messageId,
      successMessage: `Reply added to ${result.title}.`,
    };
  },
);

const addPlatformSupportTicketInternalNoteActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformSupportSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: AddWorkspaceSupportTicketInternalNoteActionInput =
      addWorkspaceSupportTicketInternalNoteActionSchema.parse(raw);

    assertCanAddSupportInternalNote(session.permissions);

    const result = await addPlatformSupportTicketInternalNoteWorkflow({
      ticketId: parsed.ticketId,
      senderIdentityId: session.identityId,
      message: parsed.message,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    await logSupportAdminAction({
      session,
      action: 'support.ticket.internal-note.create',
      entityId: result.ticketId,
      description: `Platform internal note added to support ticket ${result.title}.`,
    });

    return {
      ticketId: result.ticketId,
      messageId: result.messageId,
      successMessage: `Internal note added to ${result.title}.`,
    };
  },
);

export async function updatePlatformSupportTicketStatusAction(formData: FormData) {
  return updatePlatformSupportTicketStatusActionImpl(formData);
}

export async function createPlatformSupportTicketAction(formData: FormData) {
  return createPlatformSupportTicketActionImpl(formData);
}

export async function updatePlatformSupportTicketAssignmentAction(
  formData: FormData,
) {
  return updatePlatformSupportTicketAssignmentActionImpl(formData);
}

export async function addPlatformSupportTicketReplyAction(formData: FormData) {
  return addPlatformSupportTicketReplyActionImpl(formData);
}

export async function addPlatformSupportTicketInternalNoteAction(
  formData: FormData,
) {
  return addPlatformSupportTicketInternalNoteActionImpl(formData);
}

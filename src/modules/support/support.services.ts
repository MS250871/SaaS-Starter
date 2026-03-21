import {
  supportTicketCrud,
  supportTicketQueries,
  supportTicketMessageCrud,
  supportTicketMessageQueries,
} from '@/modules/support/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { SenderType } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get support ticket by ID
 */
export async function getSupportTicketById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  const ticket = await supportTicketQueries.byId(id);

  if (!ticket) throwError(ERR.NOT_FOUND, 'Support ticket not found');

  return ticket;
}

/**
 * Create support ticket
 */
export async function createSupportTicket(data: CreateInput<'SupportTicket'>) {
  if (!data?.workspaceId || !data?.title || !data?.body) {
    throwError(ERR.INVALID_INPUT, 'Invalid support ticket payload');
  }

  try {
    return await supportTicketCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create support ticket', undefined, e);
  }
}

/**
 * Create workspace support ticket
 */
export async function createWorkspaceSupportTicket(params: {
  workspaceId: string;
  title: string;
  body: string;
  status?: string;
  priority?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
}) {
  if (!params.workspaceId || !params.title || !params.body) {
    throwError(ERR.INVALID_INPUT, 'Invalid support ticket params');
  }

  try {
    return await supportTicketCrud.create({
      workspaceId: params.workspaceId,
      title: params.title,
      body: params.body,
      status: params.status ?? 'open',
      priority: params.priority ?? undefined,
      createdById: params.createdById ?? undefined,
      assignedToId: params.assignedToId ?? undefined,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create workspace ticket', undefined, e);
  }
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(
  id: string,
  data: UpdateInput<'SupportTicket'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  try {
    return await supportTicketCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update ticket', undefined, e);
  }
}

/**
 * Assign support ticket
 */
export async function assignSupportTicket(id: string, assignedToId: string) {
  if (!id || !assignedToId) {
    throwError(ERR.INVALID_INPUT, 'Ticket ID and assignee required');
  }

  try {
    return await supportTicketCrud.update(id, {
      assignedToId,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to assign ticket', undefined, e);
  }
}

/**
 * Unassign support ticket
 */
export async function unassignSupportTicket(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  try {
    return await supportTicketCrud.update(id, {
      assignedToId: null,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to unassign ticket', undefined, e);
  }
}

/**
 * Update status
 */
export async function updateSupportTicketStatus(id: string, status: string) {
  if (!id || !status) {
    throwError(ERR.INVALID_INPUT, 'Ticket ID and status required');
  }

  try {
    return await supportTicketCrud.update(id, {
      status,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update ticket status', undefined, e);
  }
}

/**
 * Update priority
 */
export async function updateSupportTicketPriority(
  id: string,
  priority: string | null,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  try {
    return await supportTicketCrud.update(id, {
      priority: priority ?? null,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update ticket priority', undefined, e);
  }
}

/**
 * Delete support ticket
 */
export async function deleteSupportTicket(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  try {
    return await supportTicketCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete ticket', undefined, e);
  }
}

/**
 * List workspace support tickets
 */
export async function listWorkspaceSupportTickets(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  return supportTicketQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List created tickets
 */
export async function listCreatedSupportTickets(createdById: string) {
  if (!createdById) {
    throwError(ERR.INVALID_INPUT, 'createdById is required');
  }

  return supportTicketQueries.many({
    where: {
      createdById,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List assigned tickets
 */
export async function listAssignedSupportTickets(assignedToId: string) {
  if (!assignedToId) {
    throwError(ERR.INVALID_INPUT, 'assignedToId is required');
  }

  return supportTicketQueries.many({
    where: {
      assignedToId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * =========================
 * Support Ticket Messages
 * =========================
 */

export async function getSupportTicketMessageById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Message ID is required');

  const msg = await supportTicketMessageQueries.byId(id);

  if (!msg) throwError(ERR.NOT_FOUND, 'Message not found');

  return msg;
}

export async function createSupportTicketMessage(
  data: CreateInput<'SupportTicketMessage'>,
) {
  if (!data?.ticketId || !data?.workspaceId || !data?.message) {
    throwError(ERR.INVALID_INPUT, 'Invalid message payload');
  }

  try {
    return await supportTicketMessageCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create message', undefined, e);
  }
}

export async function addSupportTicketReply(params: {
  ticketId: string;
  workspaceId: string;
  senderType: SenderType;
  senderId?: string | null;
  message: string;
  attachments?: Prisma.InputJsonValue;
}) {
  if (!params.ticketId || !params.workspaceId || !params.message) {
    throwError(ERR.INVALID_INPUT, 'Invalid reply params');
  }

  try {
    return await supportTicketMessageCrud.create({
      ticketId: params.ticketId,
      workspaceId: params.workspaceId,
      senderType: params.senderType,
      senderId: params.senderId ?? undefined,
      message: params.message,
      attachments: params.attachments,
      isInternalNote: false,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to add reply', undefined, e);
  }
}

export async function addSupportTicketInternalNote(params: {
  ticketId: string;
  workspaceId: string;
  senderId?: string | null;
  message: string;
  attachments?: Prisma.InputJsonValue;
}) {
  if (!params.ticketId || !params.workspaceId || !params.message) {
    throwError(ERR.INVALID_INPUT, 'Invalid internal note params');
  }

  try {
    return await supportTicketMessageCrud.create({
      ticketId: params.ticketId,
      workspaceId: params.workspaceId,
      senderType: SenderType.SYSTEM,
      senderId: params.senderId ?? undefined,
      message: params.message,
      attachments: params.attachments,
      isInternalNote: true,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to add internal note', undefined, e);
  }
}

export async function updateSupportTicketMessage(
  id: string,
  data: UpdateInput<'SupportTicketMessage'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Message ID is required');

  try {
    return await supportTicketMessageCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update message', undefined, e);
  }
}

export async function deleteSupportTicketMessage(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Message ID is required');

  try {
    return await supportTicketMessageCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete message', undefined, e);
  }
}

export async function listSupportTicketMessages(ticketId: string) {
  if (!ticketId) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  return supportTicketMessageQueries.many({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listSupportTicketReplies(ticketId: string) {
  if (!ticketId) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  return supportTicketMessageQueries.many({
    where: {
      ticketId,
      isInternalNote: false,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listSupportTicketInternalNotes(ticketId: string) {
  if (!ticketId) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  return supportTicketMessageQueries.many({
    where: {
      ticketId,
      isInternalNote: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

import {
  supportTicketCrud,
  supportTicketQueries,
  supportTicketMessageCrud,
  supportTicketMessageQueries,
} from '@/modules/support/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { SenderType } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

/**
 * =========================
 * Support Ticket
 * =========================
 */

/**
 * Get support ticket by ID
 */
export async function getSupportTicketById(id: string) {
  return supportTicketQueries.byId(id);
}

/**
 * Create support ticket
 */
export async function createSupportTicket(data: CreateInput<'SupportTicket'>) {
  return supportTicketCrud.create(data);
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
  return supportTicketCrud.create({
    workspaceId: params.workspaceId,
    title: params.title,
    body: params.body,
    status: params.status ?? 'open',
    priority: params.priority ?? undefined,
    createdById: params.createdById ?? undefined,
    assignedToId: params.assignedToId ?? undefined,
  });
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(
  id: string,
  data: UpdateInput<'SupportTicket'>,
) {
  return supportTicketCrud.update(id, data);
}

/**
 * Assign support ticket
 */
export async function assignSupportTicket(id: string, assignedToId: string) {
  return supportTicketCrud.update(id, {
    assignedToId,
  });
}

/**
 * Unassign support ticket
 */
export async function unassignSupportTicket(id: string) {
  return supportTicketCrud.update(id, {
    assignedToId: null,
  });
}

/**
 * Change support ticket status
 */
export async function updateSupportTicketStatus(id: string, status: string) {
  return supportTicketCrud.update(id, {
    status,
  });
}

/**
 * Change support ticket priority
 */
export async function updateSupportTicketPriority(
  id: string,
  priority: string | null,
) {
  return supportTicketCrud.update(id, {
    priority: priority ?? null,
  });
}

/**
 * Delete support ticket
 */
export async function deleteSupportTicket(id: string) {
  return supportTicketCrud.delete(id);
}

/**
 * List workspace support tickets
 */
export async function listWorkspaceSupportTickets(workspaceId: string) {
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
 * List tickets created by identity
 */
export async function listCreatedSupportTickets(createdById: string) {
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
 * List tickets assigned to identity
 */
export async function listAssignedSupportTickets(assignedToId: string) {
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

/**
 * Get support ticket message by ID
 */
export async function getSupportTicketMessageById(id: string) {
  return supportTicketMessageQueries.byId(id);
}

/**
 * Create support ticket message
 */
export async function createSupportTicketMessage(
  data: CreateInput<'SupportTicketMessage'>,
) {
  return supportTicketMessageCrud.create(data);
}

/**
 * Add ticket reply
 */
export async function addSupportTicketReply(params: {
  ticketId: string;
  workspaceId: string;
  senderType: SenderType;
  senderId?: string | null;
  message: string;
  attachments?: Prisma.InputJsonValue;
}) {
  return supportTicketMessageCrud.create({
    ticketId: params.ticketId,
    workspaceId: params.workspaceId,
    senderType: params.senderType,
    senderId: params.senderId ?? undefined,
    message: params.message,
    attachments: params.attachments,
    isInternalNote: false,
  });
}

/**
 * Add internal note
 */
export async function addSupportTicketInternalNote(params: {
  ticketId: string;
  workspaceId: string;
  senderId?: string | null;
  message: string;
  attachments?: Prisma.InputJsonValue;
}) {
  return supportTicketMessageCrud.create({
    ticketId: params.ticketId,
    workspaceId: params.workspaceId,
    senderType: SenderType.SYSTEM,
    senderId: params.senderId ?? undefined,
    message: params.message,
    attachments: params.attachments,
    isInternalNote: true,
  });
}

/**
 * Update support ticket message
 */
export async function updateSupportTicketMessage(
  id: string,
  data: UpdateInput<'SupportTicketMessage'>,
) {
  return supportTicketMessageCrud.update(id, data);
}

/**
 * Delete support ticket message
 */
export async function deleteSupportTicketMessage(id: string) {
  return supportTicketMessageCrud.delete(id);
}

/**
 * List all messages for a ticket
 */
export async function listSupportTicketMessages(ticketId: string) {
  return supportTicketMessageQueries.many({
    where: {
      ticketId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * List public messages only
 */
export async function listSupportTicketReplies(ticketId: string) {
  return supportTicketMessageQueries.many({
    where: {
      ticketId,
      isInternalNote: false,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * List internal notes only
 */
export async function listSupportTicketInternalNotes(ticketId: string) {
  return supportTicketMessageQueries.many({
    where: {
      ticketId,
      isInternalNote: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

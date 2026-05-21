import {
  supportTicketCrud,
  supportTicketMessageCrud,
  supportTicketQueries,
  supportTicketMessageQueries,
} from '@/modules/support/db';
import { listIdentityDisplayProfilesByIds } from '@/modules/auth/services/identity.services';
import { listCustomerIdentityProfilesByIds } from '@/modules/customer/services/customer.services';
import { listFileAttachmentsByEntityIds } from '@/modules/media/media.services';
import { listActivePlatformMembershipsByIdentityIds } from '@/modules/platform/services/membership.services';
import {
  assertPlatformOwnedSupportContext,
  assertWorkspaceOwnedSupportContext,
} from '@/modules/support/support-ownership';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { SenderType, SupportContextType } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type SupportIdentityProfile = Awaited<
  ReturnType<typeof listIdentityDisplayProfilesByIds>
>[number];
type SupportCustomerProfile = Awaited<
  ReturnType<typeof listCustomerIdentityProfilesByIds>
>[number];
type SupportPlatformMembership = Awaited<
  ReturnType<typeof listActivePlatformMembershipsByIdentityIds>
>[number];
type SupportAttachment = Awaited<
  ReturnType<typeof listFileAttachmentsByEntityIds>
>[number];
type SupportMessageCountGroup = {
  ticketId: string;
  _count: {
    _all: number;
  };
};
type SupportThreadMessage = {
  id: string;
  senderType: SenderType;
  senderIdentityId: string | null;
  senderCustomerId: string | null;
  message: string;
  isInternalNote: boolean;
  createdAt: Date;
};

export type WorkspaceSupportThreadSnapshot = {
  ticket: {
    id: string;
    contextType: string;
    title: string;
    body: string;
    status: string;
    priority: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    createdByCustomerId: string | null;
    assignedToId: string | null;
  };
  messages: SupportThreadMessage[];
  messageIdentities: SupportIdentityProfile[];
  messageCustomers: SupportCustomerProfile[];
  platformMemberships: SupportPlatformMembership[];
  ticketAttachments: SupportAttachment[];
  messageAttachments: SupportAttachment[];
};

/**
 * Get support ticket by ID
 */
export async function getSupportTicketById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Ticket ID is required');

  const ticket = await supportTicketQueries.findUnique({
    where: { id },
  });

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
      contextType: SupportContextType.WORKSPACE,
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

export async function createPlatformSupportTicket(params: {
  workspaceId: string;
  title: string;
  body: string;
  status?: string;
  priority?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
}) {
  if (!params.workspaceId || !params.title || !params.body) {
    throwError(ERR.INVALID_INPUT, 'Invalid platform support ticket params');
  }

  try {
    return await supportTicketCrud.create({
      workspaceId: params.workspaceId,
      contextType: SupportContextType.PLATFORM,
      title: params.title,
      body: params.body,
      status: params.status ?? 'open',
      priority: params.priority ?? undefined,
      createdById: params.createdById ?? undefined,
      assignedToId: params.assignedToId ?? undefined,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create platform ticket', undefined, e);
  }
}

export async function createCustomerSupportTicket(params: {
  workspaceId: string;
  customerId: string;
  title: string;
  body: string;
  status?: string;
  priority?: string | null;
  assignedToId?: string | null;
}) {
  if (!params.workspaceId || !params.customerId || !params.title || !params.body) {
    throwError(ERR.INVALID_INPUT, 'Invalid customer support ticket params');
  }

  try {
    return await supportTicketCrud.create({
      workspaceId: params.workspaceId,
      contextType: SupportContextType.CUSTOMER,
      createdByCustomerId: params.customerId,
      title: params.title,
      body: params.body,
      status: params.status ?? 'open',
      priority: params.priority ?? undefined,
      assignedToId: params.assignedToId ?? undefined,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create customer ticket', undefined, e);
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

export async function getWorkspaceSupportTicketById(
  workspaceId: string,
  ticketId: string,
) {
  if (!workspaceId || !ticketId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and ticketId are required');
  }

  const ticket = await supportTicketQueries.findFirst({
    where: {
      id: ticketId,
      workspaceId,
    },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      status: true,
      contextType: true,
    },
  });

  if (!ticket) {
    throwError(ERR.NOT_FOUND, 'Support ticket not found for this workspace');
  }

  return ticket;
}

export async function getWorkspaceManagedSupportTicketById(
  workspaceId: string,
  ticketId: string,
) {
  const ticket = await getWorkspaceSupportTicketById(workspaceId, ticketId);
  assertWorkspaceOwnedSupportContext(ticket.contextType);
  return ticket;
}

export async function getPlatformManagedSupportTicketById(ticketId: string) {
  const ticket = await getSupportTicketById(ticketId);
  assertPlatformOwnedSupportContext(ticket.contextType);
  return ticket;
}

export async function getCustomerSupportTicketById(params: {
  workspaceId: string;
  customerId: string;
  ticketId: string;
}) {
  if (!params.workspaceId || !params.customerId || !params.ticketId) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId, customerId, and ticketId are required',
    );
  }

  const ticket = await supportTicketQueries.findFirst({
    where: {
      id: params.ticketId,
      workspaceId: params.workspaceId,
      createdByCustomerId: params.customerId,
      contextType: SupportContextType.CUSTOMER,
    },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      status: true,
      contextType: true,
      createdByCustomerId: true,
      assignedToId: true,
    },
  });

  if (!ticket) {
    throwError(ERR.NOT_FOUND, 'Support ticket not found for this customer');
  }

  return ticket;
}

/**
 * =========================
 * Support Ticket Messages
 * =========================
 */

export async function getSupportTicketMessageById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Message ID is required');

  const msg = await supportTicketMessageQueries.findUnique({
    where: { id },
  });

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
    const senderFields =
      params.senderType === SenderType.IDENTITY
        ? { senderIdentityId: params.senderId ?? undefined }
        : params.senderType === SenderType.CUSTOMER
          ? { senderCustomerId: params.senderId ?? undefined }
          : {};

    return await supportTicketMessageCrud.create({
      ticketId: params.ticketId,
      workspaceId: params.workspaceId,
      senderType: params.senderType,
      ...senderFields,
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
      senderType: SenderType.IDENTITY,
      senderIdentityId: params.senderId ?? undefined,
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

export async function getWorkspaceSupportSummary(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  const openStatuses = ['open', 'in_progress'];

  const [
    totalWorkspaceTickets,
    totalPlatformEscalations,
    openWorkspaceTickets,
    openPlatformEscalations,
  ] = await Promise.all([
    supportTicketQueries.count({
      where: {
        workspaceId,
        contextType: {
          not: 'PLATFORM',
        },
      },
    }),
    supportTicketQueries.count({
      where: {
        workspaceId,
        contextType: 'PLATFORM',
      },
    }),
    supportTicketQueries.count({
      where: {
        workspaceId,
        contextType: {
          not: 'PLATFORM',
        },
        status: {
          in: openStatuses,
        },
      },
    }),
    supportTicketQueries.count({
      where: {
        workspaceId,
        contextType: 'PLATFORM',
        status: {
          in: openStatuses,
        },
      },
    }),
  ]);

  return {
    openWorkspaceTickets,
    openPlatformEscalations,
    totalWorkspaceTickets,
    totalPlatformEscalations,
  };
}

export async function getCustomerSupportSummary(params: {
  workspaceId: string;
  customerId: string;
}) {
  if (!params.workspaceId || !params.customerId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and customerId are required');
  }

  const openStatuses = ['open', 'in_progress'];

  const [totalTickets, openTickets] = await Promise.all([
    supportTicketQueries.count({
      where: {
        workspaceId: params.workspaceId,
        createdByCustomerId: params.customerId,
        contextType: SupportContextType.CUSTOMER,
      },
    }),
    supportTicketQueries.count({
      where: {
        workspaceId: params.workspaceId,
        createdByCustomerId: params.customerId,
        contextType: SupportContextType.CUSTOMER,
        status: {
          in: openStatuses,
        },
      },
    }),
  ]);

  return {
    totalTickets,
    openTickets,
  };
}

function resolveWorkspaceSupportSenderName(params: {
  identity?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  customer?: {
    identity: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    };
  } | null;
}) {
  if (params.customer) {
    return (
      `${params.customer.identity.firstName ?? ''} ${params.customer.identity.lastName ?? ''}`.trim() ||
      params.customer.identity.email ||
      'Customer'
    );
  }

  if (params.identity) {
    return (
      `${params.identity.firstName ?? ''} ${params.identity.lastName ?? ''}`.trim() ||
      params.identity.email ||
      'Workspace member'
    );
  }

  return 'System';
}

export async function hydrateWorkspaceSupportTicketListItems(
  tickets: Array<{
    id: string;
    contextType: string;
    title: string;
    body: string;
    status: string;
    priority: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    createdByCustomerId: string | null;
    assignedToId: string | null;
  }>,
) {
  const createdByIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.createdById)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const createdByCustomerIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.createdByCustomerId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const assignedToIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.assignedToId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [identities, customers, messageCounts]: [
    SupportIdentityProfile[],
    SupportCustomerProfile[],
    SupportMessageCountGroup[],
  ] = await Promise.all([
    createdByIds.length + assignedToIds.length > 0
      ? listIdentityDisplayProfilesByIds(
          Array.from(new Set([...createdByIds, ...assignedToIds])),
        )
      : Promise.resolve([] as SupportIdentityProfile[]),
    createdByCustomerIds.length > 0
      ? listCustomerIdentityProfilesByIds(createdByCustomerIds)
      : Promise.resolve([] as SupportCustomerProfile[]),
    tickets.length > 0
      ? (supportTicketMessageQueries.delegate.groupBy({
          by: ['ticketId'],
          where: {
            ticketId: {
              in: tickets.map((ticket) => ticket.id),
            },
          },
          _count: {
            _all: true,
          },
        }) as unknown as Promise<SupportMessageCountGroup[]>)
      : Promise.resolve([] as SupportMessageCountGroup[]),
  ]);

  const identityMap = new Map(
    identities.map((identity: SupportIdentityProfile) => [identity.id, identity]),
  );
  const customerMap = new Map(
    customers.map((customer: SupportCustomerProfile) => [customer.id, customer]),
  );
  const messageCountMap = new Map(
    messageCounts.map((count: SupportMessageCountGroup) => [
      count.ticketId,
      count._count._all,
    ]),
  );

  return tickets.map((ticket) => {
    const createdBy = ticket.createdById
      ? identityMap.get(ticket.createdById)
      : null;
    const createdByCustomer = ticket.createdByCustomerId
      ? customerMap.get(ticket.createdByCustomerId)
      : null;
    const assignedTo = ticket.assignedToId
      ? identityMap.get(ticket.assignedToId)
      : null;

    return {
      id: ticket.id,
      contextType: ticket.contextType,
      title: ticket.title,
      body: ticket.body,
      status: ticket.status,
      priority: ticket.priority ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messageCount: messageCountMap.get(ticket.id) ?? 0,
      createdById: ticket.createdById ?? null,
      createdByCustomerId: ticket.createdByCustomerId ?? null,
      createdByName: createdBy
        ? resolveWorkspaceSupportSenderName({ identity: createdBy })
        : null,
      createdByCustomerName: createdByCustomer
        ? resolveWorkspaceSupportSenderName({ customer: createdByCustomer })
        : null,
      assignedToId: ticket.assignedToId ?? null,
      assignedToName: assignedTo
        ? resolveWorkspaceSupportSenderName({ identity: assignedTo })
        : null,
    };
  });
}

export async function listWorkspaceSupportQueueTickets(params: {
  workspaceId: string;
  queue: 'workspace' | 'platform';
  page: number;
  pageSize: number;
}) {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  const queueWhere =
    params.queue === 'platform'
      ? {
          workspaceId: params.workspaceId,
          contextType: 'PLATFORM' as const,
        }
      : {
          workspaceId: params.workspaceId,
          contextType: {
            not: 'PLATFORM' as const,
          },
        };

  const [totalItems, tickets] = await Promise.all([
    supportTicketQueries.count({
      where: {
        ...queueWhere,
      },
    }),
    supportTicketQueries.many({
      where: {
        ...queueWhere,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        contextType: true,
        title: true,
        body: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        createdByCustomerId: true,
        assignedToId: true,
      },
    }),
  ]);

  return {
    totalItems,
    tickets,
  };
}

export async function listWorkspaceSupportQueueTicketSnapshots(params: {
  workspaceId: string;
  queue: 'workspace' | 'platform';
  limit?: number;
}) {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  const queueWhere =
    params.queue === 'platform'
      ? {
          workspaceId: params.workspaceId,
          contextType: 'PLATFORM' as const,
        }
      : {
          workspaceId: params.workspaceId,
          contextType: {
            not: 'PLATFORM' as const,
          },
        };

  return supportTicketQueries.many({
    where: {
      ...queueWhere,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: params.limit ?? 500,
    select: {
      id: true,
      contextType: true,
      title: true,
      body: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      createdByCustomerId: true,
      assignedToId: true,
    },
  });
}

export async function listCustomerSupportQueueTickets(params: {
  workspaceId: string;
  customerId: string;
  page: number;
  pageSize: number;
}) {
  if (!params.workspaceId || !params.customerId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and customerId are required');
  }

  const [totalItems, tickets] = await Promise.all([
    supportTicketQueries.count({
      where: {
        workspaceId: params.workspaceId,
        createdByCustomerId: params.customerId,
        contextType: SupportContextType.CUSTOMER,
      },
    }),
    supportTicketQueries.many({
      where: {
        workspaceId: params.workspaceId,
        createdByCustomerId: params.customerId,
        contextType: SupportContextType.CUSTOMER,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        contextType: true,
        title: true,
        body: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        createdByCustomerId: true,
        assignedToId: true,
      },
    }),
  ]);

  return {
    totalItems,
    tickets,
  };
}

export async function getWorkspaceSupportThreadSnapshot(
  workspaceId: string,
  ticketId: string,
): Promise<WorkspaceSupportThreadSnapshot | null> {
  if (!workspaceId || !ticketId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and ticketId are required');
  }

  const ticket = await supportTicketQueries.findFirst({
    where: {
      id: ticketId,
      workspaceId,
    },
    select: {
      id: true,
      contextType: true,
      title: true,
      body: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      createdByCustomerId: true,
      assignedToId: true,
    },
  });

  if (!ticket) {
    return null;
  }

  const messages: SupportThreadMessage[] = await supportTicketMessageQueries.many({
    where: {
      ticketId: ticket.id,
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      senderType: true,
      senderIdentityId: true,
      senderCustomerId: true,
      message: true,
      isInternalNote: true,
      createdAt: true,
    },
  });

  const messageIdentityIds = Array.from(
    new Set(
      messages
        .map((message) => message.senderIdentityId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const messageCustomerIds = Array.from(
    new Set(
      messages
        .map((message) => message.senderCustomerId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [
    messageIdentities,
    messageCustomers,
    platformMemberships,
    ticketAttachments,
    messageAttachments,
  ]: [
    SupportIdentityProfile[],
    SupportCustomerProfile[],
    SupportPlatformMembership[],
    SupportAttachment[],
    SupportAttachment[],
  ] = await Promise.all([
    messageIdentityIds.length > 0
      ? listIdentityDisplayProfilesByIds(messageIdentityIds)
      : Promise.resolve([] as SupportIdentityProfile[]),
    messageCustomerIds.length > 0
      ? listCustomerIdentityProfilesByIds(messageCustomerIds)
      : Promise.resolve([] as SupportCustomerProfile[]),
    messageIdentityIds.length > 0
      ? listActivePlatformMembershipsByIdentityIds(messageIdentityIds)
      : Promise.resolve([] as SupportPlatformMembership[]),
    listFileAttachmentsByEntityIds({
      entityType: 'SUPPORT_TICKET',
      entityIds: [ticket.id],
      orderByCreatedAt: 'asc',
    }),
    messages.length > 0
      ? listFileAttachmentsByEntityIds({
          entityType: 'SUPPORT_TICKET_MESSAGE',
          entityIds: messages.map((message: SupportThreadMessage) => message.id),
          orderByCreatedAt: 'asc',
        })
      : Promise.resolve([] as SupportAttachment[]),
  ]);

  return {
    ticket,
    messages,
    messageIdentities,
    messageCustomers,
    platformMemberships,
    ticketAttachments,
    messageAttachments,
  };
}

export type PlatformSupportTicketAdminSnapshot = Prisma.SupportTicketGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    createdByCustomerId: true;
    contextType: true;
    createdById: true;
    assignedToId: true;
    title: true;
    body: true;
    status: true;
    priority: true;
    createdAt: true;
    updatedAt: true;
    workspace: {
      select: {
        id: true;
        name: true;
        slug: true;
        isActive: true;
      };
    };
    createdBy: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    createdByCustomer: {
      select: {
        id: true;
        externalId: true;
        identity: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
          };
        };
      };
    };
    assignedTo: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    _count: {
      select: {
        messages: true;
      };
    };
  };
}>;

function buildPlatformSupportTicketAdminSelect() {
  return {
    id: true,
    workspaceId: true,
    createdByCustomerId: true,
    contextType: true,
    createdById: true,
    assignedToId: true,
    title: true,
    body: true,
    status: true,
    priority: true,
    createdAt: true,
    updatedAt: true,
    workspace: {
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    createdByCustomer: {
      select: {
        id: true,
        externalId: true,
        identity: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
    assignedTo: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    _count: {
      select: {
        messages: true,
      },
    },
  } satisfies Prisma.SupportTicketSelect;
}

export async function listPlatformSupportTicketAdminSnapshots(opts?: {
  limit?: number;
}): Promise<PlatformSupportTicketAdminSnapshot[]> {
  const tickets = await supportTicketQueries.delegate.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: opts?.limit ?? 500,
    select: buildPlatformSupportTicketAdminSelect(),
  });

  return tickets as PlatformSupportTicketAdminSnapshot[];
}

export async function getPlatformSupportTicketAdminSnapshot(
  ticketId: string,
): Promise<PlatformSupportTicketAdminSnapshot> {
  if (!ticketId) {
    throwError(ERR.INVALID_INPUT, 'Ticket ID is required');
  }

  const ticket = await supportTicketQueries.delegate.findUnique({
    where: { id: ticketId },
    select: buildPlatformSupportTicketAdminSelect(),
  });

  if (!ticket) {
    throwError(ERR.NOT_FOUND, 'Support ticket not found');
  }

  return ticket as PlatformSupportTicketAdminSnapshot;
}

export async function getPlatformSupportTicketThreadSnapshot(
  ticketId: string,
): Promise<WorkspaceSupportThreadSnapshot | null> {
  if (!ticketId) {
    throwError(ERR.INVALID_INPUT, 'ticketId is required');
  }

  const ticket = await supportTicketQueries.findUnique({
    where: {
      id: ticketId,
    },
    select: {
      id: true,
      contextType: true,
      title: true,
      body: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      createdByCustomerId: true,
      assignedToId: true,
    },
  });

  if (!ticket) {
    return null;
  }

  const messages: SupportThreadMessage[] = await supportTicketMessageQueries.many({
    where: {
      ticketId: ticket.id,
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      senderType: true,
      senderIdentityId: true,
      senderCustomerId: true,
      message: true,
      isInternalNote: true,
      createdAt: true,
    },
  });

  const messageIdentityIds = Array.from(
    new Set(
      messages
        .map((message) => message.senderIdentityId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const messageCustomerIds = Array.from(
    new Set(
      messages
        .map((message) => message.senderCustomerId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [
    messageIdentities,
    messageCustomers,
    platformMemberships,
    ticketAttachments,
    messageAttachments,
  ]: [
    SupportIdentityProfile[],
    SupportCustomerProfile[],
    SupportPlatformMembership[],
    SupportAttachment[],
    SupportAttachment[],
  ] = await Promise.all([
    messageIdentityIds.length > 0
      ? listIdentityDisplayProfilesByIds(messageIdentityIds)
      : Promise.resolve([] as SupportIdentityProfile[]),
    messageCustomerIds.length > 0
      ? listCustomerIdentityProfilesByIds(messageCustomerIds)
      : Promise.resolve([] as SupportCustomerProfile[]),
    messageIdentityIds.length > 0
      ? listActivePlatformMembershipsByIdentityIds(messageIdentityIds)
      : Promise.resolve([] as SupportPlatformMembership[]),
    listFileAttachmentsByEntityIds({
      entityType: 'SUPPORT_TICKET',
      entityIds: [ticket.id],
      orderByCreatedAt: 'asc',
    }),
    messages.length > 0
      ? listFileAttachmentsByEntityIds({
          entityType: 'SUPPORT_TICKET_MESSAGE',
          entityIds: messages.map((message: SupportThreadMessage) => message.id),
          orderByCreatedAt: 'asc',
        })
      : Promise.resolve([] as SupportAttachment[]),
  ]);

  return {
    ticket,
    messages,
    messageIdentities,
    messageCustomers,
    platformMemberships,
    ticketAttachments,
    messageAttachments,
  };
}

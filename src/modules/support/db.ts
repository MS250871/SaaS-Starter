import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Support Tickets
 */

export const supportTicketCrud = buildCud({
  model: 'SupportTicket',
  workspaceScoped: true,
  softDelete: false,
});

export const supportTicketQueries = buildQueries({
  model: 'SupportTicket',
  workspaceScoped: true,
});

/**
 * Support Ticket Messages
 */

export const supportTicketMessageCrud = buildCud({
  model: 'SupportTicketMessage',
  workspaceScoped: false,
  softDelete: false,
});

export const supportTicketMessageQueries = buildQueries({
  model: 'SupportTicketMessage',
  workspaceScoped: false,
});

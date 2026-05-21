import { z } from 'zod';

export const createWorkspaceSupportTicketActionSchema = z.object({
  target: z.enum(['customer', 'platform']),
  customerId: z.string().uuid('Select a customer').or(z.literal('')).optional(),
  title: z.string().trim().min(3, 'Title is too short').max(160, 'Title is too long'),
  body: z.string().trim().min(10, 'Add a little more detail').max(5000, 'Message is too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
}).superRefine((data, ctx) => {
  if (data.target === 'customer' && !data.customerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerId'],
      message: 'Select a customer',
    });
  }
});

export type CreateWorkspaceSupportTicketActionInput = z.input<
  typeof createWorkspaceSupportTicketActionSchema
>;

export const createPlatformSupportTicketActionSchema = z.object({
  workspaceId: z.string().uuid('Select a workspace'),
  title: z.string().trim().min(3, 'Title is too short').max(160, 'Title is too long'),
  body: z.string().trim().min(10, 'Add a little more detail').max(5000, 'Message is too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export type CreatePlatformSupportTicketActionInput = z.input<
  typeof createPlatformSupportTicketActionSchema
>;

export const createCustomerSupportTicketActionSchema = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(160, 'Title is too long'),
  body: z.string().trim().min(10, 'Add a little more detail').max(5000, 'Message is too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export type CreateCustomerSupportTicketActionInput = z.input<
  typeof createCustomerSupportTicketActionSchema
>;

export const updateWorkspaceSupportTicketStatusActionSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket id'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

export type UpdateWorkspaceSupportTicketStatusActionInput = z.input<
  typeof updateWorkspaceSupportTicketStatusActionSchema
>;

export const updateWorkspaceSupportTicketAssignmentActionSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket id'),
  assignedToId: z.union([
    z.string().uuid('Invalid assignee id'),
    z.literal('unassigned'),
  ]),
});

export type UpdateWorkspaceSupportTicketAssignmentActionInput = z.input<
  typeof updateWorkspaceSupportTicketAssignmentActionSchema
>;

export const addWorkspaceSupportTicketReplyActionSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket id'),
  message: z
    .string()
    .trim()
    .min(2, 'Reply is too short')
    .max(5000, 'Reply is too long'),
});

export type AddWorkspaceSupportTicketReplyActionInput = z.input<
  typeof addWorkspaceSupportTicketReplyActionSchema
>;

export const addCustomerSupportTicketReplyActionSchema =
  addWorkspaceSupportTicketReplyActionSchema;

export type AddCustomerSupportTicketReplyActionInput = z.input<
  typeof addCustomerSupportTicketReplyActionSchema
>;

export const addWorkspaceSupportTicketInternalNoteActionSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket id'),
  message: z
    .string()
    .trim()
    .min(2, 'Internal note is too short')
    .max(5000, 'Internal note is too long'),
});

export type AddWorkspaceSupportTicketInternalNoteActionInput = z.input<
  typeof addWorkspaceSupportTicketInternalNoteActionSchema
>;

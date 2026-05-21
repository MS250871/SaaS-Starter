import { z } from 'zod';

const workspaceNotificationBaseSchema = z.object({
  audience: z.enum(['workspace', 'customer']),
  deliveryChannel: z.enum(['IN_APP', 'EMAIL']),
  recipientMode: z.enum(['all', 'single']),
  recipientId: z.string().trim().optional().or(z.literal('')),
  title: z
    .string()
    .trim()
    .min(3, 'Title is too short')
    .max(160, 'Title is too long'),
  body: z
    .string()
    .trim()
    .min(10, 'Add a little more detail')
    .max(5000, 'Message is too long'),
});

function validateNotificationRecipient(
  data: { recipientMode: 'all' | 'single'; recipientId?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.recipientMode === 'single' && !data.recipientId?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['recipientId'],
      message: 'Select a recipient',
    });
  }
}

export const sendWorkspaceNotificationActionSchema =
  workspaceNotificationBaseSchema.superRefine(validateNotificationRecipient);

export type SendWorkspaceNotificationActionInput = z.input<
  typeof sendWorkspaceNotificationActionSchema
>;

export const sendPlatformWorkspaceNotificationActionSchema =
  workspaceNotificationBaseSchema
    .extend({
      workspaceId: z.string().uuid('Select a valid workspace'),
    })
    .superRefine(validateNotificationRecipient);

export type SendPlatformWorkspaceNotificationActionInput = z.input<
  typeof sendPlatformWorkspaceNotificationActionSchema
>;

export const markWorkspaceNotificationReadActionSchema = z.object({
  notificationId: z.string().uuid('Invalid notification id'),
});

export type MarkWorkspaceNotificationReadActionInput = z.input<
  typeof markWorkspaceNotificationReadActionSchema
>;

import { z } from 'zod';

export const billingCheckoutModeSchema = z.enum(['subscription', 'one_time']);
export type BillingCheckoutMode = z.infer<typeof billingCheckoutModeSchema>;

export const billingIntervalSchema = z.enum(['MONTHLY', 'YEARLY']);
export type BillingIntervalInput = z.infer<typeof billingIntervalSchema>;

export const billingCheckoutSourceSchema = z
  .enum([
    'signup',
    'workspace-features',
    'workspace-domains',
    'workspace-billing',
  ])
  .optional();
export type BillingCheckoutSource = Exclude<
  z.infer<typeof billingCheckoutSourceSchema>,
  undefined
>;

export const createBillingCheckoutActionSchema = z
  .object({
    mode: billingCheckoutModeSchema,
    planKey: z.string().trim().optional(),
    priceId: z.string().uuid('Invalid price id').optional(),
    productCode: z.string().trim().optional(),
    interval: billingIntervalSchema.optional(),
    source: billingCheckoutSourceSchema,
    upgrade: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'subscription') {
      if (!value.planKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['planKey'],
          message: 'Plan key is required for subscription checkout.',
        });
      }

      if (!value.interval && !value.priceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['interval'],
          message: 'Select a billing interval for subscription checkout.',
        });
      }
    }

    if (value.mode === 'one_time' && !value.priceId && !value.productCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productCode'],
        message: 'A one-time product or price is required.',
      });
    }
  });

export type CreateBillingCheckoutActionInput = z.infer<
  typeof createBillingCheckoutActionSchema
>;

export const verifyBillingPaymentActionSchema = z.object({
  paymentId: z.string().uuid('Invalid payment id'),
  mode: billingCheckoutModeSchema,
  razorpayPaymentId: z.string().trim().min(1, 'Payment id is required'),
  razorpaySignature: z.string().trim().min(1, 'Signature is required'),
  razorpayOrderId: z.string().trim().optional(),
  razorpaySubscriptionId: z.string().trim().optional(),
  source: billingCheckoutSourceSchema,
});

export type VerifyBillingPaymentActionInput = z.infer<
  typeof verifyBillingPaymentActionSchema
>;

export const changeWorkspacePlanActionSchema = z.object({
  targetPlanKey: z.enum(['trial']),
  source: billingCheckoutSourceSchema,
});

export type ChangeWorkspacePlanActionInput = z.infer<
  typeof changeWorkspacePlanActionSchema
>;

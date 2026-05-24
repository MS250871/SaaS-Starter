'use server'

import { getUserSession } from '@/lib/auth/auth-cookies'
import { ERR } from '@/lib/errors/codes'
import { throwError } from '@/lib/errors/app-error'
import { createTxAction } from '@/lib/http/create-action'
import { invalidateWorkspaceBillingCaches } from '@/modules/billing/services/billing-cache.services'
import {
  platformBillingCancelSubscriptionActionSchema,
  platformBillingRefundPaymentActionSchema,
} from '@/modules/billing/schema'
import {
  refundPlatformPaymentWorkflow,
  schedulePlatformSubscriptionCancellationWorkflow,
} from '@/modules/billing/workflows/platform-billing-admin.workflows'
import { assertPlatformAccess, assertPlatformPermission } from '@/modules/platform/platform-admin-access'

function parseOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? '').trim()

  if (!raw) {
    return undefined
  }

  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

async function requirePlatformBillingSession(requiredPermission: string) {
  const session = await getUserSession()

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing')
  }

  assertPlatformAccess({
    roleSystemKeys: session.platformRoleSystemKeys ?? [],
    roleKeys: session.platformRoleKeys ?? [],
  })
  assertPlatformPermission({
    roleSystemKeys: session.platformRoleSystemKeys ?? [],
    roleKeys: session.platformRoleKeys ?? [],
    permissions: session.permissions ?? [],
    required: requiredPermission,
  })

  return session
}

function buildBillingAuditInput(params: {
  action: string
  entityType: string
  entityId: string
  description: string
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'BILLING' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
  }
}

const schedulePlatformSubscriptionCancellationActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformBillingSession('platformBilling.update')

    const parsed = platformBillingCancelSubscriptionActionSchema.parse({
      subscriptionId: formData.get('subscriptionId'),
    })

    const subscription =
      await schedulePlatformSubscriptionCancellationWorkflow(parsed)

    return {
      subscriptionId: subscription.id,
      workspaceId: subscription.workspaceId ?? null,
      successMessage:
        'Subscription scheduled to cancel at the end of the current billing period.',
    }
  },
  {
    audit: {
      onSuccess: ({ result }) =>
        buildBillingAuditInput({
          action: 'subscription.cancel.schedule',
          entityType: 'Subscription',
          entityId: result.subscriptionId,
          description:
            'Subscription scheduled to cancel at the current period end.',
        }),
    },
  },
)

const refundPlatformPaymentActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformBillingSession('platformBilling.refund')

    const parsed = platformBillingRefundPaymentActionSchema.parse({
      paymentId: formData.get('paymentId'),
      amount: parseOptionalNumber(formData, 'amount'),
      reason: formData.get('reason') ?? undefined,
      notes: formData.get('notes') ?? '',
    })

    const refund = await refundPlatformPaymentWorkflow(parsed)

    return {
      refundId: refund.id,
      successMessage: 'Refund request submitted successfully.',
    }
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0]
        const paymentId = String(formData.get('paymentId') ?? '').trim()

        return buildBillingAuditInput({
          action: 'payment.refund.create',
          entityType: 'Refund',
          entityId: result.refundId,
          description: `Refund created for payment ${paymentId}.`,
        })
      },
    },
  },
)

export async function schedulePlatformSubscriptionCancellationAction(
  formData: FormData,
) {
  const response = await schedulePlatformSubscriptionCancellationActionImpl(
    formData,
  )

  if (response.success && response.data.workspaceId) {
    await invalidateWorkspaceBillingCaches(response.data.workspaceId)
  }

  return response
}

export async function refundPlatformPaymentAction(formData: FormData) {
  return refundPlatformPaymentActionImpl(formData)
}

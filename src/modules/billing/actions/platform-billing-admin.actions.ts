'use server'

import { getUserSession } from '@/lib/auth/auth-cookies'
import { getRequestContext } from '@/lib/context/request-context'
import { ERR } from '@/lib/errors/codes'
import { throwError } from '@/lib/errors/app-error'
import { createTxAction } from '@/lib/http/create-action'
import { logAdminAction } from '@/modules/audit/audit.services'
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

async function logBillingAdminAction(params: {
  session: Awaited<ReturnType<typeof requirePlatformBillingSession>>
  action: string
  entityType: string
  entityId: string
  description: string
}) {
  const requestContext = getRequestContext()

  await logAdminAction({
    adminIdentityId: params.session.identityId,
    adminEmail: null,
    adminRole: params.session.platformRoleSystemKeys?.[0] ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    ipAddress: requestContext.ip,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId,
  })
}

const schedulePlatformSubscriptionCancellationActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformBillingSession('platformBilling.update')

    const parsed = platformBillingCancelSubscriptionActionSchema.parse({
      subscriptionId: formData.get('subscriptionId'),
    })

    const subscription =
      await schedulePlatformSubscriptionCancellationWorkflow(parsed)

    await logBillingAdminAction({
      session,
      action: 'subscription.cancel.schedule',
      entityType: 'Subscription',
      entityId: subscription.id,
      description: 'Subscription scheduled to cancel at the current period end.',
    })

    return {
      subscriptionId: subscription.id,
      successMessage:
        'Subscription scheduled to cancel at the end of the current billing period.',
    }
  },
)

const refundPlatformPaymentActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformBillingSession('platformBilling.refund')

    const parsed = platformBillingRefundPaymentActionSchema.parse({
      paymentId: formData.get('paymentId'),
      amount: parseOptionalNumber(formData, 'amount'),
      reason: formData.get('reason') ?? undefined,
      notes: formData.get('notes') ?? '',
    })

    const refund = await refundPlatformPaymentWorkflow(parsed)

    await logBillingAdminAction({
      session,
      action: 'payment.refund.create',
      entityType: 'Refund',
      entityId: refund.id,
      description: `Refund created for payment ${refund.paymentId}.`,
    })

    return {
      refundId: refund.id,
      successMessage: 'Refund request submitted successfully.',
    }
  },
)

export async function schedulePlatformSubscriptionCancellationAction(
  formData: FormData,
) {
  return schedulePlatformSubscriptionCancellationActionImpl(formData)
}

export async function refundPlatformPaymentAction(formData: FormData) {
  return refundPlatformPaymentActionImpl(formData)
}

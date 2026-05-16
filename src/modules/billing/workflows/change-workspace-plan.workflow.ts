import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { resolveWorkspaceSurfaceRedirect } from '@/modules/auth/workflows/post-login.workflow';
import { findActivePriceByProductCode } from '@/modules/billing/services/catalog.services';
import {
  cancelWorkspaceSubscriptions,
  createSubscription,
} from '@/modules/billing/services/subscription.services';
import type { ChangeWorkspacePlanActionInput } from '@/modules/billing/schema';
import { FREE_TRIAL_PRODUCT_CODE } from '@/modules/workspace/defaults';
import { syncWorkspaceBillingSettings } from '@/modules/workspace/services/setting.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

type ChangeWorkspacePlanContext = {
  identityId: string;
  workspaceId?: string;
};

export type ChangeWorkspacePlanResult = {
  workspaceId: string;
  canonicalHost: string;
  intent: 'free' | 'paid';
  redirectTo: string;
  successMessage: string;
};

function buildWorkspaceRedirectTarget(
  source?: ChangeWorkspacePlanActionInput['source'],
) {
  if (source === 'workspace-domains') {
    return 'domains';
  }

  return 'billing';
}

function addOneMonth(start: Date) {
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
}

export async function changeWorkspacePlanWorkflow(
  context: ChangeWorkspacePlanContext,
  input: ChangeWorkspacePlanActionInput,
): Promise<ChangeWorkspacePlanResult> {
  if (!context.workspaceId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  if (input.targetPlanKey !== 'trial') {
    throwError(ERR.INVALID_INPUT, 'Unsupported target plan');
  }

  const { price } = await withUnitOfWork(() =>
    findActivePriceByProductCode({
      productCode: FREE_TRIAL_PRODUCT_CODE,
      interval: 'MONTHLY',
    }),
  );
  const now = new Date();
  const nextPeriodEnd = addOneMonth(now);

  const routing = await withUnitOfWork(async () => {
    await cancelWorkspaceSubscriptions({
      workspaceId: context.workspaceId!,
      now,
    });

    await createSubscription({
      workspaceId: context.workspaceId!,
      identityId: context.identityId,
      priceId: price.id,
      status: 'ACTIVE',
      provider: 'RAZORPAY',
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriodEnd,
      cancelAtPeriodEnd: false,
    });

    await syncWorkspaceBillingSettings({
      workspaceId: context.workspaceId!,
      planCode: 'trial',
      subscriptionStatus: 'ACTIVE',
    });

    return syncWorkspaceRoutingState(context.workspaceId!);
  });

  const basePath = await resolveWorkspaceSurfaceRedirect({
    workspaceId: context.workspaceId,
    fallbackPath: '/app',
  });

  return {
    workspaceId: context.workspaceId,
    canonicalHost: routing.primaryHost,
    intent: routing.intent,
    redirectTo: `${basePath}/${buildWorkspaceRedirectTarget(input.source)}`,
    successMessage:
      'Workspace moved back to the path-based plan. Please log in again if the domain changed.',
  };
}

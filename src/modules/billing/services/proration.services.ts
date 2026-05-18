import {
  fromRazorpayAmountSubunits,
  toRazorpayAmountSubunits,
} from '@/lib/payments/razorpay';

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function roundCurrency(amount: number) {
  return fromRazorpayAmountSubunits(toRazorpayAmountSubunits(amount));
}

export function calculateRemainingPeriodRatio(params: {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const totalMs =
    params.currentPeriodEnd.getTime() - params.currentPeriodStart.getTime();

  if (totalMs <= 0) {
    return 0;
  }

  const remainingMs = Math.max(
    0,
    params.currentPeriodEnd.getTime() - now.getTime(),
  );

  return clampRatio(remainingMs / totalMs);
}

export function calculateUnusedSubscriptionValue(params: {
  currentPlanAmount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now?: Date;
}) {
  const ratio = calculateRemainingPeriodRatio(params);

  return {
    ratio,
    unusedAmount: roundCurrency(params.currentPlanAmount * ratio),
  };
}

export function calculateProratedUpgradeDelta(params: {
  currentPlanAmount: number;
  nextPlanAmount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now?: Date;
}) {
  const ratio = calculateRemainingPeriodRatio(params);
  const delta = Math.max(0, params.nextPlanAmount - params.currentPlanAmount);

  return {
    ratio,
    proratedChargeAmount: roundCurrency(delta * ratio),
  };
}

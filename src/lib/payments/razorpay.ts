import crypto from 'node:crypto';

import Razorpay from 'razorpay';

import { getRazorpayEnv } from '@/lib/env';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type RazorpayOrderCreateParams = {
  amountSubunits: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string | number>;
  description?: string | null;
};

type RazorpayPlanCreateParams = {
  name: string;
  description?: string | null;
  amountSubunits: number;
  currency: string;
  period: 'monthly' | 'yearly';
  interval: number;
  notes?: Record<string, string | number>;
};

type RazorpaySubscriptionCreateParams = {
  planId: string;
  totalCount: number;
  quantity?: number;
  customerNotify?: boolean;
  notes?: Record<string, string | number>;
};

type RazorpaySubscriptionUpdateParams = {
  planId?: string;
  totalCount?: number;
  quantity?: number;
  customerNotify?: boolean | 0 | 1;
  scheduleChangeAt?: 'now' | 'cycle_end';
  remainingCount?: number;
  notes?: Record<string, string | number>;
};

type RazorpayRefundCreateParams = {
  amountSubunits?: number;
  speed?: 'normal' | 'optimum';
  notes?: Record<string, string | number>;
  receipt?: string | null;
};

let razorpayClient: Razorpay | null = null;

const IS_PROD = process.env.NODE_ENV === 'production';

function getRazorpayKeyId() {
  const env = getRazorpayEnv();
  const liveKey =
    env.RAZORPAY_API_KEY ?? env.NEXT_PUBLIC_RAZORPAY_API_KEY ?? null;
  const testKey =
    env.RAZORPAY_TEST_API_KEY ?? env.NEXT_PUBLIC_RAZORPAY_TEST_API_KEY ?? null;

  if (IS_PROD) {
    return liveKey ?? testKey;
  }

  return testKey;
}

function getRazorpayKeySecret() {
  const env = getRazorpayEnv();
  const liveSecret = env.RAZORPAY_API_SECRET ?? null;
  const testSecret = env.RAZORPAY_TEST_API_SECRET ?? null;

  if (IS_PROD) {
    return liveSecret ?? testSecret;
  }

  return testSecret;
}

function getRazorpayWebhookSecret() {
  return getRazorpayEnv().RAZORPAY_WEBHOOK_SECRET;
}

function buildHmacSignature(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function getPublicRazorpayKeyId() {
  const keyId = getRazorpayKeyId();

  if (!keyId) {
    throwError(
      ERR.INVALID_STATE,
      'Razorpay key id is missing. Set NEXT_PUBLIC_RAZORPAY_TEST_API_KEY or RAZORPAY_TEST_API_KEY.',
    );
  }

  if (!IS_PROD && !keyId.startsWith('rzp_test_')) {
    throwError(
      ERR.INVALID_STATE,
      'Non-production checkout must use a Razorpay test key.',
    );
  }

  return keyId;
}

export function getRazorpayClient() {
  if (razorpayClient) {
    return razorpayClient;
  }

  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    throwError(
      ERR.INVALID_STATE,
      'Razorpay server keys are missing. Set RAZORPAY_TEST_API_KEY and RAZORPAY_TEST_API_SECRET.',
    );
  }

  if (!IS_PROD && !keyId.startsWith('rzp_test_')) {
    throwError(
      ERR.INVALID_STATE,
      'Non-production server checkout must use Razorpay test credentials.',
    );
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

export function toRazorpayAmountSubunits(amount: number) {
  return Math.round(amount * 100);
}

export function fromRazorpayAmountSubunits(amountSubunits: number) {
  return Number((amountSubunits / 100).toFixed(2));
}

export function verifyRazorpayOrderPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const keySecret = getRazorpayKeySecret();

  if (!keySecret) {
    throwError(ERR.INVALID_STATE, 'Razorpay secret is missing.');
  }

  const expectedSignature = buildHmacSignature(
    `${params.orderId}|${params.paymentId}`,
    keySecret,
  );

  return expectedSignature === params.signature;
}

export function verifyRazorpaySubscriptionPaymentSignature(params: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
}) {
  const keySecret = getRazorpayKeySecret();

  if (!keySecret) {
    throwError(ERR.INVALID_STATE, 'Razorpay secret is missing.');
  }

  const expectedSignature = buildHmacSignature(
    `${params.paymentId}|${params.subscriptionId}`,
    keySecret,
  );

  return expectedSignature === params.signature;
}

export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}) {
  const webhookSecret = getRazorpayWebhookSecret();

  if (!webhookSecret) {
    throwError(ERR.INVALID_STATE, 'Razorpay webhook secret is missing.');
  }

  const expectedSignature = buildHmacSignature(params.rawBody, webhookSecret);
  return expectedSignature === params.signature;
}

export async function createRazorpayOrder(params: RazorpayOrderCreateParams) {
  const client = getRazorpayClient();

  return client.orders.create({
    amount: params.amountSubunits,
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes,
    partial_payment: false,
  });
}

export async function createRazorpayPlan(params: RazorpayPlanCreateParams) {
  const client = getRazorpayClient();

  return client.plans.create({
    period: params.period,
    interval: params.interval,
    item: {
      name: params.name,
      description: params.description ?? undefined,
      amount: params.amountSubunits,
      currency: params.currency,
    },
    notes: params.notes,
  });
}

export async function createRazorpaySubscription(
  params: RazorpaySubscriptionCreateParams,
) {
  const client = getRazorpayClient();

  return client.subscriptions.create({
    plan_id: params.planId,
    total_count: params.totalCount,
    quantity: params.quantity ?? 1,
    customer_notify: params.customerNotify ?? true,
    notes: params.notes,
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  const client = getRazorpayClient();
  return client.payments.fetch(paymentId);
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  const client = getRazorpayClient();
  return client.subscriptions.fetch(subscriptionId);
}

export async function updateRazorpaySubscription(
  subscriptionId: string,
  params: RazorpaySubscriptionUpdateParams,
) {
  const client = getRazorpayClient();

  return client.subscriptions.update(subscriptionId, {
    plan_id: params.planId,
    total_count: params.totalCount,
    quantity: params.quantity,
    customer_notify: params.customerNotify,
    schedule_change_at: params.scheduleChangeAt,
    remaining_count: params.remainingCount,
    notes: params.notes,
  });
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd = false,
) {
  const client = getRazorpayClient();
  return client.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}

export async function createRazorpayPaymentRefund(
  paymentId: string,
  params: RazorpayRefundCreateParams,
) {
  const client = getRazorpayClient();

  return client.payments.refund(paymentId, {
    amount: params.amountSubunits,
    speed: params.speed,
    notes: params.notes,
    receipt: params.receipt,
  });
}

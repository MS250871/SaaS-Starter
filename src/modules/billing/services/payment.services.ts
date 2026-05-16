import {
  paymentCrud,
  paymentAttemptCrud,
  paymentAttemptQueries,
  paymentQueries,
} from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export async function getPaymentById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  const payment = await paymentQueries.findUnique({
    where: { id },
  });

  if (!payment) {
    throwError(ERR.NOT_FOUND, 'Payment not found');
  }

  return payment;
}

export async function findPaymentByProviderOrderId(providerOrderId: string) {
  if (!providerOrderId) {
    throwError(ERR.INVALID_INPUT, 'Provider order id is required');
  }

  return paymentQueries.findFirst({
    where: {
      providerOrderId,
    },
  });
}

export async function findPaymentByProviderPaymentId(providerPaymentId: string) {
  if (!providerPaymentId) {
    throwError(ERR.INVALID_INPUT, 'Provider payment id is required');
  }

  return paymentQueries.findFirst({
    where: {
      providerPaymentId,
    },
  });
}

export async function findPaymentBySubscriptionId(subscriptionId: string) {
  if (!subscriptionId) {
    throwError(ERR.INVALID_INPUT, 'Subscription id is required');
  }

  return paymentQueries.findFirst({
    where: {
      subscriptionId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createPayment(data: CreateInput<'Payment'>) {
  if (!data?.amount || !data?.paymentProvider) {
    throwError(ERR.INVALID_INPUT, 'Invalid payment data');
  }

  try {
    return await paymentCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create payment', undefined, e);
  }
}

export async function updatePayment(id: string, data: UpdateInput<'Payment'>) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  try {
    return await paymentCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update payment', undefined, e);
  }
}

export async function listWorkspacePayments(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  return paymentQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listIdentityPayments(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return paymentQueries.many({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countPaymentAttempts(paymentId: string) {
  if (!paymentId) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  return paymentAttemptQueries.count({
    where: {
      paymentId,
    },
  });
}

export async function createPaymentAttempt(
  data: CreateInput<'PaymentAttempt'>,
) {
  if (!data?.paymentId || !data?.attemptNumber) {
    throwError(ERR.INVALID_INPUT, 'Invalid payment attempt data');
  }

  try {
    return await paymentAttemptCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create payment attempt', undefined, e);
  }
}

export async function updatePaymentAttempt(
  id: string,
  data: UpdateInput<'PaymentAttempt'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Payment attempt ID is required');
  }

  try {
    return await paymentAttemptCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update payment attempt', undefined, e);
  }
}

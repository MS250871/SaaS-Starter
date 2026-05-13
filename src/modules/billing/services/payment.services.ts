import {
  paymentCrud,
  paymentAttemptCrud,
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

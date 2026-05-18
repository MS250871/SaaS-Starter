import { refundCrud, refundQueries } from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export async function createRefund(data: CreateInput<'Refund'>) {
  if (!data?.paymentId || !data?.amount) {
    throwError(ERR.INVALID_INPUT, 'Invalid refund data');
  }

  try {
    return await refundCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create refund', undefined, e);
  }
}

export async function updateRefund(id: string, data: UpdateInput<'Refund'>) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Refund ID is required');
  }

  try {
    return await refundCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update refund', undefined, e);
  }
}

export async function findLatestRefundByPaymentId(paymentId: string) {
  if (!paymentId) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  return refundQueries.findFirst({
    where: {
      paymentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findRefundByProviderRefundId(providerRefundId: string) {
  if (!providerRefundId) {
    throwError(ERR.INVALID_INPUT, 'Provider refund ID is required');
  }

  return refundQueries.findFirst({
    where: {
      providerRefundId,
    },
  });
}

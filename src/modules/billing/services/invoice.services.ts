import {
  invoiceCrud,
  invoiceItemCrud,
  invoiceQueries,
} from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export async function getInvoiceById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Invoice ID is required');
  }

  const invoice = await invoiceQueries.findUnique({
    where: { id },
  });

  if (!invoice) {
    throwError(ERR.NOT_FOUND, 'Invoice not found');
  }

  return invoice;
}

export async function findInvoiceByPaymentId(paymentId: string) {
  if (!paymentId) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  return invoiceQueries.findFirst({
    where: {
      paymentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findInvoiceByProviderInvoiceId(providerInvoiceId: string) {
  if (!providerInvoiceId) {
    throwError(ERR.INVALID_INPUT, 'Provider invoice id is required');
  }

  return invoiceQueries.findFirst({
    where: {
      providerInvoiceId,
    },
  });
}

export async function createInvoice(data: CreateInput<'Invoice'>) {
  if (!data?.invoiceNumber || !data?.amount) {
    throwError(ERR.INVALID_INPUT, 'Invalid invoice data');
  }

  try {
    return await invoiceCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create invoice', undefined, e);
  }
}

export async function updateInvoice(id: string, data: UpdateInput<'Invoice'>) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Invoice ID is required');
  }

  try {
    return await invoiceCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update invoice', undefined, e);
  }
}

export async function createInvoiceItem(data: CreateInput<'InvoiceItem'>) {
  if (!data?.invoiceId || !data?.quantity) {
    throwError(ERR.INVALID_INPUT, 'Invalid invoice item data');
  }

  try {
    return await invoiceItemCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create invoice item', undefined, e);
  }
}

export async function listWorkspaceInvoices(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  return invoiceQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export function buildInvoiceNumber(prefix = 'INV') {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${suffix}`;
}

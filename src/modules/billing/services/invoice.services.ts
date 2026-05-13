import {
  invoiceCrud,
  invoiceItemCrud,
  invoiceQueries,
} from '@/modules/billing/db';
import type { CreateInput } from '@/lib/crud/prisma-types';
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

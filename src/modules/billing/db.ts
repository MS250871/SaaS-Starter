import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

export const productCrud = buildCud({
  model: 'Product',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const productQueries = buildQueries({
  model: 'Product',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

export const priceCrud = buildCud({
  model: 'Price',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const priceQueries = buildQueries({
  model: 'Price',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

export const subscriptionCrud = buildCud({
  model: 'Subscription',
  workspaceScoped: false,
  softDelete: false,
});

export const subscriptionQueries = buildQueries({
  model: 'Subscription',
  workspaceScoped: false,
});

export const paymentCrud = buildCud({
  model: 'Payment',
  workspaceScoped: false,
  softDelete: false,
});

export const paymentQueries = buildQueries({
  model: 'Payment',
  workspaceScoped: false,
});

export const paymentAttemptCrud = buildCud({
  model: 'PaymentAttempt',
  workspaceScoped: false,
  softDelete: false,
});

export const paymentAttemptQueries = buildQueries({
  model: 'PaymentAttempt',
  workspaceScoped: false,
});

export const invoiceCrud = buildCud({
  model: 'Invoice',
  workspaceScoped: false,
  softDelete: false,
});

export const invoiceQueries = buildQueries({
  model: 'Invoice',
  workspaceScoped: false,
});

export const invoiceItemCrud = buildCud({
  model: 'InvoiceItem',
  workspaceScoped: false,
  softDelete: false,
});

export const invoiceItemQueries = buildQueries({
  model: 'InvoiceItem',
  workspaceScoped: false,
});

export const refundCrud = buildCud({
  model: 'Refund',
  workspaceScoped: false,
  softDelete: false,
});

export const refundQueries = buildQueries({
  model: 'Refund',
  workspaceScoped: false,
});

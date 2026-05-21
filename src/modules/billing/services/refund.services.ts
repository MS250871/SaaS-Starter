import { refundCrud, refundQueries } from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type PlatformRefundAdminSnapshot = Prisma.RefundGetPayload<{
  select: {
    id: true;
    paymentId: true;
    amount: true;
    currency: true;
    status: true;
    reason: true;
    notes: true;
    paymentProvider: true;
    providerRefundId: true;
    metadata: true;
    processedAt: true;
    createdAt: true;
    updatedAt: true;
    payment: {
      select: {
        id: true;
        type: true;
        amount: true;
        currency: true;
        paymentStatus: true;
        providerPaymentId: true;
        workspace: {
          select: {
            id: true;
            name: true;
            slug: true;
            isActive: true;
          };
        };
        identity: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
          };
        };
        customer: {
          select: {
            id: true;
            externalId: true;
            identity: {
              select: {
                id: true;
                firstName: true;
                lastName: true;
                email: true;
              };
            };
            workspace: {
              select: {
                id: true;
                name: true;
                slug: true;
              };
            };
          };
        };
        price: {
          select: {
            id: true;
            amount: true;
            currency: true;
            interval: true;
            product: {
              select: {
                id: true;
                code: true;
                name: true;
                plan: {
                  select: {
                    id: true;
                    key: true;
                    name: true;
                  };
                };
              };
            };
          };
        };
        subscription: {
          select: {
            id: true;
            status: true;
          };
        };
      };
    };
  };
}>;

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

export async function getRefundById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Refund ID is required');
  }

  const refund = await refundQueries.findUnique({
    where: { id },
  });

  if (!refund) {
    throwError(ERR.NOT_FOUND, 'Refund not found');
  }

  return refund;
}

export async function listRefundsByPaymentId(paymentId: string) {
  if (!paymentId) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  return refundQueries.many({
    where: {
      paymentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function listPlatformRefundAdminSnapshots(opts?: {
  limit?: number;
}): Promise<PlatformRefundAdminSnapshot[]> {
  const refunds = await refundQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 500,
    select: {
      id: true,
      paymentId: true,
      amount: true,
      currency: true,
      status: true,
      reason: true,
      notes: true,
      paymentProvider: true,
      providerRefundId: true,
      metadata: true,
      processedAt: true,
      createdAt: true,
      updatedAt: true,
      payment: {
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          paymentStatus: true,
          providerPaymentId: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
          identity: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          customer: {
            select: {
              id: true,
              externalId: true,
              identity: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          price: {
            select: {
              id: true,
              amount: true,
              currency: true,
              interval: true,
              product: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  plan: {
                    select: {
                      id: true,
                      key: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return refunds as PlatformRefundAdminSnapshot[];
}

export async function getPlatformRefundAdminSnapshot(
  id: string,
): Promise<PlatformRefundAdminSnapshot> {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Refund ID is required');
  }

  const refund = await refundQueries.delegate.findUnique({
    where: { id },
    select: {
      id: true,
      paymentId: true,
      amount: true,
      currency: true,
      status: true,
      reason: true,
      notes: true,
      paymentProvider: true,
      providerRefundId: true,
      metadata: true,
      processedAt: true,
      createdAt: true,
      updatedAt: true,
      payment: {
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          paymentStatus: true,
          providerPaymentId: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
          identity: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          customer: {
            select: {
              id: true,
              externalId: true,
              identity: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          price: {
            select: {
              id: true,
              amount: true,
              currency: true,
              interval: true,
              product: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  plan: {
                    select: {
                      id: true,
                      key: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!refund) {
    throwError(ERR.NOT_FOUND, 'Refund not found');
  }

  return refund as PlatformRefundAdminSnapshot;
}

import {
  paymentCrud,
  paymentAttemptCrud,
  paymentAttemptQueries,
  paymentQueries,
} from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

function buildUpgradeMetadataFilter(expectedMode: string) {
  return {
    path: ['upgradeMode'],
    equals: expectedMode,
  } satisfies Prisma.JsonFilter;
}

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

export async function findLatestSuccessfulPaymentBySubscriptionId(
  subscriptionId: string,
) {
  if (!subscriptionId) {
    throwError(ERR.INVALID_INPUT, 'Subscription id is required');
  }

  return paymentQueries.findFirst({
    where: {
      subscriptionId,
      paymentStatus: 'SUCCESS',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findPendingProratedUpgradePaymentBySubscriptionId(
  subscriptionId: string,
) {
  if (!subscriptionId) {
    throwError(ERR.INVALID_INPUT, 'Subscription id is required');
  }

  return paymentQueries.findFirst({
    where: {
      subscriptionId,
      type: 'UPGRADE',
      paymentStatus: {
        in: ['PENDING', 'REQUIRES_ACTION'],
      },
      metadata: buildUpgradeMetadataFilter('card_proration'),
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

export type PlatformPaymentAdminSnapshot = Prisma.PaymentGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    identityId: true;
    customerId: true;
    priceId: true;
    subscriptionId: true;
    type: true;
    paymentProvider: true;
    providerOrderId: true;
    providerPaymentId: true;
    amount: true;
    currency: true;
    paymentStatus: true;
    description: true;
    capturedAt: true;
    createdAt: true;
    updatedAt: true;
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
            type: true;
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
        currentPeriodEnd: true;
        cancelAtPeriodEnd: true;
      };
    };
    invoices: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 1;
      select: {
        id: true;
        invoiceNumber: true;
        amount: true;
        currency: true;
        status: true;
        issuedAt: true;
        paidAt: true;
      };
    };
    refunds: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 1;
      select: {
        id: true;
        amount: true;
        currency: true;
        status: true;
        reason: true;
        processedAt: true;
        createdAt: true;
      };
    };
    _count: {
      select: {
        attempts: true;
        invoices: true;
        refunds: true;
      };
    };
  };
}>;

export type PlatformPaymentDetailAdminSnapshot = Prisma.PaymentGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    identityId: true;
    customerId: true;
    priceId: true;
    subscriptionId: true;
    type: true;
    paymentProvider: true;
    providerOrderId: true;
    providerPaymentId: true;
    providerSignature: true;
    amount: true;
    currency: true;
    paymentStatus: true;
    description: true;
    metadata: true;
    capturedAt: true;
    createdAt: true;
    updatedAt: true;
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
            type: true;
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
        currentPeriodStart: true;
        currentPeriodEnd: true;
        cancelAtPeriodEnd: true;
        providerSubscriptionId: true;
      };
    };
    attempts: {
      orderBy: {
        createdAt: 'desc';
      };
      select: {
        id: true;
        attemptNumber: true;
        provider: true;
        status: true;
        errorCode: true;
        errorMessage: true;
        createdAt: true;
      };
    };
    invoices: {
      orderBy: {
        createdAt: 'desc';
      };
      select: {
        id: true;
        invoiceNumber: true;
        providerInvoiceId: true;
        amount: true;
        currency: true;
        status: true;
        issuedAt: true;
        paidAt: true;
        items: {
          select: {
            id: true;
            quantity: true;
            unitPrice: true;
            total: true;
            currency: true;
            product: {
              select: {
                id: true;
                name: true;
                code: true;
              };
            };
            price: {
              select: {
                id: true;
                interval: true;
              };
            };
          };
        };
      };
    };
    refunds: {
      orderBy: {
        createdAt: 'desc';
      };
      select: {
        id: true;
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
      };
    };
  };
}>;

export async function listPaymentsBySubscriptionId(subscriptionId: string) {
  if (!subscriptionId) {
    throwError(ERR.INVALID_INPUT, 'Subscription id is required');
  }

  return paymentQueries.many({
    where: {
      subscriptionId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function listPlatformPaymentAdminSnapshots(opts?: {
  limit?: number;
}): Promise<PlatformPaymentAdminSnapshot[]> {
  const payments = await paymentQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 500,
    select: {
      id: true,
      workspaceId: true,
      identityId: true,
      customerId: true,
      priceId: true,
      subscriptionId: true,
      type: true,
      paymentProvider: true,
      providerOrderId: true,
      providerPaymentId: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      description: true,
      capturedAt: true,
      createdAt: true,
      updatedAt: true,
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
              type: true,
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
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
      invoices: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          invoiceNumber: true,
          amount: true,
          currency: true,
          status: true,
          issuedAt: true,
          paidAt: true,
        },
      },
      refunds: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          reason: true,
          processedAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          attempts: true,
          invoices: true,
          refunds: true,
        },
      },
    },
  });

  return payments as PlatformPaymentAdminSnapshot[];
}

export async function getPlatformPaymentAdminSnapshot(
  id: string,
): Promise<PlatformPaymentDetailAdminSnapshot> {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Payment ID is required');
  }

  const payment = await paymentQueries.delegate.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      identityId: true,
      customerId: true,
      priceId: true,
      subscriptionId: true,
      type: true,
      paymentProvider: true,
      providerOrderId: true,
      providerPaymentId: true,
      providerSignature: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      description: true,
      metadata: true,
      capturedAt: true,
      createdAt: true,
      updatedAt: true,
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
              type: true,
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
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          providerSubscriptionId: true,
        },
      },
      attempts: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          attemptNumber: true,
          provider: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          invoiceNumber: true,
          providerInvoiceId: true,
          amount: true,
          currency: true,
          status: true,
          issuedAt: true,
          paidAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              total: true,
              currency: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              price: {
                select: {
                  id: true,
                  interval: true,
                },
              },
            },
          },
        },
      },
      refunds: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
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
        },
      },
    },
  });

  if (!payment) {
    throwError(ERR.NOT_FOUND, 'Payment not found');
  }

  return payment as PlatformPaymentDetailAdminSnapshot;
}

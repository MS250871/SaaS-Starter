import { customerCrud, customerQueries } from '@/modules/customer/db';
import type { Prisma } from '@/generated/prisma/client';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type CustomerNotificationRecipient = Prisma.CustomerGetPayload<{
  select: {
    id: true;
    identity: {
      select: {
        id: true;
        email: true;
        phone: true;
      };
    };
  };
}>;

export type CustomerIdentityProfile = Prisma.CustomerGetPayload<{
  select: {
    id: true;
    identity: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
      };
    };
  };
}>;

export type WorkspaceCustomerDirectoryEntry = Prisma.CustomerGetPayload<{
  select: {
    id: true;
    identity: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

export type WorkspaceCustomerPageEntry = Prisma.CustomerGetPayload<{
  select: {
    id: true;
    externalId: true;
    createdAt: true;
    identity: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

export type WorkspaceNotificationRecipientCustomer = Prisma.CustomerGetPayload<{
  select: {
    id: true;
    identity: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

export type WorkspaceCustomerDetailsSnapshot = Prisma.CustomerGetPayload<{
  select: {
    id: true;
    externalId: true;
    createdAt: true;
    identity: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
      };
    };
    _count: {
      select: {
        supportTickets: true;
        notifications: true;
        media: true;
      };
    };
  };
}>;

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  const customer = await customerQueries.findUnique({
    where: { id },
  });

  if (!customer) {
    throwError(ERR.NOT_FOUND, 'Customer not found');
  }

  return customer;
}

/**
 * Get customer by identity id
 */
export async function getCustomerByIdentityId(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const customer = await findCustomerByIdentityId(identityId);

  if (!customer) {
    throwError(ERR.NOT_FOUND, 'Customer not found');
  }

  return customer;
}

export async function findCustomerByIdentityId(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return customerQueries.findFirst({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCustomerByWorkspaceIdentity(
  workspaceId: string,
  identityId: string,
) {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and identityId are required');
  }

  return customerQueries.findFirst({
    where: {
      workspaceId,
      identityId,
    },
  });
}

export async function getCustomerNotificationRecipient(
  customerId: string,
): Promise<CustomerNotificationRecipient> {
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  const customer = await customerQueries.findFirst({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      identity: {
        select: {
          id: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!customer) {
    throwError(ERR.NOT_FOUND, 'Customer not found');
  }

  return customer as unknown as CustomerNotificationRecipient;
}

export async function listCustomerIdentityProfilesByIds(
  customerIds: string[],
): Promise<CustomerIdentityProfile[]> {
  const uniqueIds = Array.from(new Set(customerIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const customers = await customerQueries.many({
    where: {
      id: {
        in: uniqueIds,
      },
    },
    select: {
      id: true,
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return customers as unknown as CustomerIdentityProfile[];
}

/**
 * Create customer
 */
export async function createCustomer(data: CreateInput<'Customer'>) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }
  const payload: CreateInput<'Customer'> = { ...data };
  try {
    return await customerCrud.create(payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create customer', undefined, e);
  }
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: string,
  data: UpdateInput<'Customer'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }
  const payload: UpdateInput<'Customer'> = { ...data };
  try {
    return await customerCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update customer', undefined, e);
  }
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  try {
    return await customerCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete customer', undefined, e);
  }
}

/**
 * List customers
 */
export async function listWorkspaceCustomers(
  workspaceId: string,
  opts?: {
    page?: number;
    pageSize?: number;
  },
) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const [totalItems, items] = await Promise.all([
    customerQueries.count({
      where: { workspaceId },
    }),
    customerQueries.many({
      where: { workspaceId },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

/**
 * Count customers
 */
export async function countWorkspaceCustomers(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return customerQueries.count({
    where: {
      workspaceId,
    },
  });
}

export async function listWorkspaceNotificationRecipientCustomers(params: {
  workspaceId: string;
  recipientMode: 'all' | 'single';
  recipientId?: string | null;
  requireEmail?: boolean;
}): Promise<WorkspaceNotificationRecipientCustomer[]> {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const customers = await customerQueries.many({
    where: {
      workspaceId: params.workspaceId,
      id:
        params.recipientMode === 'single'
          ? params.recipientId ?? undefined
          : undefined,
      ...(params.requireEmail
        ? {
            identity: {
              is: {
                email: {
                  not: null,
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  return customers as unknown as WorkspaceNotificationRecipientCustomer[];
}

export async function listWorkspaceCustomersDirectory(
  workspaceId: string,
): Promise<WorkspaceCustomerDirectoryEntry[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const customers = await customerQueries.many({
    where: {
      workspaceId,
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return customers as unknown as WorkspaceCustomerDirectoryEntry[];
}

export async function listWorkspaceCustomersPage(params: {
  workspaceId: string;
  page: number;
  pageSize: number;
  query?: string;
  source?: 'all' | 'external' | 'native';
}): Promise<{ totalItems: number; customers: WorkspaceCustomerPageEntry[] }> {
  const query = params.query?.trim() ?? '';
  const source = params.source ?? 'all';

  const where = {
    workspaceId: params.workspaceId,
    ...(source === 'external'
      ? {
          externalId: {
            not: null,
          },
        }
      : source === 'native'
        ? {
            externalId: null,
          }
        : {}),
    ...(query
      ? {
          OR: [
            {
              externalId: {
                contains: query,
                mode: 'insensitive' as const,
              },
            },
            {
              identity: {
                is: {
                  firstName: {
                    contains: query,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
            {
              identity: {
                is: {
                  lastName: {
                    contains: query,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
            {
              identity: {
                is: {
                  email: {
                    contains: query,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [totalItems, customers] = await Promise.all([
    customerQueries.count(where),
    customerQueries.many({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        externalId: true,
        createdAt: true,
        identity: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    totalItems,
    customers: customers as unknown as WorkspaceCustomerPageEntry[],
  };
}

export async function getWorkspaceCustomerDetailsSnapshot(
  workspaceId: string,
  customerId: string,
): Promise<WorkspaceCustomerDetailsSnapshot | null> {
  if (!workspaceId || !customerId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and customerId are required');
  }

  const customer = await customerQueries.findFirst({
    where: {
      id: customerId,
      workspaceId,
    },
    select: {
      id: true,
      externalId: true,
      createdAt: true,
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      _count: {
        select: {
          supportTickets: true,
          notifications: true,
          media: true,
        },
      },
    },
  });

  return customer as unknown as WorkspaceCustomerDetailsSnapshot | null;
}

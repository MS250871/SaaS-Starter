import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getWorkspaceCustomerDetailsSnapshot,
  listWorkspaceCustomerTableSnapshots,
} from '@/modules/customer/services/customer.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

export async function getWorkspaceCustomersPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        customers: [],
      };
    }

    const customers = await listWorkspaceCustomerTableSnapshots(
      context.workspaceId,
    );

    return {
      ...context,
      customers: customers.map((customer) => ({
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${
            customer.identity.lastName ?? ''
          }`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
        externalId: customer.externalId ?? null,
        sourceLabel: customer.externalId ? 'External Sync' : 'Native',
        createdAt: customer.createdAt.toISOString(),
        createdAtLabel: customer.createdAt.toISOString(),
      })),
    };
  });
}

export async function getWorkspaceCustomerDetailsPageData(customerId: string) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        customer: null,
      };
    }

    const customer = await getWorkspaceCustomerDetailsSnapshot(
      context.workspaceId,
      customerId,
    );

    if (!customer) {
      return {
        ...context,
        customer: null,
      };
    }

    return {
      ...context,
      customer: {
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${
            customer.identity.lastName ?? ''
          }`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
        phone: customer.identity.phone ?? null,
        externalId: customer.externalId ?? null,
        createdAt: customer.createdAt.toISOString(),
        supportTicketCount: customer._count.supportTickets,
        notificationCount: customer._count.notifications,
        mediaCount: customer._count.media,
      },
    };
  });
}

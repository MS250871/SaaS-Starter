import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getWorkspaceCustomerDetailsSnapshot,
  listWorkspaceCustomersPage,
} from '@/modules/customer/services/customer.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type WorkspaceCustomerPageEntry = Awaited<
  ReturnType<typeof listWorkspaceCustomersPage>
>['customers'][number];

const CUSTOMER_PAGE_SIZE = 10;

function normalizePageNumber(value?: number | null) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

export async function getWorkspaceCustomersPageData(params?: {
  page?: number | null;
  query?: string | null;
  source?: string | null;
}) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    const page = normalizePageNumber(params?.page);
    const query = params?.query?.trim() ?? '';
    const source =
      params?.source === 'external' || params?.source === 'native'
        ? params.source
        : 'all';

    if (!context.workspaceId) {
      return {
        ...context,
        customers: [],
        page,
        pageSize: CUSTOMER_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
        filters: {
          query,
          source,
        },
      };
    }

    const { totalItems, customers } = await listWorkspaceCustomersPage({
      workspaceId: context.workspaceId,
      page,
      pageSize: CUSTOMER_PAGE_SIZE,
      query,
      source,
    });

    return {
      ...context,
      customers: customers.map((customer: WorkspaceCustomerPageEntry) => ({
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${
            customer.identity.lastName ?? ''
          }`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
        externalId: customer.externalId ?? null,
        createdAt: customer.createdAt.toISOString(),
      })),
      page,
      pageSize: CUSTOMER_PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / CUSTOMER_PAGE_SIZE)),
      filters: {
        query,
        source,
      },
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

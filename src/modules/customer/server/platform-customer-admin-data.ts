import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformCustomerAdminSnapshots } from '@/modules/customer/services/customer.services';

function formatName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    params.phone ||
    'Customer'
  );
}

function formatShortDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(value);
}

export type PlatformCustomerRow = {
  id: string;
  identityId: string;
  workspaceId: string;
  customerName: string;
  identityEmail: string | null;
  identityPhone: string | null;
  workspaceName: string;
  workspaceSlug: string;
  workspaceIsActive: boolean;
  externalId: string | null;
  identityIsActive: boolean;
  createdAtLabel: string;
};

export async function getPlatformCustomersPageData() {
  return withActionTxContext(async () => {
    const customers = await listPlatformCustomerAdminSnapshots({ limit: 500 });

    const rows: PlatformCustomerRow[] = customers.map((customer) => ({
      id: customer.id,
      identityId: customer.identity.id,
      workspaceId: customer.workspace.id,
      customerName: formatName(customer.identity),
      identityEmail: customer.identity.email ?? null,
      identityPhone: customer.identity.phone ?? null,
      workspaceName: customer.workspace.name,
      workspaceSlug: customer.workspace.slug,
      workspaceIsActive: customer.workspace.isActive,
      externalId: customer.externalId ?? null,
      identityIsActive: customer.identity.isActive,
      createdAtLabel: formatShortDate(customer.createdAt),
    }));

    return {
      summary: {
        total: rows.length,
        workspaces: new Set(rows.map((row) => row.workspaceId)).size,
        external: rows.filter((row) => row.externalId !== null).length,
        inactiveIdentityLinks: rows.filter((row) => !row.identityIsActive).length,
      },
      rows,
    };
  });
}

export async function getPlatformCustomersForIdentityPageData(identityId: string) {
  return withActionTxContext(async () => {
    const customers = await listPlatformCustomerAdminSnapshots({
      identityId,
      limit: 100,
    });

    return customers.map((customer) => ({
      id: customer.id,
      identityId: customer.identity.id,
      workspaceId: customer.workspace.id,
      customerName: formatName(customer.identity),
      identityEmail: customer.identity.email ?? null,
      identityPhone: customer.identity.phone ?? null,
      workspaceName: customer.workspace.name,
      workspaceSlug: customer.workspace.slug,
      workspaceIsActive: customer.workspace.isActive,
      externalId: customer.externalId ?? null,
      identityIsActive: customer.identity.isActive,
      createdAtLabel: formatShortDate(customer.createdAt),
    }));
  });
}

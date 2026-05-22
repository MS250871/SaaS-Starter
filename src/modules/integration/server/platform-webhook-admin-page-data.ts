import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getPlatformWebhookEventAdminSnapshot,
  listPlatformWebhookEventAdminSnapshots,
} from '@/modules/integration/services/webhook-event.services';

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatIdentityName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    'Identity'
  );
}

function buildOwnerLabels(event: Awaited<ReturnType<typeof getPlatformWebhookEventAdminSnapshot>>) {
  if (event.customer) {
    return {
      ownerLabel: formatIdentityName({
        firstName: event.customer.identity.firstName,
        lastName: event.customer.identity.lastName,
        email: event.customer.identity.email,
      }),
      ownerSubLabel: event.customer.externalId
        ? `Customer ${event.customer.externalId}`
        : 'Workspace customer',
    };
  }

  if (event.identity) {
    return {
      ownerLabel: formatIdentityName(event.identity),
      ownerSubLabel: 'Identity scope',
    };
  }

  if (event.workspace) {
    return {
      ownerLabel: event.workspace.name,
      ownerSubLabel: event.workspace.slug,
    };
  }

  return {
    ownerLabel: 'Global',
    ownerSubLabel: 'No tenant scope',
  };
}

function buildWebhookRow(event: Awaited<ReturnType<typeof getPlatformWebhookEventAdminSnapshot>>) {
  const owner = buildOwnerLabels(event);

  return {
    id: event.id,
    provider: event.provider,
    providerLabel: formatEnumLabel(event.provider),
    eventType: event.eventType,
    externalId: event.externalId,
    status: event.status,
    statusLabel: formatEnumLabel(event.status),
    ownerLabel: owner.ownerLabel,
    ownerSubLabel: owner.ownerSubLabel,
    attempts: event.attempts,
    errorSummary: event.error ?? 'N/A',
    nextRetryAtLabel: formatDate(event.nextRetryAt),
    processedAtLabel: formatDate(event.processedAt),
    createdAtLabel: formatDate(event.createdAt),
  };
}

export type PlatformWebhookRow = ReturnType<typeof buildWebhookRow>;

export async function getPlatformWebhookEventsPageData() {
  return withActionTxContext(async () => {
    const events = await listPlatformWebhookEventAdminSnapshots();
    const rows = events.map(buildWebhookRow);

    return {
      summary: {
        total: rows.length,
        received: rows.filter((row) => row.status === 'RECEIVED').length,
        processing: rows.filter((row) => row.status === 'PROCESSING').length,
        failed: rows.filter((row) => row.status === 'FAILED').length,
      },
      rows,
    };
  });
}

export async function getPlatformWebhookEventDetailPageData(webhookEventId: string) {
  return withActionTxContext(async () => {
    const event = await getPlatformWebhookEventAdminSnapshot(webhookEventId);
    const row = buildWebhookRow(event);

    return {
      event: {
        ...row,
        payloadJson: JSON.stringify(event.payload ?? {}, null, 2),
        canRequeue: ['FAILED', 'RECEIVED'].includes(event.status),
      },
    };
  });
}

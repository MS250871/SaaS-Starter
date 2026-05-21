import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getPlatformOutboxEventAdminSnapshot,
  listPlatformOutboxEventAdminSnapshots,
} from '@/modules/jobs/outbox-events.services';

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

function buildOwnerLabels(
  event: Awaited<ReturnType<typeof getPlatformOutboxEventAdminSnapshot>>,
) {
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

function buildOutboxRow(
  event: Awaited<ReturnType<typeof getPlatformOutboxEventAdminSnapshot>>,
) {
  const owner = buildOwnerLabels(event);

  return {
    id: event.id,
    eventType: event.eventType,
    processingKey: event.processingKey ?? 'N/A',
    status: event.status,
    statusLabel: formatEnumLabel(event.status),
    ownerLabel: owner.ownerLabel,
    ownerSubLabel: owner.ownerSubLabel,
    attempts: event.attempts,
    jobId: event.jobId ?? 'N/A',
    errorSummary: event.lastError ?? 'N/A',
    scheduledAtLabel: formatDate(event.scheduledAt),
    nextRetryAtLabel: formatDate(event.nextRetryAt),
    processedAtLabel: formatDate(event.processedAt),
    createdAtLabel: formatDate(event.createdAt),
  };
}

export type PlatformOutboxRow = ReturnType<typeof buildOutboxRow>;

export async function getPlatformOutboxEventsPageData() {
  return withActionTxContext(async () => {
    const events = await listPlatformOutboxEventAdminSnapshots();
    const rows = events.map(buildOutboxRow);

    return {
      summary: {
        total: rows.length,
        pending: rows.filter((row) => row.status === 'PENDING').length,
        processing: rows.filter((row) => row.status === 'PROCESSING').length,
        failed: rows.filter((row) => row.status === 'FAILED').length,
      },
      rows,
    };
  });
}

export async function getPlatformOutboxEventDetailPageData(outboxEventId: string) {
  return withActionTxContext(async () => {
    const event = await getPlatformOutboxEventAdminSnapshot(outboxEventId);
    const row = buildOutboxRow(event);

    return {
      event: {
        ...row,
        payloadJson: JSON.stringify(event.payload ?? {}, null, 2),
        lockedAtLabel: formatDate(event.lockedAt),
        canRequeue: ['FAILED', 'PENDING'].includes(event.status),
      },
    };
  });
}

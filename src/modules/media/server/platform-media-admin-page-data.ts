import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getPlatformMediaAdminSnapshot,
  listPlatformMediaAdminSnapshots,
  type PlatformMediaAdminSnapshot,
  type PlatformMediaDetailAdminSnapshot,
} from '@/modules/media/media.services';

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

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function buildOwnerLabels(
  media: PlatformMediaAdminSnapshot | PlatformMediaDetailAdminSnapshot,
) {
  if (media.customer) {
    return {
      ownerLabel: formatIdentityName({
        firstName: media.customer.identity.firstName,
        lastName: media.customer.identity.lastName,
        email: media.customer.identity.email,
      }),
      ownerSubLabel: media.customer.externalId
        ? `Customer ${media.customer.externalId}`
        : 'Workspace customer',
    };
  }

  if (media.identity) {
    return {
      ownerLabel: formatIdentityName(media.identity),
      ownerSubLabel: 'Identity owner',
    };
  }

  if (media.workspace) {
    return {
      ownerLabel: media.workspace.name,
      ownerSubLabel: media.workspace.slug,
    };
  }

  return {
    ownerLabel: 'Global',
    ownerSubLabel: 'No tenant scope',
  };
}

function buildMediaRow(
  media: PlatformMediaAdminSnapshot | PlatformMediaDetailAdminSnapshot,
) {
  const owner = buildOwnerLabels(media);
  const attachmentCount =
    'fileAttachments' in media
      ? media.fileAttachments.length
      : media._count.fileAttachments;
  const jobCount =
    'mediaJobs' in media ? media.mediaJobs.length : media._count.mediaJobs;

  return {
    id: media.id,
    fileName: media.fileName,
    mimeType: media.mimeType,
    size: media.size,
    sizeLabel: formatBytes(media.size),
    status: media.status,
    statusLabel: formatEnumLabel(media.status),
    ownerLabel: owner.ownerLabel,
    ownerSubLabel: owner.ownerSubLabel,
    workspaceId: media.workspace?.id ?? media.customer?.workspace?.id ?? null,
    workspaceName:
      media.workspace?.name ?? media.customer?.workspace?.name ?? 'Unscoped',
    workspaceSlug:
      media.workspace?.slug ?? media.customer?.workspace?.slug ?? 'N/A',
    workspaceIsActive: media.workspace?.isActive ?? true,
    attachmentCount,
    jobCount,
    createdAtLabel: formatDate(media.createdAt),
    updatedAtLabel: formatDate(media.updatedAt),
  };
}

export type PlatformMediaRow = ReturnType<typeof buildMediaRow>;

export async function getPlatformMediaPageData() {
  return withActionTxContext(async () => {
    const media = await listPlatformMediaAdminSnapshots();
    const rows = media.map(buildMediaRow);

    return {
      summary: {
        total: rows.length,
        ready: rows.filter((row) => row.status === 'READY').length,
        processing: rows.filter((row) =>
          ['UPLOADING', 'UPLOADED', 'PROCESSING'].includes(row.status),
        ).length,
        failed: rows.filter((row) => row.status === 'FAILED').length,
      },
      rows,
    };
  });
}

export async function getPlatformMediaDetailPageData(mediaId: string) {
  return withActionTxContext(async () => {
    const media = await getPlatformMediaAdminSnapshot(mediaId);
    const row = buildMediaRow(media);

    return {
      media: {
        ...row,
        storageKey: media.storageKey,
        checksum: media.checksum ?? 'N/A',
        url: media.url,
        cdnUrl: media.cdnUrl ?? 'N/A',
        metadataJson: JSON.stringify(media.metadata ?? {}, null, 2),
      },
      attachments: media.fileAttachments.map((attachment) => ({
        id: attachment.id,
        entityType: attachment.entityType,
        entityId: attachment.entityId,
        createdAtLabel: formatDate(attachment.createdAt),
      })),
      jobs: media.mediaJobs.map((job) => ({
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        statusLabel: formatEnumLabel(job.status),
        error: job.error ?? 'N/A',
        createdAtLabel: formatDate(job.createdAt),
        processedAtLabel: formatDate(job.processedAt),
        canRequeue: job.status === 'FAILED',
      })),
    };
  });
}

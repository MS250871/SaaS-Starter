import Image from 'next/image';
import { PaperclipIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SupportThreadEntryView } from '@/modules/support/server/support-thread-view';

function scopeBadgeLabel(scope: SupportThreadEntryView['senderScope']) {
  switch (scope) {
    case 'customer':
      return 'Customer';
    case 'platform':
      return 'Platform';
    case 'workspace':
      return 'Workspace';
    default:
      return 'System';
  }
}

function scopeBadgeVariant(scope: SupportThreadEntryView['senderScope']) {
  switch (scope) {
    case 'platform':
      return 'destructive' as const;
    case 'workspace':
      return 'outline' as const;
    case 'customer':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Calcutta',
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportThreadEntryCard({
  item,
}: {
  item: SupportThreadEntryView;
}) {
  const isInternal = item.kind === 'internal_note';
  const imageAttachments = item.attachments.filter((attachment) =>
    attachment.mimeType.startsWith('image/'),
  );
  const nonImageAttachments = item.attachments.filter(
    (attachment) => !attachment.mimeType.startsWith('image/'),
  );

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        isInternal
          ? 'border-amber-200/70 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30'
          : 'border-border/70 bg-muted/10',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{item.senderName}</p>
        <Badge variant={scopeBadgeVariant(item.senderScope)}>
          {scopeBadgeLabel(item.senderScope)}
        </Badge>
        {isInternal && <Badge variant="outline">Internal Note</Badge>}
        {item.kind === 'opening' && <Badge variant="secondary">Opened Ticket</Badge>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
      {item.attachments.length > 0 && (
        <div className="mt-4 grid gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Attachments
          </p>
          {imageAttachments.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {imageAttachments.map((attachment) => (
                <div
                  key={`preview-${attachment.id}`}
                  className="overflow-hidden rounded-lg border border-border/70 bg-background/70"
                >
                  <Image
                    alt={attachment.fileName}
                    className="h-24 w-full object-cover"
                    height={160}
                    src={attachment.previewUrl}
                    unoptimized
                    width={240}
                  />
                  <div className="grid gap-1 px-2 py-2">
                    <p className="truncate text-[11px] text-muted-foreground">
                      {attachment.fileName}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </span>
                      <a
                        className="text-[11px] font-medium text-primary hover:underline"
                        href={attachment.downloadUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {nonImageAttachments.length > 0 && (
            <div className="grid gap-2">
              {nonImageAttachments.map((attachment) => (
                <a
                  key={attachment.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm transition hover:bg-muted/30"
                  href={attachment.downloadUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{attachment.fileName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

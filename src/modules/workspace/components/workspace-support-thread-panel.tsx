'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MessageSquareReplyIcon,
  MessagesSquareIcon,
  PaperclipIcon,
  ShieldAlertIcon,
  TicketIcon,
  UserRoundCheckIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { addWorkspaceSupportTicketInternalNoteAction } from '@/modules/support/actions/add-workspace-support-ticket-internal-note.action';
import { addWorkspaceSupportTicketReplyAction } from '@/modules/support/actions/add-workspace-support-ticket-reply.action';
import { updateWorkspaceSupportTicketAssignmentAction } from '@/modules/support/actions/update-workspace-support-ticket-assignment.action';
import { updateWorkspaceSupportTicketStatusAction } from '@/modules/support/actions/update-workspace-support-ticket-status.action';

type SupportThreadItem = {
  id: string;
  kind: 'opening' | 'reply' | 'internal_note';
  senderType: string;
  senderScope: 'workspace' | 'platform' | 'customer' | 'system';
  senderName: string;
  message: string;
  createdAt: string;
  attachments: SupportAttachmentItem[];
};

type SupportAttachmentItem = {
  id: string;
  mediaId: string;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
};

type SelectedSupportTicket = {
  id: string;
  contextType: string;
  title: string;
  body: string;
  status: string;
  priority: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  createdByName: string | null;
  createdByCustomerName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  threadItems: SupportThreadItem[];
};

type AssigneeOption = {
  identityId: string;
  name: string;
  email: string | null;
};

function formatStatusLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function statusBadgeVariant(status: string) {
  if (status === 'closed' || status === 'resolved') {
    return 'secondary' as const;
  }

  if (status === 'in_progress') {
    return 'outline' as const;
  }

  return 'destructive' as const;
}

function priorityBadgeVariant(priority?: string | null) {
  if (priority === 'urgent' || priority === 'high') {
    return 'destructive' as const;
  }

  if (priority === 'medium') {
    return 'outline' as const;
  }

  return 'secondary' as const;
}

function scopeBadgeLabel(scope: SupportThreadItem['senderScope']) {
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

function scopeBadgeVariant(scope: SupportThreadItem['senderScope']) {
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

function ticketContextLabel(contextType: string) {
  return contextType === 'PLATFORM'
    ? 'Platform Escalation'
    : 'Customer Support Ticket';
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

function TicketStatusSelect({
  ticketId,
  value,
  disabled,
}: {
  ticketId: string;
  value: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      disabled={disabled || isPending}
      value={value}
      onValueChange={(status) => {
        startTransition(async () => {
          const formData = new FormData();
          formData.append('ticketId', ticketId);
          formData.append('status', status);
          const response = await updateWorkspaceSupportTicketStatusAction(formData);

          if (response.success) {
            router.refresh();
          }
        });
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">Open</SelectItem>
        <SelectItem value="in_progress">In progress</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
        <SelectItem value="closed">Closed</SelectItem>
      </SelectContent>
    </Select>
  );
}

function TicketAssigneeSelect({
  ticketId,
  assignedToId,
  assigneeOptions,
  disabled,
}: {
  ticketId: string;
  assignedToId: string | null;
  assigneeOptions: AssigneeOption[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      disabled={disabled || isPending}
      value={assignedToId ?? 'unassigned'}
      onValueChange={(nextValue) => {
        startTransition(async () => {
          const formData = new FormData();
          formData.append('ticketId', ticketId);
          formData.append('assignedToId', nextValue);
          const response = await updateWorkspaceSupportTicketAssignmentAction(
            formData,
          );

          if (response.success) {
            router.refresh();
          }
        });
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {assigneeOptions.map((assignee) => (
          <SelectItem key={assignee.identityId} value={assignee.identityId}>
            {assignee.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ThreadMessageCard({ item }: { item: SupportThreadItem }) {
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

export function WorkspaceSupportThreadPanel({
  backHref,
  selectedTicket,
  assigneeOptions,
  canUpdateTicket,
  canAssignTicket,
  canReplyTicket,
  canAddInternalNote,
}: {
  backHref: string;
  selectedTicket: SelectedSupportTicket | null;
  assigneeOptions: AssigneeOption[];
  canUpdateTicket: boolean;
  canAssignTicket: boolean;
  canReplyTicket: boolean;
  canAddInternalNote: boolean;
}) {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [replyFileInputKey, setReplyFileInputKey] = useState(0);
  const [noteFileInputKey, setNoteFileInputKey] = useState(0);
  const [replyPending, startReplyTransition] = useTransition();
  const [notePending, startNoteTransition] = useTransition();

  if (!selectedTicket) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Support ticket not found for this workspace.
        </div>
      </div>
    );
  }

  const raisedBy =
    selectedTicket.createdByCustomerName ??
    selectedTicket.createdByName ??
    'Unknown sender';
  const isPlatformEscalation = selectedTicket.contextType === 'PLATFORM';
  const hasPlatformResponse = selectedTicket.threadItems.some(
    (item) => item.senderScope === 'platform' && item.kind !== 'opening',
  );
  const canReplyInContext =
    canReplyTicket && (!isPlatformEscalation || hasPlatformResponse);
  const showThreadControls = !isPlatformEscalation;
  const showInternalNotes = !isPlatformEscalation;

  const onSubmitReply = () => {
    if (!replyMessage.trim()) {
      return;
    }

    setReplyError(null);
    startReplyTransition(async () => {
      const formData = new FormData();
      formData.append('ticketId', selectedTicket.id);
      formData.append('message', replyMessage.trim());
      replyFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await addWorkspaceSupportTicketReplyAction(formData);

      if (!response.success) {
        setReplyError(response.error.message);
        return;
      }

      setReplyMessage('');
      setReplyFiles([]);
      setReplyFileInputKey((current) => current + 1);
      router.refresh();
    });
  };

  const onSubmitInternalNote = () => {
    if (!internalNote.trim()) {
      return;
    }

    setNoteError(null);
    startNoteTransition(async () => {
      const formData = new FormData();
      formData.append('ticketId', selectedTicket.id);
      formData.append('message', internalNote.trim());
      noteFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await addWorkspaceSupportTicketInternalNoteAction(formData);

      if (!response.success) {
        setNoteError(response.error.message);
        return;
      }

      setInternalNote('');
      setNoteFiles([]);
      setNoteFileInputKey((current) => current + 1);
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{selectedTicket.title}</CardTitle>
                <Badge variant={statusBadgeVariant(selectedTicket.status)}>
                  {formatStatusLabel(selectedTicket.status)}
                </Badge>
                {selectedTicket.priority && (
                  <Badge variant={priorityBadgeVariant(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                )}
                <Badge variant="outline">
                  {ticketContextLabel(selectedTicket.contextType)}
                </Badge>
              </div>
              <CardDescription className="mt-2">
                Raised by {raisedBy} on{' '}
                {formatDateTime(selectedTicket.createdAt)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={backHref}>
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back to Queue
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TicketIcon className="size-4 text-accent" />
              Context
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {ticketContextLabel(selectedTicket.contextType)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessagesSquareIcon className="size-4 text-accent" />
              Thread
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedTicket.threadItems.length} entries in this conversation
            </p>
          </div>
          {showThreadControls ? (
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserRoundCheckIcon className="size-4 text-accent" />
                Assignee
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedTicket.assignedToName ?? 'Unassigned'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserRoundCheckIcon className="size-4 text-accent" />
                Escalation Owner
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Platform support manages assignment for this escalation.
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessagesSquareIcon className="size-4 text-accent" />
              Last Activity
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateTime(selectedTicket.updatedAt)}
            </p>
          </div>
      </div>

      {showThreadControls ? (
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Thread Controls</CardTitle>
            <CardDescription>
              Manage ticket status and ownership from the thread itself.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <FieldContent>
                <TicketStatusSelect
                  ticketId={selectedTicket.id}
                  value={selectedTicket.status}
                  disabled={!canUpdateTicket}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Assigned To</FieldLabel>
              <FieldContent>
                <TicketAssigneeSelect
                  ticketId={selectedTicket.id}
                  assignedToId={selectedTicket.assignedToId}
                  assigneeOptions={assigneeOptions}
                  disabled={!canAssignTicket}
                />
              </FieldContent>
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>
            Full customer and platform support history for this ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedTicket.threadItems.map((item) => (
            <ThreadMessageCard key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquareReplyIcon className="size-4 text-accent" />
              <CardTitle>Reply</CardTitle>
            </div>
            <CardDescription>
              Send the next response in this support thread.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={replyMessage}
              onChange={(event) => setReplyMessage(event.target.value)}
              placeholder="Write your response to this support thread."
              disabled={!canReplyInContext || replyPending}
            />
            <Input
              key={replyFileInputKey}
              disabled={!canReplyInContext || replyPending}
              multiple
              onChange={(event) => {
                setReplyFiles(Array.from(event.target.files ?? []));
              }}
              type="file"
            />
            {isPlatformEscalation && !hasPlatformResponse && (
              <Alert>
                <AlertTitle>Awaiting platform response</AlertTitle>
                <AlertDescription>
                  You can add a follow-up reply after the platform team responds
                  to this escalation.
                </AlertDescription>
              </Alert>
            )}
            {replyFiles.length > 0 && (
              <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                {replyFiles.map((file) => file.name).join(', ')}
              </div>
            )}
            {replyError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to send reply</AlertTitle>
                <AlertDescription>{replyError}</AlertDescription>
              </Alert>
            )}
            {replyPending ? (
              <SpinnerButton
                className="w-full sm:w-auto"
                message="Sending reply..."
              />
            ) : (
              <Button
                onClick={onSubmitReply}
                disabled={!canReplyInContext || !replyMessage.trim()}
              >
                Send Reply
              </Button>
            )}
          </CardContent>
        </Card>

        {showInternalNotes ? (
          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="size-4 text-accent" />
                <CardTitle>Internal Notes</CardTitle>
              </div>
              <CardDescription>
                Capture internal workspace-only notes for this ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder="Capture internal context, follow-ups, or operational notes."
                disabled={!canAddInternalNote || notePending}
              />
              <Input
                key={noteFileInputKey}
                disabled={!canAddInternalNote || notePending}
                multiple
                onChange={(event) => {
                  setNoteFiles(Array.from(event.target.files ?? []));
                }}
                type="file"
              />
              {noteFiles.length > 0 && (
                <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                  {noteFiles.map((file) => file.name).join(', ')}
                </div>
              )}
              {noteError && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to save note</AlertTitle>
                  <AlertDescription>{noteError}</AlertDescription>
                </Alert>
              )}
              {notePending ? (
                <SpinnerButton
                  className="w-full sm:w-auto"
                  message="Saving note..."
                />
              ) : (
                <Button
                  variant="outline"
                  onClick={onSubmitInternalNote}
                  disabled={!canAddInternalNote || !internalNote.trim()}
                >
                  Add Internal Note
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}

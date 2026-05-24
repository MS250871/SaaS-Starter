'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  MessageSquareReplyIcon,
  MessagesSquareIcon,
  ShieldAlertIcon,
  TicketIcon,
  UserRoundCheckIcon,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldLabel,
} from '@/components/ui/field';
import { useActionToast } from '@/hooks/use-action-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { SupportThreadEntryCard } from '@/modules/support/components/support-thread-entry-card';
import type { SupportThreadEntryView } from '@/modules/support/server/support-thread-view';
import { addWorkspaceSupportTicketInternalNoteAction } from '@/modules/support/actions/add-workspace-support-ticket-internal-note.action';
import { addWorkspaceSupportTicketReplyAction } from '@/modules/support/actions/add-workspace-support-ticket-reply.action';
import { updateWorkspaceSupportTicketAssignmentAction } from '@/modules/support/actions/update-workspace-support-ticket-assignment.action';
import { updateWorkspaceSupportTicketStatusAction } from '@/modules/support/actions/update-workspace-support-ticket-status.action';

type SelectedSupportTicket = {
  id: string;
  contextType: string;
  contextLabel: string;
  ownerScope: 'workspace' | 'platform';
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
  conversationItems: SupportThreadEntryView[];
  internalNotes: SupportThreadEntryView[];
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Calcutta',
  }).format(new Date(value));
}

function buildOptimisticThreadEntry(params: {
  id: string;
  kind: 'reply' | 'internal_note';
  message: string;
  senderScope: 'workspace';
}): SupportThreadEntryView {
  return {
    id: params.id,
    kind: params.kind,
    senderType: 'IDENTITY',
    senderScope: params.senderScope,
    senderName: 'You',
    message: params.message,
    createdAt: new Date().toISOString(),
    attachments: [],
  };
}

function TicketStatusSelect({
  ticketId,
  value,
  disabled,
  onUpdated,
}: {
  ticketId: string;
  value: string;
  disabled: boolean;
  onUpdated?: (nextStatus: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

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

          if (!response.success) {
            showActionError(response.error);
            return;
          }

          onUpdated?.(response.data.status);
          showActionSuccess(response.data.successMessage, 'Ticket status updated.');
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
  onUpdated,
}: {
  ticketId: string;
  assignedToId: string | null;
  assigneeOptions: AssigneeOption[];
  disabled: boolean;
  onUpdated?: (next: {
    assignedToId: string | null;
    assigneeName: string | null;
  }) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

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

          if (!response.success) {
            showActionError(response.error);
            return;
          }

          onUpdated?.({
            assignedToId: response.data.assignedToId,
            assigneeName: response.data.assigneeName,
          });
          showActionSuccess(
            response.data.successMessage,
            'Ticket assignment updated.',
          );
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
  const { showActionError, showActionSuccess } = useActionToast();
  const [replyMessage, setReplyMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [replyFileInputKey, setReplyFileInputKey] = useState(0);
  const [noteFileInputKey, setNoteFileInputKey] = useState(0);
  const [replyPending, startReplyTransition] = useTransition();
  const [notePending, startNoteTransition] = useTransition();
  const [ticketState, setTicketState] = useState(selectedTicket);

  useEffect(() => {
    setTicketState(selectedTicket);
  }, [selectedTicket]);

  if (!ticketState) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Support ticket not found for this workspace.
        </div>
      </div>
    );
  }

  const raisedBy =
    ticketState.createdByCustomerName ??
    ticketState.createdByName ??
    'Unknown sender';
  const isWorkspaceOwned = ticketState.ownerScope === 'workspace';
  const canControlInContext = isWorkspaceOwned && canUpdateTicket;
  const canAssignInContext = isWorkspaceOwned && canAssignTicket;
  const canAddInternalNotesInContext = isWorkspaceOwned && canAddInternalNote;

  const onSubmitReply = () => {
    if (!replyMessage.trim()) {
      return;
    }

    startReplyTransition(async () => {
      const submittedMessage = replyMessage.trim();
      const hasAttachments = replyFiles.length > 0;
      const formData = new FormData();
      formData.append('ticketId', ticketState.id);
      formData.append('message', submittedMessage);
      replyFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await addWorkspaceSupportTicketReplyAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage, 'Reply added.');
      if (!hasAttachments) {
        setTicketState((current) =>
          current
            ? {
                ...current,
                updatedAt: new Date().toISOString(),
                messageCount: current.messageCount + 1,
                conversationItems: [
                  ...current.conversationItems,
                  buildOptimisticThreadEntry({
                    id: response.data.messageId,
                    kind: 'reply',
                    message: submittedMessage,
                    senderScope: 'workspace',
                  }),
                ],
              }
            : current,
        );
      }
      setReplyMessage('');
      setReplyFiles([]);
      setReplyFileInputKey((current) => current + 1);
      if (hasAttachments) {
        router.refresh();
      }
    });
  };

  const onSubmitInternalNote = () => {
    if (!internalNote.trim()) {
      return;
    }

    startNoteTransition(async () => {
      const submittedMessage = internalNote.trim();
      const hasAttachments = noteFiles.length > 0;
      const formData = new FormData();
      formData.append('ticketId', ticketState.id);
      formData.append('message', submittedMessage);
      noteFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await addWorkspaceSupportTicketInternalNoteAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage, 'Internal note added.');
      if (!hasAttachments) {
        setTicketState((current) =>
          current
            ? {
                ...current,
                updatedAt: new Date().toISOString(),
                messageCount: current.messageCount + 1,
                internalNotes: [
                  ...current.internalNotes,
                  buildOptimisticThreadEntry({
                    id: response.data.messageId,
                    kind: 'internal_note',
                    message: submittedMessage,
                    senderScope: 'workspace',
                  }),
                ],
              }
            : current,
        );
      }
      setInternalNote('');
      setNoteFiles([]);
      setNoteFileInputKey((current) => current + 1);
      if (hasAttachments) {
        router.refresh();
      }
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="workspace-info-card border bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{ticketState.title}</CardTitle>
                <Badge variant={statusBadgeVariant(ticketState.status)}>
                  {formatStatusLabel(ticketState.status)}
                </Badge>
                {ticketState.priority && (
                  <Badge variant={priorityBadgeVariant(ticketState.priority)}>
                    {ticketState.priority}
                  </Badge>
                )}
                <Badge variant="outline">{ticketState.contextLabel}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Raised by {raisedBy} on {formatDateTime(ticketState.createdAt)}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={backHref}>
                <ArrowLeftIcon className="mr-2 size-4" />
                Back to Queue
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="workspace-info-card rounded-2xl border bg-background p-4 shadow-sm">
          <div className="workspace-info-label flex items-center gap-2 text-sm font-medium">
            <TicketIcon className="size-4 text-accent" />
            Context
          </div>
          <p className="workspace-info-value mt-2 text-sm font-medium">
            {ticketState.contextLabel}
          </p>
        </div>
        <div className="workspace-info-card rounded-2xl border bg-background p-4 shadow-sm">
          <div className="workspace-info-label flex items-center gap-2 text-sm font-medium">
            <MessagesSquareIcon className="size-4 text-accent" />
            Conversation
          </div>
          <p className="workspace-info-value mt-2 text-sm font-medium">
            {ticketState.conversationItems.length} thread item(s)
          </p>
        </div>
        <div className="workspace-info-card rounded-2xl border bg-background p-4 shadow-sm">
          <div className="workspace-info-label flex items-center gap-2 text-sm font-medium">
            <UserRoundCheckIcon className="size-4 text-accent" />
            Desk Owner
          </div>
          <p className="workspace-info-value mt-2 text-sm font-medium">
            {isWorkspaceOwned ? 'Workspace support desk' : 'Platform support desk'}
          </p>
        </div>
        <div className="workspace-info-card rounded-2xl border bg-background p-4 shadow-sm">
          <div className="workspace-info-label flex items-center gap-2 text-sm font-medium">
            <MessagesSquareIcon className="size-4 text-accent" />
            Last Activity
          </div>
          <p className="workspace-info-value mt-2 text-sm font-medium">
            {formatDateTime(ticketState.updatedAt)}
          </p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <Card className="workspace-info-card border bg-background/85">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquareReplyIcon className="size-4 text-accent" />
              <CardTitle>Conversation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketState.conversationItems.map((item) => (
              <SupportThreadEntryCard key={item.id} item={item} />
            ))}

            <div className="border-t border-border/70 pt-4">
              <div className="space-y-4">
                <p className="text-sm font-medium">Reply</p>
                <Textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  placeholder="Write your response to this support thread."
                  disabled={!canReplyTicket || replyPending}
                />
                <Input
                  key={replyFileInputKey}
                  disabled={!canReplyTicket || replyPending}
                  multiple
                  onChange={(event) => {
                    setReplyFiles(Array.from(event.target.files ?? []));
                  }}
                  type="file"
                />
                {replyFiles.length > 0 && (
                  <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                    {replyFiles.map((file) => file.name).join(', ')}
                  </div>
                )}
                {replyPending ? (
                  <SpinnerButton message="Sending reply..." />
                ) : (
                  <Button
                    onClick={onSubmitReply}
                    disabled={!canReplyTicket || !replyMessage.trim()}
                  >
                    Send Reply
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {isWorkspaceOwned ? (
            <Card className="workspace-info-card border bg-background/85">
              <CardHeader>
                <CardTitle>Ticket Controls</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <FieldContent>
                    <TicketStatusSelect
                      ticketId={ticketState.id}
                      value={ticketState.status}
                      disabled={!canControlInContext}
                      onUpdated={(nextStatus) => {
                        setTicketState((current) =>
                          current
                            ? {
                                ...current,
                                status: nextStatus,
                                updatedAt: new Date().toISOString(),
                              }
                            : current,
                        );
                      }}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Assigned To</FieldLabel>
                  <FieldContent>
                    <TicketAssigneeSelect
                      ticketId={ticketState.id}
                      assignedToId={ticketState.assignedToId}
                      assigneeOptions={assigneeOptions}
                      disabled={!canAssignInContext}
                      onUpdated={(next) => {
                        setTicketState((current) =>
                          current
                            ? {
                                ...current,
                                assignedToId: next.assignedToId,
                                assignedToName: next.assigneeName,
                                updatedAt: new Date().toISOString(),
                              }
                            : current,
                        );
                      }}
                    />
                  </FieldContent>
                </Field>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTitle>Platform-owned escalation</AlertTitle>
              <AlertDescription>
                Platform support controls status, assignment, and notes. Your workspace can still reply here.
              </AlertDescription>
            </Alert>
          )}

          {isWorkspaceOwned ? (
            <Card className="workspace-info-card border bg-background/85">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlertIcon className="size-4 text-accent" />
                  <CardTitle>Internal Notes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketState.internalNotes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No internal notes yet for this ticket.
                  </div>
                ) : (
                  ticketState.internalNotes.map((item) => (
                    <SupportThreadEntryCard key={item.id} item={item} />
                  ))
                )}

                <div className="border-t border-border/70 pt-4">
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Add Note</p>
                    <Textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      placeholder="Capture internal context, handoff notes, or follow-up tasks."
                      disabled={!canAddInternalNotesInContext || notePending}
                    />
                    <Input
                      key={noteFileInputKey}
                      disabled={!canAddInternalNotesInContext || notePending}
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
                    {notePending ? (
                      <SpinnerButton message="Saving note..." />
                    ) : (
                      <Button
                        variant="outline"
                        onClick={onSubmitInternalNote}
                        disabled={
                          !canAddInternalNotesInContext || !internalNote.trim()
                        }
                      >
                        Add Internal Note
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </section>
  );
}

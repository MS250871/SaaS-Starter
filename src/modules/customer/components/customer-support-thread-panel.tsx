'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  MessageSquareReplyIcon,
  MessagesSquareIcon,
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
import { useActionToast } from '@/hooks/use-action-toast';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { SupportThreadEntryCard } from '@/modules/support/components/support-thread-entry-card';
import type { SupportThreadEntryView } from '@/modules/support/server/support-thread-view';
import { addCustomerSupportTicketReplyAction } from '@/modules/support/actions/add-customer-support-ticket-reply.action';

type SelectedSupportTicket = {
  id: string;
  contextType: string;
  contextLabel: string;
  ownerScope: 'workspace';
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
  message: string;
}): SupportThreadEntryView {
  return {
    id: params.id,
    kind: 'reply',
    senderType: 'CUSTOMER',
    senderScope: 'customer',
    senderName: 'You',
    message: params.message,
    createdAt: new Date().toISOString(),
    attachments: [],
  };
}

export function CustomerSupportThreadPanel({
  backHref,
  selectedTicket,
}: {
  backHref: string;
  selectedTicket: SelectedSupportTicket | null;
}) {
  const router = useRouter();
  const { showActionError, showActionSuccess } = useActionToast();
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyFileInputKey, setReplyFileInputKey] = useState(0);
  const [replyPending, startReplyTransition] = useTransition();
  const [ticketState, setTicketState] = useState(selectedTicket);

  useEffect(() => {
    setTicketState(selectedTicket);
  }, [selectedTicket]);

  if (!ticketState) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Support ticket not found for this customer.
        </div>
      </div>
    );
  }

  const raisedBy =
    ticketState.createdByCustomerName ??
    ticketState.createdByName ??
    'Unknown sender';

  const onSubmitReply = () => {
    if (!replyMessage.trim()) {
      return;
    }

    startReplyTransition(async () => {
      const submittedMessage = replyMessage.trim();
      const formData = new FormData();
      formData.append('ticketId', ticketState.id);
      formData.append('message', submittedMessage);
      replyFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await addCustomerSupportTicketReplyAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage, 'Reply added.');
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
                  message: submittedMessage,
                }),
              ],
            }
          : current,
      );
      setReplyMessage('');
      setReplyFiles([]);
      setReplyFileInputKey((current) => current + 1);
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
                Opened on {formatDateTime(ticketState.createdAt)} by {raisedBy}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={backHref}>
                <ArrowLeftIcon className="mr-2 size-4" />
                Back to Tickets
              </Link>
            </Button>
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
            {ticketState.contextLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessagesSquareIcon className="size-4 text-accent" />
            Conversation
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {ticketState.conversationItems.length} thread item(s)
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserRoundCheckIcon className="size-4 text-accent" />
            Desk Owner
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Workspace support manages ticket status and assignment.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessagesSquareIcon className="size-4 text-accent" />
            Last Activity
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDateTime(ticketState.updatedAt)}
          </p>
        </div>
      </div>

      <Alert>
        <AlertTitle>Workspace support owns this ticket</AlertTitle>
        <AlertDescription>
          You can continue the conversation below, while the workspace support
          desk manages status, assignment, and internal follow-up.
        </AlertDescription>
      </Alert>

      <Card className="border-border/70 bg-background/85">
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
              <div>
                <p className="text-sm font-medium">Reply</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the next update or answer from your side.
                </p>
              </div>
              <Textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                placeholder="Write your response to the workspace support desk."
                disabled={replyPending}
              />
              <Input
                key={replyFileInputKey}
                disabled={replyPending}
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
                <SpinnerButton
                  className="w-full sm:w-auto"
                  message="Sending reply..."
                />
              ) : (
                <Button
                  onClick={onSubmitReply}
                  disabled={!replyMessage.trim()}
                >
                  Send Reply
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

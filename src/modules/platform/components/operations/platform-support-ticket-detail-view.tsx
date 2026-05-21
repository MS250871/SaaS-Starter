'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformSupportTicketControls } from '@/modules/platform/components/operations/platform-support-ticket-controls';
import { PlatformSupportTicketInternalNotesPanel } from '@/modules/platform/components/operations/platform-support-ticket-internal-notes-panel';
import { PlatformSupportTicketReplyComposer } from '@/modules/platform/components/operations/platform-support-ticket-reply-composer';
import { SupportThreadEntryCard } from '@/modules/support/components/support-thread-entry-card';
import type {
  getPlatformSupportTicketDetailPageData,
} from '@/modules/support/server/platform-support-admin-page-data';
import type { SupportThreadEntryView } from '@/modules/support/server/support-thread-view';

type PlatformSupportTicketDetailData = NonNullable<
  Awaited<ReturnType<typeof getPlatformSupportTicketDetailPageData>>
>;

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function buildOptimisticThreadEntry(params: {
  id: string;
  kind: 'reply' | 'internal_note';
  message: string;
  createdAt: string;
}): SupportThreadEntryView & { createdAtLabel: string } {
  return {
    id: params.id,
    kind: params.kind,
    senderType: 'IDENTITY',
    senderScope: 'platform',
    senderName: 'You',
    message: params.message,
    createdAt: params.createdAt,
    createdAtLabel: formatDateLabel(new Date(params.createdAt)),
    attachments: [],
  };
}

export function PlatformSupportTicketDetailView({
  data,
  canUpdateTicket,
  canAssignTicket,
  canReplyTicket,
  canAddInternalNote,
}: {
  data: PlatformSupportTicketDetailData;
  canUpdateTicket: boolean;
  canAssignTicket: boolean;
  canReplyTicket: boolean;
  canAddInternalNote: boolean;
}) {
  const [ticketData, setTicketData] = useState(data);

  useEffect(() => {
    setTicketData(data);
  }, [data]);

  const isPlatformOwned = ticketData.ticket.ownerScope === 'platform';

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <p className="text-sm text-muted-foreground">
                /platform/operations/support/{ticketData.ticket.id}
              </p>
              <CardTitle>{ticketData.ticket.title}</CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/platform/operations/support">Back to support</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Status</p>
            <CardTitle className="text-xl">
              <Badge
                variant={
                  ticketData.ticket.status === 'closed' || ticketData.ticket.status === 'resolved'
                    ? 'outline'
                    : ticketData.ticket.status === 'in_progress'
                      ? 'secondary'
                      : 'default'
                }
              >
                {ticketData.ticket.statusLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{ticketData.ticket.contextTypeLabel}</p>
            <p>{ticketData.ticket.priorityLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Workspace</p>
            <CardTitle className="text-xl">{ticketData.ticket.workspaceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{ticketData.ticket.workspaceSlug}</p>
            <p>{ticketData.ticket.createdAtLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Requester</p>
            <CardTitle className="text-xl">{ticketData.ticket.requesterLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{ticketData.ticket.requesterSubLabel}</p>
            <p>{ticketData.ticket.messageCount} messages</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Desk Owner</p>
            <CardTitle className="text-xl">
              {isPlatformOwned ? 'Platform' : 'Workspace'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Assignee: {ticketData.ticket.assigneeLabel}</p>
            <p>Updated: {ticketData.ticket.updatedAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      {!isPlatformOwned ? (
        <Alert>
          <AlertTitle>Workspace-owned ticket</AlertTitle>
          <AlertDescription>
            This ticket belongs to a workspace support desk. Platform can review
            the thread, but status, assignment, replies, and internal notes stay
            with the workspace owner of the queue.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketData.conversationItems.map((item) => (
              <SupportThreadEntryCard key={item.id} item={item} />
            ))}
            {isPlatformOwned ? (
              <PlatformSupportTicketReplyComposer
                ticketId={ticketData.ticket.id}
                disabled={!canReplyTicket}
                onReplyAdded={(entry) => {
                  setTicketData((current) => ({
                    ...current,
                    ticket: {
                      ...current.ticket,
                      messageCount: current.ticket.messageCount + 1,
                      updatedAtLabel: formatDateLabel(new Date(entry.createdAt)),
                    },
                    conversationItems: [
                      ...current.conversationItems,
                      buildOptimisticThreadEntry({
                        id: entry.id,
                        kind: 'reply',
                        message: entry.message,
                        createdAt: entry.createdAt,
                      }),
                    ],
                  }));
                }}
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {isPlatformOwned ? (
            <>
              <Card className="border-border/70 bg-background/85">
                <CardHeader>
                  <CardTitle>Ticket Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlatformSupportTicketControls
                    ticketId={ticketData.ticket.id}
                    currentStatus={ticketData.ticket.status}
                    currentAssigneeId={ticketData.ticket.assigneeId}
                    assigneeOptions={ticketData.assigneeOptions}
                    canUpdateTicket={canUpdateTicket}
                    canAssignTicket={canAssignTicket}
                    onStatusUpdated={(nextStatus) => {
                      setTicketData((current) => ({
                        ...current,
                        ticket: {
                          ...current.ticket,
                          status: nextStatus,
                          statusLabel: formatStatusLabel(nextStatus),
                          updatedAtLabel: formatDateLabel(new Date()),
                        },
                      }));
                    }}
                    onAssignmentUpdated={(next) => {
                      setTicketData((current) => ({
                        ...current,
                        ticket: {
                          ...current.ticket,
                          assigneeId: next.assignedToId,
                          assigneeLabel: next.assigneeName ?? 'Unassigned',
                          updatedAtLabel: formatDateLabel(new Date()),
                        },
                      }));
                    }}
                  />
                </CardContent>
              </Card>

              <PlatformSupportTicketInternalNotesPanel
                ticketId={ticketData.ticket.id}
                items={ticketData.internalNotes}
                disabled={!canAddInternalNote}
                onNoteAdded={(entry) => {
                  setTicketData((current) => ({
                    ...current,
                    ticket: {
                      ...current.ticket,
                      messageCount: current.ticket.messageCount + 1,
                      updatedAtLabel: formatDateLabel(new Date(entry.createdAt)),
                    },
                    internalNotes: [
                      ...current.internalNotes,
                      buildOptimisticThreadEntry({
                        id: entry.id,
                        kind: 'internal_note',
                        message: entry.message,
                        createdAt: entry.createdAt,
                      }),
                    ],
                  }));
                }}
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

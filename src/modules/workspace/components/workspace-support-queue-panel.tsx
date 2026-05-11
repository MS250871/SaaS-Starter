import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon, LifeBuoyIcon, PlusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SupportTicketItem = {
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
  assignedToName: string | null;
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

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function WorkspaceSupportQueuePanel({
  basePath,
  queue,
  tickets,
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  supportSummary,
}: {
  basePath: string;
  queue: 'workspace' | 'platform';
  tickets: SupportTicketItem[];
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  supportSummary: {
    openWorkspaceTickets: number;
    openPlatformEscalations: number;
    totalWorkspaceTickets: number;
    totalPlatformEscalations: number;
  };
}) {
  const isPlatform = queue === 'platform';
  const routeBase = isPlatform
    ? `${basePath}/support/escalations`
    : `${basePath}/support`;
  const alternateHref = isPlatform
    ? `${basePath}/support`
    : `${basePath}/support/escalations`;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Customer Tickets"
          value={supportSummary.openWorkspaceTickets}
          detail="Workspace-scoped issues currently active."
        />
        <StatCard
          label="Customer Queue"
          value={supportSummary.totalWorkspaceTickets}
          detail="All customer-facing tickets for this workspace."
        />
        <StatCard
          label="Open Platform Escalations"
          value={supportSummary.openPlatformEscalations}
          detail="Escalations currently active with the platform team."
        />
        <StatCard
          label="Platform Escalations"
          value={supportSummary.totalPlatformEscalations}
          detail="All platform tickets raised from this workspace."
        />
      </div>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoyIcon className="size-4 text-accent" />
                <CardTitle>
                  {isPlatform ? 'Platform Escalations' : 'Customer Support Queue'}
                </CardTitle>
              </div>
              <CardDescription className="mt-2">
                {isPlatform
                  ? 'Track tickets your workspace has escalated to the platform team.'
                  : 'Manage customer-facing support tickets for this workspace.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={alternateHref}>
                  {isPlatform ? 'Customer Queue' : 'Platform Escalations'}
                </Link>
              </Button>
              <Button asChild>
                <Link href={`${basePath}/support/create`}>
                  <PlusIcon className="mr-2 size-4" />
                  Create Ticket
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>{isPlatform ? 'Escalation List' : 'Ticket List'}</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-sm text-muted-foreground">
              {isPlatform
                ? 'No platform escalations yet.'
                : 'No customer support tickets yet.'}
            </div>
          ) : (
            tickets.map((ticket) => {
              const raisedBy =
                ticket.createdByCustomerName ??
                ticket.createdByName ??
                'Unknown sender';

              return (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-border/70 bg-muted/10 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{ticket.title}</p>
                        <Badge variant={statusBadgeVariant(ticket.status)}>
                          {formatStatusLabel(ticket.status)}
                        </Badge>
                        {ticket.priority && (
                          <Badge variant={priorityBadgeVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {ticket.messageCount} thread items
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {ticket.body}
                      </p>
                      <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                        <p>Raised by: {raisedBy}</p>
                        <p>
                          Updated: {new Date(ticket.updatedAt).toLocaleString()}
                        </p>
                        <p>Assigned to: {ticket.assignedToName ?? 'Unassigned'}</p>
                      </div>
                    </div>
                    <Button asChild className="w-full lg:w-auto">
                      <Link href={`${basePath}/support/${ticket.id}`}>Open Thread</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages}
            </p>
            <div className="flex gap-3">
              {hasPreviousPage ? (
                <Button asChild variant="outline">
                  <Link href={`${routeBase}?page=${Math.max(page - 1, 1)}`}>
                    <ArrowLeftIcon className="mr-2 size-4" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Previous
                </Button>
              )}
              {hasNextPage ? (
                <Button asChild variant="outline">
                  <Link href={`${routeBase}?page=${page + 1}`}>
                    Next
                    <ArrowRightIcon className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Next
                  <ArrowRightIcon className="ml-2 size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

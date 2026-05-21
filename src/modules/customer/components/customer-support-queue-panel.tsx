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
    <Card className="border-border/70 bg-background/85">
      <CardHeader className="gap-2">
        <p className="text-sm font-medium">{label}</p>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function CustomerSupportQueuePanel({
  basePath,
  tickets,
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  supportSummary,
}: {
  basePath: string;
  tickets: SupportTicketItem[];
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  supportSummary: {
    totalTickets: number;
    openTickets: number;
  };
}) {
  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Open Tickets"
          value={supportSummary.openTickets}
          detail="Tickets still active with the workspace support desk."
        />
        <StatCard
          label="Total Tickets"
          value={supportSummary.totalTickets}
          detail="Every support case you have raised in this workspace."
        />
      </div>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoyIcon className="size-4 text-accent" />
                <CardTitle>Support Tickets</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Track your open cases and continue the conversation with the
                workspace support desk.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href={`${basePath}/support/create`}>
                <PlusIcon className="mr-2 size-4" />
                Open Ticket
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Ticket List</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-sm text-muted-foreground">
              You have not opened any support tickets yet.
            </div>
          ) : (
            tickets.map((ticket) => (
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
                      <Badge variant="outline">{ticket.messageCount} thread items</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {ticket.body}
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                      <p>Latest update: {new Date(ticket.updatedAt).toLocaleString()}</p>
                      <p>Assigned to: {ticket.assignedToName ?? 'Workspace support'}</p>
                    </div>
                  </div>
                  <Button asChild className="w-full lg:w-auto">
                    <Link href={`${basePath}/support/${ticket.id}`}>Open Thread</Link>
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages}
            </p>
            <div className="flex gap-3">
              {hasPreviousPage ? (
                <Button asChild variant="outline">
                  <Link href={`${basePath}/support?page=${Math.max(page - 1, 1)}`}>
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
                  <Link href={`${basePath}/support?page=${page + 1}`}>
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

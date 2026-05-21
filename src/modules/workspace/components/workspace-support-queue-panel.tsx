'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { LifeBuoyIcon, PlusIcon } from 'lucide-react';
import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
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
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export function WorkspaceSupportQueuePanel({
  basePath,
  queue,
  tickets,
  supportSummary,
}: {
  basePath: string;
  queue: 'workspace' | 'platform';
  tickets: SupportTicketItem[];
  supportSummary: {
    openWorkspaceTickets: number;
    openPlatformEscalations: number;
    totalWorkspaceTickets: number;
    totalPlatformEscalations: number;
  };
}) {
  const isPlatform = queue === 'platform';
  const alternateHref = isPlatform
    ? `${basePath}/support`
    : `${basePath}/support/escalations`;
  const createHref = `${basePath}/support/create?target=${
    isPlatform ? 'platform' : 'customer'
  }`;
  const columns: ColumnDef<SupportTicketItem>[] = [
    {
      accessorKey: 'title',
      header: 'Ticket',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.title}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {row.original.body}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {formatStatusLabel(row.original.status)}
          </Badge>
          {row.original.priority ? (
            <Badge variant={priorityBadgeVariant(row.original.priority)}>
              {row.original.priority}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'contextType',
      header: 'Context',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.contextType === 'CUSTOMER'
            ? 'Customer ticket'
            : row.original.contextType === 'WORKSPACE'
              ? 'Workspace ticket'
              : 'Platform escalation'}
        </Badge>
      ),
    },
    {
      id: 'raisedBy',
      header: 'Raised by',
      accessorFn: (row) =>
        row.createdByCustomerName ?? row.createdByName ?? 'Unknown sender',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">
            {row.original.createdByCustomerName ??
              row.original.createdByName ??
              'Unknown sender'}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.messageCount} thread items
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'assignedToName',
      header: 'Assigned to',
      cell: ({ row }) => row.original.assignedToName ?? 'Unassigned',
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) =>
        new Intl.DateTimeFormat('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Calcutta',
        }).format(new Date(row.original.updatedAt)),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`${basePath}/support/${row.original.id}`}>Open Thread</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Workspace-Owned"
          value={supportSummary.openWorkspaceTickets}
        />
        <StatCard
          label="Workspace-Owned Queue"
          value={supportSummary.totalWorkspaceTickets}
        />
        <StatCard
          label="Open Platform Escalations"
          value={supportSummary.openPlatformEscalations}
        />
        <StatCard
          label="Platform Escalations"
          value={supportSummary.totalPlatformEscalations}
        />
      </div>

      <Card className="workspace-info-card border bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoyIcon className="size-4 text-accent" />
                <CardTitle>
                  {isPlatform ? 'Platform Escalations' : 'Customer Support Queue'}
                </CardTitle>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={alternateHref}>
                  {isPlatform ? 'Customer Queue' : 'Platform Escalations'}
                </Link>
              </Button>
              <Button asChild>
                <Link href={createHref}>
                  <PlusIcon className="mr-2 size-4" />
                  Create Ticket
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <AdminDataTable
        title={isPlatform ? 'Escalation List' : 'Ticket List'}
        columns={columns}
        data={tickets}
        searchPlaceholder="Search support tickets by title, body, sender, assignee, or status"
        emptyStateTitle={isPlatform ? 'No platform escalations yet' : 'No support tickets yet'}
        emptyStateDescription={
          isPlatform
            ? 'Escalations raised from this workspace to platform support will appear here.'
            : 'Customer and workspace-owned support tickets will appear here once they are raised.'
        }
        defaultPageSize={10}
        cardClassName="workspace-info-card border bg-background/85"
      />
    </section>
  );
}

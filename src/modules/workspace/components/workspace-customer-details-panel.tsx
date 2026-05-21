import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export type WorkspaceCustomerDetailsViewModel = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  createdAt: string;
  supportTicketCount: number;
  notificationCount: number;
  mediaCount: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Calcutta',
  }).format(new Date(value));
}

export function WorkspaceCustomerDetailsPanel({
  basePath,
  customer,
  preview = false,
}: {
  basePath: string;
  customer: WorkspaceCustomerDetailsViewModel;
  preview?: boolean;
}) {
  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{customer.name}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3">
              {preview && (
                <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
                  Preview Mode
                </span>
              )}
              <Button asChild variant="outline">
                <Link href={`${basePath}/customers`}>
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back to Customers
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Email:</span>{' '}
              {customer.email ?? 'Not available'}
            </p>
            <p>
              <span className="font-medium text-foreground">Phone:</span>{' '}
              {customer.phone ?? 'Not available'}
            </p>
            <p>
              <span className="font-medium text-foreground">External ID:</span>{' '}
              {customer.externalId ?? 'Native customer'}
            </p>
            <p>
              <span className="font-medium text-foreground">Joined:</span>{' '}
              {formatDate(customer.createdAt)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Business-Specific Panel</CardTitle>
          </CardHeader>
          <CardContent className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
            Use this space later for courses, learner stats, orders, bookings,
            projects, cases, or other vertical-specific customer modules.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {customer.supportTicketCount} support ticket(s) currently linked to
            this customer.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {customer.notificationCount} notification record(s) currently linked
            to this customer.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85 lg:col-span-2">
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {customer.mediaCount} media item(s) currently linked to this
            customer.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

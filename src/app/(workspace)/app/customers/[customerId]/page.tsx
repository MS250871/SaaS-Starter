import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WorkspaceCustomerDetailsPanel } from '@/modules/workspace/components/workspace-customer-details-panel';
import { getWorkspaceCustomerDetailsPageData } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceCustomerDetailsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { basePath, workspaceId, customer } =
    await getWorkspaceCustomerDetailsPageData(customerId);

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <section className="grid gap-6">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Customer Not Found</CardTitle>
            <CardDescription>
              This customer does not exist in the current workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`${basePath}/customers`}>
                <ArrowLeftIcon className="mr-2 size-4" />
                Back to Customers
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <WorkspaceCustomerDetailsPanel basePath={basePath} customer={customer} />
  );
}

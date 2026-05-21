import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function GovernancePageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-background/85">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="max-w-3xl">{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            {actions}
            {backHref ? (
              <Button asChild variant="outline">
                <Link href={backHref}>
                  <ArrowLeftIcon className="mr-2 size-4" />
                  {backLabel ?? 'Back'}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

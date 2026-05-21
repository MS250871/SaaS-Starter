import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FilterIcon,
  SearchIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type WorkspaceTableColumn<T> = {
  id: string;
  header: string;
  className?: string;
  headerClassName?: string;
  cell: (row: T) => ReactNode;
};

export type WorkspaceTableFilterDefinition =
  | {
      key: string;
      label: string;
      type: 'search';
      placeholder?: string;
      value?: string;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      value?: string;
      options: Array<{
        label: string;
        value: string;
      }>;
    };

export type WorkspaceTableAction = {
  label: string;
  href: string;
  variant?: 'default' | 'outline' | 'secondary';
  icon?: ReactNode;
};

function buildHref(
  basePath: string,
  query: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...query, ...patch })) {
    if (!value) {
      continue;
    }

    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function WorkspaceDataTable<T>({
  title,
  description,
  basePath,
  filters = [],
  actions = [],
  columns,
  rows,
  rowKey,
  emptyStateTitle,
  emptyStateDescription,
  page,
  totalPages,
  totalItems,
  pageSize,
  query = {},
}: {
  title: string;
  description?: string;
  basePath: string;
  filters?: WorkspaceTableFilterDefinition[];
  actions?: WorkspaceTableAction[];
  columns: WorkspaceTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  query?: Record<string, string | undefined>;
}) {
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);
  const hasFilters = filters.length > 0;
  const previousHref = buildHref(basePath, query, {
    ...query,
    page: String(Math.max(page - 1, 1)),
  });
  const nextHref = buildHref(basePath, query, {
    ...query,
    page: String(page + 1),
  });

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description ? (
                <CardDescription className="mt-2">{description}</CardDescription>
              ) : null}
            </div>
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Button
                    key={`${action.label}-${action.href}`}
                    asChild
                    variant={action.variant ?? 'default'}
                  >
                    <Link href={action.href}>
                      {action.icon}
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                Showing {rangeStart}-{rangeEnd} of {totalItems} records.
              </CardDescription>
            </div>
          </div>

          {hasFilters && (
            <form
              method="get"
              action={basePath}
              className="grid gap-4 rounded-2xl border border-border/70 bg-muted/10 p-4 lg:grid-cols-[1fr_220px_auto]"
            >
              {filters.map((filter) =>
                filter.type === 'search' ? (
                  <label key={filter.key} className="grid gap-2">
                    <span className="text-sm font-medium">{filter.label}</span>
                    <div className="relative">
                      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        name={filter.key}
                        defaultValue={filter.value ?? ''}
                        placeholder={filter.placeholder ?? `Filter ${filter.label}`}
                        className="pl-9"
                      />
                    </div>
                  </label>
                ) : (
                  <label key={filter.key} className="grid gap-2">
                    <span className="text-sm font-medium">{filter.label}</span>
                    <select
                      name={filter.key}
                      defaultValue={filter.value ?? ''}
                      className="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-3"
                    >
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ),
              )}

              <div className="flex flex-wrap items-end gap-3">
                <Button type="submit">
                  <FilterIcon className="mr-2 size-4" />
                  Apply Filters
                </Button>
                <Button asChild variant="outline">
                  <Link href={basePath}>Reset</Link>
                </Button>
              </div>
            </form>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  {columns.map((column) => (
                    <TableHead
                      key={column.id}
                      className={column.headerClassName}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <TableRow key={rowKey(row)}>
                      {columns.map((column) => (
                        <TableCell key={column.id} className={column.className}>
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-32 text-center"
                    >
                      <div className="mx-auto max-w-md space-y-2">
                        <p className="text-sm font-medium">{emptyStateTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {emptyStateDescription}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-3">
              {page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={previousHref}>
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

              {page < totalPages ? (
                <Button asChild variant="outline">
                  <Link href={nextHref}>
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

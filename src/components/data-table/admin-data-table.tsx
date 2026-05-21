"use client"

import * as React from "react"
import Link from "next/link"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  Columns3Icon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type AdminDataTableAction = {
  label: string
  href: string
  variant?: "default" | "outline" | "secondary"
}

type AdminDataTableProps<TData, TValue> = {
  title: string
  description?: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyStateTitle: string
  emptyStateDescription: string
  searchPlaceholder?: string
  primaryAction?: AdminDataTableAction
  secondaryActions?: AdminDataTableAction[]
  defaultPageSize?: number
  headerTextClassName?: string
  descriptionClassName?: string
  actionsClassName?: string
  cardClassName?: string
}

function includesSearchValue(value: unknown, query: string): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (Array.isArray(value)) {
    return value.some((entry) => includesSearchValue(entry, query))
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      (entry): boolean => includesSearchValue(entry, query),
    )
  }

  return String(value).toLowerCase().includes(query)
}

export function AdminDataTable<TData, TValue>({
  title,
  description,
  columns,
  data,
  emptyStateTitle,
  emptyStateDescription,
  searchPlaceholder = "Search this table",
  primaryAction,
  secondaryActions = [],
  defaultPageSize = 10,
  headerTextClassName,
  descriptionClassName,
  actionsClassName,
  cardClassName,
}: AdminDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  // TanStack Table exposes non-memoizable functions here, which React Compiler
  // intentionally skips. This table is interactive and expected to use that API.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue ?? "").trim().toLowerCase()

      if (!query) {
        return true
      }

      return Object.values(row.original as Record<string, unknown>).some(
        (value) => includesSearchValue(value, query),
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: defaultPageSize,
      },
    },
  })

  const visibleRows = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const pageStart = visibleRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1
  const pageEnd = Math.min(
    (pageIndex + 1) * table.getState().pagination.pageSize,
    visibleRows,
  )

  return (
    <Card className={cn("border-border/70 bg-background/85", cardClassName)}>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className={cn("space-y-2", headerTextClassName)}>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription
                className={cn("max-w-3xl", descriptionClassName)}
              >
                {description}
              </CardDescription>
            ) : null}
          </div>
          <div className={cn("flex flex-wrap gap-3", actionsClassName)}>
            {secondaryActions.map((action) => (
              <Button
                key={`${action.label}-${action.href}`}
                asChild
                variant={action.variant ?? "outline"}
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
            {primaryAction ? (
              <Button asChild variant={primaryAction.variant ?? "default"}>
                <Link href={primaryAction.href}>{primaryAction.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-80">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns3Icon className="mr-2 size-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(Boolean(value))
                      }
                    >
                      {column.id
                        .replace(/[-_]/g, " ")
                        .replace(/\b\w/g, (match) => match.toUpperCase())}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <span>
              Showing {pageStart}-{pageEnd} of {visibleRows} filtered records
            </span>
            <label className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={String(table.getState().pagination.pageSize)}
                onChange={(event) =>
                  table.setPageSize(Number(event.target.value))
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/20 hover:bg-muted/20"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-2 text-left font-medium",
                            "transition-colors hover:text-foreground",
                          )}
                          onClick={() =>
                            header.column.toggleSorting(
                              header.column.getIsSorted() === "asc",
                            )
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
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
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ArrowLeftIcon className="mr-2 size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ArrowRightIcon className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

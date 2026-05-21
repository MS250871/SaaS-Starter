"use client"

import * as React from "react"
import { PanelRightOpenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type AdminContentSheetPayload = {
  title: string
  description?: string
  content: React.ReactNode
  footer?: React.ReactNode
  contentClassName?: string
}

type AdminContentSheetContextValue = {
  closeSheet: () => void
  openSheet: (payload: AdminContentSheetPayload) => void
}

const AdminContentSheetContext =
  React.createContext<AdminContentSheetContextValue | null>(null)

export function AdminContentSheetProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [payload, setPayload] = React.useState<AdminContentSheetPayload | null>(
    null,
  )

  const closeSheet = React.useCallback(() => {
    setOpen(false)
  }, [])

  const openSheet = React.useCallback((nextPayload: AdminContentSheetPayload) => {
    setPayload(nextPayload)
    setOpen(true)
  }, [])

  const value = React.useMemo(
    () => ({
      closeSheet,
      openSheet,
    }),
    [closeSheet, openSheet],
  )

  return (
    <AdminContentSheetContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 border-border/70 bg-background p-0 sm:max-w-xl"
        >
          {payload ? (
            <>
              <SheetHeader className="border-b border-border/70 px-5 py-4">
                <SheetTitle>{payload.title}</SheetTitle>
                {payload.description ? (
                  <SheetDescription>{payload.description}</SheetDescription>
                ) : null}
              </SheetHeader>

              <div
                className={cn(
                  "flex-1 overflow-y-auto px-5 py-5",
                  payload.contentClassName,
                )}
              >
                {payload.content}
              </div>

              {payload.footer ? (
                <SheetFooter className="border-t border-border/70 px-5 py-4 sm:flex-row sm:justify-end">
                  {payload.footer}
                </SheetFooter>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminContentSheetContext.Provider>
  )
}

export function useAdminContentSheet() {
  const context = React.useContext(AdminContentSheetContext)

  if (!context) {
    throw new Error(
      "useAdminContentSheet must be used within an AdminContentSheetProvider.",
    )
  }

  return context
}

export function AdminContentSheetTestButton({
  areaLabel,
  className,
  label = "Open side panel",
}: {
  areaLabel: string
  className?: string
  label?: string
}) {
  const { closeSheet, openSheet } = useAdminContentSheet()

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() =>
        openSheet({
          title: `${areaLabel} side panel`,
          description: `Testing the shared admin content sheet from the ${areaLabel.toLowerCase()} overview.`,
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-medium">Shared shell capability</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This right-side panel is mounted once in the admin shell, so
                  content pages across platform, workspace, and customer can
                  open contextual tools without altering the surrounding layout.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Origin
                  </p>
                  <p className="mt-2 text-sm font-medium">{areaLabel} overview</p>
                </div>

                <div className="rounded-2xl border border-border/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Side
                  </p>
                  <p className="mt-2 text-sm font-medium">Right</p>
                </div>
              </div>
            </div>
          ),
          footer: (
            <Button type="button" onClick={closeSheet}>
              Close panel
            </Button>
          ),
        })
      }
    >
      <PanelRightOpenIcon className="size-4" />
      <span>{label}</span>
    </Button>
  )
}

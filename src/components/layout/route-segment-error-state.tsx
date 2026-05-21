"use client"

import { AlertTriangle, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type RouteSegmentErrorStateProps = {
  title: string
  description: string
  onRetry: () => void
  surface?: "default" | "workspace"
}

export function RouteSegmentErrorState({
  title,
  description,
  onRetry,
  surface = "default",
}: RouteSegmentErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] items-center justify-center px-4 py-10 sm:px-6",
        surface === "workspace" && "workspace-surface"
      )}
    >
      <Card className="w-full max-w-xl border border-destructive/20 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={onRetry}>
            <RefreshCcw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

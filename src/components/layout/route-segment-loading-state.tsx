import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type RouteSegmentLoadingStateProps = {
  title: string
  description: string
  variant?: "auth" | "dashboard" | "inline"
  surface?: "default" | "workspace"
}

export function RouteSegmentLoadingState({
  title,
  description,
  variant = "dashboard",
  surface = "default",
}: RouteSegmentLoadingStateProps) {
  if (variant === "auth") {
    return (
      <div
        className={cn(
          "flex min-h-[60vh] items-center justify-center px-4 py-10 sm:px-6",
          surface === "workspace" && "workspace-surface"
        )}
      >
        <Card className="w-full max-w-2xl border border-border/60 shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="max-w-xl text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-[92%] rounded-lg" />
              <Skeleton className="h-4 w-[78%] rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex min-h-[46vh] items-center justify-center px-4 py-10 sm:px-6",
          surface === "workspace" && "workspace-surface"
        )}
      >
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-sm">
            <Spinner className="size-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 px-4 py-6 sm:px-6",
        surface === "workspace" && "workspace-surface"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>

      <Skeleton className="h-[22rem] rounded-xl" />

      <Skeleton className="h-[22rem] rounded-xl" />

      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[20rem] rounded-xl" />
        <Skeleton className="h-[20rem] rounded-xl" />
        <Skeleton className="h-[20rem] rounded-xl" />
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="grid gap-4 px-6 py-6 xl:grid-cols-[0.38fr_0.62fr]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-[94%] rounded-lg" />
            <Skeleton className="h-4 w-[88%] rounded-lg" />
            <Skeleton className="h-4 w-[92%] rounded-lg" />
            <Skeleton className="h-4 w-[84%] rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

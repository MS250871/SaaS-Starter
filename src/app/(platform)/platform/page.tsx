import { ActivityIcon, ShieldCheckIcon, Users2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { readActorContext } from "@/lib/request/read-actor-context"

function PlatformStat({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <Card className="bg-background/80">
      <CardHeader className="gap-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default async function PlatformPage() {
  const { actor } = await readActorContext()
  const primaryPlatformRole =
    actor.platformRoleKeys[0] ??
    actor.platformRoles[0] ??
    actor.platformRole ??
    "platform-user"
  const platformRoleCount =
    actor.platformRoleKeys.length ||
    actor.platformRoles.length ||
    (actor.platformRole ? 1 : 0)

  return (
    <div className="grid gap-6">
      <section
        id="governance"
        className="grid gap-4 md:grid-cols-3"
      >
        <PlatformStat
          label="Platform Role"
          value={primaryPlatformRole}
          detail="Resolved from the middleware actor headers for this session."
        />
        <PlatformStat
          label="Permissions"
          value={actor.permissions.length}
          detail="Use this count to gate future control-plane modules."
        />
        <PlatformStat
          label="Platform Roles"
          value={platformRoleCount}
          detail="Prepared for multi-role platform operators."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-primary" />
              <CardTitle>Governance Queue</CardTitle>
            </div>
            <CardDescription>
              This shell is ready for platform-wide policies, pricing controls,
              invite oversight, and audit workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="text-sm font-medium">Catalog Control</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Manage plans, limits, features, and public catalog rules from one
                shared surface.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="text-sm font-medium">Role Overrides</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Future platform overrides can live here without needing a
                separate visual system.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card id="signals" className="border-border/70 bg-background/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-primary" />
              <CardTitle>Signals</CardTitle>
            </div>
            <CardDescription>
              A compact holding area for operational alerts, usage spikes, and
              background-job health.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
              <span className="text-sm font-medium">Ready for alerts feed</span>
              <Badge variant="outline">Planned</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
              <span className="text-sm font-medium">Ready for background jobs</span>
              <Badge variant="outline">Planned</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="memberships">
        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users2Icon className="size-4 text-primary" />
              <CardTitle>Membership Context</CardTitle>
            </div>
            <CardDescription>
              Current platform actor snapshot so we can attach real tables and
              moderation workflows next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-2xl bg-muted/20 p-4 text-xs leading-6">
              {JSON.stringify(actor, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

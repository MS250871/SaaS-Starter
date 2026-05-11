import { BadgeDollarSignIcon, FileClockIcon, LifeBuoyIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { readActorContext } from "@/lib/request/read-actor-context"

function CustomerStat({
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

export default async function CustomerPage() {
  const { actor } = await readActorContext()

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <CustomerStat
          label="Customer Context"
          value={actor.customerId ? actor.customerId.slice(0, 8) : "Missing"}
          detail="Customer id resolved for the active post-login branch."
        />
        <CustomerStat
          label="Workspace Role"
          value={actor.workspaceRoleKey ?? actor.workspaceRole ?? "customer-user"}
          detail="Useful when customer flows share workspace-scoped modules."
        />
        <CustomerStat
          label="Permissions"
          value={actor.permissions.length}
          detail="Ready for gating customer billing, cases, and service tools."
        />
      </section>

      <section id="billing" className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BadgeDollarSignIcon className="size-4 text-primary" />
              <CardTitle>Billing Surface</CardTitle>
            </div>
            <CardDescription>
              This slot is ready for invoices, payment methods, and plan history
              once the customer module expands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">Plan summary block</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keep the shared admin shell while adapting the content toward a
                customer-facing operational workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">Payment timeline block</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This can later become a table or timeline without changing the
                surrounding navigation frame.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card id="support" className="border-border/70 bg-background/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LifeBuoyIcon className="size-4 text-primary" />
              <CardTitle>Support Shortcuts</CardTitle>
            </div>
            <CardDescription>
              Useful for tickets, account assistance, and onboarding checklists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
              <span className="text-sm font-medium">Open support case</span>
              <Badge variant="outline">Planned</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
              <span className="text-sm font-medium">Share onboarding docs</span>
              <Badge variant="outline">Planned</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="activity">
        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileClockIcon className="size-4 text-primary" />
              <CardTitle>Activity Context</CardTitle>
            </div>
            <CardDescription>
              Current actor snapshot so we can plug in real customer events and
              history next.
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

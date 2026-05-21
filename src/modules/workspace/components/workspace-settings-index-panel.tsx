import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { WorkspaceSettingsLink } from "@/modules/workspace/settings-navigation"

const settingsDescriptions: Record<string, string> = {
  Domains: "Manage routing, DNS, and branded domain setup.",
  Billing: "Review subscription, invoices, and one-time purchases.",
  Themes: "Adjust workspace colors, typography, and preview styling.",
  Access: "Control role policies and member-level access.",
  "Features & Limits": "Review resolved entitlements and upgrade paths.",
  "API Keys": "Issue and manage integration keys for this workspace.",
  "Audit Log": "Inspect tracked administrative actions.",
}

export function WorkspaceSettingsIndexPanel({
  links,
}: {
  links: WorkspaceSettingsLink[]
}) {
  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Card
            key={link.href}
            className="workspace-info-card border bg-background/85"
          >
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">{link.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {settingsDescriptions[link.title] ?? "Open this settings area."}
              </p>
              <Button asChild variant="outline">
                <Link href={link.href}>
                  Open
                  <ArrowUpRightIcon className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

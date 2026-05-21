"use client"

import {
  AlertTriangleIcon,
  BellRingIcon,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { AdminContentSheetTestButton } from "@/components/admin/admin-content-sheet"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { WorkspaceOverviewMetrics } from "@/modules/workspace/server/workspace-admin-page-data"

const commerceConfig = {
  revenueLakh: {
    label: "Revenue (INR lakh)",
    color: "var(--workspace-primary, var(--color-chart-1))",
  },
  refundsLakh: {
    label: "Refunds (INR lakh)",
    color: "var(--workspace-accent, var(--color-chart-3))",
  },
} satisfies ChartConfig

const learnerGrowthConfig = {
  activeLearners: {
    label: "Active learners",
    color: "var(--workspace-primary, var(--color-chart-1))",
  },
  enrollments: {
    label: "Enrollments",
    color: "var(--workspace-accent, var(--color-chart-2))",
  },
  completions: {
    label: "Completions",
    color: "var(--color-chart-4)",
  },
} satisfies ChartConfig

const catalogConfig = {
  certification: {
    label: "Certification bootcamps",
    color: "var(--workspace-primary, var(--color-chart-1))",
  },
  cohort: {
    label: "Live cohorts",
    color: "var(--workspace-accent, var(--color-chart-2))",
  },
  microCourse: {
    label: "Micro-courses",
    color: "var(--color-chart-3)",
  },
  coaching: {
    label: "Coaching programs",
    color: "var(--color-chart-4)",
  },
} satisfies ChartConfig

const queueConfig = {
  value: {
    label: "Items",
    color: "var(--workspace-accent, var(--color-chart-2))",
  },
} satisfies ChartConfig

function OverviewStatCard({
  badge,
  title,
  value,
}: {
  badge: string
  title: string
  value: string
}) {
  return (
    <Card className="@container/card workspace-info-card border bg-background/85 shadow-xs">
      <CardHeader className="gap-3">
        <div className="flex justify-end">
          <Badge variant="outline">{badge}</Badge>
        </div>
        <CardDescription className="workspace-info-label">{title}</CardDescription>
        <CardTitle className="workspace-info-value text-3xl font-semibold tabular-nums @[260px]/card:text-4xl">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[18rem] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function WorkspaceOverviewDashboard({
  data,
}: {
  data: WorkspaceOverviewMetrics
}) {
  const catalogTotal = data.catalogMix.reduce((total, item) => total + item.value, 0)
  const queueTotal = data.queueHealth.reduce((total, item) => total + item.value, 0)
  const unreadNotifications =
    data.queueHealth.find((item) => item.key === "unreadNotifications")?.value ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <AdminContentSheetTestButton areaLabel="Workspace" />
      </div>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <OverviewStatCard
          badge="6 month window"
          title="Learner revenue"
          value={formatCurrency(data.hero.totalRevenue)}
        />
        <OverviewStatCard
          badge="Monthly"
          title="Monthly learner revenue"
          value={formatCurrency(data.hero.monthlyRecurringRevenue)}
        />
        <OverviewStatCard
          badge="Active learners"
          title="Active learners"
          value={data.hero.activeLearners.toLocaleString("en-IN")}
        />
        <OverviewStatCard
          badge="Completion"
          title="Completion rate"
          value={`${data.hero.completionRate}%`}
        />
      </section>

      <section>
        <Card className="workspace-info-card border bg-background/85 shadow-xs">
          <CardHeader>
            <CardDescription className="workspace-info-label">Collections</CardDescription>
            <CardTitle>Monthly LMS commerce movement</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={commerceConfig}
              className="aspect-auto h-[20rem] w-full"
            >
              <AreaChart data={data.commerceSeries} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="workspaceRevenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenueLakh)" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="var(--color-revenueLakh)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="workspaceRefunds" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-refundsLakh)" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="var(--color-refundsLakh)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area
                  type="monotone"
                  dataKey="revenueLakh"
                  stroke="var(--color-revenueLakh)"
                  fill="url(#workspaceRevenue)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="refundsLakh"
                  stroke="var(--color-refundsLakh)"
                  fill="url(#workspaceRefunds)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="workspace-info-card border bg-background/85 shadow-xs">
          <CardHeader>
            <CardDescription className="workspace-info-label">Learner momentum</CardDescription>
            <CardTitle>Active learners, enrollments, and completions</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={learnerGrowthConfig}
              className="aspect-auto h-[20rem] w-full"
            >
              <LineChart data={data.learnerSeries} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="activeLearners"
                  stroke="var(--color-activeLearners)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="enrollments"
                  stroke="var(--color-enrollments)"
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="completions"
                  stroke="var(--color-completions)"
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="workspace-info-card border bg-background/85 shadow-xs">
          <CardHeader>
            <CardDescription className="workspace-info-label">Catalog mix</CardDescription>
            <CardTitle>How the LMS offer is distributed</CardTitle>
          </CardHeader>
          <CardContent>
            {catalogTotal === 0 ? (
              <EmptyChartState message="No catalog mix data is available yet." />
            ) : (
              <ChartContainer
                config={catalogConfig}
                className="aspect-auto h-[20rem] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="label" hideLabel />}
                  />
                  <Pie
                    data={data.catalogMix}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={90}
                    strokeWidth={6}
                  >
                    {data.catalogMix.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="label" />}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="workspace-info-card border bg-background/85 shadow-xs">
          <CardHeader>
            <CardDescription className="workspace-info-label">Queue breakdown</CardDescription>
            <CardTitle>Support and operator pressure points</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={queueConfig}
              className="aspect-auto h-[20rem] w-full"
            >
              <BarChart data={data.queueHealth} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  interval={0}
                />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-value)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="workspace-info-card border bg-background/85 shadow-xs">
          <CardHeader>
            <CardDescription className="workspace-info-label">Business operations</CardDescription>
            <CardTitle>Sample metrics with live workspace context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[0.38fr_0.62fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="workspace-info-card rounded-2xl border p-4">
                <div className="workspace-info-label flex items-center gap-2">
                  <BellRingIcon className="size-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Unread notifications
                  </span>
                </div>
                <p className="workspace-info-value mt-3 text-4xl font-semibold">
                  {unreadNotifications.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Operator notifications still waiting to be reviewed
                </p>
              </div>

              <div className="workspace-info-card rounded-2xl border p-4">
                <div className="workspace-info-label flex items-center gap-2">
                  <AlertTriangleIcon className="size-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Attention queue
                  </span>
                </div>
                <p className="workspace-info-value mt-3 text-3xl font-semibold">
                  {queueTotal.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Combined support, escalation, invite, and notification items
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.18em]">
                  Workspace plan
                </p>
                <p className="workspace-info-value mt-3 text-3xl font-semibold">{data.hero.planName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.hero.planStatus}
                </p>
              </div>

              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.18em]">
                  Domains and routing
                </p>
                <p className="workspace-info-value mt-3 text-3xl font-semibold">
                  {data.hero.domainCount.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.hero.verifiedCustomDomainCount.toLocaleString("en-IN")} verified custom
                  domains and {data.hero.redirectAliasCount.toLocaleString("en-IN")} redirect aliases
                </p>
              </div>

              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.18em]">
                  API surface
                </p>
                <p className="workspace-info-value mt-3 text-3xl font-semibold">
                  {data.hero.apiKeyCount.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active keys reserved for integrations and automations
                </p>
              </div>

              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.18em]">
                  Support posture
                </p>
                <p className="workspace-info-value mt-3 text-3xl font-semibold">
                  {(
                    data.hero.openWorkspaceTickets + data.hero.openPlatformEscalations
                  ).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open workspace tickets and platform escalations in flight
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

"use client"

import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
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
import type { PlatformOverviewPageData } from "@/modules/platform/server/platform-overview-page-data"

const commerceConfig = {
  collectedLakh: {
    label: "Collections (INR lakh)",
    color: "var(--color-chart-1)",
  },
  refundedLakh: {
    label: "Refunds (INR lakh)",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig

const tenantGrowthConfig = {
  workspaces: {
    label: "Workspaces",
    color: "var(--color-chart-1)",
  },
  identities: {
    label: "Identities",
    color: "var(--color-chart-2)",
  },
  customers: {
    label: "Customers",
    color: "var(--color-chart-4)",
  },
} satisfies ChartConfig

const routingConfig = {
  freePath: {
    label: "Free path",
    color: "var(--color-chart-3)",
  },
  subdomain: {
    label: "Subdomain",
    color: "var(--color-chart-2)",
  },
  customDomain: {
    label: "Custom domain",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig

const queueConfig = {
  value: {
    label: "Items",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig

function MetricCard({
  title,
  value,
  trend,
}: PlatformOverviewPageData["cards"][number]) {
  const isPositive = !trend.startsWith("-")

  return (
    <Card className="@container/card border-border/70 bg-gradient-to-br from-background via-background to-muted/30 shadow-xs">
      <CardHeader className="gap-3">
        <div className="flex justify-end">
          <Badge variant="outline" className="gap-1.5">
            {isPositive ? (
              <ArrowUpIcon className="size-3.5" />
            ) : (
              <ArrowDownIcon className="size-3.5" />
            )}
            {trend}
          </Badge>
        </div>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums @[260px]/card:text-4xl">
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

export function PlatformOverviewDashboard({
  data,
}: {
  data: PlatformOverviewPageData
}) {
  const routingTotal = data.routingMix.reduce((total, item) => total + item.value, 0)
  const queueTotal = data.queueHealth.reduce((total, item) => total + item.value, 0)
  const unreadNotifications =
    data.queueHealth.find((item) => item.label === "Unread notifications")?.value ?? 0
  const cardRank = (title: string) => {
    if (title === "30 Day Collections") return 0
    if (title === "Tenant Base") return 1
    if (title === "Live Subscriptions") return 2
    if (title === "Attention Queue") return 3
    return 99
  }
  const topCards = [...data.cards].sort((left, right) => {
    return cardRank(left.title) - cardRank(right.title)
  })

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {topCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </section>

      <section>
        <Card className="border-border/70 bg-background/90 shadow-xs">
          <CardHeader>
            <CardDescription>Collections</CardDescription>
            <CardTitle>Monthly commerce movement</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={commerceConfig}
              className="aspect-auto h-[20rem] w-full"
            >
              <AreaChart data={data.commerceSeries} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="platformCollected" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-collectedLakh)" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="var(--color-collectedLakh)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="platformRefunded" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-refundedLakh)" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="var(--color-refundedLakh)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area
                  type="monotone"
                  dataKey="collectedLakh"
                  stroke="var(--color-collectedLakh)"
                  fill="url(#platformCollected)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="refundedLakh"
                  stroke="var(--color-refundedLakh)"
                  fill="url(#platformRefunded)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-background/90 shadow-xs">
          <CardHeader>
            <CardDescription>Tenant growth</CardDescription>
            <CardTitle>Workspaces, identities, and customers</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={tenantGrowthConfig}
              className="aspect-auto h-[20rem] w-full"
            >
              <LineChart data={data.tenantGrowthSeries} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="workspaces"
                  stroke="var(--color-workspaces)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="identities"
                  stroke="var(--color-identities)"
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="var(--color-customers)"
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-background/90 shadow-xs">
          <CardHeader>
            <CardDescription>Tenant mix</CardDescription>
            <CardTitle>How tenant entry is distributed</CardTitle>
          </CardHeader>
          <CardContent>
            {routingTotal === 0 ? (
              <EmptyChartState message="No workspace routing data yet." />
            ) : (
              <ChartContainer
                config={routingConfig}
                className="aspect-auto h-[20rem] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="label" hideLabel />}
                  />
                  <Pie
                    data={data.routingMix}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={90}
                    strokeWidth={6}
                  >
                    {data.routingMix.map((entry) => (
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

        <Card className="border-border/70 bg-background/90 shadow-xs">
          <CardHeader>
            <CardDescription>Queue breakdown</CardDescription>
            <CardTitle>Operational pressure points</CardTitle>
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
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  fill="var(--color-value)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-background/90 shadow-xs">
          <CardHeader>
            <CardDescription>Attention queue</CardDescription>
            <CardTitle>Unread notifications in context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[0.38fr_0.62fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BellRingIcon className="size-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Unread notifications
                  </span>
                </div>
                <p className="mt-3 text-4xl font-semibold">
                  {unreadNotifications.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Operator notifications still waiting to be reviewed
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangleIcon className="size-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Attention queue
                  </span>
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {queueTotal.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Combined support, delivery, and refund items waiting on action
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/15 p-4">
              {data.queueHealth.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {item.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary/80"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            12,
                            (item.value /
                              Math.max(...data.queueHealth.map((entry) => entry.value), 1)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

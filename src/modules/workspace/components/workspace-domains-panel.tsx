"use client"

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CopyIcon,
  Globe2Icon,
  Layers3Icon,
  RefreshCcwIcon,
  SparklesIcon,
} from "lucide-react"

import { createWorkspaceCustomDomainAction } from "@/modules/workspace/actions/create-workspace-custom-domain.action"
import { createWorkspaceRedirectAliasAction } from "@/modules/workspace/actions/create-workspace-redirect-alias.action"
import { refreshWorkspaceCustomDomainVerificationAction } from "@/modules/workspace/actions/refresh-workspace-custom-domain-verification.action"
import { changeWorkspacePlanAction } from "@/modules/billing/actions/change-workspace-plan.action"
import { navigateClientRedirect } from "@/lib/navigation/client-redirect"
import { AdminDataTable } from "@/components/data-table/admin-data-table"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SpinnerButton } from "@/components/ui/spinner-button"

type WorkspaceDomainDnsRecordItem = {
  id: string
  type: string
  purpose: string
  host: string
  expectedValue: string
  isRequired: boolean
  isMatched: boolean
  matchedValue: string | null
  lastCheckedAt: string | null
  lastError: string | null
}

type DnsTableRow = {
  id: string
  host: string
  type: string
  value: string
  ttl: string
  priority: string
}

type WorkspaceDomainItem = {
  id: string
  domain: string
  type: string
  routingMode: string
  status: string
  target: string | null
  isPrimary: boolean
  isVerified: boolean
  behavior: "PRIMARY_ROUTE" | "REDIRECT_ALIAS" | "SECONDARY_ROUTE"
  redirectTo: string | null
  redirectStatusCode: 301 | 302 | 307 | 308 | null
  createdAt: string
  verifiedAt: string | null
  lastCheckedAt: string | null
  lastVerificationError: string | null
  dnsRecords: WorkspaceDomainDnsRecordItem[]
}

type WorkspaceDomainPlan = {
  key: string
  name: string
  status: string | null
  currentPeriodEnd: string | null
} | null

type WorkspaceDomainConfig = {
  strategy: string | null
  rootDomain: string | null
  primaryHost: string | null
  customDomain: string | null
  customDomainVerified: boolean
  redirectAliases: Array<{
    domain: string
    redirectTo: string
    redirectStatusCode: 301 | 302 | 307 | 308
    verified: boolean
  }>
}

type WhiteLabelConfig = {
  isEnabled: boolean
  customDomainSlots: number
  currentCustomDomainCount: number
  remainingCustomDomainSlots: number
  providerLabel: string
}

function formatModeLabel(mode: "free_path" | "subdomain" | "custom_domain") {
  if (mode === "custom_domain") {
    return "White-label custom domain"
  }

  if (mode === "subdomain") {
    return "Subdomain routing"
  }

  return "Path-based routing"
}

function formatPlanBadge(planKey?: string | null) {
  if (planKey === "business") {
    return "Business"
  }

  if (planKey === "pro") {
    return "Pro"
  }

  return "Trial"
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function buildPaymentHref(params: {
  plan: "pro" | "business"
  planName: string
  upgrade: "subdomain" | "custom-domain"
}) {
  const search = new URLSearchParams({
    plan: params.plan,
    planName: params.planName,
    upgrade: params.upgrade,
    source: "workspace-domains",
  })

  return `/payment?${search.toString()}`
}

function formatRoutingModeLabel(mode: string) {
  if (mode === "APEX_A") {
    return "Apex A records"
  }

  return "CNAME"
}

function formatDomainBehaviorLabel(
  behavior: WorkspaceDomainItem["behavior"]
) {
  if (behavior === "REDIRECT_ALIAS") {
    return "Redirect Alias"
  }

  if (behavior === "SECONDARY_ROUTE") {
    return "Secondary Route"
  }

  return "Primary Route"
}

function normalizeDomainInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
}

function buildWhiteLabelHosts(baseDomain: string) {
  const normalized = normalizeDomainInput(baseDomain).replace(/^www\./, "")

  return {
    baseDomain: normalized,
    redirectDomain: normalized,
    routedDomain: `www.${normalized}`,
  }
}

function buildSubdomainPreview(workspaceSlug: string, rootDomain?: string | null) {
  const normalizedRoot = normalizeDomainInput(rootDomain ?? "")

  if (!normalizedRoot) {
    return `${workspaceSlug}.your-domain.com`
  }

  return `${workspaceSlug}.${normalizedRoot}`
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

function UpgradeButton({
  href,
  canUpgrade,
  label,
}: {
  href: string
  canUpgrade: boolean
  label: string
}) {
  if (!canUpgrade) {
    return (
      <Button type="button" disabled>
        {label}
      </Button>
    )
  }

  return (
    <Button asChild>
      <Link href={href}>
        {label}
        <ArrowUpRightIcon className="size-4" />
      </Link>
    </Button>
  )
}

function DnsCell({
  value,
}: {
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="min-w-0 flex-1 break-all text-sm">{value}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        onClick={() => copyText(value)}
      >
        <CopyIcon className="size-3.5" />
        <span className="sr-only">Copy value</span>
      </Button>
    </div>
  )
}

function toDnsHostLabel(host: string, zoneRoot: string) {
  const normalizedHost = normalizeDomainInput(host)
  const normalizedZoneRoot = normalizeDomainInput(zoneRoot)

  if (!normalizedHost || !normalizedZoneRoot) {
    return host
  }

  if (normalizedHost === normalizedZoneRoot) {
    return "@"
  }

  const suffix = `.${normalizedZoneRoot}`

  if (normalizedHost.endsWith(suffix)) {
    return normalizedHost.slice(0, -suffix.length)
  }

  return normalizedHost
}

function getDnsRowDisplay(record: WorkspaceDomainDnsRecordItem, zoneRoot: string) {
  return {
    host: toDnsHostLabel(record.host, zoneRoot),
    type: record.type,
    value: record.expectedValue,
    ttl: "Auto",
    priority: record.type === "MX" ? "10" : "Leave blank",
  }
}

function mapDnsRecordsToRows(
  records: WorkspaceDomainDnsRecordItem[],
  zoneRoot: string
): DnsTableRow[] {
  return records.map((record) => {
    const row = getDnsRowDisplay(record, zoneRoot)

    return {
      id: record.id,
      host: row.host,
      type: row.type,
      value: row.value,
      ttl: row.ttl,
      priority: row.priority,
    }
  })
}

function buildSampleRedirectRows(domain: string): DnsTableRow[] {
  return [
    {
      id: `${domain}-redirect-a`,
      host: "@",
      type: "A",
      value: "76.76.21.21",
      ttl: "Auto",
      priority: "Leave blank",
    },
    {
      id: `${domain}-redirect-txt`,
      host: "_vercel",
      type: "TXT",
      value: `vc-domain-verify=${domain},sample-redirect-token`,
      ttl: "Auto",
      priority: "Leave blank",
    },
  ]
}

function buildSampleRoutedRows(domain: string): DnsTableRow[] {
  const zoneRoot = domain.startsWith("www.") ? domain.slice(4) : domain

  return [
    {
      id: `${domain}-route-cname`,
      host: toDnsHostLabel(domain, zoneRoot),
      type: "CNAME",
      value: "cname.vercel-dns.com",
      ttl: "Auto",
      priority: "Leave blank",
    },
    {
      id: `${domain}-route-txt`,
      host: toDnsHostLabel(`_vercel.${domain}`, zoneRoot),
      type: "TXT",
      value: `vc-domain-verify=${domain},sample-route-token`,
      ttl: "Auto",
      priority: "Leave blank",
    },
  ]
}

function DnsRecordsTable({
  rows,
}: {
  rows: DnsTableRow[]
}) {
  const columns: ColumnDef<DnsTableRow>[] = [
    {
      accessorKey: "host",
      header: "Host",
      cell: ({ row }) => <DnsCell value={row.original.host} />,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <DnsCell value={row.original.type} />,
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => <DnsCell value={row.original.value} />,
    },
    {
      accessorKey: "ttl",
      header: "TTL",
      cell: ({ row }) => <DnsCell value={row.original.ttl} />,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <DnsCell value={row.original.priority} />,
    },
  ]

  return (
    <AdminDataTable
      title="DNS Records"
      columns={columns}
      data={rows}
      searchPlaceholder="Search DNS records"
      emptyStateTitle="No DNS records found"
      emptyStateDescription="DNS records will appear here once the domain setup is prepared."
      defaultPageSize={10}
      cardClassName="workspace-info-card border bg-background/70"
      headerTextClassName="lg:max-w-[20rem]"
    />
  )
}

function CurrentDomainRow({
  domain,
  canVerifyDomains,
  isRefreshing,
  onVerify,
}: {
  domain: WorkspaceDomainItem
  canVerifyDomains: boolean
  isRefreshing: boolean
  onVerify: () => void
}) {
  const sslIssued = domain.isVerified

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-all text-sm font-medium">{domain.domain}</p>
            <Badge variant="secondary">
              {formatDomainBehaviorLabel(domain.behavior)}
            </Badge>
            <Badge variant="outline">{formatRoutingModeLabel(domain.routingMode)}</Badge>
          </div>

          {domain.behavior === "REDIRECT_ALIAS" && domain.redirectTo && (
            <p className="text-sm text-muted-foreground">
              Redirects to {domain.redirectTo} with HTTP {domain.redirectStatusCode ?? 308}
            </p>
          )}

          {domain.behavior === "PRIMARY_ROUTE" && (
            <p className="text-sm text-muted-foreground">
              This is the canonical branded host for the workspace.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={domain.isVerified ? "default" : "outline"}>
              {domain.isVerified ? "Verified" : "Verification pending"}
            </Badge>
            <Badge variant={sslIssued ? "default" : "outline"}>
              {sslIssued ? "SSL certificate issued" : "SSL pending"}
            </Badge>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p>Added {formatDateLabel(domain.createdAt) ?? "recently"}</p>
            {domain.lastCheckedAt && (
              <p>Last checked {formatDateLabel(domain.lastCheckedAt)}</p>
            )}
            {domain.verifiedAt && (
              <p>Verified {formatDateLabel(domain.verifiedAt)}</p>
            )}
            {domain.target && <p className="break-all">Target {domain.target}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isRefreshing ? (
            <SpinnerButton message="Verifying..." />
          ) : (
            <Button
              type="button"
              variant={domain.isVerified ? "outline" : "default"}
              disabled={!canVerifyDomains}
              onClick={onVerify}
            >
              <RefreshCcwIcon className="size-4" />
              {domain.isVerified ? "Refresh verification" : "Verify now"}
            </Button>
          )}
          <Button type="button" variant="outline" disabled>
            {sslIssued ? "SSL certificate issued" : "Issuing SSL certificate"}
          </Button>
        </div>
      </div>

      {domain.lastVerificationError && !domain.isVerified && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Verification is still pending</AlertTitle>
          <AlertDescription>{domain.lastVerificationError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function DnsStepSection({
  title,
  rows,
}: {
  title: string
  rows: DnsTableRow[]
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <DnsRecordsTable rows={rows} />
    </div>
  )
}

export function WorkspaceDomainsPanel({
  workspaceSlug,
  currentMode,
  activePlan,
  domainConfig,
  domains,
  entitlements,
  whiteLabelConfig,
  canUpgrade,
  canManageDomains,
  canVerifyDomains,
}: {
  workspaceSlug: string
  currentMode: "free_path" | "subdomain" | "custom_domain"
  activePlan: WorkspaceDomainPlan
  domainConfig: WorkspaceDomainConfig
  domains: WorkspaceDomainItem[]
  entitlements: {
    features: string[]
    limits: Record<string, number>
  }
  whiteLabelConfig: WhiteLabelConfig
  canUpgrade: boolean
  canManageDomains: boolean
  canVerifyDomains: boolean
}) {
  const router = useRouter()
  const [isWhiteLabelPending, startWhiteLabelTransition] = useTransition()
  const [isRefreshPending, startRefreshTransition] = useTransition()
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupFieldError, setSetupFieldError] = useState<string | null>(null)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [planChangeMessage, setPlanChangeMessage] = useState<string | null>(null)
  const [planChangeError, setPlanChangeError] = useState<string | null>(null)
  const [dnsSubmittedLocally, setDnsSubmittedLocally] = useState(false)
  const [refreshingDomainId, setRefreshingDomainId] = useState<string | null>(null)
  const [whiteLabelDomainInput, setWhiteLabelDomainInput] = useState("")
  const [isPlanChangePending, startPlanChangeTransition] = useTransition()
  const refreshInFlightRef = useRef(false)

  const customDomains = useMemo(
    () => domains.filter((domain) => domain.type === "CUSTOM"),
    [domains]
  )
  const primaryRouteDomain = customDomains.find(
    (domain) => domain.behavior === "PRIMARY_ROUTE"
  ) ?? null
  const redirectAliasDomain = customDomains.find(
    (domain) => domain.behavior === "REDIRECT_ALIAS"
  ) ?? null
  const secondaryRouteDomains = customDomains.filter(
    (domain) => domain.behavior === "SECONDARY_ROUTE"
  )
  const verificationTargets = [
    ...(redirectAliasDomain ? [redirectAliasDomain] : []),
    ...(primaryRouteDomain ? [primaryRouteDomain] : []),
  ]
  const configuredBaseDomain =
    redirectAliasDomain?.domain ??
    (primaryRouteDomain?.domain.startsWith("www.")
      ? primaryRouteDomain.domain.slice(4)
      : primaryRouteDomain?.domain ?? "")
  const domainIndex = useMemo(
    () => new Map(customDomains.map((domain) => [domain.id, domain])),
    [customDomains]
  )
  const [verificationQueue, setVerificationQueue] = useState<string[]>(() =>
    verificationTargets
      .filter((domain) => !domain.isVerified && Boolean(domain.lastCheckedAt))
      .map((domain) => domain.id)
  )

  useEffect(() => {
    if (configuredBaseDomain && !whiteLabelDomainInput) {
      setWhiteLabelDomainInput(configuredBaseDomain)
    }
  }, [configuredBaseDomain, whiteLabelDomainInput])

  useEffect(() => {
    setVerificationQueue((current) =>
      current.filter((id) => {
        const domain = domainIndex.get(id)
        return Boolean(domain) && !domain?.isVerified
      })
    )
  }, [domainIndex])

  const runVerificationCycle = (
    workspaceDomainIds: string[],
    options?: { silent?: boolean }
  ) => {
    if (refreshInFlightRef.current || workspaceDomainIds.length === 0) {
      return
    }

    if (!options?.silent) {
      setRefreshMessage(null)
      setRefreshError(null)
      setSetupMessage(null)
      setSetupError(null)
      setSetupFieldError(null)
    }

    refreshInFlightRef.current = true
    setRefreshingDomainId(workspaceDomainIds[0] ?? null)

    startRefreshTransition(async () => {
      let lastSuccessMessage: string | null = null

      try {
        for (const workspaceDomainId of workspaceDomainIds) {
          setRefreshingDomainId(workspaceDomainId)

          const formData = new FormData()
          formData.append("workspaceDomainId", workspaceDomainId)

          const response = await refreshWorkspaceCustomDomainVerificationAction(
            formData
          )

          if (!response.success) {
            if (!options?.silent) {
              setRefreshError(response.error.message)
            }
            return
          }

          setVerificationQueue((current) =>
            current.includes(workspaceDomainId)
              ? current
              : [...current, workspaceDomainId]
          )
          lastSuccessMessage = response.data.successMessage
        }

        if (!options?.silent && lastSuccessMessage) {
          setRefreshMessage(lastSuccessMessage)
        }

        router.refresh()
      } finally {
        refreshInFlightRef.current = false
        setRefreshingDomainId(null)
      }
    })
  }

  const triggerBackgroundVerification = useEffectEvent(
    (workspaceDomainId: string) => {
      runVerificationCycle([workspaceDomainId], { silent: true })
    }
  )

  useEffect(() => {
    if (!canVerifyDomains || verificationQueue.length === 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (refreshInFlightRef.current) {
        return
      }

      const nextPendingDomainId = verificationQueue.find((id) => {
        const domain = domainIndex.get(id)
        return domain && !domain.isVerified
      })

      if (nextPendingDomainId) {
        triggerBackgroundVerification(nextPendingDomainId)
      }
    }, 120000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [canVerifyDomains, domainIndex, verificationQueue])

  const handleAddDomain = () => {
    setSetupMessage(null)
    setSetupError(null)
    setSetupFieldError(null)
    setRefreshMessage(null)
    setRefreshError(null)

    const normalizedInput = normalizeDomainInput(
      configuredBaseDomain || whiteLabelDomainInput
    )

    if (!normalizedInput || !normalizedInput.includes(".")) {
      setSetupFieldError("Enter the domain in the format domain.com")
      return
    }

    const nextHosts = buildWhiteLabelHosts(normalizedInput)

    startWhiteLabelTransition(async () => {
      try {
        if (
          !primaryRouteDomain ||
          primaryRouteDomain.domain !== nextHosts.routedDomain
        ) {
          const routedFormData = new FormData()
          routedFormData.append("domain", nextHosts.routedDomain)
          routedFormData.append("routingMode", "CNAME")

          const routedResponse = await createWorkspaceCustomDomainAction(
            routedFormData
          )

          if (!routedResponse.success) {
            setSetupError(routedResponse.error.message)
            return
          }
        }

        if (
          !redirectAliasDomain ||
          redirectAliasDomain.domain !== nextHosts.redirectDomain
        ) {
          const aliasFormData = new FormData()
          aliasFormData.append("domain", nextHosts.redirectDomain)
          aliasFormData.append("routingMode", "APEX_A")

          const aliasResponse = await createWorkspaceRedirectAliasAction(
            aliasFormData
          )

          if (!aliasResponse.success) {
            setSetupError(aliasResponse.error.message)
            return
          }
        }

        setSetupMessage(
          "Domain added. If you want, you can now publish the DNS records below and continue to verification."
        )
        router.refresh()
      } catch (error) {
        setSetupError(
          error instanceof Error
            ? error.message
            : "Unable to add the white-label domain"
        )
      }
    })
  }

  const handleDnsRecordsAdded = () => {
    setSetupMessage(null)
    setSetupError(null)
    setSetupFieldError(null)
    setRefreshMessage(null)
    setRefreshError(null)

    const normalizedInput = normalizeDomainInput(
      configuredBaseDomain || whiteLabelDomainInput
    )

    if (!normalizedInput || !normalizedInput.includes(".")) {
      setSetupFieldError("Enter the domain in the format domain.com")
      return
    }

    const nextHosts = buildWhiteLabelHosts(normalizedInput)

    startWhiteLabelTransition(async () => {
      try {
        const domainIds: string[] = []

        if (
          primaryRouteDomain &&
          primaryRouteDomain.domain === nextHosts.routedDomain
        ) {
          domainIds.push(primaryRouteDomain.id)
        } else {
          const routedFormData = new FormData()
          routedFormData.append("domain", nextHosts.routedDomain)
          routedFormData.append("routingMode", "CNAME")

          const routedResponse = await createWorkspaceCustomDomainAction(
            routedFormData
          )

          if (!routedResponse.success) {
            setSetupError(routedResponse.error.message)
            return
          }

          domainIds.push(routedResponse.data.domain.id)
        }

        if (
          redirectAliasDomain &&
          redirectAliasDomain.domain === nextHosts.redirectDomain
        ) {
          domainIds.unshift(redirectAliasDomain.id)
        } else {
          const aliasFormData = new FormData()
          aliasFormData.append("domain", nextHosts.redirectDomain)
          aliasFormData.append("routingMode", "APEX_A")

          const aliasResponse = await createWorkspaceRedirectAliasAction(
            aliasFormData
          )

          if (!aliasResponse.success) {
            setSetupError(aliasResponse.error.message)
            return
          }

          domainIds.unshift(aliasResponse.data.domain.id)
        }

        setSetupMessage(
          "Domains connected. Verification has started and SSL will be issued automatically after verification completes."
        )
        setDnsSubmittedLocally(true)
        setVerificationQueue((current) => {
          const next = new Set(current)
          domainIds.forEach((id) => next.add(id))
          return [...next]
        })

        runVerificationCycle(domainIds)
      } catch (error) {
        setSetupError(
          error instanceof Error
            ? error.message
            : "Unable to start white-label verification"
        )
      }
    })
  }

  const pathPreview = domainConfig.rootDomain
    ? `${domainConfig.rootDomain}/${workspaceSlug}`
    : `/${workspaceSlug}`
  const subdomainPreview = buildSubdomainPreview(
    workspaceSlug,
    domainConfig.rootDomain
  )
  const currentAccess =
    currentMode === "custom_domain"
      ? domainConfig.customDomain ??
        domainConfig.primaryHost ??
        subdomainPreview
      : currentMode === "subdomain"
        ? domainConfig.primaryHost ?? subdomainPreview
        : pathPreview
  const hasCustomDomainFeature = whiteLabelConfig.isEnabled
  const customDomainSlots = entitlements.limits.max_custom_domains ?? 0
  const customDomainLimitReached =
    customDomainSlots > 0 &&
    whiteLabelConfig.currentCustomDomainCount >= customDomainSlots
  const hasVerificationStarted = verificationTargets.some(
    (domain) => domain.isVerified || Boolean(domain.lastCheckedAt)
  )
  const showWhiteLabelCard =
    currentMode === "custom_domain" ||
    ((currentMode === "free_path" || currentMode === "subdomain") &&
      !hasVerificationStarted &&
      !dnsSubmittedLocally)
  const planEndsAt = formatDateLabel(activePlan?.currentPeriodEnd)

  const redirectStepDomain =
    redirectAliasDomain?.domain ||
    (whiteLabelDomainInput ? buildWhiteLabelHosts(whiteLabelDomainInput).redirectDomain : null)
  const routedStepDomain =
    primaryRouteDomain?.domain ||
    (whiteLabelDomainInput ? buildWhiteLabelHosts(whiteLabelDomainInput).routedDomain : null)
  const dnsZoneRoot =
    redirectStepDomain ||
    configuredBaseDomain ||
    (routedStepDomain?.startsWith("www.")
      ? routedStepDomain.slice(4)
      : routedStepDomain) ||
    "domain.com"
  const redirectDnsRows =
    redirectAliasDomain?.dnsRecords.length
      ? mapDnsRecordsToRows(redirectAliasDomain.dnsRecords, dnsZoneRoot)
      : buildSampleRedirectRows(redirectStepDomain ?? "domain.com")
  const routedDnsRows =
    primaryRouteDomain?.dnsRecords.length
      ? mapDnsRecordsToRows(primaryRouteDomain.dnsRecords, dnsZoneRoot)
      : buildSampleRoutedRows(routedStepDomain ?? "www.domain.com")

  const handleMoveToTrial = () => {
    setPlanChangeMessage(null)
    setPlanChangeError(null)

    startPlanChangeTransition(async () => {
      const response = await changeWorkspacePlanAction({
        targetPlanKey: "trial",
        source: "workspace-domains",
      })

      if (!response.success) {
        setPlanChangeError(response.error.message)
        return
      }

      setPlanChangeMessage(response.data.successMessage)
      navigateClientRedirect(router, response.data.redirectTo)
    })
  }

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2Icon className="size-4 text-accent" />
          <CardTitle>Current Domain Setup</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatModeLabel(currentMode)}</Badge>
            <Badge variant="outline">{formatPlanBadge(activePlan?.key)}</Badge>
            {activePlan?.status && <Badge variant="outline">{activePlan.status}</Badge>}
            <Badge variant="outline">Managed by {whiteLabelConfig.providerLabel}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="workspace-info-card rounded-2xl border p-4">
              <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                Current Access
              </p>
              <p className="workspace-info-value mt-2 break-all text-sm font-medium">
                {currentAccess}
              </p>
            </div>
            <div className="workspace-info-card rounded-2xl border p-4">
              <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                Path URL
              </p>
              <p className="workspace-info-value mt-2 break-all text-sm font-medium">
                {pathPreview}
              </p>
            </div>
            <div className="workspace-info-card rounded-2xl border p-4">
              <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                Subdomain Example
              </p>
              <p className="workspace-info-value mt-2 break-all text-sm font-medium">
                {subdomainPreview}
              </p>
            </div>
            <div className="workspace-info-card rounded-2xl border p-4">
              <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                White-label Setups
              </p>
              <p className="workspace-info-value mt-2 text-sm font-medium">
                {whiteLabelConfig.currentCustomDomainCount}
                {" / "}
                {customDomainSlots > 0 ? customDomainSlots : "Not enabled"}
              </p>
            </div>
          </div>

          {planEndsAt && (
            <p className="text-sm text-muted-foreground">
              Current plan period ends on {planEndsAt}.
            </p>
          )}

          {refreshMessage && (
            <Alert>
              <AlertTitle>Domain check completed</AlertTitle>
              <AlertDescription>{refreshMessage}</AlertDescription>
            </Alert>
          )}

          {refreshError && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Unable to refresh verification</AlertTitle>
              <AlertDescription>{refreshError}</AlertDescription>
            </Alert>
          )}

          {customDomains.length > 0 && (
            <div className="space-y-4">
              {customDomains.map((domain) => (
                <CurrentDomainRow
                  key={domain.id}
                  domain={domain}
                  canVerifyDomains={canVerifyDomains}
                  isRefreshing={
                    isRefreshPending && refreshingDomainId === domain.id
                  }
                  onVerify={() => runVerificationCycle([domain.id])}
                />
              ))}

              {secondaryRouteDomains.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Additional routed hosts stay attached here too, but the
                  canonical branded experience should continue to use the primary
                  routed host shown above.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(planChangeMessage || planChangeError) && (
        <div className="space-y-4">
          {planChangeMessage && (
            <Alert>
              <AlertTitle>Plan change started</AlertTitle>
              <AlertDescription>{planChangeMessage}</AlertDescription>
            </Alert>
          )}

          {planChangeError && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Unable to change the plan</AlertTitle>
              <AlertDescription>{planChangeError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers3Icon className="size-4 text-accent" />
              <CardTitle>Move to Path-based Routing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isPlanChangePending ? (
              <SpinnerButton message="Moving to Trial..." />
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!canUpgrade || currentMode === "free_path"}
                onClick={handleMoveToTrial}
              >
                Move to Trial
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-accent" />
              <CardTitle>Upgrade to Custom Domain</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <UpgradeButton
              href={buildPaymentHref({
                plan: "business",
                planName: "Business",
                upgrade: "custom-domain",
              })}
              canUpgrade={canUpgrade && currentMode !== "custom_domain"}
              label="Move to Business"
            />
          </CardContent>
        </Card>
      </div>

      {showWhiteLabelCard && (
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-accent" />
              <CardTitle>Custom Domain Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
              <p className="text-sm font-medium">Step 1. Add Domain</p>

              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Domain</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="domain.com"
                      value={whiteLabelDomainInput}
                      onChange={(event) => setWhiteLabelDomainInput(event.target.value)}
                      disabled={
                        !hasCustomDomainFeature ||
                        !canManageDomains ||
                        Boolean(configuredBaseDomain) ||
                        isWhiteLabelPending
                      }
                    />
                  </FieldContent>
                  <FieldError>{setupFieldError}</FieldError>
                </Field>

                {configuredBaseDomain && (
                  <Alert>
                    <AlertTitle>Domain already prepared</AlertTitle>
                    <AlertDescription>
                      DNS records for <code>{configuredBaseDomain}</code> are ready below.
                    </AlertDescription>
                  </Alert>
                )}

                {hasCustomDomainFeature && !canManageDomains && (
                  <Alert>
                    <AlertTitle>Domain setup permission required</AlertTitle>
                    <AlertDescription>
                      Adding white-label domains requires the{" "}
                      <code>workspaceDomain.create</code> permission.
                    </AlertDescription>
                  </Alert>
                )}

                {customDomainLimitReached && (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="size-4" />
                    <AlertTitle>Custom domain limit reached</AlertTitle>
                    <AlertDescription>
                      This workspace has already used all configured custom-domain
                      slots for the current plan.
                    </AlertDescription>
                  </Alert>
                )}

                {setupMessage && (
                  <Alert>
                    <AlertTitle>White-label flow started</AlertTitle>
                    <AlertDescription>{setupMessage}</AlertDescription>
                  </Alert>
                )}

                {setupError && (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="size-4" />
                    <AlertTitle>Unable to prepare white-label setup</AlertTitle>
                    <AlertDescription>{setupError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                  {isWhiteLabelPending ? (
                    <SpinnerButton message="Adding domain..." />
                  ) : (
                    <Button
                      type="button"
                      disabled={
                        !hasCustomDomainFeature ||
                        !canManageDomains ||
                        customDomainLimitReached ||
                        Boolean(configuredBaseDomain)
                      }
                      onClick={handleAddDomain}
                    >
                      {configuredBaseDomain ? "Domain added" : "Add domain"}
                    </Button>
                  )}
                </div>

              </FieldGroup>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
              <p className="text-sm font-medium">Step 2. DNS Records</p>

              <div className="space-y-4">
                <DnsStepSection
                  title={`Redirect ${redirectStepDomain ?? "domain.com"} -> ${redirectAliasDomain?.redirectTo ?? routedStepDomain ?? "www.domain.com"}`}
                  rows={redirectDnsRows}
                />

                <DnsStepSection
                  title={`Route ${routedStepDomain ?? "www.domain.com"}`}
                  rows={routedDnsRows}
                />

                <div className="flex flex-wrap gap-2">
                  {isWhiteLabelPending || (isRefreshPending && refreshingDomainId) ? (
                    <SpinnerButton message="Starting verification..." />
                  ) : (
                    <Button
                      type="button"
                      disabled={
                        !hasCustomDomainFeature ||
                        !canManageDomains ||
                        customDomainLimitReached ||
                        !canVerifyDomains
                      }
                      onClick={handleDnsRecordsAdded}
                    >
                      I have added the records
                    </Button>
                  )}
                  {!canVerifyDomains && (
                    <p className="self-center text-xs text-muted-foreground">
                      <code>workspaceDomain.verify</code> required.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

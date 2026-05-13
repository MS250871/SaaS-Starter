import { headers } from "next/headers"
import { WorkspaceDomainType } from "@/generated/prisma/client"

import { withActionTxContext } from "@/lib/request/withActionContext"
import { readActorContext } from "@/lib/request/read-actor-context"
import {
  countWorkspaceIdentityNotifications,
  listWorkspaceIdentityNotifications,
} from "@/modules/notifications/notification.services"
import {
  listFeatureCatalog,
  listLimitCatalog,
  listPlanFeatures,
  listPlanLimits,
  listWorkspaceFeatureOverrides,
  listWorkspaceLimitOverrides,
  resolveEntitlements,
} from "@/modules/entitlements/entitlement.services"
import {
  getRootDomainHost,
  isRootWorkspaceHost,
  normalizeHostname,
} from "@/lib/middleware/proxy-utils"
import { normalizeWorkspaceTheme } from "@/modules/workspace/theme"
import { getManagedWorkspaceDomainProviderLabel } from "@/modules/workspace/services/domain-provider.services"
import { workspaceApiKeyScopes } from "@/modules/workspace/api-key-scopes"
import {
  countWorkspaceCustomers,
  getWorkspaceCustomerDetailsSnapshot,
  listWorkspaceCustomersDirectory,
  listWorkspaceCustomersPage,
} from "@/modules/customer/services/customer.services"
import {
  countPendingWorkspaceInvites,
  listPendingWorkspaceInvitesWithRoles,
} from "@/modules/workspace/services/invite.services"
import {
  countActiveWorkspaceApiKeys,
  listWorkspaceApiKeysDetailed,
} from "@/modules/workspace/services/apikey.services"
import {
  countActiveWorkspaceMemberships,
  listActiveWorkspaceMembersWithRoles,
} from "@/modules/workspace/services/membership.services"
import {
  listPermissions,
  listWorkspaceRolePermissionOverrides,
  listWorkspaceUserPermissionOverridesDetailed,
} from "@/modules/permissions/permissions.services"
import {
  getWorkspaceSupportSummary,
  getWorkspaceSupportThreadSnapshot,
  hydrateWorkspaceSupportTicketListItems,
  listWorkspaceSupportQueueTickets,
} from "@/modules/support/support.services"
import { getWorkspaceSettings } from "@/modules/workspace/services/setting.services"
import {
  getWorkspaceAdminSurfaceWorkspace,
} from "@/modules/workspace/services/workspace.services"
import {
  countWorkspaceDomains,
  listWorkspaceDomainsDetailed,
} from "@/modules/workspace/services/domains.services"
import {
  listAssignableRoleDefinitions,
  listRoleDefinitionsWithPermissions,
} from "@/modules/roles/role.services"
import { getWorkspaceActiveSubscriptionPlanSummary } from "@/modules/workspace/services/subscription.services"

type WorkspaceRedirectAliasConfig = {
  domain: string
  redirectTo: string
  redirectStatusCode: 301 | 302 | 307 | 308
  verified: boolean
}

type AccessPermissionGroup = {
  entity: string
  permissions: Array<{
    id: string
    key: string
    name: string | null
    description: string | null
  }>
}

type FeatureCategory = {
  category: string
  features: Array<{
    id: string
    key: string
    name: string
    description: string | null
    enabled: boolean
    baseEnabled: boolean
    isOverridden: boolean
  }>
}

type LimitCategory = {
  category: string
  limits: Array<{
    id: string
    key: string
    name: string
    description: string | null
    unit: string | null
    value: number
    baseValue: number
    isOverridden: boolean
  }>
}

type WorkspaceInboxNotification = Awaited<
  ReturnType<typeof listWorkspaceIdentityNotifications>
>[number]
type WorkspaceInboxDelivery = WorkspaceInboxNotification["deliveries"][number]
type WorkspaceMemberWithRole = Awaited<
  ReturnType<typeof listActiveWorkspaceMembersWithRoles>
>[number]
type WorkspaceCustomerDirectoryEntry = Awaited<
  ReturnType<typeof listWorkspaceCustomersDirectory>
>[number]
type WorkspacePendingInvite = Awaited<
  ReturnType<typeof listPendingWorkspaceInvitesWithRoles>
>[number]
type WorkspaceCustomerPageEntry = Awaited<
  ReturnType<typeof listWorkspaceCustomersPage>
>["customers"][number]
type WorkspaceDetailedApiKey = Awaited<
  ReturnType<typeof listWorkspaceApiKeysDetailed>
>[number]
type WorkspaceSupportThreadSnapshot = NonNullable<
  Awaited<ReturnType<typeof getWorkspaceSupportThreadSnapshot>>
>
type WorkspaceSupportMessage = WorkspaceSupportThreadSnapshot["messages"][number]
type WorkspaceSupportMessageIdentity =
  WorkspaceSupportThreadSnapshot["messageIdentities"][number]
type WorkspaceSupportMessageCustomer =
  WorkspaceSupportThreadSnapshot["messageCustomers"][number]
type WorkspaceSupportPlatformMembership =
  WorkspaceSupportThreadSnapshot["platformMemberships"][number]
type WorkspaceSupportAttachment =
  WorkspaceSupportThreadSnapshot["messageAttachments"][number]
type WorkspaceSerializedSupportTicket = Awaited<
  ReturnType<typeof hydrateWorkspaceSupportTicketListItems>
>[number]

function normalizeRedirectStatusCode(value: unknown): 301 | 302 | 307 | 308 {
  if (value === 301 || value === 302 || value === 307 || value === 308) {
    return value
  }

  return 308
}

function normalizeRedirectAliases(
  value: unknown
): WorkspaceRedirectAliasConfig[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const domain =
        typeof item.domain === "string"
          ? normalizeHostname(item.domain)
          : null
      const redirectTo =
        typeof item.redirectTo === "string"
          ? normalizeHostname(item.redirectTo)
          : null

      if (!domain || !redirectTo) {
        return null
      }

      return {
        domain,
        redirectTo,
        redirectStatusCode: normalizeRedirectStatusCode(item.redirectStatusCode),
        verified: typeof item.verified === "boolean" ? item.verified : false,
      } satisfies WorkspaceRedirectAliasConfig
    })
    .filter((item): item is WorkspaceRedirectAliasConfig => Boolean(item))
}

function getWorkspaceBasePath(params: {
  slug?: string | null
  strategy?: string | null
  host?: string | null
}) {
  const normalizedHost = normalizeHostname(params.host ?? "")
  const rootHost = getRootDomainHost()

  if (
    params.slug &&
    params.strategy === "free_path" &&
    isRootWorkspaceHost(normalizedHost, rootHost)
  ) {
    return `/${params.slug}/app`
  }

  return "/app"
}

function getNotificationHref(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const href = 'href' in payload ? payload.href : null

  return typeof href === 'string' && href.trim().length > 0 ? href : null
}

export async function getWorkspaceNotificationInboxData(params: {
  workspaceId: string
  identityId: string
  limit?: number
}) {
  const [notifications, unreadCount] = await Promise.all([
    listWorkspaceIdentityNotifications({
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      limit: params.limit ?? 20,
      excludeTypes: ['workspace.notification.sent_summary'],
    }),
    countWorkspaceIdentityNotifications({
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      unreadOnly: true,
      excludeTypes: ['workspace.notification.sent_summary'],
    }),
  ])

  return {
    unreadCount,
    items: notifications.map((notification: WorkspaceInboxNotification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title ?? 'Notification',
      body: notification.body ?? null,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      href: getNotificationHref(notification.payload),
      deliveries: notification.deliveries.map((delivery: WorkspaceInboxDelivery) => ({
        id: delivery.id,
        channel: delivery.channel,
        status: delivery.status,
        recipient: delivery.recipient,
        subject: delivery.subject ?? null,
        errorMessage: delivery.errorMessage ?? null,
        sentAt: delivery.sentAt?.toISOString() ?? null,
        deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
        failedAt: delivery.failedAt?.toISOString() ?? null,
      })),
    })),
  }
}

export async function getWorkspaceAdminSurfaceContext() {
  const { actor, requestContext } = await readActorContext()
  const hdrs = await headers()
  const workspaceId = actor.workspaceId

  if (!workspaceId) {
    return {
      actor,
      requestContext,
      workspaceId: undefined,
      workspace: null,
      settings: null,
      basePath: "/app",
    }
  }

  const [workspace, settings] = await Promise.all([
    getWorkspaceAdminSurfaceWorkspace(workspaceId),
    getWorkspaceSettings(workspaceId),
  ])

  if (!workspace) {
    return {
      actor,
      requestContext,
      workspaceId: undefined,
      workspace: null,
      settings: null,
      basePath: "/app",
    }
  }

  const strategy =
    (
      settings?.settings as {
        domain?: { strategy?: string | null }
      } | null
    )?.domain?.strategy ?? null

  return {
    actor,
    requestContext,
    workspaceId,
    workspace,
    settings,
    basePath: getWorkspaceBasePath({
      slug: workspace.slug,
      strategy,
      host: hdrs.get("host"),
    }),
  }
}

export async function getWorkspaceOverviewPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        workspaceSummary: null,
      }
    }

    const [
      memberCount,
      pendingInviteCount,
      customerCount,
      domainCount,
      apiKeyCount,
      unreadNotificationCount,
    ] = await Promise.all([
      countActiveWorkspaceMemberships(context.workspaceId),
      countPendingWorkspaceInvites(context.workspaceId),
      countWorkspaceCustomers(context.workspaceId),
      countWorkspaceDomains(context.workspaceId),
      countActiveWorkspaceApiKeys(context.workspaceId),
      context.actor.identityId
        ? countWorkspaceIdentityNotifications({
            workspaceId: context.workspaceId,
            identityId: context.actor.identityId,
            unreadOnly: true,
          })
        : Promise.resolve(0),
    ])

    return {
      ...context,
      workspaceSummary: {
        name: context.workspace.name,
        slug: context.workspace.slug,
        primaryDomain: context.workspace.defaultDomain,
        memberCount,
        pendingInviteCount,
        customerCount,
        domainCount,
        apiKeyCount,
        unreadNotificationCount,
      },
    }
  })
}

export async function getWorkspaceNotificationsPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId || !context.actor.identityId) {
      return {
        ...context,
        inboxNotifications: [],
        inboxSummary: {
          totalCount: 0,
          unreadCount: 0,
        },
        workspaceRecipients: [],
        customerRecipients: [],
      }
    }

    const [inboxData, totalCount, workspaceRecipients, customerRecipients] =
      await Promise.all([
        getWorkspaceNotificationInboxData({
          workspaceId: context.workspaceId,
          identityId: context.actor.identityId,
          limit: 50,
        }),
        countWorkspaceIdentityNotifications({
          workspaceId: context.workspaceId,
          identityId: context.actor.identityId,
        }),
        listActiveWorkspaceMembersWithRoles(context.workspaceId),
        listWorkspaceCustomersDirectory(context.workspaceId),
      ])

    return {
      ...context,
      inboxNotifications: inboxData.items,
      inboxSummary: {
        totalCount,
        unreadCount: inboxData.unreadCount,
      },
      workspaceRecipients: workspaceRecipients
        .filter((member: WorkspaceMemberWithRole) => member.identityId !== context.actor.identityId)
        .map((member: WorkspaceMemberWithRole) => ({
          id: member.identityId,
          name:
            `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
            member.identity.email ||
            'Workspace member',
          email: member.identity.email ?? null,
        })),
      customerRecipients: customerRecipients.map((customer: WorkspaceCustomerDirectoryEntry) => ({
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${customer.identity.lastName ?? ''}`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
      })),
    }
  })
}

export async function getWorkspaceTeamPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId) {
      return {
        ...context,
        members: [],
        invites: [],
        assignableRoles: [],
      }
    }

    const [members, invites, assignableRoles] = await Promise.all([
      listActiveWorkspaceMembersWithRoles(context.workspaceId),
      listPendingWorkspaceInvitesWithRoles(context.workspaceId, 20),
      listAssignableRoleDefinitions("WORKSPACE"),
    ])

    return {
      ...context,
      members: members.map((member: WorkspaceMemberWithRole) => ({
        id: member.id,
        identityId: member.identityId,
        role: member.roleDefinition.name,
        roleKey: member.roleKey,
        roleDefinitionId: member.roleDefinition.id,
        roleSystemKey: member.roleSystemKey,
        roleRank: member.roleDefinition.hierarchyRank ?? null,
        createdAt: member.createdAt.toISOString(),
        name:
          `${member.identity.firstName ?? ""} ${member.identity.lastName ?? ""}`.trim() ||
          member.identity.email ||
          "Unnamed member",
        email: member.identity.email ?? null,
      })),
      invites: invites.map((invite: WorkspacePendingInvite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.roleKey,
        roleName: invite.roleDefinition.name,
        roleDefinitionId: invite.roleDefinition.id,
        roleSystemKey: invite.roleSystemKey,
        roleRank: invite.roleDefinition.hierarchyRank ?? null,
        status: invite.status,
        token: invite.token,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
        createdAt: invite.createdAt.toISOString(),
      })),
      assignableRoles: assignableRoles.map(
        (role: (typeof assignableRoles)[number]) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description ?? null,
          roleSystemKey: role.systemKey ?? null,
          roleRank: role.hierarchyRank ?? null,
        }),
      ),
    }
  })
}

export async function getWorkspaceThemePageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    return {
      ...context,
      initialTheme: normalizeWorkspaceTheme(context.settings?.themes),
    }
  })
}

export async function getWorkspaceAccessPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId) {
      return {
        ...context,
        roles: [],
        permissionsByEntity: [],
        userOverrides: [],
        members: [],
        accessSummary: {
          roleCount: 0,
          permissionCount: 0,
          roleOverrideCount: 0,
          userOverrideCount: 0,
        },
      }
    }

    const [roleDefinitions, permissions, roleOverrides, userOverrides, members] =
      await Promise.all([
        listRoleDefinitionsWithPermissions('WORKSPACE'),
        listPermissions(),
        listWorkspaceRolePermissionOverrides(context.workspaceId),
        listWorkspaceUserPermissionOverridesDetailed(context.workspaceId),
        listActiveWorkspaceMembersWithRoles(context.workspaceId),
      ])

    const overridesByRoleId = new Map<
      string,
      Record<string, 'allow' | 'deny'>
    >()

    for (const override of roleOverrides) {
      const roleOverridesForRole =
        overridesByRoleId.get(override.roleDefinitionId) ?? {}
      roleOverridesForRole[override.permissionId] = override.isAllowed
        ? 'allow'
        : 'deny'
      overridesByRoleId.set(override.roleDefinitionId, roleOverridesForRole)
    }

    const permissionsByEntityMap: Record<string, AccessPermissionGroup> = {}
    const permissionsByEntity: AccessPermissionGroup[] = Object.values(
      permissions.reduce((acc: Record<string, AccessPermissionGroup>, permission: (typeof permissions)[number]) => {
        acc[permission.entity] ??= {
          entity: permission.entity,
          permissions: [],
        }

        acc[permission.entity].permissions.push({
          id: permission.id,
          key: permission.key,
          name: permission.name ?? null,
          description: permission.description ?? null,
        })

        return acc
      }, permissionsByEntityMap),
    )

    return {
      ...context,
      roles: roleDefinitions.map((role: (typeof roleDefinitions)[number]) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        roleSystemKey: role.systemKey ?? null,
        roleRank: role.hierarchyRank ?? null,
        isAssignable: role.isAssignable,
        isDefault: role.isDefault,
        isSystem: role.isSystem,
        basePermissionIds: role.rolePermissions.map(
          (rolePermission: (typeof role.rolePermissions)[number]) => rolePermission.permissionId,
        ),
        overrideModes: overridesByRoleId.get(role.id) ?? {},
      })),
      permissionsByEntity,
      userOverrides: userOverrides.map((override: (typeof userOverrides)[number]) => ({
        id: override.id,
        identityId: override.identityId,
        permissionId: override.permissionId,
        permissionKey: override.permission?.key ?? '',
        permissionName: override.permission?.name ?? null,
        effect: override.effect,
        source: override.source,
        createdAt: override.createdAt.toISOString(),
        expiresAt: override.expiresAt?.toISOString() ?? null,
        memberName:
          `${override.identity?.firstName ?? ''} ${override.identity?.lastName ?? ''}`.trim() ||
          override.identity?.email ||
          'Workspace member',
        memberEmail: override.identity?.email ?? null,
        grantedByName:
          `${override.grantedBy?.firstName ?? ''} ${override.grantedBy?.lastName ?? ''}`.trim() ||
          override.grantedBy?.email ||
          null,
      })),
      members: members.map((member: (typeof members)[number]) => ({
        membershipId: member.id,
        identityId: member.identityId,
        name:
          `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
          member.identity.email ||
          'Workspace member',
        email: member.identity.email ?? null,
        roleName: member.roleDefinition.name,
        roleKey: member.roleDefinition.key,
      })),
      accessSummary: {
        roleCount: roleDefinitions.length,
        permissionCount: permissions.length,
        roleOverrideCount: roleOverrides.length,
        userOverrideCount: userOverrides.length,
      },
    }
  })
}

export async function getWorkspaceCustomersPageData(params?: {
  page?: number | null
  query?: string | null
  source?: string | null
}) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    const page = normalizePageNumber(params?.page)
    const query = params?.query?.trim() ?? ''
    const source =
      params?.source === 'external' || params?.source === 'native'
        ? params.source
        : 'all'

    if (!context.workspaceId) {
      return {
        ...context,
        customers: [],
        page,
        pageSize: CUSTOMER_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
        filters: {
          query,
          source,
        },
      }
    }

    const { totalItems, customers } = await listWorkspaceCustomersPage({
      workspaceId: context.workspaceId,
      page,
      pageSize: CUSTOMER_PAGE_SIZE,
      query,
      source,
    })

    return {
      ...context,
      customers: customers.map((customer: WorkspaceCustomerPageEntry) => ({
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${customer.identity.lastName ?? ''}`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
        externalId: customer.externalId ?? null,
        createdAt: customer.createdAt.toISOString(),
      })),
      page,
      pageSize: CUSTOMER_PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / CUSTOMER_PAGE_SIZE)),
      filters: {
        query,
        source,
      },
    }
  })
}

export async function getWorkspaceCustomerDetailsPageData(customerId: string) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId) {
      return {
        ...context,
        customer: null,
      }
    }

    const customer = await getWorkspaceCustomerDetailsSnapshot(
      context.workspaceId,
      customerId,
    )

    if (!customer) {
      return {
        ...context,
        customer: null,
      }
    }

    return {
      ...context,
      customer: {
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${customer.identity.lastName ?? ''}`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
        phone: customer.identity.phone ?? null,
        externalId: customer.externalId ?? null,
        createdAt: customer.createdAt.toISOString(),
        supportTicketCount: customer._count.supportTickets,
        notificationCount: customer._count.notifications,
        mediaCount: customer._count.media,
      },
    }
  })
}

export async function getWorkspaceFeaturesPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        activePlan: null,
        featuresByCategory: [],
        limitsByCategory: [],
        overridesSummary: {
          featureOverrideCount: 0,
          limitOverrideCount: 0,
        },
      }
    }

    const [activeSubscription, features, limits, featureOverrides, limitOverrides] =
      await Promise.all([
        getWorkspaceActiveSubscriptionPlanSummary(context.workspaceId),
        listFeatureCatalog(),
        listLimitCatalog(),
        listWorkspaceFeatureOverrides(context.workspaceId),
        listWorkspaceLimitOverrides(context.workspaceId),
      ])

    const activePlan = activeSubscription?.price?.product?.plan ?? null
    const entitlements = await resolveEntitlements({
      workspaceId: context.workspaceId,
      planId: activePlan?.id,
    })

    const basePlanFeatures = activePlan?.id
      ? await listPlanFeatures(activePlan.id)
      : []

    const basePlanLimits = activePlan?.id
      ? await listPlanLimits(activePlan.id)
      : []

    const baseFeatureMap = new Map<string, boolean>(
      basePlanFeatures.map((entry: (typeof basePlanFeatures)[number]) => [entry.featureId, entry.isEnabled]),
    )
    const featureOverrideMap = new Map<string, boolean>(
      featureOverrides.map((entry: (typeof featureOverrides)[number]) => [entry.featureId, entry.isEnabled]),
    )
    const baseLimitMap = new Map<string, number>(
      basePlanLimits.map((entry: (typeof basePlanLimits)[number]) => [entry.limitDefinitionId, entry.valueInt]),
    )
    const limitOverrideMap = new Map<string, number>(
      limitOverrides.map((entry: (typeof limitOverrides)[number]) => [entry.limitDefinitionId, entry.valueInt]),
    )

    const featureGroupMap: Record<string, FeatureCategory> = {}
    const featureGroups: FeatureCategory[] = Object.values(
      features.reduce((acc: Record<string, FeatureCategory>, feature: (typeof features)[number]) => {
        const category = feature.category ?? 'general'
        acc[category] ??= {
          category,
          features: [],
        }

        acc[category].features.push({
          id: feature.id,
          key: feature.key,
          name: feature.name,
          description: feature.description ?? null,
          enabled: entitlements.features.includes(feature.key),
          baseEnabled: baseFeatureMap.get(feature.id) ?? false,
          isOverridden: featureOverrideMap.has(feature.id),
        })

        return acc
      }, featureGroupMap),
    )

    const limitGroupMap: Record<string, LimitCategory> = {}
    const limitGroups: LimitCategory[] = Object.values(
      limits.reduce((acc: Record<string, LimitCategory>, limit: (typeof limits)[number]) => {
        const category = limit.key.startsWith('max_')
          ? limit.key.includes('api') ||
            limit.key.includes('webhook') ||
            limit.key.includes('integration')
            ? 'automation'
            : limit.key.includes('storage') ||
                limit.key.includes('bandwidth') ||
                limit.key.includes('email')
              ? 'infrastructure'
              : limit.key.includes('course') ||
                  limit.key.includes('chapter') ||
                  limit.key.includes('lesson') ||
                  limit.key.includes('assignment') ||
                  limit.key.includes('quiz') ||
                  limit.key.includes('certificate')
                ? 'learning'
                : limit.key.includes('admin') ||
                    limit.key.includes('instructor') ||
                    limit.key.includes('learner') ||
                    limit.key.includes('group') ||
                    limit.key.includes('branch')
                  ? 'people'
                  : 'general'
          : 'billing'

        acc[category] ??= {
          category,
          limits: [],
        }

        acc[category].limits.push({
          id: limit.id,
          key: limit.key,
          name: limit.name,
          description: limit.description ?? null,
          unit: limit.unit ?? null,
          value: entitlements.limits[limit.key] ?? 0,
          baseValue: baseLimitMap.get(limit.id) ?? 0,
          isOverridden: limitOverrideMap.has(limit.id),
        })

        return acc
      }, limitGroupMap),
    )

    return {
      ...context,
      activePlan: activePlan
        ? {
            id: activePlan.id,
            key: activePlan.key,
            name: activePlan.name,
            description: activePlan.description ?? null,
            status: activeSubscription?.status ?? null,
            sortOrder: activePlan.sortOrder,
            currentPeriodEnd:
              activeSubscription?.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      featuresByCategory: featureGroups,
      limitsByCategory: limitGroups,
      overridesSummary: {
        featureOverrideCount: featureOverrides.length,
        limitOverrideCount: limitOverrides.length,
      },
    }
  })
}

export async function getWorkspaceApiKeysPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId) {
      return {
        ...context,
        apiKeys: [],
        availableScopes: workspaceApiKeyScopes,
        apiKeySummary: {
          totalKeys: 0,
          activeKeys: 0,
          revokedKeys: 0,
          expiredKeys: 0,
        },
      }
    }

    const apiKeys = await listWorkspaceApiKeysDetailed(context.workspaceId)

    const now = new Date()

    return {
      ...context,
      apiKeys: apiKeys.map((apiKey: WorkspaceDetailedApiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix ?? null,
        description: apiKey.description ?? null,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        isExpired: Boolean(apiKey.expiresAt && apiKey.expiresAt < now),
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
        revokedAt: apiKey.revokedAt?.toISOString() ?? null,
        createdAt: apiKey.createdAt.toISOString(),
        createdByName:
          `${apiKey.createdBy?.firstName ?? ''} ${apiKey.createdBy?.lastName ?? ''}`.trim() ||
          apiKey.createdBy?.email ||
          'Workspace admin',
      })),
      availableScopes: workspaceApiKeyScopes,
      apiKeySummary: {
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter(
          (apiKey: WorkspaceDetailedApiKey) =>
            apiKey.isActive && (!apiKey.expiresAt || apiKey.expiresAt >= now)
        ).length,
        revokedKeys: apiKeys.filter((apiKey: WorkspaceDetailedApiKey) => !apiKey.isActive).length,
        expiredKeys: apiKeys.filter(
          (apiKey: WorkspaceDetailedApiKey) => Boolean(apiKey.expiresAt && apiKey.expiresAt < now)
        ).length,
      },
    }
  })
}

type SupportThreadItem = {
  id: string
  kind: 'opening' | 'reply' | 'internal_note'
  senderType: string
  senderScope: 'workspace' | 'platform' | 'customer' | 'system'
  senderName: string
  message: string
  createdAt: string
  attachments: SupportAttachmentItem[]
}

type SupportAttachmentItem = {
  id: string
  mediaId: string
  fileName: string
  mimeType: string
  size: number
  previewUrl: string
  downloadUrl: string
}

function resolveSupportSenderName(params: {
  identity?: {
    firstName: string | null
    lastName: string | null
    email: string | null
  } | null
  customer?: {
    identity: {
      firstName: string | null
      lastName: string | null
      email: string | null
    }
  } | null
}) {
  if (params.customer) {
    return (
      `${params.customer.identity.firstName ?? ''} ${params.customer.identity.lastName ?? ''}`.trim() ||
      params.customer.identity.email ||
      'Customer'
    )
  }

  if (params.identity) {
    return (
      `${params.identity.firstName ?? ''} ${params.identity.lastName ?? ''}`.trim() ||
      params.identity.email ||
      'Workspace member'
    )
  }

  return 'System'
}

function resolveSupportSenderScope(params: {
  senderCustomerId?: string | null
  senderIdentityId?: string | null
  workspaceIdentityIds: Set<string>
  platformIdentityIds: Set<string>
}) {
  if (params.senderCustomerId) {
    return 'customer' as const
  }

  if (params.senderIdentityId) {
    if (params.platformIdentityIds.has(params.senderIdentityId)) {
      return 'platform' as const
    }

    if (params.workspaceIdentityIds.has(params.senderIdentityId)) {
      return 'workspace' as const
    }
  }

  return 'system' as const
}

const CUSTOMER_PAGE_SIZE = 10
const SUPPORT_PAGE_SIZE = 10

function normalizePageNumber(value?: number | null) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1
  }

  return Math.floor(value)
}


export async function getWorkspaceSupportQueuePageData(params: {
  queue: 'workspace' | 'platform'
  page?: number | null
}) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()
    const page = normalizePageNumber(params.page)

    if (!context.workspaceId) {
      return {
        ...context,
        queue: params.queue,
        tickets: [],
        page,
        pageSize: SUPPORT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        supportSummary: {
          openWorkspaceTickets: 0,
          openPlatformEscalations: 0,
          totalWorkspaceTickets: 0,
          totalPlatformEscalations: 0,
        },
      }
    }

    const [supportSummary, queuePage] = await Promise.all([
      getWorkspaceSupportSummary(context.workspaceId),
      listWorkspaceSupportQueueTickets({
        workspaceId: context.workspaceId,
        queue: params.queue,
        page,
        pageSize: SUPPORT_PAGE_SIZE,
      }),
    ])

    const serializedTickets = await hydrateWorkspaceSupportTicketListItems(
      queuePage.tickets,
    )
    const totalPages = Math.max(
      1,
      Math.ceil(queuePage.totalItems / SUPPORT_PAGE_SIZE),
    )

    return {
      ...context,
      queue: params.queue,
      tickets: serializedTickets,
      page,
      pageSize: SUPPORT_PAGE_SIZE,
      totalItems: queuePage.totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      supportSummary: {
        ...supportSummary,
      },
    }
  })
}

export async function getWorkspaceSupportCreatePageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    return {
      ...context,
    }
  })
}

export async function getWorkspaceSupportThreadPageData(ticketId: string) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId) {
      return {
        ...context,
        selectedQueue: 'workspace' as const,
        selectedTicket: null,
        assigneeOptions: [],
        backHref: `${context.basePath}/support`,
      }
    }

    const [threadSnapshot, workspaceMembers] = await Promise.all([
      getWorkspaceSupportThreadSnapshot(context.workspaceId, ticketId),
      listActiveWorkspaceMembersWithRoles(context.workspaceId),
    ])

    if (!threadSnapshot) {
      return {
        ...context,
        selectedQueue: 'workspace' as const,
        selectedTicket: null,
        assigneeOptions: workspaceMembers.map((member: WorkspaceMemberWithRole) => ({
          identityId: member.identityId,
          name:
            `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
            member.identity.email ||
            'Workspace member',
          email: member.identity.email ?? null,
        })),
        backHref: `${context.basePath}/support`,
      }
    }

    const [serializedTicket]: WorkspaceSerializedSupportTicket[] =
      await hydrateWorkspaceSupportTicketListItems([threadSnapshot.ticket])

    const messageIdentityMap = new Map<string, WorkspaceSupportMessageIdentity>(
      threadSnapshot.messageIdentities.map((identity: WorkspaceSupportMessageIdentity) => [identity.id, identity]),
    )
    const messageCustomerMap = new Map<string, WorkspaceSupportMessageCustomer>(
      threadSnapshot.messageCustomers.map((customer: WorkspaceSupportMessageCustomer) => [customer.id, customer]),
    )
    const workspaceIdentityIds = new Set<string>(
      workspaceMembers.map((member: WorkspaceMemberWithRole) => member.identityId),
    )
    const platformIdentityIds = new Set<string>(
      threadSnapshot.platformMemberships.map(
        (membership: WorkspaceSupportPlatformMembership) => membership.identityId,
      ),
    )
    const ticketAttachmentItems = threadSnapshot.ticketAttachments.map((attachment: WorkspaceSupportAttachment) => ({
      id: attachment.id,
      mediaId: attachment.mediaId,
      fileName: attachment.media.fileName,
      mimeType: attachment.media.mimeType,
      size: attachment.media.size,
      previewUrl: `/api/workspace/media/${attachment.mediaId}/download`,
      downloadUrl: `/api/workspace/media/${attachment.mediaId}/download?download=1`,
    }))
    const messageAttachmentMap = new Map<string, SupportAttachmentItem[]>()

    for (const attachment of threadSnapshot.messageAttachments as WorkspaceSupportAttachment[]) {
      const nextAttachment = {
        id: attachment.id,
        mediaId: attachment.mediaId,
        fileName: attachment.media.fileName,
        mimeType: attachment.media.mimeType,
        size: attachment.media.size,
        previewUrl: `/api/workspace/media/${attachment.mediaId}/download`,
        downloadUrl: `/api/workspace/media/${attachment.mediaId}/download?download=1`,
      }

      const existing = messageAttachmentMap.get(attachment.entityId) ?? []
      existing.push(nextAttachment)
      messageAttachmentMap.set(attachment.entityId, existing)
    }

    const openingSenderName =
      serializedTicket.createdByCustomerName ??
      serializedTicket.createdByName ??
      'Unknown sender'
    const openingSenderScope = serializedTicket.createdByCustomerId
      ? 'customer'
      : serializedTicket.createdById &&
          platformIdentityIds.has(serializedTicket.createdById)
        ? 'platform'
        : 'workspace'

    const selectedQueue =
      threadSnapshot.ticket.contextType === 'PLATFORM' ? 'platform' : 'workspace'

    return {
      ...context,
      selectedQueue,
      selectedTicket: {
        ...serializedTicket,
        threadItems: [
          {
            id: `opening-${serializedTicket.id}`,
            kind: 'opening',
            senderType: serializedTicket.createdByCustomerId
              ? 'CUSTOMER'
              : 'IDENTITY',
            senderScope: openingSenderScope,
            senderName: openingSenderName,
            message: serializedTicket.body,
            createdAt: serializedTicket.createdAt,
            attachments: ticketAttachmentItems,
          } satisfies SupportThreadItem,
          ...threadSnapshot.messages.map((message: WorkspaceSupportMessage) => {
            const identity = message.senderIdentityId
              ? messageIdentityMap.get(message.senderIdentityId)
              : null
            const customer = message.senderCustomerId
              ? messageCustomerMap.get(message.senderCustomerId)
              : null

            return {
              id: message.id,
              kind: message.isInternalNote ? 'internal_note' : 'reply',
              senderType: message.senderType,
              senderScope: resolveSupportSenderScope({
                senderCustomerId: message.senderCustomerId,
                senderIdentityId: message.senderIdentityId,
                workspaceIdentityIds,
                platformIdentityIds,
              }),
              senderName: resolveSupportSenderName({
                identity,
                customer,
              }),
              message: message.message,
              createdAt: message.createdAt.toISOString(),
              attachments: messageAttachmentMap.get(message.id) ?? [],
            } satisfies SupportThreadItem
          }),
        ],
      },
      assigneeOptions: workspaceMembers.map((member: WorkspaceMemberWithRole) => ({
        identityId: member.identityId,
        name:
          `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
          member.identity.email ||
          'Workspace member',
        email: member.identity.email ?? null,
      })),
      backHref:
        threadSnapshot.ticket.contextType === 'PLATFORM'
          ? `${context.basePath}/support/escalations`
          : `${context.basePath}/support`,
    }
  })
}

function isCustomDomain(params: { domain: string; rootDomain: string | null }) {
  if (!params.rootDomain) {
    return true
  }

  return !params.domain.endsWith(params.rootDomain)
}

function resolveWorkspaceDomainMode(params: {
  strategy?: string | null
  customDomain?: string | null
  customDomainVerified?: boolean
  domainRows: Array<{ domain: string; isVerified: boolean }>
  rootDomain?: string | null
}) {
  if (params.customDomain && params.customDomainVerified) {
    return "custom_domain" as const
  }

  if (
    params.domainRows.some(
      (domain) =>
        domain.isVerified &&
        isCustomDomain({
          domain: domain.domain,
          rootDomain: params.rootDomain ?? null,
        }),
    )
  ) {
    return "custom_domain" as const
  }

  if (
    params.strategy === "subdomain" ||
    params.strategy === "sub_domain" ||
    params.strategy === "subdomain_pending"
  ) {
    return "subdomain" as const
  }

  return "free_path" as const
}

export async function getWorkspaceDomainsPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        activePlan: null,
        domains: [],
        entitlements: {
          features: [] as string[],
          limits: {} as Record<string, number>,
        },
        domainConfig: {
          strategy: null as string | null,
          rootDomain: null as string | null,
          primaryHost: null as string | null,
          customDomain: null as string | null,
          customDomainVerified: false,
          redirectAliases: [] as WorkspaceRedirectAliasConfig[],
        },
        whiteLabelConfig: {
          isEnabled: false,
          customDomainSlots: 0,
          currentCustomDomainCount: 0,
          remainingCustomDomainSlots: 0,
          providerLabel: getManagedWorkspaceDomainProviderLabel(),
        },
        currentMode: "free_path" as const,
      }
    }

    const domainSettings =
      (
        context.settings?.settings as {
          domain?: {
            strategy?: string | null
            rootDomain?: string | null
            primaryHost?: string | null
            customDomain?: string | null
            customDomainVerified?: boolean | null
            redirectAliases?: unknown
          }
        } | null
      )?.domain ?? null

    const [domains, activeSubscription] = await Promise.all([
      listWorkspaceDomainsDetailed(context.workspaceId),
      getWorkspaceActiveSubscriptionPlanSummary(context.workspaceId),
    ])

    const activePlan = activeSubscription?.price?.product?.plan ?? null
    const entitlements = await resolveEntitlements({
      workspaceId: context.workspaceId,
      planId: activePlan?.id,
    })
    const customDomainSlots = entitlements.limits.max_custom_domains ?? 0
    const customDomainCount = domains.filter(
      (domain: (typeof domains)[number]) =>
        domain.type === WorkspaceDomainType.CUSTOM && domain.isPrimary
    ).length
    const redirectAliases = normalizeRedirectAliases(
      domainSettings?.redirectAliases
    )
    const redirectAliasMap = new Map<string, WorkspaceRedirectAliasConfig>(
      redirectAliases.map((alias) => [alias.domain, alias])
    )
    const hasCustomDomainFeature =
      entitlements.features.includes("domain_custom") || customDomainSlots > 0
    const currentMode = resolveWorkspaceDomainMode({
      strategy: domainSettings?.strategy ?? null,
      customDomain: domainSettings?.customDomain ?? null,
      customDomainVerified: domainSettings?.customDomainVerified ?? false,
      domainRows: domains,
      rootDomain: domainSettings?.rootDomain ?? getRootDomainHost(),
    })

    return {
      ...context,
      activePlan: activePlan
        ? {
            key: activePlan.key,
            name: activePlan.name,
            status: activeSubscription?.status ?? null,
            currentPeriodEnd:
              activeSubscription?.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      domains: domains.map((domain: (typeof domains)[number]) => {
        const redirectAlias = redirectAliasMap.get(domain.domain)
        const behavior: "REDIRECT_ALIAS" | "PRIMARY_ROUTE" | "SECONDARY_ROUTE" = redirectAlias
          ? "REDIRECT_ALIAS"
          : domain.isPrimary
            ? "PRIMARY_ROUTE"
            : "SECONDARY_ROUTE"

        return {
          id: domain.id,
          domain: domain.domain,
          type: domain.type,
          routingMode: domain.routingMode,
          status: domain.status,
          target: domain.target,
          isPrimary: domain.isPrimary,
          isVerified: domain.isVerified,
          behavior,
          redirectTo: redirectAlias?.redirectTo ?? null,
          redirectStatusCode: redirectAlias?.redirectStatusCode ?? null,
          createdAt: domain.createdAt.toISOString(),
          verifiedAt: domain.verifiedAt?.toISOString() ?? null,
          lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
          lastVerificationError: domain.lastVerificationError ?? null,
          dnsRecords: domain.dnsRecords.map((record: (typeof domain.dnsRecords)[number]) => ({
            id: record.id,
            type: record.type,
            purpose: record.purpose,
            host: record.host,
            expectedValue: record.expectedValue,
            isRequired: record.isRequired,
            isMatched: record.isMatched,
            matchedValue: record.matchedValue ?? null,
            lastCheckedAt: record.lastCheckedAt?.toISOString() ?? null,
            lastError: record.lastError ?? null,
          })),
        }
      }),
      entitlements,
      domainConfig: {
        strategy: domainSettings?.strategy ?? null,
        rootDomain: domainSettings?.rootDomain ?? getRootDomainHost(),
        primaryHost:
          domainSettings?.primaryHost ??
          context.workspace.defaultDomain ??
          getRootDomainHost(),
        customDomain: domainSettings?.customDomain ?? null,
        customDomainVerified: domainSettings?.customDomainVerified ?? false,
        redirectAliases,
      },
      whiteLabelConfig: {
        isEnabled: hasCustomDomainFeature,
        customDomainSlots,
        currentCustomDomainCount: customDomainCount,
        remainingCustomDomainSlots:
          customDomainSlots > 0
            ? Math.max(customDomainSlots - customDomainCount, 0)
            : 0,
        providerLabel: getManagedWorkspaceDomainProviderLabel(),
      },
      currentMode,
    }
  })
}

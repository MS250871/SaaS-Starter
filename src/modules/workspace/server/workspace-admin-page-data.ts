import { headers } from "next/headers"
import { WorkspaceDomainType } from "@/generated/prisma/client"

import { prisma } from "@/lib/prisma"
import { withServerRequestContext } from "@/lib/request/with-server-request-context"
import { readActorContext } from "@/lib/request/read-actor-context"
import { resolveEntitlements } from "@/modules/entitlements/entitlement.services"
import {
  getRootDomainHost,
  isRootWorkspaceHost,
  normalizeHostname,
} from "@/lib/middleware/proxy-utils"
import { normalizeWorkspaceTheme } from "@/modules/workspace/theme"
import { getManagedWorkspaceDomainProviderLabel } from "@/modules/workspace/services/domain-provider.services"
import { workspaceApiKeyScopes } from "@/modules/workspace/api-key-scopes"

type WorkspaceRedirectAliasConfig = {
  domain: string
  redirectTo: string
  redirectStatusCode: 301 | 302 | 307 | 308
  verified: boolean
}

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
  const notifications = await prisma.notification.findMany({
    where: {
      workspaceId: params.workspaceId,
      recipientIdentityId: params.identityId,
      type: {
        not: 'workspace.notification.sent_summary',
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: params.limit ?? 20,
    include: {
      deliveries: {
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          channel: true,
          status: true,
          recipient: true,
          subject: true,
          errorMessage: true,
          sentAt: true,
          deliveredAt: true,
          failedAt: true,
        },
      },
    },
  })

  const unreadCount = await prisma.notification.count({
    where: {
      workspaceId: params.workspaceId,
      recipientIdentityId: params.identityId,
      isRead: false,
      type: {
        not: 'workspace.notification.sent_summary',
      },
    },
  })

  return {
    unreadCount,
    items: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title ?? 'Notification',
      body: notification.body ?? null,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      href: getNotificationHref(notification.payload),
      deliveries: notification.deliveries.map((delivery) => ({
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
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        defaultDomain: true,
      },
    }),
    prisma.workspaceSettings.findUnique({
      where: { workspaceId },
      select: {
        themes: true,
        settings: true,
      },
    }),
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
  return withServerRequestContext(async () => {
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
      prisma.membership.count({
        where: {
          workspaceId: context.workspaceId,
          isActive: true,
        },
      }),
      prisma.workspaceInvite.count({
        where: {
          workspaceId: context.workspaceId,
          status: "PENDING",
        },
      }),
      prisma.customer.count({
        where: {
          workspaceId: context.workspaceId,
        },
      }),
      prisma.workspaceDomain.count({
        where: {
          workspaceId: context.workspaceId,
        },
      }),
      prisma.apiKey.count({
        where: {
          workspaceId: context.workspaceId,
          isActive: true,
        },
      }),
      prisma.notification.count({
        where: {
          workspaceId: context.workspaceId,
          isRead: false,
        },
      }),
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
  return withServerRequestContext(async () => {
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
        prisma.notification.count({
          where: {
            workspaceId: context.workspaceId,
            recipientIdentityId: context.actor.identityId,
          },
        }),
        prisma.membership.findMany({
          where: {
            workspaceId: context.workspaceId,
            isActive: true,
          },
          orderBy: [{ createdAt: 'asc' }],
          select: {
            identityId: true,
            identity: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.customer.findMany({
          where: {
            workspaceId: context.workspaceId,
          },
          orderBy: [{ createdAt: 'asc' }],
          select: {
            id: true,
            identity: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
      ])

    return {
      ...context,
      inboxNotifications: inboxData.items,
      inboxSummary: {
        totalCount,
        unreadCount: inboxData.unreadCount,
      },
      workspaceRecipients: workspaceRecipients
        .filter((member) => member.identityId !== context.actor.identityId)
        .map((member) => ({
          id: member.identityId,
          name:
            `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
            member.identity.email ||
            'Workspace member',
          email: member.identity.email ?? null,
        })),
      customerRecipients: customerRecipients.map((customer) => ({
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
  return withServerRequestContext(async () => {
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
      prisma.membership.findMany({
        where: {
          workspaceId: context.workspaceId,
          isActive: true,
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          identityId: true,
          roleKey: true,
          roleSystemKey: true,
          createdAt: true,
          roleDefinition: {
            select: {
              id: true,
              name: true,
              hierarchyRank: true,
            },
          },
          identity: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.workspaceInvite.findMany({
        where: {
          workspaceId: context.workspaceId,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          email: true,
          roleKey: true,
          roleSystemKey: true,
          roleDefinition: {
            select: {
              id: true,
              name: true,
              hierarchyRank: true,
            },
          },
          status: true,
          token: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.roleDefinition.findMany({
        where: {
          scope: "WORKSPACE",
          isActive: true,
          isAssignable: true,
        },
        orderBy: [{ hierarchyRank: "desc" }, { name: "asc" }],
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          hierarchyRank: true,
          systemKey: true,
        },
      }),
    ])

    return {
      ...context,
      members: members.map((member) => ({
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
      invites: invites.map((invite) => ({
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
      assignableRoles: assignableRoles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        roleSystemKey: role.systemKey ?? null,
        roleRank: role.hierarchyRank ?? null,
      })),
    }
  })
}

export async function getWorkspaceThemePageData() {
  return withServerRequestContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    return {
      ...context,
      initialTheme: normalizeWorkspaceTheme(context.settings?.themes),
    }
  })
}

export async function getWorkspaceAccessPageData() {
  return withServerRequestContext(async () => {
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
        prisma.roleDefinition.findMany({
          where: {
            scope: 'WORKSPACE',
            isActive: true,
          },
          orderBy: [{ hierarchyRank: 'desc' }, { name: 'asc' }],
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        }),
        prisma.permission.findMany({
          where: {
            isActive: true,
          },
          orderBy: [{ entity: 'asc' }, { key: 'asc' }],
        }),
        prisma.workspaceRolePermission.findMany({
          where: {
            workspaceId: context.workspaceId,
          },
          include: {
            permission: true,
          },
        }),
        prisma.userPermission.findMany({
          where: {
            workspaceId: context.workspaceId,
            isActive: true,
          },
          orderBy: [{ createdAt: 'desc' }],
          include: {
            permission: true,
            identity: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            grantedBy: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.membership.findMany({
          where: {
            workspaceId: context.workspaceId,
            isActive: true,
          },
          orderBy: [{ createdAt: 'asc' }],
          include: {
            identity: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            roleDefinition: {
              select: {
                id: true,
                name: true,
                key: true,
              },
            },
          },
        }),
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

    const permissionsByEntity = Object.values(
      permissions.reduce<
        Record<
          string,
          {
            entity: string
            permissions: Array<{
              id: string
              key: string
              name: string | null
              description: string | null
            }>
          }
        >
      >((acc, permission) => {
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
      }, {}),
    )

    return {
      ...context,
      roles: roleDefinitions.map((role) => ({
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
          (rolePermission) => rolePermission.permissionId,
        ),
        overrideModes: overridesByRoleId.get(role.id) ?? {},
      })),
      permissionsByEntity,
      userOverrides: userOverrides.map((override) => ({
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
      members: members.map((member) => ({
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
  return withServerRequestContext(async () => {
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

    const where = {
      workspaceId: context.workspaceId,
      ...(source === 'external'
        ? {
            externalId: {
              not: null,
            },
          }
        : source === 'native'
          ? {
              externalId: null,
            }
          : {}),
      ...(query
        ? {
            OR: [
              {
                externalId: {
                  contains: query,
                  mode: 'insensitive' as const,
                },
              },
              {
                identity: {
                  is: {
                    firstName: {
                      contains: query,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
              {
                identity: {
                  is: {
                    lastName: {
                      contains: query,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
              {
                identity: {
                  is: {
                    email: {
                      contains: query,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    }

    const [totalItems, customers] = await Promise.all([
      prisma.customer.count({
        where,
      }),
      prisma.customer.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * CUSTOMER_PAGE_SIZE,
        take: CUSTOMER_PAGE_SIZE,
        select: {
          id: true,
          externalId: true,
          createdAt: true,
          identity: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ])

    return {
      ...context,
      customers: customers.map((customer) => ({
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
  return withServerRequestContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    if (!context.workspaceId) {
      return {
        ...context,
        customer: null,
      }
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        workspaceId: context.workspaceId,
      },
      select: {
        id: true,
        externalId: true,
        createdAt: true,
        identity: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            supportTickets: true,
            notifications: true,
            media: true,
          },
        },
      },
    })

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
  return withServerRequestContext(async () => {
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
        prisma.subscription.findFirst({
          where: {
            workspaceId: context.workspaceId,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            status: true,
            currentPeriodEnd: true,
            price: {
              select: {
                product: {
                  select: {
                    plan: {
                      select: {
                        id: true,
                        key: true,
                        name: true,
                        description: true,
                        sortOrder: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.feature.findMany({
          where: {
            isActive: true,
          },
          orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.limitDefinition.findMany({
          where: {
            isActive: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.workspaceFeatureOverride.findMany({
          where: {
            workspaceId: context.workspaceId,
          },
          select: {
            featureId: true,
            isEnabled: true,
          },
        }),
        prisma.workspaceLimitOverride.findMany({
          where: {
            workspaceId: context.workspaceId,
          },
          select: {
            limitDefinitionId: true,
            valueInt: true,
          },
        }),
      ])

    const activePlan = activeSubscription?.price?.product?.plan ?? null
    const entitlements = await resolveEntitlements({
      workspaceId: context.workspaceId,
      planId: activePlan?.id,
    })

    const basePlanFeatures = activePlan?.id
      ? await prisma.planFeature.findMany({
          where: {
            planId: activePlan.id,
          },
          select: {
            featureId: true,
            isEnabled: true,
          },
        })
      : []

    const basePlanLimits = activePlan?.id
      ? await prisma.planLimit.findMany({
          where: {
            planId: activePlan.id,
          },
          select: {
            limitDefinitionId: true,
            valueInt: true,
          },
        })
      : []

    const baseFeatureMap = new Map(
      basePlanFeatures.map((entry) => [entry.featureId, entry.isEnabled]),
    )
    const featureOverrideMap = new Map(
      featureOverrides.map((entry) => [entry.featureId, entry.isEnabled]),
    )
    const baseLimitMap = new Map(
      basePlanLimits.map((entry) => [entry.limitDefinitionId, entry.valueInt]),
    )
    const limitOverrideMap = new Map(
      limitOverrides.map((entry) => [entry.limitDefinitionId, entry.valueInt]),
    )

    const featureGroups = Object.values(
      features.reduce<
        Record<
          string,
          {
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
        >
      >((acc, feature) => {
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
      }, {}),
    )

    const limitGroups = Object.values(
      limits.reduce<
        Record<
          string,
          {
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
        >
      >((acc, limit) => {
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
      }, {}),
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
  return withServerRequestContext(async () => {
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

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        workspaceId: context.workspaceId,
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        description: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    const now = new Date()

    return {
      ...context,
      apiKeys: apiKeys.map((apiKey) => ({
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
          (apiKey) =>
            apiKey.isActive && (!apiKey.expiresAt || apiKey.expiresAt >= now)
        ).length,
        revokedKeys: apiKeys.filter((apiKey) => !apiKey.isActive).length,
        expiredKeys: apiKeys.filter(
          (apiKey) => Boolean(apiKey.expiresAt && apiKey.expiresAt < now)
        ).length,
      },
    }
  })
}

type SupportTicketListItem = {
  id: string
  contextType: string
  title: string
  body: string
  status: string
  priority: string | null
  createdAt: string
  updatedAt: string
  messageCount: number
  createdById: string | null
  createdByCustomerId: string | null
  createdByName: string | null
  createdByCustomerName: string | null
  assignedToId: string | null
  assignedToName: string | null
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

type SupportSummary = {
  openWorkspaceTickets: number
  openPlatformEscalations: number
  totalWorkspaceTickets: number
  totalPlatformEscalations: number
}

const CUSTOMER_PAGE_SIZE = 10
const SUPPORT_PAGE_SIZE = 10

function normalizePageNumber(value?: number | null) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1
  }

  return Math.floor(value)
}

async function getWorkspaceSupportSummary(
  workspaceId: string
): Promise<SupportSummary> {
  const openStatuses = ['open', 'in_progress']

  const [
    totalWorkspaceTickets,
    totalPlatformEscalations,
    openWorkspaceTickets,
    openPlatformEscalations,
  ] = await Promise.all([
    prisma.supportTicket.count({
      where: {
        workspaceId,
        contextType: {
          not: 'PLATFORM',
        },
      },
    }),
    prisma.supportTicket.count({
      where: {
        workspaceId,
        contextType: 'PLATFORM',
      },
    }),
    prisma.supportTicket.count({
      where: {
        workspaceId,
        contextType: {
          not: 'PLATFORM',
        },
        status: {
          in: openStatuses,
        },
      },
    }),
    prisma.supportTicket.count({
      where: {
        workspaceId,
        contextType: 'PLATFORM',
        status: {
          in: openStatuses,
        },
      },
    }),
  ])

  return {
    openWorkspaceTickets,
    openPlatformEscalations,
    totalWorkspaceTickets,
    totalPlatformEscalations,
  }
}

async function hydrateSupportTicketListItems(
  tickets: Array<{
    id: string
    contextType: string
    title: string
    body: string
    status: string
    priority: string | null
    createdAt: Date
    updatedAt: Date
    createdById: string | null
    createdByCustomerId: string | null
    assignedToId: string | null
  }>
) {
  const createdByIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.createdById)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const createdByCustomerIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.createdByCustomerId)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const assignedToIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.assignedToId)
        .filter((value): value is string => Boolean(value)),
    ),
  )

  const [identities, customers, messageCounts] = await Promise.all([
    createdByIds.length + assignedToIds.length > 0
      ? prisma.identity.findMany({
          where: {
            id: {
              in: Array.from(new Set([...createdByIds, ...assignedToIds])),
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : Promise.resolve([]),
    createdByCustomerIds.length > 0
      ? prisma.customer.findMany({
          where: {
            id: {
              in: createdByCustomerIds,
            },
          },
          select: {
            id: true,
            identity: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    tickets.length > 0
      ? prisma.supportTicketMessage.groupBy({
          by: ['ticketId'],
          where: {
            ticketId: {
              in: tickets.map((ticket) => ticket.id),
            },
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
  ])

  const identityMap = new Map(
    identities.map((identity) => [identity.id, identity]),
  )
  const customerMap = new Map(
    customers.map((customer) => [customer.id, customer]),
  )
  const messageCountMap = new Map(
    messageCounts.map((count) => [count.ticketId, count._count._all]),
  )

  return tickets.map((ticket): SupportTicketListItem => {
    const createdBy = ticket.createdById
      ? identityMap.get(ticket.createdById)
      : null
    const createdByCustomer = ticket.createdByCustomerId
      ? customerMap.get(ticket.createdByCustomerId)
      : null
    const assignedTo = ticket.assignedToId
      ? identityMap.get(ticket.assignedToId)
      : null

    return {
      id: ticket.id,
      contextType: ticket.contextType,
      title: ticket.title,
      body: ticket.body,
      status: ticket.status,
      priority: ticket.priority ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messageCount: messageCountMap.get(ticket.id) ?? 0,
      createdById: ticket.createdById ?? null,
      createdByCustomerId: ticket.createdByCustomerId ?? null,
      createdByName: createdBy
        ? resolveSupportSenderName({ identity: createdBy })
        : null,
      createdByCustomerName: createdByCustomer
        ? resolveSupportSenderName({ customer: createdByCustomer })
        : null,
      assignedToId: ticket.assignedToId ?? null,
      assignedToName: assignedTo
        ? resolveSupportSenderName({ identity: assignedTo })
        : null,
    }
  })
}

export async function getWorkspaceSupportQueuePageData(params: {
  queue: 'workspace' | 'platform'
  page?: number | null
}) {
  return withServerRequestContext(async () => {
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

    const queueWhere =
      params.queue === 'platform'
        ? {
            workspaceId: context.workspaceId,
            contextType: 'PLATFORM' as const,
          }
        : {
            workspaceId: context.workspaceId,
            contextType: {
              not: 'PLATFORM' as const,
            },
          }

    const [supportSummary, totalItems, tickets] = await Promise.all([
      getWorkspaceSupportSummary(context.workspaceId),
      prisma.supportTicket.count({
        where: {
          ...queueWhere,
        },
      }),
      prisma.supportTicket.findMany({
        where: {
          ...queueWhere,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * SUPPORT_PAGE_SIZE,
        take: SUPPORT_PAGE_SIZE,
        select: {
          id: true,
          contextType: true,
          title: true,
          body: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          createdByCustomerId: true,
          assignedToId: true,
        },
      }),
    ])

    const serializedTickets = await hydrateSupportTicketListItems(tickets)
    const totalPages = Math.max(1, Math.ceil(totalItems / SUPPORT_PAGE_SIZE))

    return {
      ...context,
      queue: params.queue,
      tickets: serializedTickets,
      page,
      pageSize: SUPPORT_PAGE_SIZE,
      totalItems,
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
  return withServerRequestContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext()

    return {
      ...context,
    }
  })
}

export async function getWorkspaceSupportThreadPageData(ticketId: string) {
  return withServerRequestContext(async () => {
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

    const [ticket, workspaceMembers] = await Promise.all([
      prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          workspaceId: context.workspaceId,
        },
        select: {
          id: true,
          contextType: true,
          title: true,
          body: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          createdByCustomerId: true,
          assignedToId: true,
        },
      }),
      prisma.membership.findMany({
        where: {
          workspaceId: context.workspaceId,
          isActive: true,
        },
        orderBy: [{ createdAt: 'asc' }],
        select: {
          identityId: true,
          identity: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ])

    if (!ticket) {
      return {
        ...context,
        selectedQueue: 'workspace' as const,
        selectedTicket: null,
        assigneeOptions: workspaceMembers.map((member) => ({
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

    const [serializedTicket] = await hydrateSupportTicketListItems([ticket])
    const messages = await prisma.supportTicketMessage.findMany({
      where: {
        ticketId: ticket.id,
      },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        senderType: true,
        senderIdentityId: true,
        senderCustomerId: true,
        message: true,
        isInternalNote: true,
        createdAt: true,
      },
    })

    const messageIdentityIds = Array.from(
      new Set(
        messages
          .map((message) => message.senderIdentityId)
          .filter((value): value is string => Boolean(value)),
      ),
    )
    const messageCustomerIds = Array.from(
      new Set(
        messages
          .map((message) => message.senderCustomerId)
          .filter((value): value is string => Boolean(value)),
      ),
    )

    const [messageIdentities, messageCustomers, platformMemberships, ticketAttachments, messageAttachments] =
      await Promise.all([
        messageIdentityIds.length > 0
          ? prisma.identity.findMany({
              where: {
                id: {
                  in: messageIdentityIds,
                },
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : Promise.resolve([]),
        messageCustomerIds.length > 0
          ? prisma.customer.findMany({
              where: {
                id: {
                  in: messageCustomerIds,
                },
              },
              select: {
                id: true,
                identity: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        messageIdentityIds.length > 0
          ? prisma.platformMembership.findMany({
              where: {
                identityId: {
                  in: messageIdentityIds,
                },
                isActive: true,
              },
              select: {
                identityId: true,
              },
            })
          : Promise.resolve([]),
        prisma.fileAttachment.findMany({
          where: {
            entityType: 'SUPPORT_TICKET',
            entityId: ticket.id,
          },
          include: {
            media: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        }),
        messages.length > 0
          ? prisma.fileAttachment.findMany({
              where: {
                entityType: 'SUPPORT_TICKET_MESSAGE',
                entityId: {
                  in: messages.map((message) => message.id),
                },
              },
              include: {
                media: true,
              },
              orderBy: [{ createdAt: 'asc' }],
            })
          : Promise.resolve([]),
      ])

    const messageIdentityMap = new Map(
      messageIdentities.map((identity) => [identity.id, identity]),
    )
    const messageCustomerMap = new Map(
      messageCustomers.map((customer) => [customer.id, customer]),
    )
    const workspaceIdentityIds = new Set(
      workspaceMembers.map((member) => member.identityId),
    )
    const platformIdentityIds = new Set(
      platformMemberships.map((membership) => membership.identityId),
    )
    const ticketAttachmentItems = ticketAttachments.map((attachment) => ({
      id: attachment.id,
      mediaId: attachment.mediaId,
      fileName: attachment.media.fileName,
      mimeType: attachment.media.mimeType,
      size: attachment.media.size,
      previewUrl: `/api/workspace/media/${attachment.mediaId}/download`,
      downloadUrl: `/api/workspace/media/${attachment.mediaId}/download?download=1`,
    }))
    const messageAttachmentMap = new Map<string, SupportAttachmentItem[]>()

    for (const attachment of messageAttachments) {
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
      ticket.contextType === 'PLATFORM' ? 'platform' : 'workspace'

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
          ...messages.map((message) => {
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
      assigneeOptions: workspaceMembers.map((member) => ({
        identityId: member.identityId,
        name:
          `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
          member.identity.email ||
          'Workspace member',
        email: member.identity.email ?? null,
      })),
      backHref:
        ticket.contextType === 'PLATFORM'
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
  return withServerRequestContext(async () => {
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
      prisma.workspaceDomain.findMany({
        where: {
          workspaceId: context.workspaceId,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          domain: true,
          type: true,
          routingMode: true,
          status: true,
          target: true,
          isPrimary: true,
          isVerified: true,
          createdAt: true,
          verifiedAt: true,
          lastCheckedAt: true,
          lastVerificationError: true,
          dnsRecords: {
            orderBy: [{ purpose: "asc" }, { type: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              type: true,
              purpose: true,
              host: true,
              expectedValue: true,
              isRequired: true,
              isMatched: true,
              matchedValue: true,
              lastCheckedAt: true,
              lastError: true,
            },
          },
        },
      }),
      prisma.subscription.findFirst({
        where: {
          workspaceId: context.workspaceId,
          status: {
            in: ["ACTIVE", "TRIALING", "PAST_DUE"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          status: true,
          currentPeriodEnd: true,
          price: {
            select: {
              product: {
                select: {
                  plan: {
                    select: {
                      id: true,
                      key: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ])

    const activePlan = activeSubscription?.price?.product?.plan ?? null
    const entitlements = await resolveEntitlements({
      workspaceId: context.workspaceId,
      planId: activePlan?.id,
    })
    const customDomainSlots = entitlements.limits.max_custom_domains ?? 0
    const customDomainCount = domains.filter(
      (domain) => domain.type === WorkspaceDomainType.CUSTOM && domain.isPrimary
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
      domains: domains.map((domain) => {
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
          dnsRecords: domain.dnsRecords.map((record) => ({
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

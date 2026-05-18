import "dotenv/config"

import { PrismaNeon } from "@prisma/adapter-neon"

import {
  AuthAccountType,
  PrismaClient,
  RoleScope,
} from "../src/generated/prisma/client"

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

const PLATFORM_OWNER = {
  firstName: "Munir",
  lastName: "Suri",
  email: "ms@nimblestack.in",
  phone: "9818478573",
  platformRoleKey: "platform-admin",
  platformRoleSystemKey: "PLATFORM_ADMIN",
} as const

const normalizedEmail = PLATFORM_OWNER.email.toLowerCase()

function normalizeIndianPhoneForSeed(input: string) {
  const cleaned = input.trim().replace(/[^\d+]/g, "")

  if (/^\+91\d{10}$/.test(cleaned)) {
    return cleaned
  }

  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`
  }

  if (/^0\d{10}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`
  }

  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`
  }

  throw new Error(`Invalid platform owner phone number: ${input}`)
}

const normalizedPhone = normalizeIndianPhoneForSeed(PLATFORM_OWNER.phone)

async function resolveIdentity() {
  const matches = await prisma.identity.findMany({
    where: {
      OR: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
        { phone: PLATFORM_OWNER.phone },
      ],
    },
  })

  const uniqueMatches = Array.from(new Map(matches.map((item) => [item.id, item])).values())

  if (uniqueMatches.length > 1) {
    throw new Error(
      `Email ${normalizedEmail} and phone ${normalizedPhone} belong to different identities. Resolve that conflict before seeding the platform owner.`,
    )
  }

  const existing = uniqueMatches[0]

  if (existing) {
    return prisma.identity.update({
      where: { id: existing.id },
      data: {
        firstName: PLATFORM_OWNER.firstName,
        lastName: PLATFORM_OWNER.lastName,
        email: normalizedEmail,
        phone: normalizedPhone,
        isActive: true,
      },
    })
  }

  return prisma.identity.create({
    data: {
      firstName: PLATFORM_OWNER.firstName,
      lastName: PLATFORM_OWNER.lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      isActive: true,
    },
  })
}

async function ensureAuthAccount(params: {
  identityId: string
  type: AuthAccountType
  value: string
  legacyValues?: string[]
}) {
  const existing = await prisma.authAccount.findUnique({
    where: {
      type_value: {
        type: params.type,
        value: params.value,
      },
    },
  })

  const legacyCandidates =
    !existing && params.legacyValues?.length
      ? await prisma.authAccount.findFirst({
          where: {
            identityId: params.identityId,
            type: params.type,
            value: {
              in: params.legacyValues,
            },
          },
        })
      : null

  if (existing && existing.identityId !== params.identityId) {
    throw new Error(
      `Auth account ${params.type}:${params.value} already belongs to another identity.`,
    )
  }

  const now = new Date()

  if (legacyCandidates) {
    return prisma.authAccount.update({
      where: { id: legacyCandidates.id },
      data: {
        value: params.value,
        isVerified: true,
        verifiedAt: legacyCandidates.verifiedAt ?? now,
      },
    })
  }

  return prisma.authAccount.upsert({
    where: {
      type_value: {
        type: params.type,
        value: params.value,
      },
    },
    update: {
      identityId: params.identityId,
      isVerified: true,
      verifiedAt: existing?.verifiedAt ?? now,
    },
    create: {
      identityId: params.identityId,
      type: params.type,
      value: params.value,
      isVerified: true,
      verifiedAt: now,
    },
  })
}

async function ensurePlatformMembership(identityId: string) {
  const roleDefinition = await prisma.roleDefinition.findUnique({
    where: {
      scope_systemKey: {
        scope: RoleScope.PLATFORM,
        systemKey: PLATFORM_OWNER.platformRoleSystemKey,
      },
    },
  })

  if (!roleDefinition) {
    throw new Error(
      `Missing role definition ${PLATFORM_OWNER.platformRoleSystemKey}. Run prisma/seed-role-definitions.ts first.`,
    )
  }

  return prisma.platformMembership.upsert({
    where: {
      identityId_roleDefinitionId: {
        identityId,
        roleDefinitionId: roleDefinition.id,
      },
    },
    update: {
      roleKey: roleDefinition.key,
      roleSystemKey: roleDefinition.systemKey,
      isActive: true,
    },
    create: {
      identityId,
      roleDefinitionId: roleDefinition.id,
      roleKey: roleDefinition.key,
      roleSystemKey: roleDefinition.systemKey,
      isActive: true,
    },
  })
}

async function main() {
  console.log("Seeding platform owner...")

  const identity = await resolveIdentity()

  await ensureAuthAccount({
    identityId: identity.id,
    type: AuthAccountType.EMAIL,
    value: normalizedEmail,
  })

  await ensureAuthAccount({
    identityId: identity.id,
    type: AuthAccountType.PHONE,
    value: normalizedPhone,
    legacyValues: [PLATFORM_OWNER.phone],
  })

  const membership = await ensurePlatformMembership(identity.id)

  console.log("Platform owner seeded successfully")
  console.log(
    JSON.stringify(
      {
        identityId: identity.id,
        platformMembershipId: membership.id,
        email: normalizedEmail,
        phone: normalizedPhone,
        role: PLATFORM_OWNER.platformRoleKey,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error("Platform owner seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

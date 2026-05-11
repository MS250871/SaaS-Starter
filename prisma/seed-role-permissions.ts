import "dotenv/config"

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import {
  ROLE_DEFINITION_SEED,
  ROLE_PERMISSION_KEY_MAP,
} from "./data/roleDefinitions"

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

type PermissionRecord = {
  id: string
  key: string
}

function resolvePermissions(
  allPermissions: PermissionRecord[],
  keys: string[],
): string[] {
  if (keys.includes("*")) {
    return allPermissions.map((permission) => permission.id)
  }

  const resolved: string[] = []

  for (const key of keys) {
    if (key.endsWith(".*")) {
      const prefix = key.slice(0, -2)

      for (const permission of allPermissions) {
        if (permission.key.startsWith(`${prefix}.`)) {
          resolved.push(permission.id)
        }
      }

      continue
    }

    const match = allPermissions.find((permission) => permission.key === key)

    if (match) {
      resolved.push(match.id)
    }
  }

  return [...new Set(resolved)]
}

async function seedRolePermissions(permissions: PermissionRecord[]) {
  for (const roleSeed of ROLE_DEFINITION_SEED) {
    const permissionKeys = ROLE_PERMISSION_KEY_MAP[roleSeed.systemKey]
    const permissionIds = resolvePermissions(permissions, permissionKeys)

    const roleDefinition = await prisma.roleDefinition.findUnique({
      where: {
        scope_key: {
          scope: roleSeed.scope,
          key: roleSeed.key,
        },
      },
      select: {
        id: true,
      },
    })

    if (!roleDefinition) {
      throw new Error(
        `Role definition missing for ${roleSeed.scope}:${roleSeed.key}. Run seed-role-definitions first.`,
      )
    }

    await prisma.rolePermission.deleteMany({
      where: {
        roleDefinitionId: roleDefinition.id,
      },
    })

    if (permissionIds.length === 0) {
      continue
    }

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleDefinitionId: roleDefinition.id,
        permissionId,
      })),
      skipDuplicates: true,
    })
  }
}

async function main() {
  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      key: true,
    },
  })

  await seedRolePermissions(permissions)

  console.log("Role permissions seeded successfully")
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

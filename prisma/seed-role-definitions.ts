import "dotenv/config"

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { ROLE_DEFINITION_SEED } from "./data/roleDefinitions"

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding role definitions...")

  let upserted = 0

  for (const roleDefinition of ROLE_DEFINITION_SEED) {
    await prisma.roleDefinition.upsert({
      where: {
        scope_key: {
          scope: roleDefinition.scope,
          key: roleDefinition.key,
        },
      },
      update: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: roleDefinition.isSystem,
        systemKey: roleDefinition.systemKey,
        hierarchyRank: roleDefinition.hierarchyRank,
        isDefault: roleDefinition.isDefault,
        isAssignable: roleDefinition.isAssignable,
        isActive: roleDefinition.isActive,
      },
      create: {
        scope: roleDefinition.scope,
        key: roleDefinition.key,
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: roleDefinition.isSystem,
        systemKey: roleDefinition.systemKey,
        hierarchyRank: roleDefinition.hierarchyRank,
        isDefault: roleDefinition.isDefault,
        isAssignable: roleDefinition.isAssignable,
        isActive: roleDefinition.isActive,
      },
    })

    upserted += 1
  }

  console.log(`Role definitions seeded: ${upserted} upserted`)
}

main()
  .catch((error) => {
    console.error("Role definition seeding failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

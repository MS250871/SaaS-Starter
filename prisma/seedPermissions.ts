require('dotenv').config();

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PERMISSION_SEED } from './data/permissions.js';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding permissions...');

  const result = await prisma.permission.createMany({
    data: PERMISSION_SEED,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${result.count} permissions`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

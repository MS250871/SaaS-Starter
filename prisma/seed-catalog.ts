require('dotenv').config();

import {
  BillingInterval,
  Currency,
  PrismaClient,
  ProductType,
} from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PLANS_SEED } from './data/plan.js';
import { FEATURES_SEED } from './data/feature.js';
import { LIMITDEFINITIONS_SEED } from './data/limitDefinition.js';
import { PRODUCTS_SEED } from './data/product.js';
import { PRICES_SEED } from './data/price.js';
import { planFeatureMap } from './data/planFeatureMap';
import { planLimitMap } from './data/planLimitMap';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type PlanSeed = {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
};

type FeatureSeed = {
  key: string;
  name: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type LimitSeed = {
  key: string;
  name: string;
  description?: string;
  unit?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type ProductSeed = {
  code: string;
  name: string;
  planKey?: string;
  type: string;
  description?: string;
  isActive?: boolean;
};

type PriceSeed = {
  productCode: string;
  amount: number;
  currency?: string;
  interval?: string | null;
  isActive?: boolean;
};

function normalizeProductType(value: string): ProductType {
  if (value === ProductType.SUBSCRIPTION || value === ProductType.ONE_TIME) {
    return value;
  }

  throw new Error(`Unsupported product type: ${value}`);
}

function normalizeCurrency(value?: string): Currency {
  if (!value) {
    return Currency.INR;
  }

  const upper = value.toUpperCase();

  if (upper in Currency) {
    return Currency[upper as keyof typeof Currency];
  }

  throw new Error(`Unsupported currency: ${value}`);
}

function normalizeBillingInterval(value?: string | null): BillingInterval | null {
  if (!value) {
    return null;
  }

  const upper = value.toUpperCase();

  if (upper === 'MONTH') {
    return BillingInterval.MONTHLY;
  }

  if (upper === 'YEAR') {
    return BillingInterval.YEARLY;
  }

  if (upper === BillingInterval.MONTHLY || upper === BillingInterval.YEARLY) {
    return upper as BillingInterval;
  }

  throw new Error(`Unsupported billing interval: ${value}`);
}

async function seedPlans() {
  let upserted = 0;

  for (const plan of PLANS_SEED as PlanSeed[]) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      create: {
        key: plan.key,
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive ?? true,
        isPublic: plan.isPublic ?? true,
        sortOrder: plan.sortOrder ?? 0,
      },
      update: {
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive ?? true,
        isPublic: plan.isPublic ?? true,
        sortOrder: plan.sortOrder ?? 0,
      },
    });

    upserted += 1;
  }

  console.log(`Plans seeded: ${upserted} upserted`);
}

async function seedFeatures() {
  let upserted = 0;

  for (const feature of FEATURES_SEED as FeatureSeed[]) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      create: {
        key: feature.key,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        isActive: feature.isActive ?? true,
        sortOrder: feature.sortOrder ?? 0,
      },
      update: {
        name: feature.name,
        description: feature.description,
        category: feature.category,
        isActive: feature.isActive ?? true,
        sortOrder: feature.sortOrder ?? 0,
      },
    });

    upserted += 1;
  }

  console.log(`Features seeded: ${upserted} upserted`);
}

async function seedLimitDefinitions() {
  let upserted = 0;

  for (const limit of LIMITDEFINITIONS_SEED as LimitSeed[]) {
    await prisma.limitDefinition.upsert({
      where: { key: limit.key },
      create: {
        key: limit.key,
        name: limit.name,
        description: limit.description,
        unit: limit.unit,
        isActive: limit.isActive ?? true,
        sortOrder: limit.sortOrder ?? 0,
      },
      update: {
        name: limit.name,
        description: limit.description,
        unit: limit.unit,
        isActive: limit.isActive ?? true,
        sortOrder: limit.sortOrder ?? 0,
      },
    });

    upserted += 1;
  }

  console.log(`Limit definitions seeded: ${upserted} upserted`);
}

async function seedProducts() {
  const plans = await prisma.plan.findMany({
    select: { id: true, key: true },
  });

  const planIdByKey = new Map(plans.map((plan) => [plan.key, plan.id]));

  let created = 0;
  let updated = 0;

  for (const product of PRODUCTS_SEED as ProductSeed[]) {
    const planId = product.planKey ? planIdByKey.get(product.planKey) : undefined;

    if (product.planKey && !planId) {
      throw new Error(`Missing plan for product ${product.code}: ${product.planKey}`);
    }

    const existing = await prisma.product.findUnique({
      where: { code: product.code },
      select: { id: true },
    });

    const payload = {
      name: product.name,
      code: product.code,
      planId,
      type: normalizeProductType(product.type),
      description: product.description,
      isActive: product.isActive ?? true,
    };

    if (existing) {
      await prisma.product.update({
        where: { code: product.code },
        data: payload,
      });
      updated += 1;
    } else {
      await prisma.product.create({
        data: payload,
      });
      created += 1;
    }
  }

  console.log(`Products seeded: ${created} created, ${updated} updated`);
}

async function seedPrices() {
  const products = await prisma.product.findMany({
    select: { id: true, code: true },
  });

  const productIdByCode = new Map(products.map((product) => [product.code, product.id]));

  let created = 0;
  let updated = 0;

  for (const price of PRICES_SEED as PriceSeed[]) {
    const productId = productIdByCode.get(price.productCode);

    if (!productId) {
      throw new Error(`Missing product for price: ${price.productCode}`);
    }

    const interval = normalizeBillingInterval(price.interval);
    const currency = normalizeCurrency(price.currency);

    const existing = await prisma.price.findFirst({
      where: {
        productId,
        interval,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const payload = {
      productId,
      amount: price.amount,
      currency,
      interval,
      isActive: price.isActive ?? true,
    };

    if (existing) {
      await prisma.price.update({
        where: { id: existing.id },
        data: payload,
      });
      updated += 1;
    } else {
      await prisma.price.create({
        data: payload,
      });
      created += 1;
    }
  }

  console.log(`Prices seeded: ${created} created, ${updated} updated`);
}

async function seedPlanFeatures() {
  const plans = await prisma.plan.findMany({
    select: { id: true, key: true },
  });
  const features = await prisma.feature.findMany({
    select: { id: true, key: true },
  });

  const planIdByKey = new Map(plans.map((plan) => [plan.key, plan.id]));
  const featureIdByKey = new Map(features.map((feature) => [feature.key, feature.id]));

  let linked = 0;

  for (const [planKey, featureKeys] of Object.entries(planFeatureMap)) {
    const planId = planIdByKey.get(planKey);

    if (!planId) {
      throw new Error(`Missing plan for feature mapping: ${planKey}`);
    }

    for (const featureKey of featureKeys) {
      const featureId = featureIdByKey.get(featureKey);

      if (!featureId) {
        throw new Error(
          `Missing feature for plan feature mapping: ${planKey} -> ${featureKey}`,
        );
      }

      await prisma.planFeature.upsert({
        where: {
          planId_featureId: {
            planId,
            featureId,
          },
        },
        create: {
          planId,
          featureId,
          isEnabled: true,
        },
        update: {
          isEnabled: true,
        },
      });

      linked += 1;
    }
  }

  console.log(`Plan features linked: ${linked}`);
}

async function seedPlanLimits() {
  const plans = await prisma.plan.findMany({
    select: { id: true, key: true },
  });
  const limits = await prisma.limitDefinition.findMany({
    select: { id: true, key: true },
  });

  const planIdByKey = new Map(plans.map((plan) => [plan.key, plan.id]));
  const limitIdByKey = new Map(limits.map((limit) => [limit.key, limit.id]));

  let linked = 0;

  for (const [planKey, limitValues] of Object.entries(planLimitMap)) {
    const planId = planIdByKey.get(planKey);

    if (!planId) {
      throw new Error(`Missing plan for limit mapping: ${planKey}`);
    }

    for (const [limitKey, valueInt] of Object.entries(limitValues)) {
      const limitDefinitionId = limitIdByKey.get(limitKey);

      if (!limitDefinitionId) {
        throw new Error(
          `Missing limit definition for plan limit mapping: ${planKey} -> ${limitKey}`,
        );
      }

      await prisma.planLimit.upsert({
        where: {
          planId_limitDefinitionId: {
            planId,
            limitDefinitionId,
          },
        },
        create: {
          planId,
          limitDefinitionId,
          valueInt,
        },
        update: {
          valueInt,
        },
      });

      linked += 1;
    }
  }

  console.log(`Plan limits linked: ${linked}`);
}

async function main() {
  console.log('Seeding catalog...');

  await seedPlans();
  await seedFeatures();
  await seedLimitDefinitions();
  await seedProducts();
  await seedPrices();
  await seedPlanFeatures();
  await seedPlanLimits();

  console.log('Catalog seeded successfully');
}

main()
  .catch((e) => {
    console.error('Catalog seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

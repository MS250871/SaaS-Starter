import { EntitlementOverridePolicy } from '@/generated/prisma/client';

const ROUTING_SENSITIVE_FEATURE_KEYS = new Set([
  'domain_subdomain',
  'domain_custom',
]);

const ROUTING_SENSITIVE_LIMIT_KEYS = new Set([
  'max_subdomains',
  'max_custom_domains',
]);

export function canOverrideEntitlement(
  overridePolicy: EntitlementOverridePolicy | null | undefined,
) {
  return overridePolicy !== EntitlementOverridePolicy.NEVER;
}

export function isRoutingSensitiveFeatureKey(featureKey: string) {
  return ROUTING_SENSITIVE_FEATURE_KEYS.has(featureKey);
}

export function isRoutingSensitiveLimitKey(limitKey: string) {
  return ROUTING_SENSITIVE_LIMIT_KEYS.has(limitKey);
}

export function isRoutingSensitiveEntitlement(params: {
  featureKey?: string | null;
  limitKey?: string | null;
}) {
  return (
    (params.featureKey ? isRoutingSensitiveFeatureKey(params.featureKey) : false) ||
    (params.limitKey ? isRoutingSensitiveLimitKey(params.limitKey) : false)
  );
}

export function getOverridePolicyLabel(
  overridePolicy: EntitlementOverridePolicy | null | undefined,
) {
  if (overridePolicy === EntitlementOverridePolicy.NEVER) {
    return 'Locked to plan';
  }

  return 'Platform override';
}

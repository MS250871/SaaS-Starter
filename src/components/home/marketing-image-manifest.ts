export type MarketingImageKey =
  | 'hero-control-plane'
  | 'platform-control-plane'
  | 'workspace-overview'
  | 'catalog-pricing'
  | 'domains-routing'
  | 'billing-operations'
  | 'support-escalations'
  | 'workspace-administration';

type MarketingImageEntry = {
  key: MarketingImageKey;
  title: string;
  aspectRatio: string;
  lightFileName: string;
  darkFileName: string;
};

export const marketingImageManifest: MarketingImageEntry[] = [
  {
    key: 'hero-control-plane',
    title: 'Hero control plane',
    aspectRatio: '16:11',
    lightFileName: 'hero-control-plane-light.png',
    darkFileName: 'hero-control-plane-dark.png',
  },
  {
    key: 'platform-control-plane',
    title: 'Platform control plane',
    aspectRatio: '16:10',
    lightFileName: 'platform-control-plane-light.png',
    darkFileName: 'platform-control-plane-dark.png',
  },
  {
    key: 'workspace-overview',
    title: 'Workspace overview',
    aspectRatio: '16:10',
    lightFileName: 'workspace-overview-light.png',
    darkFileName: 'workspace-overview-dark.png',
  },
  {
    key: 'catalog-pricing',
    title: 'Catalog and pricing',
    aspectRatio: '16:10',
    lightFileName: 'catalog-pricing-light.png',
    darkFileName: 'catalog-pricing-dark.png',
  },
  {
    key: 'domains-routing',
    title: 'Domains and routing',
    aspectRatio: '16:10',
    lightFileName: 'domains-routing-light.png',
    darkFileName: 'domains-routing-dark.png',
  },
  {
    key: 'billing-operations',
    title: 'Billing operations',
    aspectRatio: '16:10',
    lightFileName: 'billing-operations-light.png',
    darkFileName: 'billing-operations-dark.png',
  },
  {
    key: 'support-escalations',
    title: 'Support and escalations',
    aspectRatio: '16:10',
    lightFileName: 'support-escalations-light.png',
    darkFileName: 'support-escalations-dark.png',
  },
  {
    key: 'workspace-administration',
    title: 'Workspace administration',
    aspectRatio: '16:10',
    lightFileName: 'workspace-administration-light.png',
    darkFileName: 'workspace-administration-dark.png',
  },
];

export function resolveMarketingImagePair(key: MarketingImageKey) {
  const entry = marketingImageManifest.find((item) => item.key === key);

  if (!entry) {
    return {};
  }

  return {
    lightSrc: `/images/home/${entry.lightFileName}`,
    darkSrc: `/images/home/${entry.darkFileName}`,
  };
}

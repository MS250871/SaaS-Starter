import type { WorkspaceSettingsJson } from '@/modules/workspace/settings';

const DEFAULT_ROOT_DOMAIN =
  (process.env.ROOT_DOMAIN || '').split(':')[0] || 'platform.localhost';

export const FREE_TRIAL_DAYS = 15;
export const FREE_TRIAL_PRODUCT_CODE = 'LMS_TRIAL';

export const defaultWorkspaceTheme = {
  brand: {
    primary: '#2563eb',
    accent: '#14b8a6',
  },
  typography: {
    headingFont: 'Geist',
    bodyFont: 'Geist',
  },
  shape: {
    radius: '0.625rem',
  },
} as const;

export function buildDefaultWorkspaceSettings(params: {
  name: string;
  slug: string;
  intent?: 'free' | 'paid';
  timezone?: string;
  trialStartsAt?: Date | null;
  trialEndsAt?: Date | null;
}) {
  const rootDomain = DEFAULT_ROOT_DOMAIN;

  return {
    themes: {
      ...defaultWorkspaceTheme,
    },
    settings: {
      branding: {
        displayName: params.name,
        legalName: null,
        tagline: null,
        shortDescription: null,
        logoAspect: 'square',
        logoUrl: null,
        logoMediaId: null,
        faviconUrl: null,
        faviconMediaId: null,
        supportEmail: null,
      },
      contact: {
        primaryContactName: null,
        supportPhone: null,
        supportWhatsapp: null,
        websiteUrl: null,
        address: {
          line1: null,
          line2: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
        },
      },
      social: {
        youtube: null,
        linkedin: null,
        instagram: null,
        facebook: null,
        x: null,
      },
      locale: {
        timezone: params.timezone ?? 'Asia/Calcutta',
        currency: 'INR',
        locale: 'en-IN',
      },
      workspace: {
        onboardingStatus: 'new',
        setupCompleted: false,
      },
      website: {
        templateKey: 'coaching-classic',
        siteTitle: params.name,
        defaultSeo: {
          metaTitle: null,
          metaDescription: null,
          ogImageUrl: null,
          ogImageMediaId: null,
        },
      },
      domain: {
        strategy: params.intent === 'paid' ? 'pending_payment' : 'free_path',
        slug: params.slug,
        rootDomain,
        primaryHost: rootDomain,
        customDomain: null,
        customDomainVerified: false,
      },
      billing: {
        planCode: params.intent === 'paid' ? 'pending_payment' : 'trial',
        subscriptionStatus: params.intent === 'paid' ? 'INCOMPLETE' : 'TRIALING',
        trialDays: FREE_TRIAL_DAYS,
        trialStartsAt: params.trialStartsAt?.toISOString() ?? null,
        trialEndsAt: params.trialEndsAt?.toISOString() ?? null,
      },
    } satisfies WorkspaceSettingsJson,
  };
}

export function getWorkspaceRootDomain() {
  return DEFAULT_ROOT_DOMAIN;
}

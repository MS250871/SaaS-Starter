export type WorkspaceSettingsJson = {
  branding?: {
    displayName?: string | null;
    legalName?: string | null;
    tagline?: string | null;
    shortDescription?: string | null;
    logoAspect?: 'square' | '2:1' | '3:1' | '4:1' | null;
    logoUrl?: string | null;
    logoMediaId?: string | null;
    faviconUrl?: string | null;
    faviconMediaId?: string | null;
    supportEmail?: string | null;
  };
  contact?: {
    primaryContactName?: string | null;
    supportPhone?: string | null;
    supportWhatsapp?: string | null;
    websiteUrl?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null;
  };
  social?: {
    youtube?: string | null;
    linkedin?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    x?: string | null;
  };
  locale?: {
    timezone?: string | null;
    currency?: string | null;
    locale?: string | null;
  };
  workspace?: {
    onboardingStatus?: string | null;
    setupCompleted?: boolean | null;
  };
  website?: {
    templateKey?: string | null;
    siteTitle?: string | null;
    defaultSeo?: {
      metaTitle?: string | null;
      metaDescription?: string | null;
      ogImageUrl?: string | null;
      ogImageMediaId?: string | null;
    } | null;
  };
  domain?: {
    strategy?: string | null;
    intent?: 'free' | 'paid' | null;
    slug?: string | null;
    rootDomain?: string | null;
    primaryHost?: string | null;
    customDomain?: string | null;
    customDomainVerified?: boolean | null;
    redirectAliases?: unknown;
  };
  billing?: {
    planCode?: string | null;
    subscriptionStatus?: string | null;
    trialDays?: number | null;
    trialStartsAt?: string | null;
    trialEndsAt?: string | null;
  };
  [key: string]: unknown;
};

export type WorkspaceProfileSettings = Pick<
  WorkspaceSettingsJson,
  'branding' | 'contact' | 'social' | 'website'
>;

export function readWorkspaceSettingsJson(
  settings: unknown,
): WorkspaceSettingsJson {
  return settings && typeof settings === 'object'
    ? (settings as WorkspaceSettingsJson)
    : {};
}

export function pickWorkspaceProfileSettings(
  settings: WorkspaceSettingsJson | null | undefined,
): WorkspaceProfileSettings {
  return {
    branding: {
      ...(settings?.branding ?? {}),
    },
    contact: {
      ...(settings?.contact ?? {}),
      address: {
        ...(settings?.contact?.address ?? {}),
      },
    },
    social: {
      ...(settings?.social ?? {}),
    },
    website: {
      ...(settings?.website ?? {}),
      defaultSeo: {
        ...(settings?.website?.defaultSeo ?? {}),
      },
    },
  };
}

export function mergeWorkspaceProfileSettings(
  current: WorkspaceSettingsJson,
  profile: WorkspaceProfileSettings,
): WorkspaceSettingsJson {
  return {
    ...current,
    branding: {
      ...(current.branding ?? {}),
      ...(profile.branding ?? {}),
    },
    contact: {
      ...(current.contact ?? {}),
      ...(profile.contact ?? {}),
      address: {
        ...(current.contact?.address ?? {}),
        ...(profile.contact?.address ?? {}),
      },
    },
    social: {
      ...(current.social ?? {}),
      ...(profile.social ?? {}),
    },
    website: {
      ...(current.website ?? {}),
      ...(profile.website ?? {}),
      defaultSeo: {
        ...(current.website?.defaultSeo ?? {}),
        ...(profile.website?.defaultSeo ?? {}),
      },
    },
  };
}

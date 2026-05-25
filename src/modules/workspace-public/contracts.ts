import type { CSSProperties } from 'react';
import type { WorkspaceDomainStrategy } from '@/modules/workspace/routing';
import type { WorkspaceThemeSettings } from '@/modules/workspace/theme';

export const workspacePublicTemplateKeys = ['coaching-classic'] as const;

export type WorkspacePublicTemplateKey =
  (typeof workspacePublicTemplateKeys)[number];

export const workspacePublicTemplateOptions: Array<{
  key: WorkspacePublicTemplateKey;
  label: string;
}> = [
  {
    key: 'coaching-classic',
    label: 'Coaching Classic',
  },
];

export type WorkspacePublicNavItem = {
  label: string;
  href: string;
};

export type WorkspacePublicAction = {
  label: string;
  href: string;
};

export type WorkspacePublicFeature = {
  title: string;
  description: string;
};

export type WorkspacePublicCourse = {
  language: string;
  level: string;
  title: string;
  description: string;
  meta: string;
};

export type WorkspacePublicTestimonial = {
  quote: string;
  name: string;
  role: string;
};

export type WorkspacePublicCtaStrip = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryAction: WorkspacePublicAction;
  secondaryAction: WorkspacePublicAction;
};

export type WorkspacePublicHomeContract = {
  site: {
    name: string;
    logoUrl: string | null;
    description: string;
    supportEmail: string | null;
    nav: WorkspacePublicNavItem[];
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryAction: WorkspacePublicAction;
    secondaryAction: WorkspacePublicAction;
  };
  features: WorkspacePublicFeature[];
  courses: WorkspacePublicCourse[];
  testimonials: WorkspacePublicTestimonial[];
  ctaStrip: WorkspacePublicCtaStrip;
  footer: {
    blurb: string;
    supportLabel: string;
    supportValue: string;
    legalLine: string;
  };
};

export type WorkspacePublicTemplateData = {
  templateKey: WorkspacePublicTemplateKey;
  theme: WorkspaceThemeSettings;
  themeStyle: CSSProperties & Record<string, string>;
  strategy: WorkspaceDomainStrategy;
  homePath: string;
  loginPath: string;
  signupPath: string;
  continuePath: string | null;
  continueLabel: string | null;
  domainLabel: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    defaultDomain: string | null;
  };
  page: WorkspacePublicHomeContract;
};

export type WorkspacePublicTemplateComponent = (props: {
  data: WorkspacePublicTemplateData;
}) => React.ReactNode;

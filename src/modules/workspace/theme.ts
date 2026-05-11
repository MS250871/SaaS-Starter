import type { CSSProperties } from 'react';
import { defaultWorkspaceTheme } from '@/modules/workspace/defaults';

export const workspaceFontOptions = [
  'Merriweather',
  'Lora',
  'Playfair Display',
  'Bitter',
  'Libre Baskerville',
  'Geist',
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
] as const;
export const workspaceRadiusOptions = [
  '0.5rem',
  '0.625rem',
  '0.75rem',
  '1rem',
] as const;
export type WorkspaceFontOption = (typeof workspaceFontOptions)[number];

export const workspaceFontGroups = [
  {
    label: 'Serif',
    options: [
      'Merriweather',
      'Lora',
      'Playfair Display',
      'Bitter',
      'Libre Baskerville',
    ] as const satisfies readonly WorkspaceFontOption[],
  },
  {
    label: 'Sans Serif',
    options: [
      'Geist',
      'Inter',
      'Roboto',
      'Poppins',
      'Montserrat',
    ] as const satisfies readonly WorkspaceFontOption[],
  },
] as const;

export type WorkspaceThemeSettings = {
  brand: {
    primary: string;
    accent: string;
  };
  typography: {
    headingFont: WorkspaceFontOption;
    bodyFont: WorkspaceFontOption;
  };
  shape: {
    radius: (typeof workspaceRadiusOptions)[number];
  };
};

const fontFamilyMap: Record<WorkspaceFontOption, string> = {
  Merriweather: 'var(--font-merriweather)',
  Lora: 'var(--font-lora)',
  'Playfair Display': 'var(--font-playfair-display)',
  Bitter: 'var(--font-bitter)',
  'Libre Baskerville': 'var(--font-libre-baskerville)',
  Geist: 'var(--font-geist)',
  Inter: 'var(--font-sans)',
  Roboto: 'var(--font-roboto)',
  Poppins: 'var(--font-poppins)',
  Montserrat: 'var(--font-montserrat)',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeFontOption(value: unknown, fallback: WorkspaceFontOption) {
  return workspaceFontOptions.includes(
    value as WorkspaceFontOption,
  )
    ? (value as WorkspaceFontOption)
    : fallback;
}

function normalizeRadiusOption(value: unknown) {
  return workspaceRadiusOptions.includes(
    value as (typeof workspaceRadiusOptions)[number],
  )
    ? (value as (typeof workspaceRadiusOptions)[number])
    : defaultWorkspaceTheme.shape.radius;
}

export function normalizeWorkspaceTheme(
  rawTheme: unknown,
): WorkspaceThemeSettings {
  const themeRecord = isRecord(rawTheme) ? rawTheme : {};
  const brand = isRecord(themeRecord.brand) ? themeRecord.brand : {};
  const typography = isRecord(themeRecord.typography)
    ? themeRecord.typography
    : {};
  const shape = isRecord(themeRecord.shape) ? themeRecord.shape : {};

  return {
    brand: {
      primary: getString(brand.primary, defaultWorkspaceTheme.brand.primary),
      accent: getString(brand.accent, defaultWorkspaceTheme.brand.accent),
    },
    typography: {
      headingFont: normalizeFontOption(
        typography.headingFont,
        defaultWorkspaceTheme.typography.headingFont,
      ),
      bodyFont: normalizeFontOption(
        typography.bodyFont,
        defaultWorkspaceTheme.typography.bodyFont,
      ),
    },
    shape: {
      radius: normalizeRadiusOption(shape.radius),
    },
  };
}

export function getWorkspaceFontFamily(option: WorkspaceFontOption) {
  return fontFamilyMap[option];
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character + character)
          .join('')
      : normalized;

  const value = Number.parseInt(safeHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function getContrastForeground(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? '#111827' : '#ffffff';
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);

  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function buildWorkspaceThemeStyle(
  rawTheme: unknown,
): CSSProperties & Record<string, string> {
  const theme = normalizeWorkspaceTheme(rawTheme);

  return {
    '--workspace-primary': theme.brand.primary,
    '--workspace-primary-foreground': getContrastForeground(theme.brand.primary),
    '--workspace-accent': theme.brand.accent,
    '--workspace-accent-foreground': getContrastForeground(theme.brand.accent),
    '--workspace-accent-soft-light': withAlpha(theme.brand.accent, 0.14),
    '--workspace-accent-soft-dark': withAlpha(theme.brand.accent, 0.2),
    '--workspace-accent-border-light': withAlpha(theme.brand.accent, 0.28),
    '--workspace-accent-border-dark': withAlpha(theme.brand.accent, 0.34),
    '--workspace-sidebar-icon': theme.brand.accent,
    '--workspace-sidebar-primary': theme.brand.primary,
    '--workspace-sidebar-primary-foreground': getContrastForeground(
      theme.brand.primary,
    ),
    '--workspace-sidebar-accent-light': withAlpha(theme.brand.primary, 0.12),
    '--workspace-sidebar-accent-dark': withAlpha(theme.brand.primary, 0.2),
    '--workspace-sidebar-accent-foreground-light': theme.brand.primary,
    '--workspace-sidebar-accent-foreground-dark': theme.brand.primary,
    '--workspace-sidebar-ring': theme.brand.primary,
    '--radius': theme.shape.radius,
    '--workspace-heading-font': getWorkspaceFontFamily(
      theme.typography.headingFont,
    ),
    '--workspace-body-font': getWorkspaceFontFamily(theme.typography.bodyFont),
  };
}

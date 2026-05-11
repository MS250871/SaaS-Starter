export type WorkspaceApiKeyScope = {
  key: string;
  label: string;
  description: string;
  category: 'customers' | 'support' | 'content' | 'analytics';
};

export const workspaceApiKeyScopes: WorkspaceApiKeyScope[] = [
  {
    key: 'customers:read',
    label: 'Customers Read',
    description: 'Read customer records and workspace customer profile data.',
    category: 'customers',
  },
  {
    key: 'customers:write',
    label: 'Customers Write',
    description: 'Create or update customers for sync and onboarding flows.',
    category: 'customers',
  },
  {
    key: 'support:read',
    label: 'Support Read',
    description: 'Read customer support tickets and platform escalations.',
    category: 'support',
  },
  {
    key: 'support:write',
    label: 'Support Write',
    description: 'Create or reply to support tickets through integrations.',
    category: 'support',
  },
  {
    key: 'media:read',
    label: 'Media Read',
    description: 'Read workspace media metadata and asset references.',
    category: 'content',
  },
  {
    key: 'media:write',
    label: 'Media Write',
    description: 'Create or update media records for content ingestion flows.',
    category: 'content',
  },
  {
    key: 'analytics:read',
    label: 'Analytics Read',
    description: 'Read reporting and operational analytics exposed by APIs.',
    category: 'analytics',
  },
];

export function isWorkspaceApiKeyScope(value: string) {
  return workspaceApiKeyScopes.some((scope) => scope.key === value);
}

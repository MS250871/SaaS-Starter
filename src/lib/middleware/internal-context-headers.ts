export const INTERNAL_CONTEXT_HEADER_NAMES = [
  'x-request-context',
  'x-session-id',
  'x-session-created-at',
  'x-session-expires-at',
  'x-session-active',
  'x-identity-id',
  'x-identity-first-name',
  'x-identity-last-name',
  'x-identity-email',
  'x-customer-id',
  'x-workspace-id',
  'x-workspace-name',
  'x-membership-id',
  'x-workspace-role-id',
  'x-workspace-role-key',
  'x-workspace-role-system-key',
  'x-workspace-role',
  'x-ip',
  'x-browser',
  'x-os',
  'x-device',
  'x-device-id',
  'x-device-fingerprint',
  'x-user-agent',
  'x-platform-role-ids',
  'x-platform-role-keys',
  'x-platform-role-system-keys',
  'x-platform-role',
  'x-platform-roles',
] as const;

export function stripInternalContextHeaders(headers: Headers) {
  for (const headerName of INTERNAL_CONTEXT_HEADER_NAMES) {
    headers.delete(headerName);
  }
}

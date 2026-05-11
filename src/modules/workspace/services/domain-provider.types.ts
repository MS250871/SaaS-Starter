import {
  DnsRecordType,
  DomainVerificationPurpose,
  WorkspaceDomainRoutingMode,
  WorkspaceDomainStatus,
} from '@/generated/prisma/client';

export type ManagedWorkspaceDnsRecord = {
  type: DnsRecordType;
  purpose: DomainVerificationPurpose;
  host: string;
  expectedValue: string;
  isRequired: boolean;
  matched: boolean;
  matchedValue?: string | null;
  lastError?: string | null;
};

export type ManagedWorkspaceRedirectStatusCode = 301 | 302 | 307 | 308;

export type ManagedWorkspaceRedirectConfig = {
  destination: string;
  statusCode: ManagedWorkspaceRedirectStatusCode;
};

export type ManagedWorkspaceDomainState = {
  provider: 'vercel';
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
  target: string | null;
  redirectTarget?: string | null;
  redirectStatusCode?: ManagedWorkspaceRedirectStatusCode | null;
  verified: boolean;
  status: WorkspaceDomainStatus;
  lastVerificationError: string | null;
  dnsRecords: ManagedWorkspaceDnsRecord[];
};

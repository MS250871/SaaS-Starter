import { getPlatformIdentityDetailPageData } from '@/modules/auth/server/platform-identity-admin-data';
import { getPlatformCustomersForIdentityPageData } from '@/modules/customer/server/platform-customer-admin-data';
import { PlatformIdentityDetailView } from '@/modules/platform/components/identities/platform-identity-detail-view';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformIdentityDetailPage({
  params,
}: {
  params: Promise<{ identityId: string }>;
}) {
  await requirePlatformPermission('identity.read');
  const { identityId } = await params;
  const [data, customers] = await Promise.all([
    getPlatformIdentityDetailPageData(identityId),
    getPlatformCustomersForIdentityPageData(identityId),
  ]);

  return <PlatformIdentityDetailView data={data} customers={customers} />;
}

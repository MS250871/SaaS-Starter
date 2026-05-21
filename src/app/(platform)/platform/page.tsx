import { requirePlatformAccess } from '@/modules/platform/server/require-platform-admin'
import { PlatformOverviewDashboard } from "@/modules/platform/components/platform-overview-dashboard"
import { getPlatformOverviewPageData } from "@/modules/platform/server/platform-overview-page-data"

export default async function PlatformPage() {
  await requirePlatformAccess()
  const overview = await getPlatformOverviewPageData()

  return <PlatformOverviewDashboard data={overview} />
}

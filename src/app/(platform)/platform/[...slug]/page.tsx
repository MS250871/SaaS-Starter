import { notFound } from "next/navigation"

import { PlatformSectionPlaceholder } from "@/modules/platform/components/platform-section-placeholder"
import { getPlatformRouteMeta } from "@/modules/platform/admin-navigation"

export default async function PlatformSectionPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const route = `/platform/${slug.join("/")}`
  const meta = getPlatformRouteMeta(route)

  if (!meta) {
    notFound()
  }

  return (
    <PlatformSectionPlaceholder
      route={route}
      title={meta.title}
      description={meta.description}
    />
  )
}

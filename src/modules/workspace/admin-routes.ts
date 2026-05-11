export function buildWorkspaceAdminPath(basePath: string, segment?: string) {
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath

  if (!segment) {
    return normalizedBase
  }

  const normalizedSegment = segment.replace(/^\/+/, "")

  return `${normalizedBase}/${normalizedSegment}`
}

export function normalizeWorkspaceAdminPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)

  if (segments[0] && segments[0] !== "app" && segments[1] === "app") {
    const nestedSegments = segments.slice(1)
    return `/${nestedSegments.join("/")}`
  }

  return pathname || "/"
}

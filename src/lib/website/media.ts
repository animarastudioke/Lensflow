// Site photos uploaded from the builder. They live under the studio's own
// `website/` folder and are always a server-produced WebP, so a URL that does
// not match this exact shape is never rendered or saved.

export const MAX_SECTION_IMAGES = 12

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const PATH = new RegExp(`^/studios/(${UUID})/website/img-${UUID}\\.webp$`, 'i')

/** Same host the gallery previews are served from (see isSafeWebsitePreviewUrl). */
const MEDIA_ORIGIN = 'https://media.lensflow.co.ke'

/** Returns the owning studio id when `value` is one of our site photos, else null. */
export function websiteImageStudioId(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null
  try {
    const url = new URL(value)
    // `href` equality rejects credentials, an explicit port, odd casing and
    // stripped control characters: only the canonical form we generate passes.
    if (url.origin !== MEDIA_ORIGIN || url.search || url.hash || url.username || url.password || url.href !== value) return null
    return PATH.exec(url.pathname)?.[1]?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export function isWebsiteImageUrl(value: unknown): value is string {
  return websiteImageStudioId(value) !== null
}

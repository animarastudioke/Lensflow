const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

const PUBLIC_KEY_PATTERNS = [
  new RegExp(`^studios/${UUID}/galleries/${UUID}/assets/${UUID}/(?:preview|thumb)\\.webp$`, 'i'),
  new RegExp(`^studios/${UUID}/branding/logo-${UUID}\\.(?:png|jpe?g|webp|svg)$`, 'i'),
]

const CONTENT_TYPES = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
}

export function getPublicMediaKey(pathname) {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return null

  let key
  try {
    // Decode each segment separately so an encoded slash cannot smuggle an
    // extra path component past the allowlist.
    const segments = pathname.slice(1).split('/').map((segment) => decodeURIComponent(segment))
    if (segments.some((segment) => !segment || segment.includes('/') || segment.includes('\\'))) return null
    key = segments.join('/')
  } catch {
    return null
  }

  if (key.includes('..') || key.includes('\0')) return null
  return PUBLIC_KEY_PATTERNS.some((pattern) => pattern.test(key)) ? key : null
}

function responseHeaders(key, object) {
  const extension = key.split('.').pop().toLowerCase()
  const headers = new Headers({
    'Content-Type': CONTENT_TYPES[extension],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
  })

  if (object.httpEtag) headers.set('ETag', object.httpEtag)

  // SVG is allowed only for studio logos. Keep it inert if opened directly.
  if (extension === 'svg') {
    headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
  }

  return headers
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }

    const key = getPublicMediaKey(new URL(request.url).pathname)
    if (!key) return new Response('Not found', { status: 404 })

    const object = await env.MEDIA_BUCKET.get(key)
    if (!object) return new Response('Not found', { status: 404 })

    const headers = responseHeaders(key, object)
    if (request.method === 'HEAD') return new Response(null, { headers })
    return new Response(object.body, { headers })
  },
}

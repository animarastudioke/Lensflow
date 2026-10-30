import assert from 'node:assert/strict'
import test from 'node:test'
import worker, { getPublicMediaKey } from './index.mjs'

const studioId = '123e4567-e89b-42d3-a456-426614174000'
const galleryId = '123e4567-e89b-42d3-a456-426614174001'
const mediaId = '123e4567-e89b-42d3-a456-426614174002'
const previewKey = `studios/${studioId}/galleries/${galleryId}/assets/${mediaId}/preview.webp`

test('allows gallery preview and thumbnail keys only', () => {
  assert.equal(getPublicMediaKey(`/${previewKey}`), previewKey)
  assert.equal(getPublicMediaKey(`/${previewKey.replace('preview.webp', 'thumb.webp')}`), previewKey.replace('preview.webp', 'thumb.webp'))
  assert.equal(getPublicMediaKey(`/${previewKey.replace('preview.webp', 'original.jpg')}`), null)
  assert.equal(getPublicMediaKey(`/${previewKey.replace('preview.webp', 'raw.webp')}`), null)
})

test('rejects malformed, traversal, encoded-separator, and non-media paths', () => {
  assert.equal(getPublicMediaKey(`/../${previewKey}`), null)
  assert.equal(getPublicMediaKey(`/${previewKey.replace('/preview.webp', '/%2e%2e/preview.webp')}`), null)
  assert.equal(getPublicMediaKey(`/${previewKey.replace('/assets/', '%2fassets/')}`), null)
  assert.equal(getPublicMediaKey(`/studios/${studioId}/products/file.jpg`), null)
})

test('serves previews from R2 and keeps originals unavailable', async () => {
  const bucket = {
    get: async (key) => key === previewKey
      ? { body: new Blob(['preview-bytes']).stream(), httpEtag: '"preview-etag"' }
      : null,
  }
  const env = { MEDIA_BUCKET: bucket }

  const preview = await worker.fetch(new Request(`https://media.lensflow.co.ke/${previewKey}`), env)
  assert.equal(preview.status, 200)
  assert.equal(await preview.text(), 'preview-bytes')
  assert.equal(preview.headers.get('content-type'), 'image/webp')
  assert.equal(preview.headers.get('cache-control'), 'public, max-age=31536000, immutable')

  const original = await worker.fetch(new Request(`https://media.lensflow.co.ke/${previewKey.replace('preview.webp', 'original.jpg')}`), env)
  assert.equal(original.status, 404)
})

test('supports HEAD, restricts methods, and serves SVG logos as sandboxed images', async () => {
  const logoKey = `studios/${studioId}/branding/logo-${mediaId}.svg`
  const env = { MEDIA_BUCKET: { get: async (key) => key === logoKey ? { body: new Blob(['<svg/>']).stream() } : null } }

  const head = await worker.fetch(new Request(`https://media.lensflow.co.ke/${logoKey}`, { method: 'HEAD' }), env)
  assert.equal(head.status, 200)
  assert.equal(head.body, null)

  const logo = await worker.fetch(new Request(`https://media.lensflow.co.ke/${logoKey}`), env)
  assert.equal(logo.headers.get('content-type'), 'image/svg+xml')
  assert.match(logo.headers.get('content-security-policy'), /sandbox/)

  const post = await worker.fetch(new Request(`https://media.lensflow.co.ke/${logoKey}`, { method: 'POST' }), env)
  assert.equal(post.status, 405)
})

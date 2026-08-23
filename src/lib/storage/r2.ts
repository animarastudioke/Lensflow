import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 is S3-compatible — we talk to it with the standard AWS SDK
// pointed at the account's R2 endpoint, rather than a Cloudflare-specific SDK.

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Every real object key in this app is server-built as
 * `studios/{studioId}/...` (buildMediaKey, and the ad hoc branding/product
 * keys in studios.ts/products.ts) — never accepted verbatim from a client.
 * This is a defense-in-depth backstop against a future call site passing an
 * empty, path-traversal, or otherwise malformed key/prefix through to R2,
 * not a replacement for that server-generated-key discipline.
 */
function assertSafeKey(key: string): void {
  if (!key || !key.trim()) {
    throw new Error('R2 object key must not be empty')
  }
  if (key.startsWith('/') || key.includes('..')) {
    throw new Error(`R2 object key is not well-formed: ${key}`)
  }
  if (!/^studios\/[^/]+\/.+/.test(key)) {
    throw new Error(`R2 object key is outside the studios/{studioId}/ namespace: ${key}`)
  }
}

/**
 * Stricter than assertSafeKey: deleteObjectsByPrefix fans out to a
 * potentially unbounded number of DeleteObjectsCommand calls, so an
 * under-scoped prefix here (e.g. the bare `studios/` namespace root) is far
 * more dangerous than an under-scoped single-object key — it must be
 * anchored to at least one specific studio.
 */
function assertSafePrefix(prefix: string): void {
  if (!prefix || !prefix.trim()) {
    throw new Error('R2 delete prefix must not be empty')
  }
  if (prefix.startsWith('/') || prefix.includes('..')) {
    throw new Error(`R2 delete prefix is not well-formed: ${prefix}`)
  }
  // Requires a trailing slash right after the studio id segment (content
  // beyond that, e.g. a specific gallery, is optional) — this both rejects
  // the un-scoped `studios/` namespace root and prevents a prefix like
  // `studios/abc` from also matching an unrelated studio `studios/abc-evil`.
  if (!/^studios\/[^/]+\//.test(prefix)) {
    throw new Error(`R2 delete prefix must be scoped under studios/{studioId}/, got: ${prefix}`)
  }
}

let cachedClient: S3Client | null = null

export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient

  const accountId = getEnv('R2_ACCOUNT_ID')
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    },
    // AWS SDK v3 defaults to auto-computing a request checksum for every
    // PutObjectCommand. For a *presigned* URL the SDK signs that checksum
    // before it has the real file body (there isn't one yet), so it bakes
    // in the checksum of an empty payload. R2 then rejects the real upload
    // with 403 once the actual bytes don't match — and doesn't send CORS
    // headers on that error, so the browser misreports it as a CORS/network
    // failure. 'WHEN_REQUIRED' restores the pre-3.729 behavior (only add a
    // checksum when the API call actually requires one).
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
  return cachedClient
}

export function getR2BucketName(): string {
  return getEnv('R2_BUCKET_NAME')
}

/**
 * Public URL for objects served through R2's public bucket domain (custom
 * domain or r2.dev dev URL). Only ever used for preview/thumbnail variants —
 * originals are never given a public URL, so access to them can only happen
 * through the gated, entitlement-checked download routes.
 */
export function getR2PublicUrl(key: string): string {
  const base = getEnv('R2_PUBLIC_URL').replace(/\/$/, '')
  return `${base}/${key}`
}

/** Reverses getR2PublicUrl — returns null for a URL that isn't one of our own public objects (e.g. an unrelated external URL). */
export function keyFromR2PublicUrl(url: string): string | null {
  const base = getEnv('R2_PUBLIC_URL').replace(/\/$/, '')
  if (!url.startsWith(`${base}/`)) return null
  return url.slice(base.length + 1)
}

export type R2AssetVariant = 'raw' | 'preview' | 'thumb' | 'original'

/**
 * Server-generated object key. `mediaId` must be a server-generated UUID —
 * callers must never accept a client-supplied path.
 */
export function buildMediaKey(params: {
  studioId: string
  galleryId: string
  mediaId: string
  variant: R2AssetVariant
  extension: string
}): string {
  const ext = params.extension.replace(/^\./, '')
  return `studios/${params.studioId}/galleries/${params.galleryId}/assets/${params.mediaId}/${params.variant}.${ext}`
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  assertSafeKey(key)
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function createPresignedDownloadUrl(
  key: string,
  filename?: string,
  expiresInSeconds = 60
): Promise<string> {
  assertSafeKey(key)
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ...(filename
      ? { ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"` }
      : {}),
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  assertSafeKey(key)
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

/**
 * Lightweight existence + size check without downloading the object body —
 * used to server-verify large direct-to-R2 uploads (e.g. video) where
 * downloading the whole file just to confirm it landed would be wasteful,
 * while still never trusting a client-reported file size for quota/billing.
 */
export async function headObject(key: string): Promise<{ exists: boolean; sizeBytes: number }> {
  assertSafeKey(key)
  const client = getR2Client()
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: getR2BucketName(), Key: key }))
    return { exists: true, sizeBytes: result.ContentLength ?? 0 }
  } catch {
    return { exists: false, sizeBytes: 0 }
  }
}

export async function downloadObject(key: string): Promise<Buffer> {
  assertSafeKey(key)
  const client = getR2Client()
  const result = await client.send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key })
  )
  const bytes = await result.Body?.transformToByteArray()
  if (!bytes) throw new Error(`R2 object not found or empty: ${key}`)
  return Buffer.from(bytes)
}

/** Returns a readable stream suitable for piping into a zip archive. */
export async function getObjectStream(key: string) {
  assertSafeKey(key)
  const client = getR2Client()
  const result = await client.send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key })
  )
  return result.Body
}

/**
 * Stream plus the metadata needed to serve a single-object download response
 * directly (Content-Type/Content-Length), for routes that proxy the object
 * through this app rather than redirecting the browser to R2 — see
 * createPresignedDownloadUrl's doc comment for why a redirect isn't safe here.
 */
export async function getObjectWithMeta(key: string) {
  assertSafeKey(key)
  const client = getR2Client()
  const result = await client.send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key })
  )
  if (!result.Body) return null
  return {
    stream: result.Body,
    contentType: result.ContentType ?? 'application/octet-stream',
    contentLength: result.ContentLength,
  }
}

export async function deleteObject(key: string): Promise<void> {
  assertSafeKey(key)
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key }))
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  keys.forEach(assertSafeKey)
  const client = getR2Client()
  // R2/S3 DeleteObjects accepts up to 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: getR2BucketName(),
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    )
  }
}

/** Deletes every object under a key prefix (e.g. an entire studio or gallery folder). */
export async function deleteObjectsByPrefix(prefix: string): Promise<void> {
  assertSafePrefix(prefix)
  const client = getR2Client()
  let continuationToken: string | undefined
  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: getR2BucketName(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )
    const keys = (result.Contents ?? []).map((obj) => obj.Key).filter((key): key is string => !!key)
    await deleteObjects(keys)
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
  } while (continuationToken)
}

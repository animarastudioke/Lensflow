import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
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

export async function downloadObject(key: string): Promise<Buffer> {
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
  const client = getR2Client()
  const result = await client.send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key })
  )
  return result.Body
}

export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key }))
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return
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

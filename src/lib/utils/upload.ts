/**
 * PUTs a file/blob to a presigned URL while reporting upload progress.
 * fetch() has no upload-progress event in any browser, so this uses
 * XMLHttpRequest — the only way to observe bytes sent, not just bytes
 * received back.
 */
export function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total)
    }
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status })
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(body)
  })
}

const RETRYABLE_ATTEMPTS = 2 // total attempts = 1 initial + this many retries

/**
 * Same as putWithProgress, but retries a connection-level failure (the flaky
 * mobile/wifi drop that shows up as "Network error during upload" right at
 * the end of a large transfer) with backoff before giving up. A non-network
 * HTTP failure (4xx/5xx — presigned URL expired, bad request, etc.) is not
 * retried since resending the same request won't change the outcome.
 */
export async function putWithRetry(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ ok: boolean; status: number }> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRYABLE_ATTEMPTS; attempt++) {
    try {
      return await putWithProgress(url, body, contentType, onProgress)
    } catch (err) {
      lastError = err
      if (attempt < RETRYABLE_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
        onProgress?.(0, 1) // reset the bar for this file before the retry restarts the transfer
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network error during upload')
}

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

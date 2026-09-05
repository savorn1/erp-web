// Wraps the backend's generic S3-backed upload endpoint (/api/files/upload,
// any authenticated user — not admin-only). Hands back a URL to store
// wherever the caller needs it (e.g. Product.imageUrl); no metadata is
// persisted server-side beyond the object itself.
//
// Deliberately not named `useFileUpload` — @nuxt/ui auto-imports its own
// built-in composable of that exact name (backing <UFileUpload>), and ours
// would shadow/collide with it, silently resolving calls here to the wrong
// implementation and crashing (`Cannot read properties of undefined
// (reading 'accept')` inside Nuxt UI's version, which expects a different
// call signature).

export interface UploadedFile {
  key: string
  url: string
  fileName: string
  contentType: string
  size: number
}

interface ApiEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T
}

export function useAssetUpload() {
  const api = useApi()

  async function upload(file: File, folder?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) formData.append('folder', folder)
    const res = await api<ApiEnvelope<UploadedFile>>('/api/files/upload', { method: 'POST', body: formData })
    return res.data
  }

  return { upload }
}

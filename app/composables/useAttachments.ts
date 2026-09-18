// Wraps the backend's admin-only AttachmentController
// (/api/admin/attachments/**) — the metadata layer over the generic S3
// upload primitive at /api/files/upload (see useAssetUpload.ts). Upload a
// file there first to get a key/url, then call create() here to record it
// against an owner record. Polymorphic: one table for every owner type.

import type { ApiEnvelope } from '#shared/types'

export type AttachmentOwnerType = 'INVOICE' | 'PURCHASE_ORDER' | 'SALES_ORDER' | 'CUSTOMER' | 'SUPPLIER'

export interface Attachment {
  id: number
  ownerType: AttachmentOwnerType
  ownerId: number
  key: string
  url: string
  fileName: string
  contentType: string | null
  size: number
  uploadedBy: string | null
  uploadedAt: string
}

export interface CreateAttachmentPayload {
  ownerType: AttachmentOwnerType
  ownerId: number
  key: string
  url: string
  fileName: string
  contentType?: string
  size: number
}

export function useAttachments() {
  const api = useApi()

  async function list(ownerType: AttachmentOwnerType, ownerId: number) {
    const res = await api<ApiEnvelope<Attachment[]>>('/api/admin/attachments', { query: { ownerType, ownerId } })
    return res.data
  }

  async function create(payload: CreateAttachmentPayload) {
    const res = await api<ApiEnvelope<Attachment>>('/api/admin/attachments', { method: 'POST', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/attachments/${id}`, { method: 'DELETE' })
  }

  return { list, create, remove }
}

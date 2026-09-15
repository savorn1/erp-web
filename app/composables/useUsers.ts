// Wraps the backend's admin-only UserController (/api/admin/users/**, requires
// ROLE_ADMIN). Single-item endpoints wrap their payload in ApiResponse<T>;
// list wraps in PageResponse<T>.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'
import type { PermissionGrant } from './useCustomRoles'

export type Role = 'ADMIN' | 'USER'

export interface AdminUser {
  id: number
  username: string
  email: string | null
  role: Role
  enabled: boolean
  companyId: number | null
  companyName: string | null
  branchId: number | null
  branchName: string | null
  departmentId: number | null
  departmentName: string | null
  customRoleId: number | null
  customRoleName: string | null
  // Only populated on single-user responses (get/create/update/etc), not
  // the batch list — see UserServiceImpl.effectivePermissionsOf.
  permissions?: PermissionGrant[]
}

export interface UserFilter {
  username?: string
  role?: Role
  enabled?: boolean
  departmentId?: number
  companyId?: number
  branchId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreateUserPayload {
  username: string
  password: string
  email?: string
  role: Role
  enabled: boolean
  companyId?: number
  branchId?: number
  departmentId?: number
  // Only meaningful when role is USER — see PermissionAuthorizationManager.
  customRoleId?: number
}

// Admin-side general edit — email plus org assignment. Role/status stay on
// their own endpoints (see updateRole/updateStatus) since those revoke the
// user's sessions server-side; this one doesn't.
export interface UpdateUserPayload {
  email?: string
  companyId?: number
  branchId?: number
  departmentId?: number
}

export function useUsers() {
  const api = useApi()

  function list(filter: UserFilter = {}) {
    return api<PageEnvelope<AdminUser>>('/api/admin/users', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<AdminUser>>(`/api/admin/users/${id}`)
    return res.data
  }

  async function create(payload: CreateUserPayload) {
    const res = await api<ApiEnvelope<AdminUser>>('/api/admin/users', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: UpdateUserPayload) {
    const res = await api<ApiEnvelope<AdminUser>>(`/api/admin/users/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateRole(id: number, role: Role) {
    const res = await api<ApiEnvelope<AdminUser>>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: { role }
    })
    return res.data
  }

  async function updateCustomRole(id: number, customRoleId: number | undefined) {
    const res = await api<ApiEnvelope<AdminUser>>(`/api/admin/users/${id}/custom-role`, {
      method: 'PUT',
      body: { customRoleId }
    })
    return res.data
  }

  async function updateStatus(id: number, enabled: boolean) {
    const res = await api<ApiEnvelope<AdminUser>>(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      body: { enabled }
    })
    return res.data
  }

  async function resetPassword(id: number, newPassword: string) {
    await api(`/api/admin/users/${id}/password`, { method: 'PUT', body: { newPassword } })
  }

  async function remove(id: number) {
    await api(`/api/admin/users/${id}`, { method: 'DELETE' })
  }

  // Revokes the user's refresh tokens without touching role/status/password —
  // their current access token stays valid until it expires, but the next
  // refresh attempt fails and forces a re-login.
  async function forceLogout(id: number) {
    await api(`/api/admin/users/${id}/force-logout`, { method: 'POST' })
  }

  async function bulkForceLogout(userIds: number[]) {
    await api('/api/admin/users/force-logout', { method: 'POST', body: { userIds } })
  }

  return { list, get, create, update, updateRole, updateCustomRole, updateStatus, resetPassword, remove, forceLogout, bulkForceLogout }
}

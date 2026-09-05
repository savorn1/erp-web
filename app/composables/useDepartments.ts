// Wraps the backend's admin-only DepartmentController (/api/admin/departments/**,
// requires ROLE_ADMIN). Single-item endpoints wrap their payload in
// ApiResponse<T>; list wraps in PageResponse<T>. Each department belongs to a
// Company, optionally a parent Department (org hierarchy) and a manager User
// (see useCompanies/useUsers) — all resolved server-side into display names.
// Employee assignment sets the assigned User's own departmentId — there's no
// separate join table, an employee belongs to at most one department.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface Department {
  id: number
  companyId: number
  companyName: string | null
  name: string
  parentDepartmentId: number | null
  parentDepartmentName: string | null
  managerId: number | null
  managerUsername: string | null
  employeeCount: number
  active: boolean
}

export interface DepartmentFilter {
  name?: string
  companyId?: number
  parentDepartmentId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface DepartmentPayload {
  companyId: number
  name: string
  parentDepartmentId?: number
  managerId?: number
}

export function useDepartments() {
  const api = useApi()

  function list(filter: DepartmentFilter = {}) {
    return api<PageEnvelope<Department>>('/api/admin/departments', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Department>>(`/api/admin/departments/${id}`)
    return res.data
  }

  async function create(payload: DepartmentPayload) {
    const res = await api<ApiEnvelope<Department>>('/api/admin/departments', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: DepartmentPayload) {
    const res = await api<ApiEnvelope<Department>>(`/api/admin/departments/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, active: boolean) {
    const res = await api<ApiEnvelope<Department>>(`/api/admin/departments/${id}/status`, {
      method: 'PUT',
      body: { active }
    })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/departments/${id}`, { method: 'DELETE' })
  }

  async function assignEmployees(id: number, userIds: number[]) {
    await api(`/api/admin/departments/${id}/employees`, { method: 'POST', body: { userIds } })
  }

  async function unassignEmployee(id: number, userId: number) {
    await api(`/api/admin/departments/${id}/employees/${userId}`, { method: 'DELETE' })
  }

  return { list, get, create, update, updateStatus, remove, assignEmployees, unassignEmployee }
}

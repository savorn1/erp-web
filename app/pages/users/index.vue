<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
      <UButton icon="i-lucide-plus" @click="openCreate">New user</UButton>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search username" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.role" :items="roleFilterOptions" placeholder="Role" class="w-32" />
        <USelect v-model="filter.enabled" :items="statusFilterOptions" placeholder="Status" class="w-32" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-40" />
        <USelect v-model="filter.branchId" :items="branchFilterOptions" placeholder="Branch" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        v-model:selected="selectedUsers"
        :rows="pagedRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        selectable
        exportable
        export-filename="users"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #bulk-actions="{ selected, clear }">
          <UButton size="xs" color="warning" variant="soft" icon="i-lucide-log-out" @click="onBulkForceLogoutClick(selected, clear)"> Force logout </UButton>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" :disabled="row.username === myUsername" @click="openEdit(row)">
              Edit
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-key-round"
              :disabled="row.username === myUsername"
              @click="openResetPasswordWith(row)"
            >
              Reset password
            </UButton>
            <UButton size="xs" color="warning" variant="soft" icon="i-lucide-log-out" @click="confirmForceLogout = row"> Force logout </UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" :disabled="row.username === myUsername" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No users match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-users" title="No users yet" description="Create the first user account to get started.">
            <template #action>
              <UButton icon="i-lucide-plus" @click="openCreate">New user</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ResetPasswordModal
      v-model="showResetPassword"
      :username="resetTarget?.username ?? ''"
      :loading="resettingPassword"
      :error="resetError"
      @submit="onResetPasswordSubmit"
    />

    <UModal v-model:open="showCreate" title="New user" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit user '${editingUser?.username ?? ''}'`" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="editFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete user"
      :description="`Delete user '${confirmDelete?.username ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />

    <ConfirmModal
      :model-value="confirmForceLogout !== null"
      title="Force logout"
      :description="`Log out '${confirmForceLogout?.username ?? ''}' everywhere? Their current session ends the next time it tries to refresh.`"
      confirm-label="Force logout"
      color="warning"
      :loading="forcingLogout"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmForceLogout = null
        }
      "
      @confirm="onForceLogoutConfirm"
    />

    <ConfirmModal
      :model-value="bulkForceLogoutTargets !== null"
      title="Force logout"
      :description="`Log out ${bulkForceLogoutTargets?.length ?? 0} selected user(s) everywhere? Their current sessions end the next time they try to refresh.`"
      confirm-label="Force logout"
      color="warning"
      :loading="forcingBulkLogout"
      @update:model-value="
        (v: boolean) => {
          if (!v) bulkForceLogoutTargets = null
        }
      "
      @confirm="onBulkForceLogoutConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef, FieldDef } from '#shared/types'
import type { AdminUser, CreateUserPayload, Role } from '~/composables/useUsers'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateRole, updateStatus, resetPassword, remove, forceLogout, bulkForceLogout } = useUsers()
const { list: listCompanies } = useCompanies()
const { list: listBranches } = useBranches()
const { list: listDepartments } = useDepartments()
const { username: myUsername } = useAuth()
const toast = useToast()

const rows = ref<AdminUser[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const branches = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const departments = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])

async function loadLookups() {
  const [companiesRes, branchesRes, departmentsRes] = await Promise.all([
    listCompanies({ size: 200 }),
    listBranches({ size: 200 }),
    listDepartments({ size: 200 })
  ])
  companies.value = companiesRes.data
  branches.value = branchesRes.data
  departments.value = departmentsRes.data
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const branchFilterOptions = computed(() => [{ label: 'All branches', value: undefined }, ...branches.value.map((b) => ({ label: b.name, value: b.id }))])
function branchOptionsFor(companyId: number | undefined) {
  return branches.value.filter((b) => b.active && (companyId === undefined || b.companyId === companyId)).map((b) => ({ label: b.name, value: b.id }))
}
function departmentOptionsFor(companyId: number | undefined) {
  return departments.value.filter((d) => d.active && (companyId === undefined || d.companyId === companyId)).map((d) => ({ label: d.name, value: d.id }))
}

const filter = reactive<{
  role: Role | undefined
  enabled: boolean | undefined
  companyId: number | undefined
  branchId: number | undefined
}>({
  role: undefined,
  enabled: undefined,
  companyId: undefined,
  branchId: undefined
})

const roleOptions = [
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' }
]
const roleFilterOptions = [{ label: 'All roles', value: undefined }, ...roleOptions]
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Enabled', value: true },
  { label: 'Disabled', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({
  column: 'id',
  direction: 'desc'
})

const {
  page,
  pageSize,
  total,
  rows: pagedRows,
  truncated,
  search
} = useClientTable(rows, {
  pageSize: 10,
  searchFields: ['username']
})

const columns: ColumnDef<AdminUser>[] = [
  // { key: 'id', label: 'ID', sortable: true },
  { key: 'username', sortable: true },
  { key: 'email', value: (row) => row.email ?? '—' },
  { key: 'role', type: 'badge', color: (row) => (row.role === 'ADMIN' ? 'primary' : 'neutral') },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'branchName', label: 'Branch', value: (row) => row.branchName ?? '—' },
  { key: 'departmentName', label: 'Department', value: (row) => row.departmentName ?? '—' },
  { key: 'enabled', type: 'boolean', trueLabel: 'Enabled', falseLabel: 'Disabled' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      role: filter.role,
      enabled: filter.enabled,
      companyId: filter.companyId,
      branchId: filter.branchId,
      sortBy: sort.value?.column,
      sortOrder: sort.value?.direction,
      size: 200
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const {
  open: showResetPassword,
  target: resetTarget,
  loading: resettingPassword,
  error: resetError,
  openWith: openResetPasswordWith
} = useTargetModal<AdminUser>()

async function onResetPasswordSubmit(newPassword: string) {
  if (!resetTarget.value) return
  resettingPassword.value = true
  resetError.value = ''
  try {
    await resetPassword(resetTarget.value.id, newPassword)
    showResetPassword.value = false
    toast.add({ title: 'Password reset', color: 'success' })
  } catch (err) {
    resetError.value = apiErrorMessage(err)
  } finally {
    resettingPassword.value = false
  }
}

const createFields = computed<FieldDef[]>(() => [
  { name: 'username', required: true },
  { name: 'password', type: 'password', required: true, hint: 'Minimum 6 characters.' },
  { name: 'email', type: 'email', hint: 'Optional — needed for the user to use "forgot password".' },
  { name: 'role', type: 'select', required: true, options: roleOptions },
  { name: 'enabled', type: 'switch', onLabel: 'Enabled', offLabel: 'Disabled', default: true },
  { name: 'companyId', label: 'Company', type: 'select', options: activeCompanyOptions.value, hint: 'Optional — can be assigned later.' },
  { name: 'branchId', label: 'Branch', type: 'select', options: branchOptionsFor(createForm.value.companyId) },
  { name: 'departmentId', label: 'Department', type: 'select', options: departmentOptionsFor(createForm.value.companyId) }
])

const editFields = computed<FieldDef[]>(() => [
  { name: 'role', type: 'select', required: true, options: roleOptions },
  { name: 'enabled', type: 'switch', onLabel: 'Enabled', offLabel: 'Disabled' },
  { name: 'email', type: 'email' },
  { name: 'companyId', label: 'Company', type: 'select', options: activeCompanyOptions.value },
  { name: 'branchId', label: 'Branch', type: 'select', options: branchOptionsFor(editForm.value.companyId) },
  { name: 'departmentId', label: 'Department', type: 'select', options: departmentOptionsFor(editForm.value.companyId) }
])

interface UserEditPayload {
  role: Role
  enabled: boolean
  email?: string
  companyId?: number
  branchId?: number
  departmentId?: number
}

const {
  showCreate,
  creating,
  error: createError,
  createForm,
  openCreate,
  onCreate,
  showEdit,
  editing,
  editError,
  editingRow: editingUser,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<AdminUser, CreateUserPayload, UserEditPayload>(
  {
    create: (payload) => create(payload),
    remove: (row) => remove(row.id),
    // Role and status stay on their own endpoints (they revoke sessions
    // server-side); email/company/branch/department go through the generic
    // update endpoint — only whichever of the three actually changed is called.
    async update(row, payload) {
      let result = row
      if (
        payload.email !== (row.email ?? '') ||
        payload.companyId !== (row.companyId ?? undefined) ||
        payload.branchId !== (row.branchId ?? undefined) ||
        payload.departmentId !== (row.departmentId ?? undefined)
      ) {
        result = await update(row.id, {
          email: payload.email || undefined,
          companyId: payload.companyId,
          branchId: payload.branchId,
          departmentId: payload.departmentId
        })
      }
      if (payload.role !== row.role) result = await updateRole(row.id, payload.role)
      if (payload.enabled !== row.enabled) result = await updateStatus(row.id, payload.enabled)
      return result
    }
  },
  load,
  {
    entityName: 'User',
    createDefaults: () => ({ role: 'USER', enabled: true }),
    toPayload: (values) => ({
      username: values.username,
      password: values.password,
      email: values.email || undefined,
      role: values.role,
      enabled: values.enabled ?? true,
      companyId: values.companyId || undefined,
      branchId: values.branchId || undefined,
      departmentId: values.departmentId || undefined
    }),
    toForm: (row) => ({
      role: row.role,
      enabled: row.enabled,
      email: row.email ?? '',
      companyId: row.companyId ?? undefined,
      branchId: row.branchId ?? undefined,
      departmentId: row.departmentId ?? undefined
    }),
    toEditPayload: (values) => ({
      role: values.role,
      enabled: values.enabled,
      email: values.email || undefined,
      companyId: values.companyId || undefined,
      branchId: values.branchId || undefined,
      departmentId: values.departmentId || undefined
    })
  }
)

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.role, filter.enabled, filter.companyId, filter.branchId], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.role !== undefined || filter.enabled !== undefined || filter.companyId !== undefined || filter.branchId !== undefined
)

function clearFilters() {
  search.value = ''
  filter.role = undefined
  filter.enabled = undefined
  filter.companyId = undefined
  filter.branchId = undefined
  load()
}

const selectedUsers = ref<AdminUser[]>([])

const confirmForceLogout = ref<AdminUser | null>(null)
const forcingLogout = ref(false)
async function onForceLogoutConfirm() {
  if (!confirmForceLogout.value) return
  forcingLogout.value = true
  try {
    await forceLogout(confirmForceLogout.value.id)
    toast.add({ title: `${confirmForceLogout.value.username} logged out`, color: 'success' })
    confirmForceLogout.value = null
  } catch (err) {
    toast.add({ title: 'Could not force logout', description: apiErrorMessage(err), color: 'error' })
  } finally {
    forcingLogout.value = false
  }
}

const bulkForceLogoutTargets = ref<AdminUser[] | null>(null)
const forcingBulkLogout = ref(false)
let clearSelection: (() => void) | null = null
function onBulkForceLogoutClick(selected: AdminUser[], clear: () => void) {
  bulkForceLogoutTargets.value = selected
  clearSelection = clear
}
async function onBulkForceLogoutConfirm() {
  if (!bulkForceLogoutTargets.value) return
  forcingBulkLogout.value = true
  try {
    await bulkForceLogout(bulkForceLogoutTargets.value.map((u) => u.id))
    toast.add({ title: `${bulkForceLogoutTargets.value.length} user(s) logged out`, color: 'success' })
    bulkForceLogoutTargets.value = null
    clearSelection?.()
    selectedUsers.value = []
  } catch (err) {
    toast.add({ title: 'Could not force logout selected users', description: apiErrorMessage(err), color: 'error' })
  } finally {
    forcingBulkLogout.value = false
  }
}
</script>

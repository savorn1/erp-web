<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">
        New department
      </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every department belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput
          v-model="search"
          placeholder="Search name"
          icon="i-lucide-search"
          class="w-56"
        />
        <USelect
          v-model="filter.companyId"
          :items="companyFilterOptions"
          placeholder="Company"
          class="w-48"
        />
        <USelect
          v-model="filter.active"
          :items="statusFilterOptions"
          placeholder="Status"
          class="w-36"
        />
        <UButton
          v-if="hasActiveFilter"
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="clearFilters"
        >
          Clear filters
        </UButton>
      </div>
    </UCard>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      class="mb-4"
      :title="error"
      icon="i-lucide-triangle-alert"
    />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="pagedRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="departments"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #name-data="{ row }">
          <span class="inline-flex items-center gap-1" :style="{ paddingLeft: `${depthOf(row) * 1.25}rem` }">
            <UIcon v-if="depthOf(row) > 0" name="i-lucide-corner-down-right" class="w-3 h-3 text-gray-400 shrink-0" />
            {{ row.name }}
          </span>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">
              Edit
            </UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-users" @click="openEmployees(row)">
              Employees
            </UButton>
            <UButton
              size="xs"
              :color="row.active ? 'neutral' : 'success'"
              variant="soft"
              :icon="row.active ? 'i-lucide-power-off' : 'i-lucide-power'"
              :loading="togglingId === row.id"
              @click="toggleStatus(row)"
            >
              {{ row.active ? 'Deactivate' : 'Activate' }}
            </UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No departments match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-sitemap" title="No departments yet" description="Create the first department to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New department</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New department" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="createDepartmentFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit department '${editingDepartment?.name ?? ''}'`" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="editDepartmentFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEmployees" :title="`Employees — ${employeesTarget?.name ?? ''}`" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned</p>
            <div v-if="loadingDepartmentUsers" class="text-sm text-gray-400">Loading…</div>
            <EmptyState v-else-if="departmentUsers.length === 0" icon="i-lucide-user-x" title="No employees assigned" />
            <ul v-else class="space-y-1.5">
              <li
                v-for="u in departmentUsers"
                :key="u.id"
                class="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-sm"
              >
                <span class="text-gray-700 dark:text-gray-300">{{ u.username }}</span>
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-x"
                  :loading="unassigningId === u.id"
                  @click="onUnassign(u)"
                >
                  Remove
                </UButton>
              </li>
            </ul>
          </div>

          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign more</p>
            <div class="flex gap-2">
              <USelectMenu
                v-model="selectedUserIdsToAssign"
                multiple
                :items="unassignedUserOptions"
                value-key="value"
                placeholder="Select users"
                class="flex-1"
              />
              <UButton
                :disabled="selectedUserIdsToAssign.length === 0"
                :loading="assigningEmployees"
                icon="i-lucide-user-plus"
                @click="onAssignSelected"
              >
                Assign
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete department"
      :description="`Delete department '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef, FieldDef } from '#shared/types'
import type { Department, DepartmentPayload } from '~/composables/useDepartments'
import type { AdminUser } from '~/composables/useUsers'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove, assignEmployees, unassignEmployee } = useDepartments()
const { list: listCompanies } = useCompanies()
const { list: listUsers } = useUsers()
const toast = useToast()

const rows = ref<Department[]>([])
const allDepartments = ref<Department[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const users = ref<AdminUser[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [companiesRes, usersRes] = await Promise.all([
      listCompanies({ size: 200 }),
      listUsers({ size: 200 })
    ])
    companies.value = companiesRes.data
    users.value = usersRes.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() =>
  companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
)
const companyFilterOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.map((c) => ({ label: c.name, value: c.id }))
])
const managerOptions = computed(() => users.value.map((u) => ({ label: u.username, value: u.id })))

function parentOptionsFor(companyId: number | undefined, excludeId?: number) {
  return allDepartments.value
    .filter((d) => d.companyId === companyId && d.active && d.id !== excludeId)
    .map((d) => ({ label: d.name, value: d.id }))
}

const departmentById = computed(() => new Map(allDepartments.value.map((d) => [d.id, d])))
function depthOf(department: Department): number {
  let depth = 0
  let current: Department | undefined = department
  const visited = new Set<number>()
  while (current?.parentDepartmentId != null && !visited.has(current.id)) {
    visited.add(current.id)
    const parent = departmentById.value.get(current.parentDepartmentId)
    if (!parent) break
    depth++
    current = parent
  }
  return depth
}

const filter = reactive<{ companyId: number | undefined; active: boolean | undefined }>({
  companyId: undefined,
  active: undefined
})
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({
  column: 'id',
  direction: 'desc'
})

const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, {
  pageSize: 10,
  searchFields: ['name']
})

const columns: ColumnDef<Department>[] = [
  { key: 'name', sortable: true },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'parentDepartmentName', label: 'Parent department', value: (row) => row.parentDepartmentName ?? 'Top-level' },
  { key: 'managerUsername', label: 'Manager', value: (row) => row.managerUsername ?? '—' },
  { key: 'employeeCount', label: 'Employees' },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [filteredRes, allRes] = await Promise.all([
      list({
        companyId: filter.companyId,
        active: filter.active,
        sortBy: sort.value?.column,
        sortOrder: sort.value?.direction,
        size: 200
      }),
      // Unfiltered, used to resolve hierarchy depth and parent-select options
      // regardless of which company/status filter the table itself is under.
      list({ size: 200 })
    ])
    rows.value = filteredRes.data
    allDepartments.value = allRes.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const createDepartmentFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true },
  {
    name: 'parentDepartmentId',
    label: 'Parent department',
    type: 'select',
    options: parentOptionsFor(createForm.value.companyId),
    hint: 'Optional — leave blank for a top-level department.'
  },
  {
    name: 'managerId',
    label: 'Department manager',
    type: 'select',
    options: managerOptions.value,
    hint: 'Optional — assign a user as this department\'s manager.'
  }
])

const editDepartmentFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true },
  {
    name: 'parentDepartmentId',
    label: 'Parent department',
    type: 'select',
    options: parentOptionsFor(editForm.value.companyId, editingDepartment.value?.id),
    hint: 'Optional — leave blank for a top-level department.'
  },
  {
    name: 'managerId',
    label: 'Department manager',
    type: 'select',
    options: managerOptions.value,
    hint: 'Optional — assign a user as this department\'s manager.'
  }
])

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
  editingRow: editingDepartment,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Department, DepartmentPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Department',
    createDefaults: () => ({}),
    toForm: (row) => ({
      companyId: row.companyId,
      name: row.name,
      parentDepartmentId: row.parentDepartmentId ?? undefined,
      managerId: row.managerId ?? undefined
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      name: values.name,
      parentDepartmentId: values.parentDepartmentId || undefined,
      managerId: values.managerId || undefined
    })
  }
)

const togglingId = ref<number | null>(null)
async function toggleStatus(row: Department) {
  togglingId.value = row.id
  try {
    await updateStatus(row.id, !row.active)
    toast.add({ title: row.active ? 'Department deactivated' : 'Department activated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not update status', description: apiErrorMessage(err), color: 'error' })
  } finally {
    togglingId.value = null
  }
}

const {
  open: showEmployees,
  target: employeesTarget,
  openWith: openEmployeesWith
} = useTargetModal<Department>()

const departmentUsers = ref<AdminUser[]>([])
const loadingDepartmentUsers = ref(false)
const selectedUserIdsToAssign = ref<number[]>([])
const assigningEmployees = ref(false)
const unassigningId = ref<number | null>(null)

async function loadDepartmentUsers() {
  if (!employeesTarget.value) return
  loadingDepartmentUsers.value = true
  try {
    const res = await listUsers({ departmentId: employeesTarget.value.id, size: 200 })
    departmentUsers.value = res.data
  } finally {
    loadingDepartmentUsers.value = false
  }
}

async function openEmployees(row: Department) {
  openEmployeesWith(row)
  selectedUserIdsToAssign.value = []
  await loadDepartmentUsers()
}

const unassignedUserOptions = computed(() => {
  const assignedIds = new Set(departmentUsers.value.map((u) => u.id))
  return users.value.filter((u) => !assignedIds.has(u.id)).map((u) => ({ label: u.username, value: u.id }))
})

async function onAssignSelected() {
  if (!employeesTarget.value || selectedUserIdsToAssign.value.length === 0) return
  assigningEmployees.value = true
  try {
    await assignEmployees(employeesTarget.value.id, selectedUserIdsToAssign.value)
    selectedUserIdsToAssign.value = []
    toast.add({ title: 'Employees assigned', color: 'success' })
    await loadDepartmentUsers()
    await load()
  } catch (err) {
    toast.add({ title: 'Could not assign employees', description: apiErrorMessage(err), color: 'error' })
  } finally {
    assigningEmployees.value = false
  }
}

async function onUnassign(user: AdminUser) {
  if (!employeesTarget.value) return
  unassigningId.value = user.id
  try {
    await unassignEmployee(employeesTarget.value.id, user.id)
    toast.add({ title: 'Employee removed', color: 'success' })
    await loadDepartmentUsers()
    await load()
  } catch (err) {
    toast.add({ title: 'Could not remove employee', description: apiErrorMessage(err), color: 'error' })
  } finally {
    unassigningId.value = null
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.active], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.active !== undefined)

function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.active = undefined
  load()
}
</script>

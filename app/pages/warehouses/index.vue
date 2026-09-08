<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Warehouses</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New warehouse </UButton>
    </div>

    <UAlert
      v-if="!loadingCompanies && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every warehouse belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-48" />
        <USelect v-model="filter.active" :items="statusFilterOptions" placeholder="Status" class="w-36" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
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
        export-filename="warehouses"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
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
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No warehouses match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-warehouse" title="No warehouses yet" description="Create the first warehouse to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New warehouse</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New warehouse" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="warehouseFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit warehouse '${editingWarehouse?.name ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="warehouseFields"
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
      title="Delete warehouse"
      :description="`Delete warehouse '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef, FieldDef } from '#shared/types'
import type { Warehouse, WarehousePayload } from '~/composables/useWarehouses'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove } = useWarehouses()
const { list: listCompanies } = useCompanies()
const { list: listUsers } = useUsers()
const toast = useToast()

const rows = ref<Warehouse[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingCompanies = ref(false)
const users = ref<{ id: number; username: string }[]>([])

async function loadLookups() {
  loadingCompanies.value = true
  try {
    const [companiesRes, usersRes] = await Promise.all([listCompanies({ size: 200 }), listUsers({ size: 200 })])
    companies.value = companiesRes.data
    users.value = usersRes.data
  } finally {
    loadingCompanies.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const managerOptions = computed(() => users.value.map((u) => ({ label: u.username, value: u.id })))
const timezoneOptions = Intl.supportedValuesOf('timeZone').map((tz) => ({ label: tz, value: tz }))

const filter = reactive<{ companyId: number | undefined; active: boolean | undefined }>({ companyId: undefined, active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<Warehouse>[] = [
  { key: 'name', sortable: true },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'managerUsername', label: 'Manager', value: (row) => row.managerUsername ?? '—' },
  { key: 'city', value: (row) => row.city ?? '—' },
  { key: 'zoneCount', label: 'Zones' },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      active: filter.active,
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

const warehouseFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true },
  {
    name: 'managerId',
    label: 'Warehouse manager',
    type: 'combobox',
    options: managerOptions.value,
    placeholder: 'Search users…',
    hint: "Optional — assign a user as this warehouse's manager."
  },
  { name: 'phone' },
  { name: 'email', type: 'email' },
  { name: 'timezone', type: 'combobox', options: timezoneOptions, placeholder: 'Search timezones…', hint: 'IANA timezone, e.g. Asia/Phnom_Penh.' },
  { name: 'addressLine1', label: 'Address line 1', wrapper: 'full' },
  { name: 'addressLine2', label: 'Address line 2', wrapper: 'full' },
  { name: 'city' },
  { name: 'state', label: 'State / province' },
  { name: 'postalCode', label: 'Postal code' },
  { name: 'country' }
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
  editingRow: editingWarehouse,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Warehouse, WarehousePayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Warehouse',
    createDefaults: () => ({}),
    toForm: (row) => ({
      companyId: row.companyId,
      name: row.name,
      managerId: row.managerId ?? undefined,
      phone: row.phone ?? '',
      email: row.email ?? '',
      timezone: row.timezone ?? '',
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      postalCode: row.postalCode ?? '',
      country: row.country ?? ''
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      name: values.name,
      managerId: values.managerId || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      timezone: values.timezone || undefined,
      addressLine1: values.addressLine1 || undefined,
      addressLine2: values.addressLine2 || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      postalCode: values.postalCode || undefined,
      country: values.country || undefined
    })
  }
)

const togglingId = ref<number | null>(null)
async function toggleStatus(row: Warehouse) {
  togglingId.value = row.id
  try {
    await updateStatus(row.id, !row.active)
    toast.add({ title: row.active ? 'Warehouse deactivated' : 'Warehouse activated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not update status', description: apiErrorMessage(err), color: 'error' })
  } finally {
    togglingId.value = null
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

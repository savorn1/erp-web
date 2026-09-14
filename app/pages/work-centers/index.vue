<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Work centers</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New work center </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first."
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

    <UCard>
      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
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
            title="No work centers match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-factory" title="No work centers yet" description="Create the first work center to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New work center</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New work center" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm v-model="createForm" :fields="workCenterFields" :loading="creating" :error="createError" submit-label="Create" cancelable
          @submit="onCreate" @cancel="showCreate = false" />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit work center '${editingWorkCenter?.name ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm v-model="editForm" :fields="workCenterFields" :loading="editing" :error="editError" submit-label="Save changes" cancelable
          @submit="onEdit" @cancel="showEdit = false" />
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete work center"
      :description="`Delete work center '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { WorkCenter, WorkCenterPayload } from '~/composables/useWorkCenters'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove } = useWorkCenters()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const toast = useToast()

const rows = ref<WorkCenter[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, w] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 })])
    companies.value = c.data
    warehouses.value = w.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const warehouseOptions = computed(() => warehouses.value.filter((w) => w.active).map((w) => ({ label: w.name, value: w.id })))

const filter = reactive<{ companyId: number | undefined; active: boolean | undefined }>({ companyId: undefined, active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<WorkCenter>[] = [
  { key: 'name', sortable: true },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'capacityPerHour', label: 'Capacity/hr', value: (row) => row.capacityPerHour ?? '—' },
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

const workCenterFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true },
  { name: 'code' },
  { name: 'warehouseId', label: 'Warehouse', type: 'select', options: warehouseOptions.value, hint: 'Optional — where this work center is located.' },
  { name: 'capacityPerHour', label: 'Capacity per hour', type: 'number', hint: 'Optional nominal throughput, e.g. units/hour.' },
  { name: 'description', type: 'textarea', wrapper: 'full' }
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
  editingRow: editingWorkCenter,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<WorkCenter, WorkCenterPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Work center',
    createDefaults: () => ({}),
    toForm: (row) => ({
      companyId: row.companyId,
      name: row.name,
      code: row.code ?? '',
      warehouseId: row.warehouseId ?? undefined,
      capacityPerHour: row.capacityPerHour ?? undefined,
      description: row.description ?? ''
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      name: values.name,
      code: values.code || undefined,
      warehouseId: values.warehouseId || undefined,
      capacityPerHour: values.capacityPerHour || undefined,
      description: values.description || undefined
    })
  }
)

const togglingId = ref<number | null>(null)
async function toggleStatus(row: WorkCenter) {
  togglingId.value = row.id
  try {
    await updateStatus(row.id, !row.active)
    toast.add({ title: row.active ? 'Work center deactivated' : 'Work center activated', color: 'success' })
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

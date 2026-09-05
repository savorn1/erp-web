<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Shelves / bins</h1>
      <UButton icon="i-lucide-plus" :disabled="zoneOptions.length === 0" @click="openCreate"> New bin </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && zoneOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active zones yet"
      description="Create a warehouse zone first — every bin belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
        <USelect
          v-model="filter.warehouseId"
          :items="warehouseFilterOptions"
          placeholder="Warehouse"
          class="w-44"
          @update:model-value="filter.zoneId = undefined"
        />
        <USelect v-model="filter.zoneId" :items="zoneFilterOptions" placeholder="Zone" class="w-40" />
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
        export-filename="warehouse-bins"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No bins match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-package-2" title="No bins yet" description="Create the first shelf/bin to get started.">
            <template #action>
              <UButton :disabled="zoneOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New bin</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New bin">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="createBinFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit bin '${editingBin?.name ?? ''}'`">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="editBinFields"
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
      title="Delete bin"
      :description="`Delete bin '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { WarehouseBin, WarehouseBinPayload } from '~/composables/useWarehouseBins'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useWarehouseBins()
const { list: listWarehouses } = useWarehouses()
const { list: listZones } = useWarehouseZones()

const rows = ref<WarehouseBin[]>([])
const loading = ref(false)
const error = ref('')

const warehouses = ref<{ id: number; name: string; active: boolean }[]>([])
const zones = ref<{ id: number; name: string; warehouseId: number; active: boolean }[]>([])
const loadingLookups = ref(false)
async function loadLookups() {
  loadingLookups.value = true
  try {
    const [w, z] = await Promise.all([listWarehouses({ size: 200 }), listZones({ size: 200 })])
    warehouses.value = w.data
    zones.value = z.data
  } finally {
    loadingLookups.value = false
  }
}
const zoneOptions = computed(() => zones.value.filter((z) => z.active).map((z) => ({ label: z.name, value: z.id })))
function zoneOptionsFor(warehouseId: number | undefined) {
  return zones.value.filter((z) => z.active && (warehouseId === undefined || z.warehouseId === warehouseId)).map((z) => ({ label: z.name, value: z.id }))
}
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])
const zoneFilterOptions = computed(() => [{ label: 'All zones', value: undefined }, ...zoneOptionsFor(filter.warehouseId)])

const filter = reactive<{ warehouseId: number | undefined; zoneId: number | undefined; active: boolean | undefined }>({
  warehouseId: undefined,
  zoneId: undefined,
  active: undefined
})
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<WarehouseBin>[] = [
  { key: 'name', sortable: true },
  { key: 'zoneName', label: 'Zone', value: (row) => row.zoneName ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ zoneId: filter.zoneId, active: filter.active, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    // Bins only store zoneId server-side — a warehouse-only filter (no
    // specific zone chosen) is applied client-side using warehouseId, which
    // the response already resolves through the zone.
    rows.value = filter.warehouseId !== undefined ? res.data.filter((b) => b.warehouseId === filter.warehouseId) : res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const createBinFields = computed<FieldDef[]>(() => [
  {
    name: 'warehouseId',
    label: 'Warehouse',
    type: 'select',
    required: true,
    options: warehouses.value.filter((w) => w.active).map((w) => ({ label: w.name, value: w.id }))
  },
  { name: 'zoneId', label: 'Zone', type: 'select', required: true, options: zoneOptionsFor(createForm.value?.warehouseId) },
  { name: 'name', hint: 'e.g. A-01-03, or a plain label like "Bin 12".', required: true },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive', default: true }
])
const editBinFields = computed<FieldDef[]>(() => [
  {
    name: 'warehouseId',
    label: 'Warehouse',
    type: 'select',
    required: true,
    options: warehouses.value.filter((w) => w.active).map((w) => ({ label: w.name, value: w.id }))
  },
  { name: 'zoneId', label: 'Zone', type: 'select', required: true, options: zoneOptionsFor(editForm.value?.warehouseId) },
  { name: 'name', required: true },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive' }
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
  editingRow: editingBin,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<WarehouseBin, WarehouseBinPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Bin',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({ warehouseId: row.warehouseId ?? undefined, zoneId: row.zoneId, name: row.name, active: row.active }),
    toPayload: (values) => ({ zoneId: values.zoneId, name: values.name, active: values.active ?? true })
  }
)

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.warehouseId, filter.zoneId, filter.active], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.warehouseId !== undefined || filter.zoneId !== undefined || filter.active !== undefined)
function clearFilters() {
  search.value = ''
  filter.warehouseId = undefined
  filter.zoneId = undefined
  filter.active = undefined
  load()
}
</script>

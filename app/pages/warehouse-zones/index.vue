<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Warehouse zones</h1>
      <UButton icon="i-lucide-plus" :disabled="warehouseOptions.length === 0" @click="openCreate">
        New zone
      </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && warehouseOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active warehouses yet"
      description="Create a warehouse first — every zone belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-48" />
        <USelect v-model="filter.active" :items="statusFilterOptions" placeholder="Status" class="w-36" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters">
          Clear filters
        </UButton>
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
        export-filename="warehouse-zones"
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
            title="No zones match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-layout-grid" title="No zones yet" description="Create the first zone to get started.">
            <template #action>
              <UButton :disabled="warehouseOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New zone</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New zone">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="formFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit zone '${editingZone?.name ?? ''}'`">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="formFields"
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
      title="Delete zone"
      :description="`Delete zone '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { WarehouseZone, WarehouseZonePayload } from '~/composables/useWarehouseZones'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useWarehouseZones()
const { list: listWarehouses } = useWarehouses()

const rows = ref<WarehouseZone[]>([])
const loading = ref(false)
const error = ref('')

const warehouses = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)
async function loadLookups() {
  loadingLookups.value = true
  try {
    warehouses.value = (await listWarehouses({ size: 200 })).data
  } finally {
    loadingLookups.value = false
  }
}
const warehouseOptions = computed(() => warehouses.value.filter((w) => w.active).map((w) => ({ label: w.name, value: w.id })))
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])

const filter = reactive<{ warehouseId: number | undefined; active: boolean | undefined }>({ warehouseId: undefined, active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<WarehouseZone>[] = [
  { key: 'name', sortable: true },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'description', value: (row) => row.description ?? '—' },
  { key: 'binCount', label: 'Bins' },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ warehouseId: filter.warehouseId, active: filter.active, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const formFields = computed<FieldDef[]>(() => [
  { name: 'warehouseId', label: 'Warehouse', type: 'select', required: true, options: warehouseOptions.value },
  { name: 'name', required: true },
  { name: 'description', type: 'textarea', wrapper: 'full' },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive', default: true }
])

const {
  showCreate, creating, error: createError, createForm, openCreate, onCreate,
  showEdit, editing, editError, editingRow: editingZone, editForm, openEdit, onEdit,
  deleting, confirmDelete, onDelete
} = useCrudModals<WarehouseZone, WarehouseZonePayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Zone',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({ warehouseId: row.warehouseId, name: row.name, description: row.description ?? '', active: row.active }),
    toPayload: (values) => ({
      warehouseId: values.warehouseId,
      name: values.name,
      description: values.description || undefined,
      active: values.active ?? true
    })
  }
)

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.warehouseId, filter.active], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.warehouseId !== undefined || filter.active !== undefined)
function clearFilters() {
  search.value = ''
  filter.warehouseId = undefined
  filter.active = undefined
  load()
}
</script>

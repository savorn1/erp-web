<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Units of measure</h1>
      <UButton icon="i-lucide-plus" @click="openCreate"> New unit </UButton>
    </div>

    <UAlert
      color="info"
      variant="subtle"
      class="mb-4"
      title="Conversion factors moved"
      description="Set how a non-base unit converts to its category's base unit on the UOM conversions page — this page only manages the unit itself."
      icon="i-lucide-info"
    >
      <template #actions>
        <UButton to="/uom-conversions" size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-arrow-right">Go to UOM conversions</UButton>
      </template>
    </UAlert>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
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
        export-filename="units-of-measure"
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
            title="No units match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-ruler" title="No units yet" description="Create the first unit of measure to get started.">
            <template #action>
              <UButton icon="i-lucide-plus" @click="openCreate">New unit</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New unit of measure">
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

    <UModal v-model:open="showEdit" :title="`Edit unit '${editingUnit?.name ?? ''}'`">
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
      title="Delete unit of measure"
      :description="`Delete unit '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { UnitOfMeasure, UnitOfMeasurePayload } from '~/composables/useUnitsOfMeasure'
import type { UomCategory } from '~/composables/useUomCategories'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useUnitsOfMeasure()
const { list: listUomCategories } = useUomCategories()

const rows = ref<UnitOfMeasure[]>([])
const loading = ref(false)
const error = ref('')

const uomCategories = ref<UomCategory[]>([])
async function loadLookups() {
  uomCategories.value = (await listUomCategories({ size: 200 })).data
}
const categoryOptions = computed(() => [
  { label: 'No category (standalone)', value: undefined },
  ...uomCategories.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])

const filter = reactive<{ active: boolean | undefined }>({ active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name', 'abbreviation'] })

const columns: ColumnDef<UnitOfMeasure>[] = [
  { key: 'name', sortable: true },
  { key: 'abbreviation' },
  { key: 'categoryName', label: 'Category', value: (row) => row.categoryName ?? '—' },
  {
    key: 'baseUnit',
    label: 'Base unit',
    value: (row) => (row.categoryId ? (row.baseUnit ? 'Yes' : 'No') : '—')
  },
  { key: 'decimalAllowed', label: 'Decimals', type: 'boolean', trueLabel: 'Allowed', trueColor: 'neutral', falseLabel: 'Whole only', falseColor: 'neutral' },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ active: filter.active, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const formFields = computed<FieldDef[]>(() => [
  { name: 'name', required: true, hint: 'e.g. Kilogram, Piece, Liter.' },
  { name: 'abbreviation', required: true, hint: 'Short display form, e.g. kg, pcs, L.' },
  {
    name: 'categoryId',
    label: 'UOM category',
    type: 'select',
    options: categoryOptions.value,
    hint: 'Group with compatible units to enable conversion, e.g. Weight: kg/g/lb.'
  },
  {
    name: 'baseUnit',
    label: 'Base unit of category',
    type: 'switch',
    onLabel: 'Yes',
    offLabel: 'No',
    default: false,
    showIf: (v) => !!v.categoryId,
    hint: 'Setting this unsets whichever unit was previously the base for this category. Set conversion factors on the UOM conversions page.'
  },
  {
    name: 'decimalAllowed',
    label: 'Allow decimal quantities',
    type: 'switch',
    onLabel: 'Yes',
    offLabel: 'No',
    default: true,
    hint: 'Turn off for whole-number-only units like Piece or Box.'
  },
  { name: 'description', type: 'textarea', wrapper: 'full' },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive', default: true }
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
  editingRow: editingUnit,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<UnitOfMeasure, UnitOfMeasurePayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Unit of measure',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({
      name: row.name,
      abbreviation: row.abbreviation,
      description: row.description ?? '',
      decimalAllowed: row.decimalAllowed,
      categoryId: row.categoryId ?? undefined,
      baseUnit: row.baseUnit,
      active: row.active
    }),
    toPayload: (values) => ({
      name: values.name,
      abbreviation: values.abbreviation,
      description: values.description || undefined,
      decimalAllowed: values.decimalAllowed ?? true,
      categoryId: values.categoryId || undefined,
      baseUnit: values.categoryId ? (values.baseUnit ?? false) : false,
      active: values.active ?? true
    })
  }
)

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => filter.active, load)

const hasActiveFilter = computed(() => search.value !== '' || filter.active !== undefined)
function clearFilters() {
  search.value = ''
  filter.active = undefined
  load()
}
</script>

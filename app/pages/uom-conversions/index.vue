<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">UOM conversions</h1>
      <UButton icon="i-lucide-plus" @click="openCreate"> New conversion </UButton>
    </div>

    <UAlert
      color="info"
      variant="subtle"
      class="mb-4"
      title="Backs the units-of-measure conversion factor"
      description="Editing a unit's 'conversion factor to base' on the Units of measure page writes a row here. Manage extra direct conversions (e.g. Box ↔ Dozen) below."
      icon="i-lucide-info"
    />

    <UCard class="mb-4">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick convert</p>
      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model.number="calc.quantity" type="number" step="0.0001" class="w-28" />
        <USelect v-model="calc.fromUnitOfMeasureId" :items="unitOptionsFor(undefined)" placeholder="From unit" class="w-48" />
        <UIcon name="i-lucide-arrow-right" class="text-gray-400 shrink-0" />
        <USelect v-model="calc.toUnitOfMeasureId" :items="unitOptionsFor(undefined)" placeholder="To unit" class="w-48" />
        <UButton :loading="calculating" @click="onCalculate">Convert</UButton>
      </div>
      <p v-if="calcResult !== null" class="text-sm text-gray-900 dark:text-white mt-3">
        {{ calc.quantity }} {{ unitAbbr(calc.fromUnitOfMeasureId) }} =
        <span class="font-semibold">{{ calcResult }} {{ unitAbbr(calc.toUnitOfMeasureId) }}</span>
      </p>
      <UAlert v-if="calcError" color="error" variant="subtle" class="mt-3" :title="calcError" />
    </UCard>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
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
        export-filename="uom-conversions"
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
            title="No conversions match your filters"
            description="Try a different filter or clear it."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState
            v-else
            icon="i-lucide-arrow-left-right"
            title="No UOM conversions yet"
            description="Setting a non-base unit's conversion factor on the Units of measure page will create one automatically."
          >
            <template #action>
              <UButton icon="i-lucide-plus" @click="openCreate">New conversion</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New UOM conversion">
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

    <UModal v-model:open="showEdit" title="Edit UOM conversion">
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
      title="Delete UOM conversion"
      :description="`Delete conversion from '${confirmDelete?.fromUnitOfMeasureName ?? ''}' to '${confirmDelete?.toUnitOfMeasureName ?? ''}'? This cannot be undone.`"
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
import type { UomConversion, UomConversionPayload } from '~/composables/useUomConversions'
import type { UnitOfMeasure } from '~/composables/useUnitsOfMeasure'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove, convert } = useUomConversions()
const { list: listUnits } = useUnitsOfMeasure()

const rows = ref<UomConversion[]>([])
const loading = ref(false)
const error = ref('')

const units = ref<UnitOfMeasure[]>([])
async function loadLookups() {
  units.value = (await listUnits({ size: 500 })).data
}

function unitOptionsFor(categoryId: number | null | undefined, excludeId?: number) {
  return units.value
    .filter((u) => u.active && u.categoryId && (categoryId ? u.categoryId === categoryId : true) && u.id !== excludeId)
    .map((u) => ({ label: `${u.name} (${u.abbreviation})`, value: u.id }))
}
function unitAbbr(id: number | undefined) {
  return id === undefined ? '' : (units.value.find((u) => u.id === id)?.abbreviation ?? '')
}

const calc = reactive<{ fromUnitOfMeasureId: number | undefined; toUnitOfMeasureId: number | undefined; quantity: number | undefined }>({
  fromUnitOfMeasureId: undefined,
  toUnitOfMeasureId: undefined,
  quantity: 1
})
const calcResult = ref<number | null>(null)
const calcError = ref('')
const calculating = ref(false)
async function onCalculate() {
  calcError.value = ''
  calcResult.value = null
  if (!calc.fromUnitOfMeasureId || !calc.toUnitOfMeasureId || calc.quantity === undefined) {
    calcError.value = 'Pick both units and a quantity'
    return
  }
  calculating.value = true
  try {
    const res = await convert({ fromUnitOfMeasureId: calc.fromUnitOfMeasureId, toUnitOfMeasureId: calc.toUnitOfMeasureId, quantity: calc.quantity })
    calcResult.value = res.convertedQuantity
  } catch (err) {
    calcError.value = apiErrorMessage(err)
  } finally {
    calculating.value = false
  }
}

const filter = reactive<{ active: boolean | undefined }>({ active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated } = useClientTable(rows, { pageSize: 10, searchFields: [] })

const columns: ColumnDef<UomConversion>[] = [
  { key: 'fromUnitOfMeasureName', label: 'From', value: (row) => `${row.fromUnitOfMeasureName} (${row.fromUnitOfMeasureAbbreviation})` },
  { key: 'toUnitOfMeasureName', label: 'To', value: (row) => `${row.toUnitOfMeasureName} (${row.toUnitOfMeasureAbbreviation})` },
  { key: 'conversionFactor', label: 'Factor', type: 'number' },
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

const activeFormTarget = ref<'create' | 'edit'>('create')
const currentFormFromUnitId = computed(() =>
  activeFormTarget.value === 'create' ? createForm.value?.fromUnitOfMeasureId : editForm.value?.fromUnitOfMeasureId
)
const currentFromCategoryId = computed(() => units.value.find((u) => u.id === currentFormFromUnitId.value)?.categoryId ?? undefined)

const formFields = computed<FieldDef[]>(() => [
  {
    name: 'fromUnitOfMeasureId',
    label: 'From unit',
    type: 'select',
    required: true,
    options: unitOptionsFor(undefined),
    hint: 'Only units already assigned to a UOM category can be converted.'
  },
  {
    name: 'toUnitOfMeasureId',
    label: 'To unit',
    type: 'select',
    required: true,
    options: unitOptionsFor(currentFromCategoryId.value, currentFormFromUnitId.value),
    hint: 'Must be in the same UOM category as the from unit.'
  },
  {
    name: 'conversionFactor',
    label: 'Conversion factor',
    type: 'number',
    required: true,
    min: 0.000001,
    step: 0.000001,
    hint: '1 unit of "From" equals this many units of "To".'
  },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive', default: true }
])

const {
  showCreate,
  creating,
  error: createError,
  createForm,
  openCreate: openCreateModal,
  onCreate,
  showEdit,
  editing,
  editError,
  editForm,
  openEdit: openEditModal,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<UomConversion, UomConversionPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'UOM conversion',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({
      fromUnitOfMeasureId: row.fromUnitOfMeasureId,
      toUnitOfMeasureId: row.toUnitOfMeasureId,
      conversionFactor: row.conversionFactor,
      active: row.active
    }),
    toPayload: (values) => ({
      fromUnitOfMeasureId: values.fromUnitOfMeasureId,
      toUnitOfMeasureId: values.toUnitOfMeasureId,
      conversionFactor: values.conversionFactor,
      active: values.active ?? true
    })
  }
)

function openCreate() {
  activeFormTarget.value = 'create'
  openCreateModal()
}
function openEdit(row: UomConversion) {
  activeFormTarget.value = 'edit'
  openEditModal(row)
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => filter.active, load)

const hasActiveFilter = computed(() => filter.active !== undefined)
function clearFilters() {
  filter.active = undefined
  load()
}
</script>

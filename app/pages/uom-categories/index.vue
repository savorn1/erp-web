<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">UOM categories</h1>
      <div class="flex items-center gap-2">
        <UButton
          v-if="filter.companyId"
          color="neutral"
          variant="soft"
          icon="i-lucide-sparkles"
          :loading="seeding"
          @click="onSeedStandard"
        >
          Seed standard categories
        </UButton>
        <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New category </UButton>
      </div>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every UOM category belongs to one."
      icon="i-lucide-triangle-alert"
    />
    <UAlert
      v-else-if="!filter.companyId"
      color="info"
      variant="subtle"
      class="mb-4"
      title="Pick a company to seed standard categories"
      description="Quantity (PCS, Box, Carton), Weight (KG, Gram, Ton), Volume (L, Milliliter), Length (M, Centimeter), and Area (M2) — filter by a company above to add them with one click. Box/Carton are seeded without a fixed conversion factor, since pack size varies by product."
      icon="i-lucide-info"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search code or name" icon="i-lucide-search" class="w-56" />
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
        export-filename="uom-categories"
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
            title="No categories match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState
            v-else
            icon="i-lucide-shapes"
            title="No UOM categories yet"
            description="Group compatible units (e.g. Weight: kg/g/lb) so they can be converted between each other."
          >
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New category</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New UOM category">
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

    <UModal v-model:open="showEdit" :title="`Edit category '${editingCategory?.name ?? ''}'`">
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
      title="Delete UOM category"
      :description="`Delete category '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { UomCategory, UomCategoryPayload } from '~/composables/useUomCategories'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove, seedStandard } = useUomCategories()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<UomCategory[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)
async function loadLookups() {
  loadingLookups.value = true
  try {
    companies.value = (await listCompanies({ size: 200 })).data
  } finally {
    loadingLookups.value = false
  }
}
const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])

const filter = reactive<{ companyId: number | undefined; active: boolean | undefined }>({ companyId: undefined, active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['code', 'name'] })

const columns: ColumnDef<UomCategory>[] = [
  { key: 'code', value: (row) => row.code ?? '—' },
  { key: 'name', sortable: true },
  {
    key: 'baseUnitName',
    label: 'Base unit',
    value: (row) => (row.baseUnitAbbreviation ? `${row.baseUnitName} (${row.baseUnitAbbreviation})` : '—')
  },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ companyId: filter.companyId, active: filter.active, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const formFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'code', required: true, hint: 'Short, stable key, e.g. WEIGHT.' },
  { name: 'name', required: true, hint: 'e.g. Weight, Volume, Count.' },
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
  editingRow: editingCategory,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<UomCategory, UomCategoryPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'UOM category',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({ companyId: row.companyId, code: row.code ?? '', name: row.name, description: row.description ?? '', active: row.active }),
    toPayload: (values) => ({
      companyId: values.companyId,
      code: values.code,
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
watch(() => [filter.companyId, filter.active], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.active !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.active = undefined
  load()
}

const seeding = ref(false)
async function onSeedStandard() {
  if (!filter.companyId) return
  seeding.value = true
  try {
    await seedStandard(filter.companyId)
    toast.add({ title: 'Standard UOM categories created', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not seed categories', description: apiErrorMessage(err), color: 'error' })
  } finally {
    seeding.value = false
  }
}
</script>

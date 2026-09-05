<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Product prices</h1>
      <div class="flex items-center gap-2">
        <UButton to="/product-prices/matrix" size="sm" color="neutral" variant="soft" icon="i-lucide-table-2">Matrix view</UButton>
        <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New price override </UButton>
      </div>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every price override belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search product or price group" icon="i-lucide-search" class="w-64" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-48" />
        <USelect v-model="filter.priceGroupId" :items="priceGroupFilterOptions" placeholder="Price group" class="w-48" />
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
        export-filename="product-prices"
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
            title="No price overrides match your filters"
            description="Try a different filter or clear it."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-tag" title="No price overrides yet" description="Create the first per-product price override to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New price override</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New price override">
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

    <UModal v-model:open="showEdit" :title="`Edit price override for '${editingPrice?.productName ?? ''}'`">
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
      title="Delete price override"
      :description="`Delete the price override for '${confirmDelete?.productName ?? ''}' in '${confirmDelete?.priceGroupName ?? ''}'? This cannot be undone.`"
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
import type { ProductPrice, ProductPricePayload } from '~/composables/useProductPrices'
import type { PriceGroup } from '~/composables/usePriceGroups'
import type { Product } from '~/composables/useProducts'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useProductPrices()
const { list: listCompanies } = useCompanies()
const { list: listPriceGroups } = usePriceGroups()
const { list: listProducts } = useProducts()

const rows = ref<ProductPrice[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const priceGroups = ref<PriceGroup[]>([])
const products = ref<Product[]>([])
const loadingLookups = ref(false)
async function loadLookups() {
  loadingLookups.value = true
  try {
    companies.value = (await listCompanies({ size: 200 })).data
    priceGroups.value = (await listPriceGroups({ active: true, size: 200 })).data
    products.value = (await listProducts({ size: 500 })).data
  } finally {
    loadingLookups.value = false
  }
}
const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const priceGroupFilterOptions = computed(() => [
  { label: 'All price groups', value: undefined },
  ...priceGroups.value.map((g) => ({ label: g.name, value: g.id }))
])
function priceGroupOptionsFor(companyId: number | undefined) {
  return priceGroups.value.filter((g) => g.companyId === companyId).map((g) => ({ label: g.name, value: g.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value.filter((p) => p.companyId === companyId).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

const filter = reactive<{ companyId: number | undefined; priceGroupId: number | undefined }>({ companyId: undefined, priceGroupId: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['productName', 'priceGroupName'] })

const columns: ColumnDef<ProductPrice>[] = [
  { key: 'productName', label: 'Product', sortable: true, value: (row) => `${row.productName ?? '—'}${row.productSku ? ` (${row.productSku})` : ''}` },
  { key: 'priceGroupName', label: 'Price group', value: (row) => row.priceGroupName ?? '—' },
  { key: 'price', type: 'currency' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      priceGroupId: filter.priceGroupId,
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

const activeFormTarget = ref<'create' | 'edit'>('create')
const currentFormCompanyId = computed(() => (activeFormTarget.value === 'create' ? createForm.value?.companyId : editForm.value?.companyId))

const formFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'productId', label: 'Product', type: 'select', required: true, options: productOptionsFor(currentFormCompanyId.value) },
  { name: 'priceGroupId', label: 'Price group', type: 'select', required: true, options: priceGroupOptionsFor(currentFormCompanyId.value) },
  { name: 'price', label: 'Price', type: 'currency', required: true }
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
  editingRow: editingPrice,
  editForm,
  openEdit: openEditModal,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<ProductPrice, ProductPricePayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Product price',
    createDefaults: () => ({}),
    toForm: (row) => ({ companyId: row.companyId, productId: row.productId, priceGroupId: row.priceGroupId, price: row.price }),
    toPayload: (values) => ({ companyId: values.companyId, productId: values.productId, priceGroupId: values.priceGroupId, price: values.price })
  }
)

function openCreate() {
  activeFormTarget.value = 'create'
  openCreateModal()
}
function openEdit(row: ProductPrice) {
  activeFormTarget.value = 'edit'
  openEditModal(row)
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.priceGroupId], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.priceGroupId !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.priceGroupId = undefined
  load()
}
</script>

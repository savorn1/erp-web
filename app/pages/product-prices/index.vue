<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Product prices</h1>
      <div class="flex items-center gap-2">
        <UButton to="/product-prices/matrix" size="sm" color="neutral" variant="soft" icon="i-lucide-table-2">Matrix view</UButton>
        <UButton icon="i-lucide-plus" @click="openCreate"> New price override </UButton>
      </div>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search product or price group" icon="i-lucide-search" class="w-64" />
        <!-- Server-side, unlike the search box next to it: that one filters
             only the page already fetched, so a product beyond the first 200
             rows can't be found with it. This narrows the query itself. -->
        <USelectMenu
          v-model="filter.productId"
          :items="productFilterOptions"
          value-key="value"
          placeholder="Any product"
          icon="i-lucide-package"
          class="w-60"
        />
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
              <UButton icon="i-lucide-plus" @click="openCreate">New price override</UButton>
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
import { priceDelta } from '#shared/utils/priceDelta'
import type { ColumnDef, FieldDef } from '#shared/types'
import type { ProductPrice, ProductPricePayload } from '~/composables/useProductPrices'
import type { PriceGroup } from '~/composables/usePriceGroups'
import type { Product } from '~/composables/useProducts'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useProductPrices()
const { list: listPriceGroups } = usePriceGroups()
const { list: listProducts } = useProducts()
const { list: listProductUoms } = useProductUoms()

const rows = ref<ProductPrice[]>([])
const loading = ref(false)
const error = ref('')

const priceGroups = ref<PriceGroup[]>([])
const products = ref<Product[]>([])
// Caught rather than allowed to reject: onMounted awaits this before load(),
// so an unhandled failure here left the page empty with no error and no
// spinner — looking exactly like "there are no overrides".
async function loadLookups() {
  try {
    const [groupRes, productRes] = await Promise.all([listPriceGroups({ active: true, size: 200 }), listProducts({ size: 500 })])
    priceGroups.value = groupRes.data
    products.value = productRes.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

// List prices come from the already-loaded product list, so the comparison
// column costs no extra request.
const productById = computed(() => new Map(products.value.map((p) => [p.id, p])))
const priceGroupFilterOptions = computed(() => [
  { label: 'All price groups', value: undefined },
  ...priceGroups.value.map((g) => ({ label: g.name, value: g.id }))
])
// The group's own default discount decides whether a per-product override is
// even needed, so it belongs on the option rather than only on the matrix.
const priceGroupOptions = computed(() =>
  priceGroups.value.map((g) => ({
    label: g.discountPercent == null ? g.name : `${g.name} (−${g.discountPercent}% default)`,
    value: g.id
  }))
)
const productOptions = computed(() => products.value.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id })))
const productFilterOptions = computed(() => [{ label: 'Any product', value: undefined }, ...productOptions.value])

const filter = reactive<{ productId: number | undefined; priceGroupId: number | undefined }>({ productId: undefined, priceGroupId: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['productName', 'priceGroupName'] })

const columns: ColumnDef<ProductPrice>[] = [
  { key: 'productName', label: 'Product', sortable: true, value: (row) => `${row.productName ?? '—'}${row.productSku ? ` (${row.productSku})` : ''}` },
  { key: 'priceGroupName', label: 'Price group', value: (row) => row.priceGroupName ?? '—' },
  // Suffixed with the base unit: the price is per one of those, and an order
  // line in a larger unit multiplies by its conversion factor. A bare number
  // here reads as "the price", which is only true at factor 1.
  // The unit this row prices. A per-unit row is used as-is on an order line,
  // while a base row gets multiplied by the line's conversion factor — the
  // same number means different money depending on which this is.
  {
    key: 'unitOfMeasureAbbreviation',
    label: 'Unit',
    value: (row) => `${row.unitOfMeasureAbbreviation ?? '—'}${row.perUnitPrice ? '' : ' (base)'}`
  },
  { key: 'price', label: 'Price', type: 'currency', suffix: (row) => (row.unitOfMeasureAbbreviation ? ` / ${row.unitOfMeasureAbbreviation}` : '') },
  // The list price this overrides, and by how much. An override is only
  // meaningful relative to the price it replaces, and without this you can't
  // tell a 5% trade discount from a 50% one — or spot a row priced *above*
  // list, which is a typo rather than a policy.
  {
    key: 'listPrice',
    label: 'List',
    type: 'currency',
    value: (row) => (row.perUnitPrice ? null : (productById.value.get(row.productId)?.sellingPrice ?? null))
  },
  {
    key: 'vsList',
    label: 'vs list',
    value: (row) => deltaFor(row).label,
    class: (row) => (deltaFor(row).aboveList ? 'text-error-600 dark:text-error-400 font-medium' : 'text-gray-500 dark:text-gray-400')
  },
  { key: 'actions', label: '' }
]

// Only comparable for base-unit rows: the product's sellingPrice is per base
// unit, so a per-case price measured against it would read as a huge premium
// when it is really a bulk discount.
function deltaFor(row: ProductPrice) {
  if (row.perUnitPrice) return { percent: null, label: '—', aboveList: false }
  return priceDelta(row.price, productById.value.get(row.productId)?.sellingPrice)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      productId: filter.productId,
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

const formFields = computed<FieldDef[]>(() => [
  // combobox, not select: there are up to 500 products here and a plain
  // dropdown makes you scroll for the one you want.
  {
    name: 'productId',
    label: 'Product',
    type: 'combobox',
    required: true,
    options: productOptions.value,
    placeholder: 'Search products…'
  },
  { name: 'priceGroupId', label: 'Price group', type: 'select', required: true, options: priceGroupOptions.value },
  {
    name: 'unitOfMeasureId',
    label: 'Unit',
    type: 'select',
    options: unitOptionsForSelectedProduct.value,
    hint: 'Base unit unless you are pricing a larger unit outright — a case price is used as typed, not multiplied.'
  },
  {
    name: 'price',
    label: 'Price',
    type: 'currency',
    required: true,
    // The list price this replaces, and the unit it is per — both decide
    // whether the number being typed is right, and neither is otherwise on
    // screen while the modal is open.
    hint: selectedProductPriceHint.value
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
  editingRow: editingPrice,
  editForm,
  openEdit,
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
    toForm: (row) => ({ productId: row.productId, priceGroupId: row.priceGroupId, unitOfMeasureId: row.unitOfMeasureId ?? undefined, price: row.price }),
    toPayload: (values) => ({
      productId: values.productId,
      priceGroupId: values.priceGroupId,
      unitOfMeasureId: values.unitOfMeasureId ?? undefined,
      price: values.price
    })
  }
)

// Which product the open form is pointing at — drives both the unit list and
// the price hint below.
const selectedProductId = computed(() => {
  const raw = showEdit.value ? editForm.value?.productId : createForm.value?.productId
  return raw == null ? undefined : Number(raw)
})

// Sales-allowed UOMs, fetched per product the first time it is selected.
// allowSales rather than allowInventory: this is a selling price.
const productUomOptions = ref<Record<number, { label: string; value: number }[]>>({})
async function ensureProductUomOptions(productId: number) {
  if (productUomOptions.value[productId]) return
  try {
    const uoms = await listProductUoms(productId)
    productUomOptions.value[productId] = uoms
      .filter((u) => u.active && u.allowSales && !u.baseUnit)
      .map((u) => ({ label: `${u.unitOfMeasureAbbreviation ?? ''} (×${u.conversionFactor})`, value: u.unitOfMeasureId }))
  } catch {
    productUomOptions.value[productId] = []
  }
}
watch(selectedProductId, (id) => {
  if (id != null) ensureProductUomOptions(id)
})

// `undefined` is the base unit — the backend normalises it to a null column
// so there is only ever one row representing the base price.
const unitOptionsForSelectedProduct = computed(() => {
  const product = selectedProductId.value == null ? undefined : productById.value.get(selectedProductId.value)
  const base = { label: `${product?.unitOfMeasureAbbreviation ?? 'Base unit'} — base`, value: undefined }
  return [base, ...(selectedProductId.value == null ? [] : (productUomOptions.value[selectedProductId.value] ?? []))]
})

// Declared after useCrudModals because it reads the open form. Both this and
// formFields are lazy computeds, so the forward reference in formFields only
// resolves at render time, by which point these exist.
const selectedProductPriceHint = computed(() => {
  const product = selectedProductId.value == null ? undefined : productById.value.get(selectedProductId.value)
  if (!product) return 'Overrides the product’s own selling price for this price group.'
  const baseUnit = product.unitOfMeasureAbbreviation ?? 'base unit'
  const chosenUnitId = showEdit.value ? editForm.value?.unitOfMeasureId : createForm.value?.unitOfMeasureId
  if (chosenUnitId != null) {
    const label = productUomOptions.value[product.id]?.find((o) => o.value === Number(chosenUnitId))?.label
    return `Per one ${label ?? 'unit'} — entered as-is, not multiplied by the conversion factor.`
  }
  return `List price ${product.sellingPrice.toFixed(2)} / ${baseUnit}. Enter the tier price per ${baseUnit}.`
})

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.productId, filter.priceGroupId], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.productId !== undefined || filter.priceGroupId !== undefined)
function clearFilters() {
  search.value = ''
  filter.productId = undefined
  filter.priceGroupId = undefined
  load()
}
</script>

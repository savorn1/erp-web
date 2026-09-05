<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New product </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every product belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name or SKU" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.categoryId" :items="categoryFilterOptions" placeholder="Category" class="w-44" />
        <USelect v-model="filter.brandId" :items="brandFilterOptions" placeholder="Brand" class="w-40" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-36" />
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
        export-filename="products"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #image-data="{ row }">
          <img v-if="row.imageUrl" :src="row.imageUrl" :alt="row.name" class="w-9 h-9 rounded object-cover border border-gray-200 dark:border-gray-800" />
          <span v-else class="flex items-center justify-center w-9 h-9 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            <UIcon name="i-lucide-package" class="w-4 h-4" />
          </span>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UDropdownMenu :items="statusMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Status</UButton>
            </UDropdownMenu>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No products match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-package" title="No products yet" description="Create the first product to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New product</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New product" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <ProductImagePicker
          :image-url="createForm.imageUrl"
          :loading="uploadingImage"
          @pick="triggerImageUpload('create')"
          @remove="createForm.imageUrl = ''"
        />
        <DynamicForm
          v-model="createForm"
          :fields="productFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit product '${editingProduct?.name ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <ProductImagePicker :image-url="editForm.imageUrl" :loading="uploadingImage" @pick="triggerImageUpload('edit')" @remove="editForm.imageUrl = ''" />
        <DynamicForm
          v-model="editForm"
          :fields="productFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="onImageFileChange" />

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete product"
      :description="`Delete product '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { Product, ProductPayload, ProductStatus } from '~/composables/useProducts'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove } = useProducts()
const { list: listCompanies } = useCompanies()
const { list: listCategories } = useProductCategories()
const { list: listBrands } = useProductBrands()
const { list: listTypes } = useProductTypes()
const { list: listUnits } = useUnitsOfMeasure()
const { list: listSuppliers } = useSuppliers()
const { upload: uploadFile } = useAssetUpload()
const toast = useToast()

const rows = ref<Product[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const categories = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const brands = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const types = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const units = ref<{ id: number; name: string; abbreviation: string; companyId: number; active: boolean }[]>([])
const suppliers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, cat, b, t, u, s] = await Promise.all([
      listCompanies({ size: 200 }),
      listCategories({ size: 200 }),
      listBrands({ size: 200 }),
      listTypes({ size: 200 }),
      listUnits({ size: 200 }),
      listSuppliers({ size: 200 })
    ])
    companies.value = c.data
    categories.value = cat.data
    brands.value = b.data
    types.value = t.data
    units.value = u.data
    suppliers.value = s.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const categoryFilterOptions = computed(() => [{ label: 'All categories', value: undefined }, ...categories.value.map((c) => ({ label: c.name, value: c.id }))])
const brandFilterOptions = computed(() => [{ label: 'All brands', value: undefined }, ...brands.value.map((b) => ({ label: b.name, value: b.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Discontinued', value: 'DISCONTINUED' }
]

function optionsFor(list: { id: number; name: string; companyId: number; active: boolean }[], companyId: number | undefined) {
  return list.filter((item) => item.active && (companyId === undefined || item.companyId === companyId)).map((item) => ({ label: item.name, value: item.id }))
}
function unitOptionsFor(companyId: number | undefined) {
  return units.value
    .filter((u) => u.active && (companyId === undefined || u.companyId === companyId))
    .map((u) => ({ label: `${u.name} (${u.abbreviation})`, value: u.id }))
}
function supplierOptionsFor(companyId: number | undefined) {
  return suppliers.value
    .filter((s) => s.status === 'ACTIVE' && (companyId === undefined || s.companyId === companyId))
    .map((s) => ({ label: s.name, value: s.id }))
}

const filter = reactive<{
  companyId: number | undefined
  categoryId: number | undefined
  brandId: number | undefined
  status: ProductStatus | undefined
}>({ companyId: undefined, categoryId: undefined, brandId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name', 'sku'] })

const columns: ColumnDef<Product>[] = [
  { key: 'image', label: '', class: 'w-12' },
  { key: 'name', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'categoryName', label: 'Category', value: (row) => row.categoryName ?? '—' },
  { key: 'unit', label: 'Unit', value: (row) => row.unitOfMeasureAbbreviation ?? '—' },
  { key: 'costPrice', label: 'Cost price', type: 'currency' },
  { key: 'sellingPrice', label: 'Selling price', type: 'currency' },
  { key: 'taxRate', label: 'Tax', type: 'percent' },
  { key: 'trackingType', label: 'Tracking', value: (row) => (row.trackingType === 'NONE' ? '—' : row.trackingType) },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      categoryId: filter.categoryId,
      brandId: filter.brandId,
      status: filter.status,
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

const productFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true, wrapper: 'full' },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'barcode' },
  { name: 'categoryId', label: 'Category', type: 'select', options: optionsFor(categories.value, currentFormCompanyId.value) },
  { name: 'brandId', label: 'Brand', type: 'select', options: optionsFor(brands.value, currentFormCompanyId.value) },
  { name: 'typeId', label: 'Type', type: 'select', options: optionsFor(types.value, currentFormCompanyId.value) },
  { name: 'unitOfMeasureId', label: 'Unit of measure', type: 'select', required: true, options: unitOptionsFor(currentFormCompanyId.value) },
  { name: 'supplierId', label: 'Supplier', type: 'select', options: supplierOptionsFor(currentFormCompanyId.value) },
  { name: 'costPrice', label: 'Cost price', type: 'currency', required: true },
  { name: 'sellingPrice', label: 'Selling price', type: 'currency', required: true },
  { name: 'taxRate', label: 'Tax rate', type: 'number', suffix: '%', min: 0, max: 100, default: 0 },
  {
    name: 'trackingType',
    label: 'Inventory tracking',
    type: 'select',
    default: 'NONE',
    options: [
      { label: 'None', value: 'NONE' },
      { label: 'Batch / lot', value: 'BATCH' },
      { label: 'Serial number', value: 'SERIAL' }
    ],
    hint: 'Determines what a goods receipt must capture when receiving this product.'
  },
  { name: 'description', type: 'textarea', wrapper: 'full' }
])

// Whichever form is currently open drives the category/brand/type/unit/supplier
// option lists below — DynamicForm re-renders when `productFields` changes, so
// switching a product's company narrows those selects to that company's data.
const activeFormTarget = ref<'create' | 'edit'>('create')
const currentFormCompanyId = computed(() => (activeFormTarget.value === 'create' ? createForm.value?.companyId : editForm.value?.companyId))

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
  editingRow: editingProduct,
  editForm,
  openEdit: openEditModal,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Product, ProductPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Product',
    createDefaults: () => ({ taxRate: 0 }),
    toForm: (row) => ({
      companyId: row.companyId,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode ?? '',
      categoryId: row.categoryId ?? undefined,
      brandId: row.brandId ?? undefined,
      typeId: row.typeId ?? undefined,
      unitOfMeasureId: row.unitOfMeasureId,
      supplierId: row.supplierId ?? undefined,
      costPrice: row.costPrice,
      sellingPrice: row.sellingPrice,
      taxRate: row.taxRate,
      trackingType: row.trackingType,
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? ''
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      categoryId: values.categoryId || undefined,
      brandId: values.brandId || undefined,
      typeId: values.typeId || undefined,
      unitOfMeasureId: values.unitOfMeasureId,
      supplierId: values.supplierId || undefined,
      name: values.name,
      description: values.description || undefined,
      sku: values.sku,
      barcode: values.barcode || undefined,
      costPrice: values.costPrice,
      sellingPrice: values.sellingPrice,
      taxRate: values.taxRate ?? 0,
      trackingType: values.trackingType ?? 'NONE',
      imageUrl: values.imageUrl || undefined
    })
  }
)

function openCreate() {
  activeFormTarget.value = 'create'
  openCreateModal()
}
function openEdit(row: Product) {
  activeFormTarget.value = 'edit'
  openEditModal(row)
}

const imageInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const imageUploadTarget = ref<'create' | 'edit'>('create')

function triggerImageUpload(target: 'create' | 'edit') {
  imageUploadTarget.value = target
  imageInputRef.value?.click()
}

async function onImageFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const uploaded = await uploadFile(file, 'products')
    if (imageUploadTarget.value === 'create') createForm.value.imageUrl = uploaded.url
    else editForm.value.imageUrl = uploaded.url
  } catch (err) {
    toast.add({ title: 'Could not upload image', description: apiErrorMessage(err), color: 'error' })
  } finally {
    uploadingImage.value = false
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}

function statusMenuItems(row: Product) {
  const options: { label: string; status: ProductStatus }[] = [
    { label: 'Active', status: 'ACTIVE' },
    { label: 'Inactive', status: 'INACTIVE' },
    { label: 'Discontinued', status: 'DISCONTINUED' }
  ]
  return [
    options
      .filter((o) => o.status !== row.status)
      .map((o) => ({
        label: o.label,
        onSelect: () => onStatusChange(row, o.status)
      }))
  ]
}

async function onStatusChange(row: Product, status: ProductStatus) {
  try {
    await updateStatus(row.id, status)
    toast.add({ title: `Status changed to ${status.toLowerCase()}`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not update status', description: apiErrorMessage(err), color: 'error' })
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.categoryId, filter.brandId, filter.status], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.companyId !== undefined || filter.categoryId !== undefined || filter.brandId !== undefined || filter.status !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.categoryId = undefined
  filter.brandId = undefined
  filter.status = undefined
  load()
}
</script>

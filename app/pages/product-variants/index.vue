<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Product variants</h1>
      <UButton icon="i-lucide-plus" :disabled="productOptions.length === 0" @click="openCreate">
        New variant
      </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && productOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active products yet"
      description="Create a product first — every variant belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name or SKU" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.productId" :items="productFilterOptions" placeholder="Product" class="w-52" />
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
        export-filename="product-variants"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #image-data="{ row }">
          <img
            v-if="row.imageUrl"
            :src="row.imageUrl"
            :alt="row.name"
            class="w-9 h-9 rounded object-cover border border-gray-200 dark:border-gray-800"
          >
          <span v-else class="flex items-center justify-center w-9 h-9 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            <UIcon name="i-lucide-package" class="w-4 h-4" />
          </span>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton
              size="xs"
              :color="row.active ? 'neutral' : 'success'"
              variant="soft"
              :icon="row.active ? 'i-lucide-power-off' : 'i-lucide-power'"
              :loading="togglingId === row.id"
              @click="toggleActive(row)"
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
            title="No variants match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-package" title="No variants yet" description="Create the first variant to get started.">
            <template #action>
              <UButton :disabled="productOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New variant</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New variant">
      <template #body>
        <ProductImagePicker :image-url="createForm.imageUrl" :loading="uploadingImage" @pick="triggerImageUpload('create')" @remove="createForm.imageUrl = ''" />
        <DynamicForm
          v-model="createForm"
          :fields="variantFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit variant '${editingVariant?.name ?? ''}'`">
      <template #body>
        <ProductImagePicker :image-url="editForm.imageUrl" :loading="uploadingImage" @pick="triggerImageUpload('edit')" @remove="editForm.imageUrl = ''" />
        <DynamicForm
          v-model="editForm"
          :fields="variantFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="onImageFileChange">

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete variant"
      :description="`Delete variant '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { ProductVariant, ProductVariantPayload } from '~/composables/useProductVariants'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useProductVariants()
const { list: listProducts } = useProducts()
const { upload: uploadFile } = useAssetUpload()
const toast = useToast()

const rows = ref<ProductVariant[]>([])
const loading = ref(false)
const error = ref('')

const products = ref<{ id: number; name: string; sku: string; status: string }[]>([])
const loadingLookups = ref(false)
async function loadLookups() {
  loadingLookups.value = true
  try {
    products.value = (await listProducts({ size: 200 })).data
  } finally {
    loadingLookups.value = false
  }
}
const productOptions = computed(() =>
  products.value.filter((p) => p.status === 'ACTIVE').map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
)
const productFilterOptions = computed(() => [
  { label: 'All products', value: undefined },
  ...products.value.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
])

const filter = reactive<{ productId: number | undefined; active: boolean | undefined }>({ productId: undefined, active: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name', 'sku'] })

const columns: ColumnDef<ProductVariant>[] = [
  { key: 'image', label: '', class: 'w-12' },
  { key: 'name', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'barcode', value: (row) => row.barcode ?? '—' },
  { key: 'productName', label: 'Product', value: (row) => row.productName ?? '—' },
  { key: 'costPrice', label: 'Cost price', value: (row) => row.costPrice == null ? 'Inherited' : formatCurrency(row.costPrice) },
  { key: 'sellingPrice', label: 'Selling price', value: (row) => row.sellingPrice == null ? 'Inherited' : formatCurrency(row.sellingPrice) },
  { key: 'active', type: 'boolean', trueLabel: 'Active', trueColor: 'success', falseLabel: 'Inactive', falseColor: 'neutral' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      productId: filter.productId,
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

const variantFields = computed<FieldDef[]>(() => [
  { name: 'productId', label: 'Product', type: 'select', required: true, options: productOptions.value },
  { name: 'name', required: true, hint: 'e.g. Red / Large.' },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'barcode' },
  { name: 'costPrice', label: 'Cost price', type: 'currency', hint: 'Leave blank to inherit the product\'s cost price.' },
  { name: 'sellingPrice', label: 'Selling price', type: 'currency', hint: 'Leave blank to inherit the product\'s selling price.' },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive', default: true }
])

const {
  showCreate, creating, error: createError, createForm, openCreate, onCreate,
  showEdit, editing, editError, editingRow: editingVariant, editForm, openEdit, onEdit,
  deleting, confirmDelete, onDelete
} = useCrudModals<ProductVariant, ProductVariantPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Variant',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode ?? '',
      costPrice: row.costPrice ?? undefined,
      sellingPrice: row.sellingPrice ?? undefined,
      imageUrl: row.imageUrl ?? '',
      active: row.active
    }),
    toPayload: (values) => ({
      productId: values.productId,
      name: values.name,
      sku: values.sku,
      barcode: values.barcode || undefined,
      costPrice: values.costPrice ?? undefined,
      sellingPrice: values.sellingPrice ?? undefined,
      imageUrl: values.imageUrl || undefined,
      active: values.active ?? true
    })
  }
)

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

const togglingId = ref<number | null>(null)
async function toggleActive(row: ProductVariant) {
  togglingId.value = row.id
  try {
    await update(row.id, {
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode ?? undefined,
      costPrice: row.costPrice ?? undefined,
      sellingPrice: row.sellingPrice ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      active: !row.active
    })
    toast.add({ title: row.active ? 'Variant deactivated' : 'Variant activated', color: 'success' })
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
watch(() => [filter.productId, filter.active], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.productId !== undefined || filter.active !== undefined)
function clearFilters() {
  search.value = ''
  filter.productId = undefined
  filter.active = undefined
  load()
}
</script>

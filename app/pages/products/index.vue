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
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-scale" @click="openUomModal(row)">UOMs</UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-boxes" @click="openVariantsModal(row)">Variants</UButton>
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

    <!-- Product UOM management -->
    <UModal v-model:open="showUomModal" :title="`Units of measure — ${uomProduct?.name ?? ''}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="uomProduct" class="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Base unit: <span class="font-medium text-gray-900 dark:text-white">{{ uomProduct.unitOfMeasureName }}</span> — every conversion factor below is
          expressed relative to it.
        </div>
        <div class="flex items-center gap-2 mb-4">
          <span class="text-sm text-gray-500 dark:text-gray-400">Preview price for</span>
          <USelect v-model="uomPreviewPriceGroupId" :items="uomPreviewPriceGroupOptions" placeholder="Default (no price group)" class="w-48" />
        </div>
        <div v-if="loadingUoms" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <div class="space-y-2 mb-5">
            <div v-for="row in uomRows" :key="row.id" class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate"
                    >{{ row.unitOfMeasureName }} ({{ row.unitOfMeasureAbbreviation }})</span
                  >
                  <UBadge v-if="row.baseUnit" color="info" variant="subtle" size="xs">Base unit</UBadge>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="text-sm text-gray-600 dark:text-gray-300 mr-1">
                    {{ formatCurrency(row.effectivePrice) }}
                    <UIcon v-if="row.priceGroupId" name="i-lucide-tag" class="w-3 h-3 inline-block text-primary-500 align-text-top" title="From price group" />
                  </span>
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-tags" title="Price-group prices" @click="openUomPricesModal(row)" />
                  <UButton
                    v-if="!row.baseUnit"
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    title="Remove this unit"
                    :loading="deletingUomId === row.id"
                    @click="onDeleteUom(row)"
                  />
                </div>
              </div>

              <p class="text-xs text-gray-500 dark:text-gray-400">
                <template v-if="row.baseUnit">Every other unit's conversion factor is expressed relative to this one.</template>
                <template v-else> 1 {{ row.unitOfMeasureAbbreviation }} = {{ row.conversionFactor }} {{ uomProduct?.unitOfMeasureAbbreviation }} </template>
              </p>

              <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div class="flex items-center gap-2">
                  <UCheckbox v-model="row.allowPurchase" label="Purchasing" :disabled="row.baseUnit" @change="onToggle(row)" />
                  <UButton
                    v-if="row.allowPurchase"
                    size="xs"
                    :color="row.defaultPurchase ? 'warning' : 'neutral'"
                    :variant="row.defaultPurchase ? 'subtle' : 'ghost'"
                    :disabled="row.defaultPurchase"
                    :title="row.defaultPurchase ? undefined : 'Make this the unit purchase orders default to'"
                    @click="onSetDefault(row, 'purchase')"
                  >
                    {{ row.defaultPurchase ? 'Default for purchasing' : 'Set as default' }}
                  </UButton>
                </div>
                <div class="flex items-center gap-2">
                  <UCheckbox v-model="row.allowSales" label="Sales" :disabled="row.baseUnit" @change="onToggle(row)" />
                  <UButton
                    v-if="row.allowSales"
                    size="xs"
                    :color="row.defaultSales ? 'warning' : 'neutral'"
                    :variant="row.defaultSales ? 'subtle' : 'ghost'"
                    :disabled="row.defaultSales"
                    :title="row.defaultSales ? undefined : 'Make this the unit sales orders default to'"
                    @click="onSetDefault(row, 'sales')"
                  >
                    {{ row.defaultSales ? 'Default for sales' : 'Set as default' }}
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add a unit</p>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-1">
            <UFormField label="Unit" required>
              <USelect v-model="uomForm.unitOfMeasureId" :items="availableUomUnitOptions" placeholder="Select a unit" class="w-full" />
            </UFormField>
            <UFormField label="Conversion factor" required>
              <UInput v-model.number="uomForm.conversionFactor" type="number" min="0.000001" step="0.000001" placeholder="e.g. 24" class="w-full" />
            </UFormField>
            <UFormField label="Barcode">
              <UInput v-model="uomForm.barcode" placeholder="Optional" class="w-full" />
            </UFormField>
            <UFormField label="Price override">
              <UInput v-model.number="uomForm.price" type="number" min="0" step="0.01" placeholder="Optional" class="w-full" />
            </UFormField>
          </div>
          <p v-if="addUnitPreview" class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ addUnitPreview }}</p>
          <UAlert v-if="uomError" color="error" variant="subtle" class="mb-3" :title="uomError" />
          <div class="flex justify-end">
            <UButton size="sm" icon="i-lucide-plus" :loading="addingUom" @click="onAddUom">Add unit</UButton>
          </div>
        </template>
      </template>
    </UModal>

    <!-- Product UOM pricing (per UOM, per price group) -->
    <UModal
      v-model:open="showUomPricesModal"
      :title="`Prices — ${uomPricesRow?.unitOfMeasureName ?? ''} (${uomPricesRow?.unitOfMeasureAbbreviation ?? ''})`"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <div v-if="loadingUomPrices" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <EmptyState
            v-if="uomPriceRows.length === 0"
            icon="i-lucide-tags"
            title="No price-group prices yet"
            description="Falls back to the unit's own effective price until you add one."
          />
          <div v-else class="space-y-2 mb-4">
            <div
              v-for="row in uomPriceRows"
              :key="row.id"
              class="grid grid-cols-12 gap-2 items-center rounded-lg border border-gray-200 dark:border-gray-800 p-2"
            >
              <div class="col-span-4 text-sm text-gray-900 dark:text-white truncate">{{ row.priceGroupName }}</div>
              <div class="col-span-3 text-sm text-gray-600 dark:text-gray-300 text-right truncate">{{ formatCurrency(row.price) }}</div>
              <div class="col-span-4 text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ row.effectiveFrom || row.effectiveTo ? `${row.effectiveFrom ?? '…'} → ${row.effectiveTo ?? '…'}` : 'Always' }}
              </div>
              <div class="col-span-1 flex justify-end">
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :loading="deletingUomPriceId === row.id"
                  @click="onDeleteUomPrice(row)"
                />
              </div>
            </div>
          </div>

          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add a price</p>
          <div class="grid grid-cols-12 gap-2 items-center mb-2">
            <USelect v-model="uomPriceForm.priceGroupId" :items="availableUomPriceGroupOptions" placeholder="Price group" class="col-span-4" />
            <UInput v-model.number="uomPriceForm.price" type="number" min="0" step="0.01" placeholder="Price" class="col-span-3" />
            <UInput v-model="uomPriceForm.effectiveFrom" type="date" placeholder="From (optional)" class="col-span-3" />
            <UInput v-model="uomPriceForm.effectiveTo" type="date" placeholder="To (optional)" class="col-span-2" />
          </div>
          <UAlert v-if="uomPriceError" color="error" variant="subtle" class="mb-3" :title="uomPriceError" />
          <div class="flex justify-end">
            <UButton size="sm" icon="i-lucide-plus" :loading="addingUomPrice" @click="onAddUomPrice">Add price</UButton>
          </div>
        </template>
      </template>
    </UModal>

    <!-- Product variant management -->
    <UModal v-model:open="showVariantsModal" :title="`Variants — ${variantsProduct?.name ?? ''}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="flex justify-end mb-3">
          <UButton size="sm" icon="i-lucide-plus" @click="openVariantCreate">New variant</UButton>
        </div>
        <div v-if="loadingVariants" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <EmptyState
            v-if="variantRows.length === 0"
            icon="i-lucide-boxes"
            title="No variants yet"
            description="Create the first variant of this product to get started."
          />
          <div v-else class="space-y-2">
            <div
              v-for="row in variantRows"
              :key="row.id"
              class="grid grid-cols-12 gap-2 items-center rounded-lg border border-gray-200 dark:border-gray-800 p-2"
            >
              <div class="col-span-3 text-sm text-gray-900 dark:text-white truncate">
                {{ row.name }}
                <span v-if="!row.active" class="text-xs text-gray-400">(inactive)</span>
              </div>
              <div class="col-span-2 text-xs text-gray-500 dark:text-gray-400 truncate">{{ row.sku }}</div>
              <div class="col-span-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ row.unitOfMeasureAbbreviation ?? `${variantsProduct?.unitOfMeasureAbbreviation ?? '—'} (inherited)` }}
              </div>
              <div class="col-span-2 text-sm text-gray-600 dark:text-gray-300 text-right truncate">
                {{ formatCurrency(row.sellingPrice ?? variantsProduct?.sellingPrice ?? 0) }}
              </div>
              <div class="col-span-3 flex justify-end gap-1">
                <UButton size="xs" color="primary" variant="ghost" icon="i-lucide-pencil" @click="openVariantEdit(row)" />
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmDeleteVariant = row" />
              </div>
            </div>
          </div>
        </template>
      </template>
    </UModal>

    <UModal v-model:open="showVariantCreate" title="New variant" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <ProductImagePicker
          :image-url="variantCreateForm.imageUrl"
          :loading="uploadingVariantImage"
          @pick="triggerVariantImageUpload('create')"
          @remove="variantCreateForm.imageUrl = ''"
        />
        <DynamicForm
          v-model="variantCreateForm"
          :fields="variantFields"
          :loading="creatingVariant"
          :error="createVariantError"
          submit-label="Create"
          cancelable
          @submit="onVariantCreate"
          @cancel="showVariantCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showVariantEdit" :title="`Edit variant '${editingVariantRow?.name ?? ''}'`" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <ProductImagePicker
          :image-url="variantEditForm.imageUrl"
          :loading="uploadingVariantImage"
          @pick="triggerVariantImageUpload('edit')"
          @remove="variantEditForm.imageUrl = ''"
        />
        <DynamicForm
          v-model="variantEditForm"
          :fields="variantFields"
          :loading="editingVariant"
          :error="editVariantError"
          submit-label="Save changes"
          cancelable
          @submit="onVariantEdit"
          @cancel="showVariantEdit = false"
        />
      </template>
    </UModal>

    <input ref="variantImageInputRef" type="file" accept="image/*" class="hidden" @change="onVariantImageFileChange" />

    <ConfirmModal
      :model-value="confirmDeleteVariant !== null"
      title="Delete variant"
      :description="`Delete variant '${confirmDeleteVariant?.name ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deletingVariant"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteVariant = null
        }
      "
      @confirm="onVariantDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef, FieldDef } from '#shared/types'
import type { ProductUom } from '~/composables/useProductUoms'
import type { ProductUomPrice } from '~/composables/useProductUomPrices'
import type { Product, ProductPayload, ProductStatus } from '~/composables/useProducts'
import type { ProductVariant, ProductVariantPayload } from '~/composables/useProductVariants'
import type { PriceGroup } from '~/composables/usePriceGroups'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove } = useProducts()
const { list: listCompanies } = useCompanies()
const { list: listCategories } = useProductCategories()
const { list: listBrands } = useProductBrands()
const { list: listTypes } = useProductTypes()
const { list: listUnits } = useUnitsOfMeasure()
const { list: listSuppliers } = useSuppliers()
const { upload: uploadFile } = useAssetUpload()
const { list: listUoms, create: createUom, update: updateUom, remove: removeUom } = useProductUoms()
const { list: listUomPrices, create: createUomPrice, remove: removeUomPrice } = useProductUomPrices()
const { list: listPriceGroups } = usePriceGroups()
const { list: listVariants, create: createVariant, update: updateVariant, remove: removeVariant } = useProductVariants()
const toast = useToast()

const rows = ref<Product[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const categories = ref<{ id: number; name: string; active: boolean }[]>([])
const brands = ref<{ id: number; name: string; active: boolean }[]>([])
const types = ref<{ id: number; name: string; active: boolean }[]>([])
const units = ref<{ id: number; name: string; abbreviation: string; active: boolean }[]>([])
const suppliers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const priceGroups = ref<PriceGroup[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, cat, b, t, u, s, pg] = await Promise.all([
      listCompanies({ size: 200 }),
      listCategories({ size: 200 }),
      listBrands({ size: 200 }),
      listTypes({ size: 200 }),
      listUnits({ size: 200 }),
      listSuppliers({ size: 200 }),
      listPriceGroups({ active: true, size: 200 })
    ])
    companies.value = c.data
    categories.value = cat.data
    brands.value = b.data
    types.value = t.data
    units.value = u.data
    suppliers.value = s.data
    priceGroups.value = pg.data
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

function optionsFor(list: { id: number; name: string; active: boolean }[]) {
  return list.filter((item) => item.active).map((item) => ({ label: item.name, value: item.id }))
}
function unitOptionsFor() {
  return units.value.filter((u) => u.active).map((u) => ({ label: `${u.name} (${u.abbreviation})`, value: u.id }))
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
  { key: 'purchaseUnit', label: 'Buys in', value: (row) => row.purchaseUnitOfMeasureAbbreviation ?? row.unitOfMeasureAbbreviation ?? '—' },
  { key: 'salesUnit', label: 'Sells in', value: (row) => row.salesUnitOfMeasureAbbreviation ?? row.unitOfMeasureAbbreviation ?? '—' },
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
  { name: 'name', required: true },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'barcode' },
  { name: 'categoryId', label: 'Category', type: 'select', options: optionsFor(categories.value) },
  { name: 'brandId', label: 'Brand', type: 'select', options: optionsFor(brands.value) },
  { name: 'typeId', label: 'Type', type: 'select', options: optionsFor(types.value) },
  { name: 'unitOfMeasureId', label: 'Unit of measure', type: 'select', required: true, options: unitOptionsFor() },
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
  {
    name: 'reorderPoint',
    label: 'Reorder point',
    type: 'number',
    min: 0,
    default: 0,
    hint: 'Flag this product on the Low Stock report once available stock falls below this. Leave at 0 to never flag it.'
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
      reorderPoint: row.reorderPoint,
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
      reorderPoint: values.reorderPoint ?? 0,
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

// ── Product UOM management ──────────────────────────────────────────────
const showUomModal = ref(false)
const uomProduct = ref<Product | null>(null)
const uomRows = ref<ProductUom[]>([])
const loadingUoms = ref(false)
const uomError = ref('')
const addingUom = ref(false)
const deletingUomId = ref<number | null>(null)

const uomForm = reactive<{ unitOfMeasureId: number | undefined; conversionFactor: number | undefined; barcode: string; price: number | undefined }>({
  unitOfMeasureId: undefined,
  conversionFactor: undefined,
  barcode: '',
  price: undefined
})

const availableUomUnitOptions = computed(() => {
  const usedIds = new Set(uomRows.value.map((r) => r.unitOfMeasureId))
  return unitOptionsFor().filter((o) => !usedIds.has(o.value))
})

const addUnitPreview = computed(() => {
  if (!uomForm.unitOfMeasureId || !uomForm.conversionFactor) return ''
  const unit = units.value.find((u) => u.id === uomForm.unitOfMeasureId)
  const baseAbbr = uomProduct.value?.unitOfMeasureAbbreviation ?? ''
  return `1 ${unit?.abbreviation ?? 'unit'} = ${uomForm.conversionFactor} ${baseAbbr}`
})

const uomPreviewPriceGroupId = ref<number | undefined>(undefined)
const uomPreviewPriceGroupOptions = computed(() => [
  { label: 'Default (no price group)', value: undefined },
  ...priceGroups.value.map((g) => ({ label: g.name, value: g.id }))
])

async function openUomModal(row: Product) {
  uomProduct.value = row
  uomError.value = ''
  uomPreviewPriceGroupId.value = undefined
  uomForm.unitOfMeasureId = undefined
  uomForm.conversionFactor = undefined
  uomForm.barcode = ''
  uomForm.price = undefined
  showUomModal.value = true
  await loadUoms()
}

async function loadUoms() {
  if (!uomProduct.value) return
  loadingUoms.value = true
  try {
    uomRows.value = await listUoms(uomProduct.value.id, undefined, uomPreviewPriceGroupId.value)
  } catch (err) {
    uomError.value = apiErrorMessage(err)
  } finally {
    loadingUoms.value = false
  }
}
watch(uomPreviewPriceGroupId, loadUoms)

async function onAddUom() {
  if (!uomProduct.value) return
  uomError.value = ''
  if (!uomForm.unitOfMeasureId || !uomForm.conversionFactor) {
    uomError.value = 'Select a unit and enter a conversion factor'
    return
  }
  addingUom.value = true
  try {
    await createUom(uomProduct.value.id, {
      unitOfMeasureId: uomForm.unitOfMeasureId,
      conversionFactor: uomForm.conversionFactor,
      allowPurchase: true,
      allowSales: true,
      allowInventory: true,
      defaultPurchase: false,
      defaultSales: false,
      barcode: uomForm.barcode || undefined,
      price: uomForm.price,
      active: true
    })
    toast.add({ title: 'Unit added', color: 'success' })
    uomForm.unitOfMeasureId = undefined
    uomForm.conversionFactor = undefined
    uomForm.barcode = ''
    uomForm.price = undefined
    await loadUoms()
  } catch (err) {
    uomError.value = apiErrorMessage(err)
  } finally {
    addingUom.value = false
  }
}

async function onToggle(row: ProductUom) {
  if (!uomProduct.value) return
  try {
    await updateUom(uomProduct.value.id, row.id, {
      unitOfMeasureId: row.unitOfMeasureId,
      conversionFactor: row.baseUnit ? undefined : row.conversionFactor,
      allowPurchase: row.allowPurchase,
      allowSales: row.allowSales,
      allowInventory: row.allowInventory,
      defaultPurchase: row.defaultPurchase,
      defaultSales: row.defaultSales,
      barcode: row.barcode ?? undefined,
      price: row.price ?? undefined,
      active: row.active
    })
  } catch (err) {
    toast.add({ title: 'Could not update unit', description: apiErrorMessage(err), color: 'error' })
    await loadUoms()
  }
}

async function onSetDefault(row: ProductUom, kind: 'purchase' | 'sales') {
  if (!uomProduct.value) return
  if (kind === 'purchase' ? row.defaultPurchase : row.defaultSales) return
  try {
    await updateUom(uomProduct.value.id, row.id, {
      unitOfMeasureId: row.unitOfMeasureId,
      conversionFactor: row.baseUnit ? undefined : row.conversionFactor,
      allowPurchase: row.allowPurchase,
      allowSales: row.allowSales,
      allowInventory: row.allowInventory,
      defaultPurchase: kind === 'purchase' ? true : row.defaultPurchase,
      defaultSales: kind === 'sales' ? true : row.defaultSales,
      barcode: row.barcode ?? undefined,
      price: row.price ?? undefined,
      active: row.active
    })
    toast.add({ title: `Default ${kind} unit updated`, color: 'success' })
    await loadUoms()
  } catch (err) {
    toast.add({ title: 'Could not update default unit', description: apiErrorMessage(err), color: 'error' })
  }
}

async function onDeleteUom(row: ProductUom) {
  if (!uomProduct.value) return
  deletingUomId.value = row.id
  try {
    await removeUom(uomProduct.value.id, row.id)
    toast.add({ title: 'Unit removed', color: 'success' })
    await loadUoms()
  } catch (err) {
    toast.add({ title: 'Could not remove unit', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deletingUomId.value = null
  }
}

// ── Product UOM pricing (per UOM, per price group) ────────────────────────
const showUomPricesModal = ref(false)
const uomPricesRow = ref<ProductUom | null>(null)
const uomPriceRows = ref<ProductUomPrice[]>([])
const loadingUomPrices = ref(false)
const uomPriceError = ref('')
const addingUomPrice = ref(false)
const deletingUomPriceId = ref<number | null>(null)

const uomPriceForm = reactive<{ priceGroupId: number | undefined; price: number | undefined; effectiveFrom: string; effectiveTo: string }>({
  priceGroupId: undefined,
  price: undefined,
  effectiveFrom: '',
  effectiveTo: ''
})

const availableUomPriceGroupOptions = computed(() => {
  const usedIds = new Set(uomPriceRows.value.map((r) => r.priceGroupId))
  return priceGroups.value.filter((g) => !usedIds.has(g.id)).map((g) => ({ label: g.name, value: g.id }))
})

async function openUomPricesModal(row: ProductUom) {
  if (!uomProduct.value) return
  uomPricesRow.value = row
  uomPriceError.value = ''
  uomPriceForm.priceGroupId = undefined
  uomPriceForm.price = undefined
  uomPriceForm.effectiveFrom = ''
  uomPriceForm.effectiveTo = ''
  showUomPricesModal.value = true
  await loadUomPrices()
}

async function loadUomPrices() {
  if (!uomProduct.value || !uomPricesRow.value) return
  loadingUomPrices.value = true
  try {
    uomPriceRows.value = await listUomPrices(uomProduct.value.id, uomPricesRow.value.id)
  } catch (err) {
    uomPriceError.value = apiErrorMessage(err)
  } finally {
    loadingUomPrices.value = false
  }
}

async function onAddUomPrice() {
  if (!uomProduct.value || !uomPricesRow.value) return
  uomPriceError.value = ''
  if (!uomPriceForm.priceGroupId || uomPriceForm.price == null) {
    uomPriceError.value = 'Select a price group and enter a price'
    return
  }
  addingUomPrice.value = true
  try {
    await createUomPrice(uomProduct.value.id, uomPricesRow.value.id, {
      priceGroupId: uomPriceForm.priceGroupId,
      price: uomPriceForm.price,
      effectiveFrom: uomPriceForm.effectiveFrom || undefined,
      effectiveTo: uomPriceForm.effectiveTo || undefined,
      active: true
    })
    toast.add({ title: 'Price added', color: 'success' })
    uomPriceForm.priceGroupId = undefined
    uomPriceForm.price = undefined
    uomPriceForm.effectiveFrom = ''
    uomPriceForm.effectiveTo = ''
    await loadUomPrices()
  } catch (err) {
    uomPriceError.value = apiErrorMessage(err)
  } finally {
    addingUomPrice.value = false
  }
}

async function onDeleteUomPrice(row: ProductUomPrice) {
  if (!uomProduct.value || !uomPricesRow.value) return
  deletingUomPriceId.value = row.id
  try {
    await removeUomPrice(uomProduct.value.id, uomPricesRow.value.id, row.id)
    toast.add({ title: 'Price removed', color: 'success' })
    await loadUomPrices()
  } catch (err) {
    toast.add({ title: 'Could not remove price', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deletingUomPriceId.value = null
  }
}

// ── Product variant management ──────────────────────────────────────────
const showVariantsModal = ref(false)
const variantsProduct = ref<Product | null>(null)
const variantRows = ref<ProductVariant[]>([])
const loadingVariants = ref(false)

async function openVariantsModal(row: Product) {
  variantsProduct.value = row
  showVariantsModal.value = true
  await loadVariants()
}

async function loadVariants() {
  if (!variantsProduct.value) return
  loadingVariants.value = true
  try {
    const res = await listVariants({ productId: variantsProduct.value.id, size: 200 })
    variantRows.value = res.data
  } finally {
    loadingVariants.value = false
  }
}

const variantUnitOptions = computed(() => [
  { label: `Inherit product's unit (${variantsProduct.value?.unitOfMeasureAbbreviation ?? '—'})`, value: undefined },
  ...unitOptionsFor()
])

const variantFields = computed<FieldDef[]>(() => [
  { name: 'name', required: true, hint: 'e.g. Red / Large.' },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'barcode' },
  {
    name: 'unitOfMeasureId',
    label: 'Unit of measure',
    type: 'select',
    options: variantUnitOptions.value,
    hint: "Leave as inherited to use the product's own unit."
  },
  { name: 'costPrice', label: 'Cost price', type: 'currency', hint: "Leave blank to inherit the product's cost price." },
  { name: 'sellingPrice', label: 'Selling price', type: 'currency', hint: "Leave blank to inherit the product's selling price." },
  { name: 'active', type: 'switch', onLabel: 'Active', offLabel: 'Inactive', default: true }
])

const {
  showCreate: showVariantCreate,
  creating: creatingVariant,
  error: createVariantError,
  createForm: variantCreateForm,
  openCreate: openVariantCreate,
  onCreate: onVariantCreate,
  showEdit: showVariantEdit,
  editing: editingVariant,
  editError: editVariantError,
  editingRow: editingVariantRow,
  editForm: variantEditForm,
  openEdit: openVariantEdit,
  onEdit: onVariantEdit,
  deleting: deletingVariant,
  confirmDelete: confirmDeleteVariant,
  onDelete: onVariantDelete
} = useCrudModals<ProductVariant, ProductVariantPayload>(
  {
    create: (payload) => createVariant({ ...payload, productId: variantsProduct.value!.id }),
    update: (row, payload) => updateVariant(row.id, { ...payload, productId: variantsProduct.value!.id }),
    remove: (row) => removeVariant(row.id)
  },
  loadVariants,
  {
    entityName: 'Variant',
    createDefaults: () => ({ active: true }),
    toForm: (row) => ({
      name: row.name,
      sku: row.sku,
      barcode: row.barcode ?? '',
      unitOfMeasureId: row.unitOfMeasureId ?? undefined,
      costPrice: row.costPrice ?? undefined,
      sellingPrice: row.sellingPrice ?? undefined,
      imageUrl: row.imageUrl ?? '',
      active: row.active
    }),
    toPayload: (values) => ({
      productId: variantsProduct.value!.id,
      name: values.name,
      sku: values.sku,
      barcode: values.barcode || undefined,
      unitOfMeasureId: values.unitOfMeasureId || undefined,
      costPrice: values.costPrice ?? undefined,
      sellingPrice: values.sellingPrice ?? undefined,
      imageUrl: values.imageUrl || undefined,
      active: values.active ?? true
    })
  }
)

const variantImageInputRef = ref<HTMLInputElement | null>(null)
const uploadingVariantImage = ref(false)
const variantImageUploadTarget = ref<'create' | 'edit'>('create')

function triggerVariantImageUpload(target: 'create' | 'edit') {
  variantImageUploadTarget.value = target
  variantImageInputRef.value?.click()
}

async function onVariantImageFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingVariantImage.value = true
  try {
    const uploaded = await uploadFile(file, 'products')
    if (variantImageUploadTarget.value === 'create') variantCreateForm.value.imageUrl = uploaded.url
    else variantEditForm.value.imageUrl = uploaded.url
  } catch (err) {
    toast.add({ title: 'Could not upload image', description: apiErrorMessage(err), color: 'error' })
  } finally {
    uploadingVariantImage.value = false
    if (variantImageInputRef.value) variantImageInputRef.value.value = ''
  }
}
</script>

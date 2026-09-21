<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">New stock count</h1>
    </div>

    <div v-if="loadingLookups" class="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Count details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onFormCompanyChanged" />
            </UFormField>
            <UFormField label="Count date" required>
              <UInput v-model="form.countDate" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Warehouse" required class="sm:col-span-2">
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" class="w-full" @update:model-value="onWarehouseChanged" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Products to count</h2>
            </div>
          </template>

          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Only untracked products can be counted — batch/serial-tracked stock isn't supported here.</p>

          <div class="flex flex-wrap items-end gap-2 mb-4">
            <UFormField label="Product" class="flex-1 min-w-[240px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="addableProductOptions"
                value-key="value"
                :disabled="!form.warehouseId"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UButton icon="i-lucide-plus" :disabled="!addLineProductId" @click="addLine">Add product</UButton>
          </div>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No products added yet
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <div class="min-w-[520px]">
              <div
                class="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
              >
                <span class="col-span-5">Product</span>
                <span class="col-span-2">Count in</span>
                <span class="col-span-4">Bin</span>
                <span class="col-span-1"></span>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <div v-for="(line, i) in form.lines" :key="line.productId" class="grid grid-cols-12 gap-2 items-center px-3 py-2">
                  <div class="col-span-5 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
                  <USelect v-model="line.unitOfMeasureId" :items="unitOptionsForProduct(line.productId)" placeholder="Unit" class="col-span-2" />
                  <USelect v-model="line.binId" :items="binOptionsForWarehouse" placeholder="No bin" class="col-span-4" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">Start count</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard this stock count?"
      description="You have unsaved changes on this stock count. Leaving now will discard them."
      confirm-label="Discard"
      color="error"
      @update:model-value="
        (v: boolean) => {
          if (!v) showLeaveConfirm = false
        }
      "
      @confirm="confirmLeave"
    />
  </div>
</template>

<script setup lang="ts">
import type { StockCountPayload } from '~/composables/useStockCounts'

definePageMeta({ middleware: 'admin' })

const router = useRouter()
const { create } = useStockCounts()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listProductUoms } = useProductUoms()
const { list: listBins } = useWarehouseBins()
const toast = useToast()

const loadingLookups = ref(true)
const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<
  {
    id: number
    name: string
    sku: string
    companyId: number
    status: string
    trackingType: string
    unitOfMeasureId: number
    unitOfMeasureAbbreviation: string | null
  }[]
>([])
const bins = ref<{ id: number; name: string; warehouseId: number | null; active: boolean }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function untrackedProductOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && p.trackingType === 'NONE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}

// Loaded per product on demand, same as the purchase-order form. Gated on
// allowInventory rather than allowPurchase: a count is an internal stock
// document, so it follows the stock-transfer rule, not the buying one.
const productUomOptions = ref<Record<number, { label: string; value: number }[]>>({})
async function ensureProductUomOptions(productId: number) {
  if (productUomOptions.value[productId]) return
  try {
    const uoms = await listProductUoms(productId)
    productUomOptions.value[productId] = uoms
      .filter((u) => u.active && u.allowInventory && !u.baseUnit)
      .map((u) => ({ label: u.unitOfMeasureAbbreviation ?? '', value: u.unitOfMeasureId }))
  } catch {
    productUomOptions.value[productId] = []
  }
}
function unitOptionsForProduct(productId: number | undefined) {
  if (!productId) return []
  const product = products.value.find((p) => p.id === productId)
  const base = product ? [{ label: product.unitOfMeasureAbbreviation ?? 'Base unit', value: product.unitOfMeasureId }] : []
  return [...base, ...(productUomOptions.value[productId] ?? [])]
}

// Already-added products drop out of the picker: counting the same product
// twice in one count would produce two variance rows for one physical shelf.
// A computed rather than a per-row call — the old markup invoked the filter +
// map inside the v-for, rebuilding the whole option list once per line.
const addableProductOptions = computed(() => {
  const taken = new Set(form.lines.map((l) => l.productId))
  return untrackedProductOptionsFor(form.companyId).filter((option) => !taken.has(option.value))
})

interface LineForm {
  // Never undefined: a line is only ever created from a product already chosen
  // in the picker above, so there are no blank rows to validate away.
  productId: number
  binId: number | undefined
  // The unit the counter will fill the sheet in. Defaults to the product's
  // base unit when the line is added.
  unitOfMeasureId: number | undefined
}

const saving = ref(false)
const formError = ref('')

const form = reactive<{
  companyId: number | undefined
  warehouseId: number | undefined
  countDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  warehouseId: undefined,
  countDate: new Date().toISOString().slice(0, 10),
  notes: '',
  lines: []
})

const binOptionsForWarehouse = computed(() => [
  { label: 'No bin', value: undefined },
  ...bins.value.filter((b) => b.active && b.warehouseId === form.warehouseId).map((b) => ({ label: b.name, value: b.id }))
])

// Both clear the lines, so the picker has to drop its pending selection too —
// otherwise it keeps showing a product from the company you just navigated away
// from, and Add would put it back on a count it doesn't belong to.
function onFormCompanyChanged() {
  form.warehouseId = undefined
  form.lines = []
  addLineProductId.value = undefined
}
function onWarehouseChanged() {
  form.lines = []
  addLineProductId.value = undefined
}

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  const product = products.value.find((p) => p.id === addLineProductId.value)
  form.lines.push({ productId: addLineProductId.value, binId: undefined, unitOfMeasureId: product?.unitOfMeasureId })
  ensureProductUomOptions(addLineProductId.value)
  addLineProductId.value = undefined
}

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => JSON.stringify(form) !== formSnapshot.value)

// Confirms before a sidebar link, browser back, refresh or tab close throws
// this form away — the page's own back button is only one way out.
useUnsavedChangesGuard(isDirty)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/stock-counts')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/stock-counts')
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.warehouseId || !form.countDate) {
    formError.value = 'Please fill in company, warehouse, and count date'
    return
  }
  // No blank-row check needed — the picker is the only way to add a line.
  if (form.lines.length === 0) {
    formError.value = 'Add at least one product to count'
    return
  }
  const payload: StockCountPayload = {
    companyId: form.companyId,
    warehouseId: form.warehouseId,
    countDate: form.countDate,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({ productId: l.productId, binId: l.binId, unitOfMeasureId: l.unitOfMeasureId }))
  }
  saving.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock count started', color: 'success' })
    router.push('/stock-counts')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loadingLookups.value = true
  try {
    const [c, w, p, b] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 }), listProducts({ size: 200 }), listBins({ size: 200 })])
    companies.value = c.data
    warehouses.value = w.data
    products.value = p.data
    bins.value = b.data
    form.companyId = activeCompanyOptions.value[0]?.value
    snapshotForm()
  } finally {
    loadingLookups.value = false
  }
})
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">New stock transfer</h1>
    </div>

    <div v-if="loadingLookups" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-repeat" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transfer details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onFormCompanyChanged" />
            </UFormField>
            <UFormField label="Request date" required>
              <UInput v-model="form.requestDate" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Source warehouse" required>
              <USelect
                v-model="form.sourceWarehouseId"
                :items="warehouseOptionsFor(form.companyId)"
                class="w-full"
                @update:model-value="onSourceWarehouseChanged"
              />
            </UFormField>
            <UFormField label="Destination warehouse" required>
              <USelect v-model="form.destinationWarehouseId" :items="destinationWarehouseOptions" class="w-full" />
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
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line items</h2>
            </div>
          </template>

          <div v-if="form.sourceWarehouseId" class="flex flex-wrap items-end gap-2 mb-4">
            <UFormField label="Product" class="flex-1 min-w-[240px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="productOptionsFor(form.companyId)"
                value-key="value"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UButton icon="i-lucide-plus" :disabled="!addLineProductId" @click="addLine">Add line</UButton>
          </div>
          <p v-else class="text-xs text-gray-400 mb-4">Select a source warehouse first to add line items.</p>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No line items yet
          </div>
          <div v-else class="space-y-3">
            <div v-for="(line, i) in form.lines" :key="i" class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <div class="grid grid-cols-12 gap-2 items-center">
                <div class="col-span-4 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
                <UInput v-model.number="line.quantityRequested" type="number" min="0.0001" step="0.0001" placeholder="Qty" class="col-span-2" />
                <USelect v-model="line.unitOfMeasureId" :items="unitOptionsForProduct(line.productId)" placeholder="Unit" class="col-span-2" />
                <span class="col-span-3 text-xs text-gray-400 text-right">Available: {{ availableFor(line) }}</span>
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <USelect v-model="line.sourceBinId" :items="sourceBinOptions" placeholder="Source bin (optional)" />
                <USelect v-model="line.destinationBinId" :items="destinationBinOptions" placeholder="Destination bin (optional)" />
              </div>
              <USelect
                v-if="trackingTypeFor(line.productId) === 'BATCH'"
                v-model="line.batchNumber"
                :items="batchOptionsFor(line)"
                placeholder="Select batch / lot"
                class="w-full"
              />
              <p v-else-if="trackingTypeFor(line.productId) === 'SERIAL'" class="text-xs text-gray-400">
                Serial-tracked — specific units are chosen when this transfer is shipped.
              </p>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">Request transfer</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard this transfer?"
      description="You have unsaved changes on this stock transfer. Leaving now will discard them."
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
import type { StockTransferPayload } from '~/composables/useStockTransfers'

definePageMeta({ middleware: 'admin' })

const router = useRouter()
const { create } = useStockTransfers()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listBins } = useWarehouseBins()
const { list: listStockLevels } = useStockLevels()
const { list: listSerialNumbers } = useSerialNumbers()
const { list: listProductUoms } = useProductUoms()
const toast = useToast()

const loadingLookups = ref(true)
const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<
  { id: number; name: string; sku: string; companyId: number; status: string; trackingType: string; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]
>([])
const bins = ref<{ id: number; name: string; warehouseId: number | null; active: boolean }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function trackingTypeFor(productId: number | undefined) {
  return products.value.find((p) => p.id === productId)?.trackingType ?? 'NONE'
}
function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}

const productUomsByProduct = ref<Record<number, { unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null; conversionFactor: number }[]>>({})
async function ensureProductUomOptions(productId: number) {
  if (productUomsByProduct.value[productId]) return
  try {
    const uoms = await listProductUoms(productId)
    productUomsByProduct.value[productId] = uoms
      .filter((u) => u.active && u.allowInventory && !u.baseUnit)
      .map((u) => ({ unitOfMeasureId: u.unitOfMeasureId, unitOfMeasureAbbreviation: u.unitOfMeasureAbbreviation, conversionFactor: u.conversionFactor }))
  } catch {
    productUomsByProduct.value[productId] = []
  }
}
function unitOptionsForProduct(productId: number | undefined) {
  if (!productId) return []
  const product = products.value.find((p) => p.id === productId)
  const base = product ? [{ label: product.unitOfMeasureAbbreviation ?? 'Base unit', value: product.unitOfMeasureId }] : []
  return [...base, ...(productUomsByProduct.value[productId] ?? []).map((u) => ({ label: u.unitOfMeasureAbbreviation ?? '', value: u.unitOfMeasureId }))]
}
function conversionFactorFor(productId: number | undefined, unitOfMeasureId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  if (!product || !unitOfMeasureId || unitOfMeasureId === product.unitOfMeasureId) return 1
  return productUomsByProduct.value[productId ?? -1]?.find((u) => u.unitOfMeasureId === unitOfMeasureId)?.conversionFactor ?? 1
}

interface LineForm {
  productId: number | undefined
  quantityRequested: number | undefined
  unitOfMeasureId: number | undefined
  sourceBinId: number | undefined
  destinationBinId: number | undefined
  batchNumber: string
}

const saving = ref(false)
const formError = ref('')
const stockLevels = ref<{ productId: number; binId: number | null; quantityOnHand: number }[]>([])
const productBatches = ref<{ productId: number; batchNumber: string }[]>([])

const form = reactive<{
  companyId: number | undefined
  sourceWarehouseId: number | undefined
  destinationWarehouseId: number | undefined
  requestDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  sourceWarehouseId: undefined,
  destinationWarehouseId: undefined,
  requestDate: new Date().toISOString().slice(0, 10),
  notes: '',
  lines: []
})

const destinationWarehouseOptions = computed(() => warehouseOptionsFor(form.companyId).filter((w) => w.value !== form.sourceWarehouseId))
const sourceBinOptions = computed(() => [
  { label: 'No bin', value: undefined },
  ...bins.value.filter((b) => b.active && b.warehouseId === form.sourceWarehouseId).map((b) => ({ label: b.name, value: b.id }))
])
const destinationBinOptions = computed(() => [
  { label: 'No bin', value: undefined },
  ...bins.value.filter((b) => b.active && b.warehouseId === form.destinationWarehouseId).map((b) => ({ label: b.name, value: b.id }))
])

// Base-unit stock converted into the line's currently-selected unit, so
// what's shown matches what the user is typing into Qty. When no source bin
// is picked, this sums every bin the product is held in (matching the
// backend's own "no bin pinned" semantics) rather than only the unbinned
// row — otherwise a binned product always looks like it has zero available
// until the exact bin holding it is guessed.
function availableFor(line: LineForm): number {
  if (!line.productId) return 0
  const matches = line.sourceBinId
    ? stockLevels.value.filter((s) => s.productId === line.productId && s.binId === line.sourceBinId)
    : stockLevels.value.filter((s) => s.productId === line.productId)
  const baseAvailable = matches.reduce((sum, s) => sum + s.quantityOnHand, 0)
  return baseAvailable / conversionFactorFor(line.productId, line.unitOfMeasureId)
}

function batchOptionsFor(line: LineForm) {
  if (!line.productId) return []
  return productBatches.value.filter((b) => b.productId === line.productId).map((b) => ({ label: b.batchNumber, value: b.batchNumber }))
}

function onFormCompanyChanged() {
  form.sourceWarehouseId = undefined
  form.destinationWarehouseId = undefined
  form.lines = []
  addLineProductId.value = undefined
  stockLevels.value = []
  productBatches.value = []
}

async function onSourceWarehouseChanged(warehouseId: number | undefined) {
  form.lines = []
  addLineProductId.value = undefined
  stockLevels.value = []
  productBatches.value = []
  if (form.destinationWarehouseId === warehouseId) form.destinationWarehouseId = undefined
  if (!warehouseId) return
  const [stockRes, serialRes] = await Promise.all([
    listStockLevels({ warehouseId, size: 500 }),
    listSerialNumbers({ warehouseId, status: 'IN_STOCK', size: 500 })
  ])
  stockLevels.value = stockRes.data.map((s: any) => ({ productId: s.productId, binId: s.binId, quantityOnHand: s.quantityOnHand }))
  productBatches.value = [
    ...new Map(
      serialRes.data
        .filter((s: any) => s.batchNumber)
        .map((s: any) => [`${s.productId}:${s.batchNumber}`, { productId: s.productId, batchNumber: s.batchNumber as string }])
    ).values()
  ]
}

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  const product = products.value.find((p) => p.id === addLineProductId.value)
  form.lines.push({
    productId: addLineProductId.value,
    quantityRequested: undefined,
    unitOfMeasureId: product?.unitOfMeasureId,
    sourceBinId: undefined,
    destinationBinId: undefined,
    batchNumber: ''
  })
  ensureProductUomOptions(addLineProductId.value)
  addLineProductId.value = undefined
}

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => JSON.stringify(form) !== formSnapshot.value)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/stock-transfers')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/stock-transfers')
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.sourceWarehouseId || !form.destinationWarehouseId || !form.requestDate) {
    formError.value = 'Please fill in company, source warehouse, destination warehouse, and request date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantityRequested)) {
    formError.value = 'Every line needs a product and quantity'
    return
  }
  for (const line of form.lines) {
    if (trackingTypeFor(line.productId) === 'BATCH' && !line.batchNumber) {
      formError.value = 'Every batch-tracked line needs a batch/lot selected'
      return
    }
  }
  const payload: StockTransferPayload = {
    companyId: form.companyId,
    sourceWarehouseId: form.sourceWarehouseId,
    destinationWarehouseId: form.destinationWarehouseId,
    requestDate: form.requestDate,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({
      productId: l.productId!,
      quantityRequested: l.quantityRequested!,
      unitOfMeasureId: l.unitOfMeasureId,
      sourceBinId: l.sourceBinId,
      destinationBinId: l.destinationBinId,
      batchNumber: l.batchNumber || undefined
    }))
  }
  saving.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock transfer requested', color: 'success' })
    router.push('/stock-transfers')
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

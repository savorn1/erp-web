<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">New stock adjustment</h1>
    </div>

    <div v-if="loadingLookups" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-scale" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Adjustment details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onFormCompanyChanged" />
            </UFormField>
            <UFormField label="Adjustment date" required>
              <UInput v-model="form.adjustmentDate" type="date" class="w-full" />
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
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line items</h2>
            </div>
          </template>

          <div class="flex flex-wrap items-end gap-2 mb-4">
            <UFormField label="Product" class="flex-1 min-w-[240px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="productOptionsFor(form.companyId)"
                value-key="value"
                :disabled="!form.warehouseId"
                :placeholder="form.warehouseId ? 'Search products…' : 'Pick a warehouse first'"
                class="w-full"
              />
            </UFormField>
            <UButton icon="i-lucide-plus" :disabled="!addLineProductId" @click="addLine">Add line</UButton>
          </div>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No line items yet
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <div class="min-w-[880px]">
              <div
                class="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
              >
                <span class="col-span-3">Product</span>
                <span class="col-span-2">Reason</span>
                <span class="col-span-2">Bin</span>
                <span class="col-span-2">Qty</span>
                <span class="col-span-2">Available</span>
                <span class="col-span-1" />
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <div v-for="(line, i) in form.lines" :key="i" class="px-3 py-2 space-y-2">
                  <div class="grid grid-cols-12 gap-2 items-center">
                    <div class="col-span-3 min-w-0">
                      <p class="text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</p>
                      <p v-if="trackingTypeFor(line.productId) !== 'NONE'" class="text-xs text-gray-400">
                        {{ trackingTypeFor(line.productId) === 'BATCH' ? 'Batch tracked' : 'Serial tracked' }}
                      </p>
                    </div>
                    <USelect
                      v-model="line.reason"
                      :items="reasonOptions"
                      placeholder="Reason"
                      class="col-span-2"
                      @update:model-value="resetLineTracking(line)"
                    />
                    <USelect
                      v-model="line.binId"
                      :items="binOptionsForWarehouse"
                      placeholder="No bin"
                      class="col-span-2"
                      @update:model-value="onBinChanged(line)"
                    />
                    <UInput
                      v-model.number="line.quantity"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      :placeholder="trackingTypeFor(line.productId) === 'SERIAL' ? 'From serials' : 'Qty'"
                      :disabled="trackingTypeFor(line.productId) === 'SERIAL'"
                      class="col-span-2"
                    />
                    <span class="col-span-2 text-xs" :class="exceedsAvailable(line) ? 'text-error' : 'text-gray-400'">
                      {{ availableFor(line) }}<span v-if="exceedsAvailable(line)"> — not enough</span>
                    </span>
                    <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1 justify-self-end" @click="form.lines.splice(i, 1)" />
                  </div>

                  <!-- Tracking details need the full row width, so they sit under the
                       aligned columns rather than inside them. -->
                  <template v-if="trackingTypeFor(line.productId) === 'BATCH'">
                    <!-- Known batches are only discoverable via serial-number records, which a
                         batch-tracked product doesn't have — so the picker is offered when we
                         happen to know some, and free text otherwise, rather than a dropdown
                         that can't be populated blocking the line entirely. -->
                    <USelect
                      v-if="line.reason && !isIncreaseReason(line.reason) && batchOptionsFor(line).length > 0"
                      v-model="line.batchNumber"
                      :items="batchOptionsFor(line)"
                      placeholder="Select existing batch / lot"
                      class="w-full"
                    />
                    <UInput
                      v-else-if="line.reason && !isIncreaseReason(line.reason)"
                      v-model="line.batchNumber"
                      placeholder="Batch / lot number being adjusted"
                      class="w-full"
                    />
                    <div v-else class="grid grid-cols-2 gap-2">
                      <UInput v-model="line.batchNumber" placeholder="Batch / lot number (new or existing)" />
                      <UInput v-model="line.expirationDate" type="date" placeholder="Expiration date" />
                    </div>
                  </template>

                  <template v-else-if="trackingTypeFor(line.productId) === 'SERIAL'">
                    <UTextarea
                      v-if="isIncreaseReason(line.reason)"
                      v-model="line.serialNumbersText"
                      placeholder="One new serial number per line"
                      :rows="3"
                      class="w-full"
                      @update:model-value="syncSerialQuantity(line)"
                    />
                    <USelectMenu
                      v-else
                      v-model="line.selectedSerials"
                      multiple
                      :items="serialOptionsFor(line)"
                      value-key="value"
                      placeholder="Select existing serial numbers"
                      class="w-full"
                      @update:model-value="syncSerialQuantity(line)"
                    />
                    <p class="text-xs text-gray-400">{{ serialCountFor(line) }} serial number(s) — quantity follows this count</p>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">Request adjustment</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard this adjustment?"
      description="You have unsaved changes on this stock adjustment. Leaving now will discard them."
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
import { isIncreaseReason, type StockAdjustmentPayload, type StockAdjustmentReason } from '~/composables/useStockAdjustments'

definePageMeta({ middleware: 'admin' })

const router = useRouter()
const { create } = useStockAdjustments()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listBins } = useWarehouseBins()
const { list: listStockLevels } = useStockLevels()
const { list: listSerialNumbers } = useSerialNumbers()
const toast = useToast()

const loadingLookups = ref(true)
const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string; trackingType: string }[]>([])
const bins = ref<{ id: number; name: string; warehouseId: number | null; active: boolean }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const reasonOptions = [
  { label: 'Stock increase', value: 'STOCK_INCREASE' },
  { label: 'Opening balance', value: 'OPENING_BALANCE' },
  { label: 'Stock decrease', value: 'STOCK_DECREASE' },
  { label: 'Damaged', value: 'DAMAGED' },
  { label: 'Lost', value: 'LOST' },
  { label: 'Expired', value: 'EXPIRED' }
]

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

interface LineForm {
  productId: number | undefined
  reason: StockAdjustmentReason | undefined
  quantity: number | undefined
  binId: number | undefined
  batchNumber: string
  expirationDate: string
  serialNumbersText: string
  selectedSerials: string[]
}

const saving = ref(false)
const formError = ref('')
const stockLevels = ref<{ productId: number; binId: number | null; quantityOnHand: number }[]>([])
const availableSerials = ref<{ productId: number; binId: number | null; serialNumber: string }[]>([])
const productBatches = ref<{ productId: number; batchNumber: string }[]>([])

const form = reactive<{
  companyId: number | undefined
  warehouseId: number | undefined
  adjustmentDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  warehouseId: undefined,
  adjustmentDate: new Date().toISOString().slice(0, 10),
  notes: '',
  lines: []
})

const binOptionsForWarehouse = computed(() => [
  { label: 'No bin', value: undefined },
  ...bins.value.filter((b) => b.active && b.warehouseId === form.warehouseId).map((b) => ({ label: b.name, value: b.id }))
])

function availableFor(line: LineForm): number {
  if (!line.productId) return 0
  const match = stockLevels.value.find((s) => s.productId === line.productId && (line.binId ? s.binId === line.binId : s.binId === null))
  return match ? match.quantityOnHand : 0
}

function batchOptionsFor(line: LineForm) {
  if (!line.productId) return []
  return productBatches.value.filter((b) => b.productId === line.productId).map((b) => ({ label: b.batchNumber, value: b.batchNumber }))
}

function serialOptionsFor(line: LineForm) {
  if (!line.productId) return []
  return availableSerials.value
    .filter((s) => s.productId === line.productId && (line.binId ? s.binId === line.binId : s.binId === null))
    .map((s) => ({ label: s.serialNumber, value: s.serialNumber }))
}

function serialCountFor(line: LineForm): number {
  if (isIncreaseReason(line.reason)) {
    return line.serialNumbersText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length
  }
  return line.selectedSerials.length
}

function resetLineTracking(line: LineForm) {
  line.batchNumber = ''
  line.expirationDate = ''
  line.serialNumbersText = ''
  line.selectedSerials = []
  syncSerialQuantity(line)
}

// For serial-tracked lines the quantity isn't an independent input — it's exactly how many
// serials were listed or picked. Deriving it removes the double entry (and with it the
// whole "expected N serial numbers" class of submit error).
function syncSerialQuantity(line: LineForm) {
  if (trackingTypeFor(line.productId) === 'SERIAL') {
    line.quantity = serialCountFor(line)
  }
}

// Only the pickers that read *existing* stock are bin-scoped: serials come from
// serialOptionsFor(bin) and a chosen batch from that bin's known list. Serials and batch
// numbers typed for an increase are new stock the user is entering, so they survive.
function onBinChanged(line: LineForm) {
  if (isIncreaseReason(line.reason)) return
  line.selectedSerials = []
  line.batchNumber = ''
  syncSerialQuantity(line)
}

function exceedsAvailable(line: LineForm): boolean {
  return !isIncreaseReason(line.reason) && (line.quantity ?? 0) > availableFor(line)
}

function onFormCompanyChanged() {
  form.warehouseId = undefined
  form.lines = []
  addLineProductId.value = undefined
  stockLevels.value = []
  availableSerials.value = []
  productBatches.value = []
}

async function onWarehouseChanged(warehouseId: number | undefined) {
  form.lines = []
  addLineProductId.value = undefined
  stockLevels.value = []
  availableSerials.value = []
  productBatches.value = []
  if (!warehouseId) return
  const [stockRes, serialRes] = await Promise.all([
    listStockLevels({ warehouseId, size: 500 }),
    listSerialNumbers({ warehouseId, status: 'IN_STOCK', size: 500 })
  ])
  stockLevels.value = stockRes.data.map((s: any) => ({ productId: s.productId, binId: s.binId, quantityOnHand: s.quantityOnHand }))
  availableSerials.value = serialRes.data.map((s: any) => ({ productId: s.productId, binId: s.binId, serialNumber: s.serialNumber }))
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
  form.lines.push({
    productId: addLineProductId.value,
    reason: undefined,
    quantity: undefined,
    binId: undefined,
    batchNumber: '',
    expirationDate: '',
    serialNumbersText: '',
    selectedSerials: []
  })
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
    router.push('/stock-adjustments')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/stock-adjustments')
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.warehouseId || !form.adjustmentDate) {
    formError.value = 'Please fill in company, warehouse, and adjustment date'
    return
  }
  if (form.lines.length === 0) {
    formError.value = 'Add at least one line item'
    return
  }
  // Errors name the offending line — with several lines on screen, "one of the decrease
  // lines" left you hunting for which one.
  for (const [index, line] of form.lines.entries()) {
    const label = `Line ${index + 1}`
    if (!line.reason) {
      formError.value = `${label}: pick a reason`
      return
    }
    const trackingType = trackingTypeFor(line.productId)
    if (!line.quantity) {
      formError.value = trackingType === 'SERIAL' ? `${label}: add at least one serial number` : `${label}: enter a quantity`
      return
    }
    if (trackingType === 'BATCH' && !line.batchNumber) {
      formError.value = `${label}: enter the batch / lot number`
      return
    }
    if (exceedsAvailable(line)) {
      formError.value = `${label}: only ${availableFor(line)} in stock, cannot remove ${line.quantity}`
      return
    }
  }
  const payload: StockAdjustmentPayload = {
    companyId: form.companyId,
    warehouseId: form.warehouseId,
    adjustmentDate: form.adjustmentDate,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => {
      const trackingType = trackingTypeFor(l.productId)
      return {
        productId: l.productId!,
        binId: l.binId,
        reason: l.reason!,
        quantity: l.quantity!,
        batchNumber: trackingType === 'BATCH' ? l.batchNumber : undefined,
        expirationDate: trackingType === 'BATCH' && isIncreaseReason(l.reason) && l.expirationDate ? l.expirationDate : undefined,
        serialNumbers:
          trackingType === 'SERIAL'
            ? isIncreaseReason(l.reason)
              ? l.serialNumbersText
                  .split('\n')
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
              : l.selectedSerials
            : undefined
      }
    })
  }
  saving.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock adjustment requested', color: 'success' })
    router.push('/stock-adjustments')
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

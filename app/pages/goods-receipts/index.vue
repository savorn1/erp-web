<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Goods receipts</h1>
      <UButton icon="i-lucide-plus" :disabled="receivablePoOptions.length === 0" @click="openCreate()"> New receipt </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && receivablePoOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="Nothing to receive"
      description="Submit a purchase order first — only submitted or partially-received orders can be received against."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search receipt number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
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
        export-filename="goods-receipts"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <NuxtLink v-if="row.status === 'COMPLETED'" :to="`/purchase-invoices?fromGoodsReceiptId=${row.id}`">
              <UButton size="xs" color="info" variant="soft" icon="i-lucide-receipt">Invoice</UButton>
            </NuxtLink>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No receipts match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-package-check" title="No receipts yet" description="Post the first goods receipt to get started.">
            <template #action>
              <UButton :disabled="receivablePoOptions.length === 0" icon="i-lucide-plus" @click="openCreate()">New receipt</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New goods receipt" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <UFormField label="Purchase order" required class="sm:col-span-2">
            <USelect
              v-model="createPoId"
              :items="receivablePoOptions"
              placeholder="Select a submitted purchase order"
              class="w-full"
              @update:model-value="onPoSelected"
            />
          </UFormField>
          <UFormField label="Receipt date" required>
            <UInput v-model="createReceiptDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Notes">
            <UInput v-model="createNotes" class="w-full" />
          </UFormField>
        </div>

        <template v-if="createPoId">
          <div v-if="loadingPoDetail" class="text-sm text-gray-400 py-6 text-center">Loading order lines…</div>
          <template v-else>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines to receive</p>
            <EmptyState
              v-if="createLines.length === 0"
              icon="i-lucide-check-circle"
              title="Nothing outstanding"
              description="Every line on this order has already been fully received."
            />
            <div v-else class="space-y-3 mb-4">
              <div v-for="line in createLines" :key="line.purchaseOrderLineId" class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ line.productName }} ({{ line.productSku }})</span>
                  <span class="text-xs text-gray-400 shrink-0">Remaining: {{ line.remaining }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <UInput v-model.number="line.quantityReceived" type="number" min="0" :max="line.remaining" step="0.0001" placeholder="Quantity to receive" />
                  <USelect v-model="line.binId" :items="binOptionsForWarehouse" placeholder="No bin" />
                </div>

                <div v-if="line.trackingType === 'BATCH'" class="grid grid-cols-2 gap-2">
                  <UInput v-model="line.batchNumber" placeholder="Batch / lot number" required />
                  <UInput v-model="line.expirationDate" type="date" placeholder="Expiration date" />
                </div>

                <div v-else-if="line.trackingType === 'SERIAL'">
                  <UTextarea v-model="line.serialNumbersText" placeholder="One serial number per line" :rows="3" class="w-full" />
                  <p class="text-xs mt-1" :class="parsedSerials(line).length === line.quantityReceived ? 'text-gray-400' : 'text-error'">
                    {{ parsedSerials(line).length }} of {{ line.quantityReceived }} serial number(s) entered
                  </p>
                </div>
              </div>
            </div>
          </template>
        </template>

        <UAlert v-if="createError" color="error" variant="subtle" class="mb-3" :title="createError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" :disabled="createLines.length === 0" @click="onCreateSubmit">Post receipt</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showView" :title="`Receipt — ${viewingReceipt?.receiptNumber ?? ''}`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingReceipt">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt class="text-gray-400">Purchase order</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingReceipt.poNumber }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Warehouse</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingReceipt.warehouseName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Receipt date</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingReceipt.receiptDate) }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Posted by</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingReceipt.createdBy ?? '—' }}</dd>
            </div>
            <div v-if="viewingReceipt.notes" class="col-span-2">
              <dt class="text-gray-400">Notes</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingReceipt.notes }}</dd>
            </div>
          </dl>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines received</p>
          <ul class="space-y-1.5">
            <li v-for="line in viewingReceipt.lines" :key="line.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
              <div class="flex items-center justify-between gap-2">
                <span>{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-gray-500 dark:text-gray-400 shrink-0"
                  >{{ line.quantityReceived }}<span v-if="line.binName"> — {{ line.binName }}</span></span
                >
              </div>
              <p v-if="line.batchNumber" class="text-xs text-gray-400 mt-0.5">
                Batch {{ line.batchNumber }}<span v-if="line.expirationDate"> · expires {{ formatDate(line.expirationDate) }}</span>
              </p>
              <p v-if="line.serialNumbers && line.serialNumbers.length > 0" class="text-xs text-gray-400 mt-0.5">
                Serials: {{ line.serialNumbers.join(', ') }}
              </p>
              <div class="flex items-center justify-between gap-2 mt-1.5">
                <StatusBadge :status="line.qualityStatus" />
                <div v-if="line.qualityStatus === 'PENDING'" class="flex items-center gap-1.5">
                  <UButton
                    size="xs"
                    color="success"
                    variant="soft"
                    icon="i-lucide-check"
                    :loading="checkingLineId === line.id"
                    @click="openQualityCheck(line, 'PASSED')"
                  >
                    Pass
                  </UButton>
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    icon="i-lucide-x"
                    :loading="checkingLineId === line.id"
                    @click="openQualityCheck(line, 'FAILED')"
                  >
                    Fail
                  </UButton>
                </div>
                <p v-else-if="line.qualityNotes" class="text-xs text-gray-400">{{ line.qualityNotes }}</p>
              </div>
            </li>
          </ul>
        </template>
      </template>
    </UModal>

    <UModal
      v-model:open="showQualityCheck"
      :title="`${qualityCheckResult === 'PASSED' ? 'Pass' : 'Fail'} quality check — ${qualityCheckLine?.productName ?? ''}`"
    >
      <template #body>
        <UFormField label="Notes">
          <UTextarea v-model="qualityCheckNotes" class="w-full" placeholder="Optional inspection notes" />
        </UFormField>
        <UAlert v-if="qualityCheckError" color="error" variant="subtle" class="mt-3" :title="qualityCheckError" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" :disabled="checkingLineId !== null" @click="showQualityCheck = false">Cancel</UButton>
          <UButton :color="qualityCheckResult === 'PASSED' ? 'success' : 'error'" :loading="checkingLineId !== null" @click="onQualityCheckSubmit">
            Confirm {{ qualityCheckResult === 'PASSED' ? 'pass' : 'fail' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { GoodsReceipt, GoodsReceiptLine, GoodsReceiptPayload, GoodsReceiptStatus } from '~/composables/useGoodsReceipts'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, get, create, qualityCheck } = useGoodsReceipts()
const { list: listPurchaseOrders, get: getPurchaseOrder } = usePurchaseOrders()
const { list: listWarehouses } = useWarehouses()
const { list: listZones } = useWarehouseZones()
const { list: listBins } = useWarehouseBins()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<GoodsReceipt[]>([])
const loading = ref(false)
const error = ref('')

const purchaseOrders = ref<{ id: number; poNumber: string; status: string; warehouseId: number }[]>([])
const warehouses = ref<{ id: number; name: string }[]>([])
const zones = ref<{ id: number; warehouseId: number }[]>([])
const bins = ref<{ id: number; name: string; zoneId: number; active: boolean }[]>([])
const products = ref<{ id: number; trackingType: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [po, w, z, b, p] = await Promise.all([
      listPurchaseOrders({ size: 200 }),
      listWarehouses({ size: 200 }),
      listZones({ size: 200 }),
      listBins({ size: 200 }),
      listProducts({ size: 200 })
    ])
    purchaseOrders.value = po.data
    warehouses.value = w.data
    zones.value = z.data
    bins.value = b.data
    products.value = p.data
  } finally {
    loadingLookups.value = false
  }
}

const receivablePoOptions = computed(() =>
  purchaseOrders.value.filter((p) => p.status === 'SENT' || p.status === 'PARTIALLY_RECEIVED').map((p) => ({ label: p.poNumber, value: p.id }))
)
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Pending QC', value: 'PENDING_QC' },
  { label: 'Completed', value: 'COMPLETED' }
]

const filter = reactive<{ warehouseId: number | undefined; status: GoodsReceiptStatus | undefined }>({ warehouseId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['receiptNumber'] })

const columns: ColumnDef<GoodsReceipt>[] = [
  { key: 'receiptNumber', label: 'Receipt number', sortable: true },
  { key: 'poNumber', label: 'PO number', value: (row) => row.poNumber ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'receiptDate', label: 'Receipt date', type: 'date' },
  { key: 'createdBy', label: 'Posted by', value: (row) => row.createdBy ?? '—' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      warehouseId: filter.warehouseId,
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

interface ReceiveLine {
  purchaseOrderLineId: number
  productId: number
  productName: string
  productSku: string
  trackingType: string
  remaining: number
  quantityReceived: number
  binId: number | undefined
  batchNumber: string
  expirationDate: string
  serialNumbersText: string
}

function parsedSerials(line: ReceiveLine): string[] {
  return line.serialNumbersText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const showCreate = ref(false)
const createPoId = ref<number | undefined>(undefined)
const createReceiptDate = ref(new Date().toISOString().slice(0, 10))
const createNotes = ref('')
const createLines = ref<ReceiveLine[]>([])
const loadingPoDetail = ref(false)
const creating = ref(false)
const createError = ref('')

const binOptionsForWarehouse = computed(() => {
  const po = purchaseOrders.value.find((p) => p.id === createPoId.value)
  if (!po) return []
  const zoneIds = new Set(zones.value.filter((z) => z.warehouseId === po.warehouseId).map((z) => z.id))
  return bins.value.filter((b) => b.active && zoneIds.has(b.zoneId)).map((b) => ({ label: b.name, value: b.id }))
})

function openCreate(poId?: number) {
  createPoId.value = poId
  createReceiptDate.value = new Date().toISOString().slice(0, 10)
  createNotes.value = ''
  createLines.value = []
  createError.value = ''
  showCreate.value = true
  if (poId) onPoSelected(poId)
}

async function onPoSelected(poId: number | undefined) {
  createLines.value = []
  if (!poId) return
  loadingPoDetail.value = true
  try {
    const detail = await getPurchaseOrder(poId)
    createLines.value = (detail.lines ?? [])
      .map((l) => ({
        purchaseOrderLineId: l.id,
        productId: l.productId,
        productName: l.productName ?? '',
        productSku: l.productSku ?? '',
        trackingType: products.value.find((p) => p.id === l.productId)?.trackingType ?? 'NONE',
        remaining: l.quantityOrdered - l.quantityReceived,
        quantityReceived: l.quantityOrdered - l.quantityReceived,
        binId: undefined,
        batchNumber: '',
        expirationDate: '',
        serialNumbersText: ''
      }))
      .filter((l) => l.remaining > 0)
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    loadingPoDetail.value = false
  }
}

async function onCreateSubmit() {
  if (!createPoId.value) return
  createError.value = ''
  const linesToSend = createLines.value.filter((l) => l.quantityReceived > 0)
  if (linesToSend.length === 0) {
    createError.value = 'Enter a quantity for at least one line'
    return
  }
  for (const line of linesToSend) {
    if (line.trackingType === 'BATCH' && !line.batchNumber.trim()) {
      createError.value = `${line.productName} is batch-tracked — enter a batch/lot number`
      return
    }
    if (line.trackingType === 'SERIAL' && parsedSerials(line).length !== line.quantityReceived) {
      createError.value = `${line.productName} is serial-tracked — enter exactly ${line.quantityReceived} serial number(s)`
      return
    }
  }
  const payload: GoodsReceiptPayload = {
    purchaseOrderId: createPoId.value,
    receiptDate: createReceiptDate.value,
    notes: createNotes.value || undefined,
    lines: linesToSend.map((l) => ({
      purchaseOrderLineId: l.purchaseOrderLineId,
      quantityReceived: l.quantityReceived,
      binId: l.binId,
      batchNumber: l.trackingType === 'BATCH' ? l.batchNumber.trim() : undefined,
      expirationDate: l.trackingType === 'BATCH' && l.expirationDate ? l.expirationDate : undefined,
      serialNumbers: l.trackingType === 'SERIAL' ? parsedSerials(l) : undefined
    }))
  }
  creating.value = true
  try {
    await create(payload)
    toast.add({ title: 'Goods receipt posted — awaiting quality check', color: 'success' })
    showCreate.value = false
    await Promise.all([load(), loadLookups()])
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const showView = ref(false)
const viewingReceipt = ref<GoodsReceipt | null>(null)
const loadingView = ref(false)
async function openView(row: GoodsReceipt) {
  showView.value = true
  loadingView.value = true
  try {
    viewingReceipt.value = await get(row.id)
  } finally {
    loadingView.value = false
  }
}

// ── Quality check ────────────────────────────────────────────────────────
const showQualityCheck = ref(false)
const qualityCheckLine = ref<GoodsReceiptLine | null>(null)
const qualityCheckResult = ref<'PASSED' | 'FAILED'>('PASSED')
const qualityCheckNotes = ref('')
const qualityCheckError = ref('')
const checkingLineId = ref<number | null>(null)

function openQualityCheck(line: GoodsReceiptLine, result: 'PASSED' | 'FAILED') {
  qualityCheckLine.value = line
  qualityCheckResult.value = result
  qualityCheckNotes.value = ''
  qualityCheckError.value = ''
  showQualityCheck.value = true
}

async function onQualityCheckSubmit() {
  if (!viewingReceipt.value || !qualityCheckLine.value) return
  qualityCheckError.value = ''
  checkingLineId.value = qualityCheckLine.value.id
  try {
    viewingReceipt.value = await qualityCheck(viewingReceipt.value.id, qualityCheckLine.value.id, {
      status: qualityCheckResult.value,
      notes: qualityCheckNotes.value || undefined
    })
    showQualityCheck.value = false
    toast.add({ title: qualityCheckResult.value === 'PASSED' ? 'Passed — stock updated' : 'Marked as failed', color: 'success' })
    await load()
  } catch (err) {
    qualityCheckError.value = apiErrorMessage(err)
  } finally {
    checkingLineId.value = null
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
  const poIdParam = Number(route.query.poId)
  if (poIdParam) openCreate(poIdParam)
})
watch(sort, load)
watch(() => [filter.warehouseId, filter.status], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.warehouseId !== undefined || filter.status !== undefined)
function clearFilters() {
  search.value = ''
  filter.warehouseId = undefined
  filter.status = undefined
  load()
}
</script>

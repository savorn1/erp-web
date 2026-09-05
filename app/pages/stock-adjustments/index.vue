<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Stock adjustments</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">
        New adjustment
      </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company and warehouse first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search adjustment number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
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
        export-filename="stock-adjustments"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <UButton v-if="row.status === 'PENDING'" size="xs" color="success" variant="soft" icon="i-lucide-check" :loading="actingId === row.id" @click="onApprove(row)">
              Approve
            </UButton>
            <UButton v-if="row.status === 'PENDING'" size="xs" color="error" variant="soft" icon="i-lucide-x" :loading="actingId === row.id" @click="onReject(row)">
              Reject
            </UButton>
            <UButton v-if="row.status === 'PENDING'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No stock adjustments match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-scale" title="No stock adjustments yet" description="Request the first stock adjustment to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New adjustment</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Create (request) modal -->
    <UModal v-model:open="showCreate" title="New stock adjustment" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</p>
          <UButton size="xs" variant="soft" icon="i-lucide-plus" :disabled="!form.warehouseId" @click="addLine">Add line</UButton>
        </div>

        <div class="space-y-3 mb-4">
          <div v-if="form.lines.length === 0" class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
            No line items yet
          </div>
          <div
            v-for="(line, i) in form.lines"
            :key="i"
            class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2"
          >
            <div class="grid grid-cols-12 gap-2 items-center">
              <USelect
                v-model="line.productId"
                :items="productOptionsFor(form.companyId)"
                placeholder="Product"
                class="col-span-5"
                @update:model-value="resetLineTracking(line)"
              />
              <USelect v-model="line.reason" :items="reasonOptions" placeholder="Reason" class="col-span-3" @update:model-value="resetLineTracking(line)" />
              <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" class="col-span-2" />
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-2" @click="form.lines.splice(i, 1)" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <USelect v-model="line.binId" :items="binOptionsForWarehouse" placeholder="No bin" />
              <span v-if="line.reason && line.reason !== 'STOCK_INCREASE'" class="text-xs text-gray-400 self-center">
                Available: {{ availableFor(line) }}
              </span>
            </div>

            <template v-if="trackingTypeFor(line.productId) === 'BATCH'">
              <USelect
                v-if="line.reason && line.reason !== 'STOCK_INCREASE'"
                v-model="line.batchNumber"
                :items="batchOptionsFor(line)"
                placeholder="Select existing batch / lot"
                class="w-full"
              />
              <div v-else class="grid grid-cols-2 gap-2">
                <UInput v-model="line.batchNumber" placeholder="Batch / lot number (new or existing)" />
                <UInput v-model="line.expirationDate" type="date" placeholder="Expiration date" />
              </div>
            </template>

            <template v-else-if="trackingTypeFor(line.productId) === 'SERIAL'">
              <UTextarea
                v-if="line.reason === 'STOCK_INCREASE'"
                v-model="line.serialNumbersText"
                placeholder="One new serial number per line"
                :rows="3"
                class="w-full"
              />
              <USelectMenu
                v-else
                v-model="line.selectedSerials"
                multiple
                :items="serialOptionsFor(line)"
                value-key="value"
                placeholder="Select existing serial numbers"
                class="w-full"
              />
              <p class="text-xs" :class="serialCountFor(line) === (line.quantity || 0) ? 'text-gray-400' : 'text-error'">
                {{ serialCountFor(line) }} of {{ line.quantity || 0 }} serial number(s)
              </p>
            </template>
          </div>
        </div>

        <UAlert v-if="createError" color="error" variant="subtle" class="mb-3" :title="createError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" @click="onCreateSubmit">Request adjustment</UButton>
        </div>
      </template>
    </UModal>

    <!-- View modal -->
    <UModal v-model:open="showView" :title="`Adjustment — ${viewingAdjustment?.adjustmentNumber ?? ''}`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingAdjustment">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><dt class="text-gray-400">Warehouse</dt><dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.warehouseName }}</dd></div>
            <div><dt class="text-gray-400">Status</dt><dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.status }}</dd></div>
            <div><dt class="text-gray-400">Requested</dt><dd class="text-gray-900 dark:text-white">{{ formatDate(viewingAdjustment.adjustmentDate) }} by {{ viewingAdjustment.requestedBy ?? '—' }}</dd></div>
            <div v-if="viewingAdjustment.approvedBy"><dt class="text-gray-400">Resolved by</dt><dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.approvedBy }}<span v-if="viewingAdjustment.approvalDate"> on {{ formatDate(viewingAdjustment.approvalDate) }}</span></dd></div>
            <div v-if="viewingAdjustment.notes" class="col-span-2"><dt class="text-gray-400">Notes</dt><dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.notes }}</dd></div>
          </dl>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines</p>
          <ul class="space-y-1.5">
            <li
              v-for="line in viewingAdjustment.lines"
              :key="line.id"
              class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5"
            >
              <div class="flex items-center justify-between">
                <span>{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-gray-500 dark:text-gray-400">
                  <span :class="line.reason === 'STOCK_INCREASE' ? 'text-success' : 'text-error'">{{ line.reason === 'STOCK_INCREASE' ? '+' : '-' }}{{ line.quantity }}</span>
                  <span v-if="line.binName"> — {{ line.binName }}</span>
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">{{ reasonLabel(line.reason) }}</p>
              <p v-if="line.batchNumber" class="text-xs text-gray-400 mt-0.5">
                Batch {{ line.batchNumber }}<span v-if="line.expirationDate"> · expires {{ formatDate(line.expirationDate) }}</span>
              </p>
              <p v-if="line.serialNumbers && line.serialNumbers.length > 0" class="text-xs text-gray-400 mt-0.5">
                Serials: {{ line.serialNumbers.join(', ') }}
              </p>
            </li>
          </ul>
        </template>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete stock adjustment"
      :description="`Delete adjustment '${confirmDelete?.adjustmentNumber ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockAdjustment, StockAdjustmentPayload, StockAdjustmentReason, StockAdjustmentStatus } from '~/composables/useStockAdjustments'

definePageMeta({ middleware: 'admin' })

const { list, get, create, approve, reject, remove } = useStockAdjustments()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listBins } = useWarehouseBins()
const { list: listStockLevels } = useStockLevels()
const { list: listSerialNumbers } = useSerialNumbers()
const toast = useToast()

const rows = ref<StockAdjustment[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string; trackingType: string }[]>([])
const bins = ref<{ id: number; name: string; warehouseId: number | null; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, w, p, b] = await Promise.all([
      listCompanies({ size: 200 }),
      listWarehouses({ size: 200 }),
      listProducts({ size: 200 }),
      listBins({ size: 200 })
    ])
    companies.value = c.data
    warehouses.value = w.data
    products.value = p.data
    bins.value = b.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' }
]
const reasonOptions = [
  { label: 'Stock increase', value: 'STOCK_INCREASE' },
  { label: 'Stock decrease', value: 'STOCK_DECREASE' },
  { label: 'Damaged', value: 'DAMAGED' },
  { label: 'Lost', value: 'LOST' },
  { label: 'Expired', value: 'EXPIRED' }
]
function reasonLabel(reason: string) {
  return reasonOptions.find((r) => r.value === reason)?.label ?? reason
}

function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId))
    .map((w) => ({ label: w.name, value: w.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value.filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function trackingTypeFor(productId: number | undefined) {
  return products.value.find((p) => p.id === productId)?.trackingType ?? 'NONE'
}

const filter = reactive<{ warehouseId: number | undefined; status: StockAdjustmentStatus | undefined }>({ warehouseId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['adjustmentNumber'] })

const columns: ColumnDef<StockAdjustment>[] = [
  { key: 'adjustmentNumber', label: 'Adjustment number', sortable: true },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'adjustmentDate', label: 'Date', type: 'date' },
  { key: 'requestedBy', label: 'Requested by', value: (row) => row.requestedBy ?? '—' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ warehouseId: filter.warehouseId, status: filter.status, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

// ── Create (request) ──────────────────────────────────────────────────────

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

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
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
  if (line.reason === 'STOCK_INCREASE') {
    return line.serialNumbersText.split('\n').map((s) => s.trim()).filter((s) => s.length > 0).length
  }
  return line.selectedSerials.length
}

function resetLineTracking(line: LineForm) {
  line.batchNumber = ''
  line.expirationDate = ''
  line.serialNumbersText = ''
  line.selectedSerials = []
}

async function onFormCompanyChanged() {
  form.warehouseId = undefined
  form.lines = []
  stockLevels.value = []
  availableSerials.value = []
  productBatches.value = []
}

async function onWarehouseChanged(warehouseId: number | undefined) {
  form.lines = []
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
  productBatches.value = [...new Map(
    serialRes.data
      .filter((s: any) => s.batchNumber)
      .map((s: any) => [`${s.productId}:${s.batchNumber}`, { productId: s.productId, batchNumber: s.batchNumber as string }])
  ).values()]
}

function addLine() {
  form.lines.push({ productId: undefined, reason: undefined, quantity: undefined, binId: undefined, batchNumber: '', expirationDate: '', serialNumbersText: '', selectedSerials: [] })
}

function openCreate() {
  createError.value = ''
  form.companyId = activeCompanyOptions.value[0]?.value
  form.warehouseId = undefined
  form.adjustmentDate = new Date().toISOString().slice(0, 10)
  form.notes = ''
  form.lines = []
  stockLevels.value = []
  availableSerials.value = []
  productBatches.value = []
  showCreate.value = true
}

async function onCreateSubmit() {
  createError.value = ''
  if (!form.companyId || !form.warehouseId || !form.adjustmentDate) {
    createError.value = 'Please fill in company, warehouse, and adjustment date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.reason || !l.quantity)) {
    createError.value = 'Every line needs a product, reason, and quantity'
    return
  }
  for (const line of form.lines) {
    const trackingType = trackingTypeFor(line.productId)
    if (trackingType === 'BATCH' && !line.batchNumber) {
      createError.value = 'Every batch-tracked line needs a batch/lot'
      return
    }
    if (trackingType === 'SERIAL' && serialCountFor(line) !== line.quantity) {
      createError.value = `Every serial-tracked line needs exactly its quantity in serial numbers (expected ${line.quantity})`
      return
    }
    if (line.reason !== 'STOCK_INCREASE' && line.quantity! > availableFor(line)) {
      createError.value = `Only ${availableFor(line)} available in stock for one of the decrease lines`
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
        expirationDate: trackingType === 'BATCH' && l.reason === 'STOCK_INCREASE' && l.expirationDate ? l.expirationDate : undefined,
        serialNumbers: trackingType === 'SERIAL'
          ? (l.reason === 'STOCK_INCREASE' ? l.serialNumbersText.split('\n').map((s) => s.trim()).filter((s) => s.length > 0) : l.selectedSerials)
          : undefined
      }
    })
  }
  creating.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock adjustment requested', color: 'success' })
    showCreate.value = false
    await load()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

// ── Approve / reject / delete ─────────────────────────────────────────────

const actingId = ref<number | null>(null)
async function onApprove(row: StockAdjustment) {
  actingId.value = row.id
  try {
    await approve(row.id)
    toast.add({ title: 'Stock adjustment approved — stock updated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not approve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReject(row: StockAdjustment) {
  actingId.value = row.id
  try {
    await reject(row.id)
    toast.add({ title: 'Stock adjustment rejected', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reject', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<StockAdjustment | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Stock adjustment deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// ── View ───────────────────────────────────────────────────────────────────

const showView = ref(false)
const viewingAdjustment = ref<StockAdjustment | null>(null)
const loadingView = ref(false)
async function openView(row: StockAdjustment) {
  showView.value = true
  loadingView.value = true
  try {
    viewingAdjustment.value = await get(row.id)
  } finally {
    loadingView.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
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

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Stock transfers</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New transfer </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company and at least two warehouses first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search transfer number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.sourceWarehouseId" :items="warehouseFilterOptions" placeholder="Source warehouse" class="w-48" />
        <USelect v-model="filter.destinationWarehouseId" :items="warehouseFilterOptions" placeholder="Destination warehouse" class="w-48" />
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
        export-filename="stock-transfers"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <UButton
              v-if="row.status === 'REQUESTED'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onApprove(row)"
            >
              Approve
            </UButton>
            <UButton
              v-if="row.status === 'REQUESTED' || row.status === 'APPROVED'"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :loading="actingId === row.id"
              @click="onReject(row)"
            >
              Reject
            </UButton>
            <UButton v-if="row.status === 'APPROVED'" size="xs" color="info" variant="soft" icon="i-lucide-truck" @click="openShip(row)"> Ship </UButton>
            <UButton
              v-if="row.status === 'SHIPPED'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-package-check"
              :loading="actingId === row.id"
              @click="onReceive(row)"
            >
              Receive
            </UButton>
            <UButton
              v-if="row.status === 'REQUESTED' || row.status === 'APPROVED'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-ban"
              :loading="actingId === row.id"
              @click="onCancel(row)"
            >
              Cancel
            </UButton>
            <UButton v-if="row.status === 'REQUESTED'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No stock transfers match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-repeat" title="No stock transfers yet" description="Request the first stock transfer to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New transfer</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Create (request) modal -->
    <UModal v-model:open="showCreate" title="New stock transfer" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</p>
          <UButton size="xs" variant="soft" icon="i-lucide-plus" :disabled="!form.sourceWarehouseId" @click="addLine">Add line</UButton>
        </div>

        <div class="space-y-3 mb-4">
          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No line items yet
          </div>
          <div v-for="(line, i) in form.lines" :key="i" class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
            <div class="grid grid-cols-12 gap-2 items-center">
              <USelect
                v-model="line.productId"
                :items="productOptionsFor(form.companyId)"
                placeholder="Product"
                class="col-span-5"
                @update:model-value="line.batchNumber = ''"
              />
              <UInput v-model.number="line.quantityRequested" type="number" min="0.0001" step="0.0001" placeholder="Qty" class="col-span-3" />
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

        <UAlert v-if="createError" color="error" variant="subtle" class="mb-3" :title="createError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" @click="onCreateSubmit">Request transfer</UButton>
        </div>
      </template>
    </UModal>

    <!-- Ship modal -->
    <UModal v-model:open="showShip" title="Ship stock transfer" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingShipDetail" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="shippingTransfer">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {{ shippingTransfer.transferNumber }} — {{ shippingTransfer.sourceWarehouseName }} → {{ shippingTransfer.destinationWarehouseName }}
          </p>
          <div class="space-y-3 mb-4">
            <div v-for="line in shipLines" :key="line.id" class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-xs text-gray-400 shrink-0">Qty: {{ line.quantityRequested }}</span>
              </div>
              <p v-if="line.batchNumber" class="text-xs text-gray-400">Batch {{ line.batchNumber }}</p>
              <template v-if="line.trackingType === 'SERIAL'">
                <USelectMenu
                  v-model="line.selectedSerials"
                  multiple
                  :items="shipSerialOptionsFor(line)"
                  value-key="value"
                  placeholder="Select serial numbers"
                  class="w-full"
                />
                <p class="text-xs mt-1" :class="line.selectedSerials.length === line.quantityRequested ? 'text-gray-400' : 'text-error'">
                  {{ line.selectedSerials.length }} of {{ line.quantityRequested }} serial number(s) selected
                </p>
              </template>
            </div>
          </div>

          <UAlert v-if="shipError" color="error" variant="subtle" class="mb-3" :title="shipError" />

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showShip = false">Cancel</UButton>
            <UButton :loading="shipping" @click="onShipSubmit">Ship</UButton>
          </div>
        </template>
      </template>
    </UModal>

    <!-- View modal -->
    <UModal v-model:open="showView" :title="`Transfer — ${viewingTransfer?.transferNumber ?? ''}`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingTransfer">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt class="text-gray-400">Source</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingTransfer.sourceWarehouseName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Destination</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingTransfer.destinationWarehouseName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Status</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingTransfer.status }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Requested</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingTransfer.requestDate) }} by {{ viewingTransfer.requestedBy ?? '—' }}</dd>
            </div>
            <div v-if="viewingTransfer.approvedBy">
              <dt class="text-gray-400">Approved by</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingTransfer.approvedBy }}</dd>
            </div>
            <div v-if="viewingTransfer.shipDate">
              <dt class="text-gray-400">Shipped</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingTransfer.shipDate) }} by {{ viewingTransfer.shippedBy ?? '—' }}</dd>
            </div>
            <div v-if="viewingTransfer.receiveDate">
              <dt class="text-gray-400">Received</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingTransfer.receiveDate) }} by {{ viewingTransfer.receivedBy ?? '—' }}</dd>
            </div>
            <div v-if="viewingTransfer.notes" class="col-span-2">
              <dt class="text-gray-400">Notes</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingTransfer.notes }}</dd>
            </div>
          </dl>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines</p>
          <ul class="space-y-1.5">
            <li v-for="line in viewingTransfer.lines" :key="line.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
              <div class="flex items-center justify-between">
                <span>{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-gray-500 dark:text-gray-400">
                  requested {{ line.quantityRequested }}<span v-if="line.quantityShipped !== null"> · shipped {{ line.quantityShipped }}</span
                  ><span v-if="line.quantityReceived !== null"> · received {{ line.quantityReceived }}</span>
                </span>
              </div>
              <p v-if="line.sourceBinName || line.destinationBinName" class="text-xs text-gray-400 mt-0.5">
                {{ line.sourceBinName ?? 'unbinned' }} → {{ line.destinationBinName ?? 'unbinned' }}
              </p>
              <p v-if="line.batchNumber" class="text-xs text-gray-400 mt-0.5">Batch {{ line.batchNumber }}</p>
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
      title="Delete stock transfer"
      :description="`Delete transfer '${confirmDelete?.transferNumber ?? ''}'? This cannot be undone.`"
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
import type { ColumnDef } from '#shared/types'
import type { StockTransfer, StockTransferPayload, StockTransferStatus, ShipStockTransferLinePayload } from '~/composables/useStockTransfers'

definePageMeta({ middleware: 'admin' })

const { list, get, create, approve, reject, ship, receive, cancel, remove } = useStockTransfers()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listBins } = useWarehouseBins()
const { list: listStockLevels } = useStockLevels()
const { list: listSerialNumbers } = useSerialNumbers()
const toast = useToast()

const rows = ref<StockTransfer[]>([])
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
    const [c, w, p, b] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 }), listProducts({ size: 200 }), listBins({ size: 200 })])
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
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' }
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

const filter = reactive<{
  sourceWarehouseId: number | undefined
  destinationWarehouseId: number | undefined
  status: StockTransferStatus | undefined
}>({ sourceWarehouseId: undefined, destinationWarehouseId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['transferNumber'] })

const columns: ColumnDef<StockTransfer>[] = [
  { key: 'transferNumber', label: 'Transfer number', sortable: true },
  { key: 'sourceWarehouseName', label: 'Source', value: (row) => row.sourceWarehouseName ?? '—' },
  { key: 'destinationWarehouseName', label: 'Destination', value: (row) => row.destinationWarehouseName ?? '—' },
  { key: 'requestDate', label: 'Requested', type: 'date' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      sourceWarehouseId: filter.sourceWarehouseId,
      destinationWarehouseId: filter.destinationWarehouseId,
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

// ── Create (request) ──────────────────────────────────────────────────────

interface LineForm {
  productId: number | undefined
  quantityRequested: number | undefined
  sourceBinId: number | undefined
  destinationBinId: number | undefined
  batchNumber: string
}

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
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

function availableFor(line: LineForm): number {
  if (!line.productId) return 0
  const match = stockLevels.value.find((s) => s.productId === line.productId && (line.sourceBinId ? s.binId === line.sourceBinId : s.binId === null))
  return match ? match.quantityOnHand : 0
}

function batchOptionsFor(line: LineForm) {
  if (!line.productId) return []
  return productBatches.value.filter((b) => b.productId === line.productId).map((b) => ({ label: b.batchNumber, value: b.batchNumber }))
}

async function onFormCompanyChanged() {
  form.sourceWarehouseId = undefined
  form.destinationWarehouseId = undefined
  form.lines = []
  stockLevels.value = []
  productBatches.value = []
}

async function onSourceWarehouseChanged(warehouseId: number | undefined) {
  form.lines = []
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

function addLine() {
  form.lines.push({ productId: undefined, quantityRequested: undefined, sourceBinId: undefined, destinationBinId: undefined, batchNumber: '' })
}

function openCreate() {
  createError.value = ''
  form.companyId = activeCompanyOptions.value[0]?.value
  form.sourceWarehouseId = undefined
  form.destinationWarehouseId = undefined
  form.requestDate = new Date().toISOString().slice(0, 10)
  form.notes = ''
  form.lines = []
  stockLevels.value = []
  productBatches.value = []
  showCreate.value = true
}

async function onCreateSubmit() {
  createError.value = ''
  if (!form.companyId || !form.sourceWarehouseId || !form.destinationWarehouseId || !form.requestDate) {
    createError.value = 'Please fill in company, source warehouse, destination warehouse, and request date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantityRequested)) {
    createError.value = 'Every line needs a product and quantity'
    return
  }
  for (const line of form.lines) {
    if (trackingTypeFor(line.productId) === 'BATCH' && !line.batchNumber) {
      createError.value = 'Every batch-tracked line needs a batch/lot selected'
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
      sourceBinId: l.sourceBinId,
      destinationBinId: l.destinationBinId,
      batchNumber: l.batchNumber || undefined
    }))
  }
  creating.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock transfer requested', color: 'success' })
    showCreate.value = false
    await load()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

// ── Approve / reject / cancel / delete ────────────────────────────────────

const actingId = ref<number | null>(null)
async function onApprove(row: StockTransfer) {
  actingId.value = row.id
  try {
    await approve(row.id)
    toast.add({ title: 'Stock transfer approved', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not approve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReject(row: StockTransfer) {
  actingId.value = row.id
  try {
    await reject(row.id)
    toast.add({ title: 'Stock transfer rejected', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reject', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: StockTransfer) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'Stock transfer cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReceive(row: StockTransfer) {
  actingId.value = row.id
  try {
    await receive(row.id)
    toast.add({ title: 'Stock transfer received — stock updated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not receive', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<StockTransfer | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Stock transfer deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// ── Ship ───────────────────────────────────────────────────────────────────

interface ShipLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityRequested: number
  binId: number | null
  batchNumber: string | null
  trackingType: string
  selectedSerials: string[]
}

const showShip = ref(false)
const shippingTransfer = ref<StockTransfer | null>(null)
const shipLines = ref<ShipLine[]>([])
const loadingShipDetail = ref(false)
const shipping = ref(false)
const shipError = ref('')
const shipAvailableSerials = ref<{ productId: number; binId: number | null; serialNumber: string }[]>([])

function shipSerialOptionsFor(line: ShipLine) {
  return shipAvailableSerials.value
    .filter((s) => s.productId === line.productId && (line.binId ? s.binId === line.binId : s.binId === null))
    .map((s) => ({ label: s.serialNumber, value: s.serialNumber }))
}

async function openShip(row: StockTransfer) {
  showShip.value = true
  loadingShipDetail.value = true
  shipError.value = ''
  shipLines.value = []
  shipAvailableSerials.value = []
  try {
    const detail = await get(row.id)
    shippingTransfer.value = detail
    const serialRes = await listSerialNumbers({ warehouseId: detail.sourceWarehouseId, status: 'IN_STOCK', size: 500 })
    shipAvailableSerials.value = serialRes.data.map((s: any) => ({ productId: s.productId, binId: s.binId, serialNumber: s.serialNumber }))
    shipLines.value = (detail.lines ?? []).map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.productName,
      productSku: l.productSku,
      quantityRequested: l.quantityRequested,
      binId: l.sourceBinId,
      batchNumber: l.batchNumber,
      trackingType: products.value.find((p) => p.id === l.productId)?.trackingType ?? 'NONE',
      selectedSerials: []
    }))
  } catch (err) {
    shipError.value = apiErrorMessage(err)
  } finally {
    loadingShipDetail.value = false
  }
}

async function onShipSubmit() {
  if (!shippingTransfer.value) return
  shipError.value = ''
  for (const line of shipLines.value) {
    if (line.trackingType === 'SERIAL' && line.selectedSerials.length !== line.quantityRequested) {
      shipError.value = `${line.productName} is serial-tracked — select exactly ${line.quantityRequested} serial number(s)`
      return
    }
  }
  const lines: ShipStockTransferLinePayload[] = shipLines.value
    .filter((l) => l.trackingType === 'SERIAL')
    .map((l) => ({ stockTransferLineId: l.id, serialNumbers: l.selectedSerials }))
  shipping.value = true
  try {
    await ship(shippingTransfer.value.id, lines)
    toast.add({ title: 'Stock transfer shipped — stock updated', color: 'success' })
    showShip.value = false
    await load()
  } catch (err) {
    shipError.value = apiErrorMessage(err)
  } finally {
    shipping.value = false
  }
}

// ── View ───────────────────────────────────────────────────────────────────

const showView = ref(false)
const viewingTransfer = ref<StockTransfer | null>(null)
const loadingView = ref(false)
async function openView(row: StockTransfer) {
  showView.value = true
  loadingView.value = true
  try {
    viewingTransfer.value = await get(row.id)
  } finally {
    loadingView.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.sourceWarehouseId, filter.destinationWarehouseId, filter.status], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.sourceWarehouseId !== undefined || filter.destinationWarehouseId !== undefined || filter.status !== undefined
)
function clearFilters() {
  search.value = ''
  filter.sourceWarehouseId = undefined
  filter.destinationWarehouseId = undefined
  filter.status = undefined
  load()
}
</script>

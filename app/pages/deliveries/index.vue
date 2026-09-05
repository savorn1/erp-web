<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Deliveries</h1>
      <UButton icon="i-lucide-plus" :disabled="deliverableSoOptions.length === 0" @click="openCreate()">
        New delivery
      </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && deliverableSoOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="Nothing to deliver"
      description="Confirm a sales order first — only confirmed or partially-delivered orders can be delivered against."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search delivery number" icon="i-lucide-search" class="w-56" />
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
        export-filename="deliveries"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <UButton v-if="row.status === 'PENDING'" size="xs" color="info" variant="soft" icon="i-lucide-package-search" :loading="actingId === row.id" @click="onPick(row)">
              Pick
            </UButton>
            <UButton v-if="row.status === 'PICKED'" size="xs" color="info" variant="soft" icon="i-lucide-box" :loading="actingId === row.id" @click="onPack(row)">
              Pack
            </UButton>
            <UButton v-if="row.status === 'PACKED'" size="xs" color="info" variant="soft" icon="i-lucide-truck" :loading="actingId === row.id" @click="onShip(row)">
              Ship
            </UButton>
            <UButton v-if="row.status === 'SHIPPED'" size="xs" color="success" variant="soft" icon="i-lucide-check-check" :loading="actingId === row.id" @click="onComplete(row)">
              Confirm delivery
            </UButton>
            <NuxtLink v-if="row.status === 'SHIPPED' || row.status === 'DELIVERED'" :to="`/invoices?fromDelivery=${row.id}`">
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-receipt">Invoice</UButton>
            </NuxtLink>
            <UButton v-if="row.status === 'PENDING' || row.status === 'PICKED' || row.status === 'PACKED'" size="xs" color="warning" variant="soft" icon="i-lucide-ban" :loading="actingId === row.id" @click="onCancel(row)">
              Cancel
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No deliveries match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-truck" title="No deliveries yet" description="Post the first delivery to get started.">
            <template #action>
              <UButton :disabled="deliverableSoOptions.length === 0" icon="i-lucide-plus" @click="openCreate()">New delivery</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New delivery" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <UFormField label="Sales order" required class="sm:col-span-2">
            <USelect v-model="createSoId" :items="deliverableSoOptions" placeholder="Select a submitted sales order" class="w-full" @update:model-value="onSoSelected" />
          </UFormField>
          <UFormField label="Delivery date" required>
            <UInput v-model="createDeliveryDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Notes">
            <UInput v-model="createNotes" class="w-full" />
          </UFormField>
        </div>

        <template v-if="createSoId">
          <div v-if="loadingSoDetail" class="text-sm text-gray-400 py-6 text-center">Loading order lines…</div>
          <template v-else>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines to deliver</p>
            <EmptyState v-if="createLines.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" description="Every line on this order has already been fully delivered." />
            <div v-else class="space-y-3 mb-4">
              <div
                v-for="line in createLines"
                :key="line.salesOrderLineId"
                class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ line.productName }} ({{ line.productSku }})</span>
                  <span class="text-xs text-gray-400 shrink-0">Ordered remaining: {{ line.remaining }} · Available: {{ availableFor(line) }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <UInput v-model.number="line.quantityDelivered" type="number" min="0" :max="Math.min(line.remaining, availableFor(line))" step="0.0001" placeholder="Quantity to deliver" />
                  <USelect v-model="line.binId" :items="binOptionsForWarehouse" placeholder="No bin" @update:model-value="onLineBinChanged(line)" />
                </div>
                <p v-if="line.quantityDelivered > availableFor(line)" class="text-xs text-error">
                  Only {{ availableFor(line) }} available in stock at this location
                </p>

                <div v-if="line.trackingType === 'BATCH'">
                  <USelect v-model="line.batchNumber" :items="batchOptionsFor(line)" placeholder="Select batch / lot" class="w-full" />
                </div>

                <div v-else-if="line.trackingType === 'SERIAL'">
                  <USelectMenu
                    v-model="line.selectedSerials"
                    multiple
                    :items="serialOptionsFor(line)"
                    value-key="value"
                    placeholder="Select serial numbers"
                    class="w-full"
                  />
                  <p class="text-xs mt-1" :class="line.selectedSerials.length === line.quantityDelivered ? 'text-gray-400' : 'text-error'">
                    {{ line.selectedSerials.length }} of {{ line.quantityDelivered }} serial number(s) selected
                  </p>
                </div>
              </div>
            </div>
          </template>
        </template>

        <UAlert v-if="createError" color="error" variant="subtle" class="mb-3" :title="createError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" :disabled="createLines.length === 0" @click="onCreateSubmit">Post delivery</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showView" :title="`Delivery — ${viewingDelivery?.deliveryNumber ?? ''}`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingDelivery">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><dt class="text-gray-400">Sales order</dt><dd class="text-gray-900 dark:text-white">{{ viewingDelivery.soNumber }}</dd></div>
            <div><dt class="text-gray-400">Warehouse</dt><dd class="text-gray-900 dark:text-white">{{ viewingDelivery.warehouseName }}</dd></div>
            <div><dt class="text-gray-400">Delivery date</dt><dd class="text-gray-900 dark:text-white">{{ formatDate(viewingDelivery.deliveryDate) }}</dd></div>
            <div><dt class="text-gray-400">Status</dt><dd class="text-gray-900 dark:text-white">{{ viewingDelivery.status }}</dd></div>
            <div><dt class="text-gray-400">Created by</dt><dd class="text-gray-900 dark:text-white">{{ viewingDelivery.createdBy ?? '—' }}</dd></div>
            <div v-if="viewingDelivery.shippedAt"><dt class="text-gray-400">Shipped</dt><dd class="text-gray-900 dark:text-white">{{ formatDateTime(viewingDelivery.shippedAt) }} by {{ viewingDelivery.shippedBy }}</dd></div>
            <div v-if="viewingDelivery.deliveredAt"><dt class="text-gray-400">Delivered</dt><dd class="text-gray-900 dark:text-white">{{ formatDateTime(viewingDelivery.deliveredAt) }} by {{ viewingDelivery.deliveredBy }}</dd></div>
            <div v-if="viewingDelivery.notes" class="col-span-2"><dt class="text-gray-400">Notes</dt><dd class="text-gray-900 dark:text-white">{{ viewingDelivery.notes }}</dd></div>
          </dl>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines delivered</p>
          <ul class="space-y-1.5">
            <li
              v-for="line in viewingDelivery.lines"
              :key="line.id"
              class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5"
            >
              <div class="flex items-center justify-between">
                <span>{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-gray-500 dark:text-gray-400">{{ line.quantityDelivered }}<span v-if="line.binName"> — {{ line.binName }}</span></span>
              </div>
              <p v-if="line.batchNumber" class="text-xs text-gray-400 mt-0.5">Batch {{ line.batchNumber }}</p>
              <p v-if="line.serialNumbers && line.serialNumbers.length > 0" class="text-xs text-gray-400 mt-0.5">
                Serials: {{ line.serialNumbers.join(', ') }}
              </p>
            </li>
          </ul>
        </template>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { Delivery, DeliveryPayload, DeliveryStatus } from '~/composables/useDeliveries'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, get, create, pick, pack, ship, complete, cancel } = useDeliveries()
const { list: listSalesOrders, get: getSalesOrder } = useSalesOrders()
const { list: listWarehouses } = useWarehouses()
const { list: listZones } = useWarehouseZones()
const { list: listBins } = useWarehouseBins()
const { list: listProducts } = useProducts()
const { list: listStockLevels } = useStockLevels()
const { list: listSerialNumbers } = useSerialNumbers()
const toast = useToast()

const rows = ref<Delivery[]>([])
const loading = ref(false)
const error = ref('')

const salesOrders = ref<{ id: number; soNumber: string; status: string; warehouseId: number }[]>([])
const warehouses = ref<{ id: number; name: string }[]>([])
const zones = ref<{ id: number; warehouseId: number }[]>([])
const bins = ref<{ id: number; name: string; zoneId: number; active: boolean }[]>([])
const products = ref<{ id: number; trackingType: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [so, w, z, b, p] = await Promise.all([
      listSalesOrders({ size: 200 }),
      listWarehouses({ size: 200 }),
      listZones({ size: 200 }),
      listBins({ size: 200 }),
      listProducts({ size: 200 })
    ])
    salesOrders.value = so.data
    warehouses.value = w.data
    zones.value = z.data
    bins.value = b.data
    products.value = p.data
  } finally {
    loadingLookups.value = false
  }
}

const deliverableSoOptions = computed(() =>
  salesOrders.value
    .filter((s) => s.status === 'CONFIRMED' || s.status === 'PARTIALLY_DELIVERED')
    .map((s) => ({ label: s.soNumber, value: s.id }))
)
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Picked', value: 'PICKED' },
  { label: 'Packed', value: 'PACKED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const filter = reactive<{ warehouseId: number | undefined; status: DeliveryStatus | undefined }>({ warehouseId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['deliveryNumber'] })

const columns: ColumnDef<Delivery>[] = [
  { key: 'deliveryNumber', label: 'Delivery number', sortable: true },
  { key: 'soNumber', label: 'SO number', value: (row) => row.soNumber ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'deliveryDate', label: 'Delivery date', type: 'date' },
  { key: 'createdBy', label: 'Created by', value: (row) => row.createdBy ?? '—' },
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

interface DeliverLine {
  salesOrderLineId: number
  productId: number
  productName: string
  productSku: string
  trackingType: string
  remaining: number
  quantityDelivered: number
  binId: number | undefined
  batchNumber: string
  selectedSerials: string[]
}

const showCreate = ref(false)
const createSoId = ref<number | undefined>(undefined)
const createDeliveryDate = ref(new Date().toISOString().slice(0, 10))
const createNotes = ref('')
const createLines = ref<DeliverLine[]>([])
const loadingSoDetail = ref(false)
const creating = ref(false)
const createError = ref('')

const stockLevels = ref<{ productId: number; warehouseId: number; binId: number | null; quantityOnHand: number }[]>([])
const availableSerials = ref<{ productId: number; binId: number | null; serialNumber: string }[]>([])
const productBatches = ref<{ productId: number; batchNumber: string }[]>([])

const binOptionsForWarehouse = computed(() => {
  const so = salesOrders.value.find((s) => s.id === createSoId.value)
  if (!so) return []
  const zoneIds = new Set(zones.value.filter((z) => z.warehouseId === so.warehouseId).map((z) => z.id))
  return bins.value.filter((b) => b.active && zoneIds.has(b.zoneId)).map((b) => ({ label: b.name, value: b.id }))
})

// Matches the backend's lookup exactly (findByProductIdAndWarehouseIdAndBinId
// vs. ...AndBinIdIsNull) — stock isn't pooled across bins, so "no bin
// selected" means the unbinned quantity, not the sum of every bin.
function availableFor(line: DeliverLine): number {
  const match = stockLevels.value.find((s) => s.productId === line.productId && (line.binId ? s.binId === line.binId : s.binId === null))
  return match ? match.quantityOnHand : 0
}

function batchOptionsFor(line: DeliverLine) {
  return productBatches.value.filter((b) => b.productId === line.productId).map((b) => ({ label: b.batchNumber, value: b.batchNumber }))
}

function serialOptionsFor(line: DeliverLine) {
  return availableSerials.value
    .filter((s) => s.productId === line.productId && (line.binId ? s.binId === line.binId : s.binId === null))
    .map((s) => ({ label: s.serialNumber, value: s.serialNumber }))
}

function onLineBinChanged(line: DeliverLine) {
  // Previously-picked serials may no longer belong to the new bin.
  line.selectedSerials = []
}

function openCreate(soId?: number) {
  createSoId.value = soId
  createDeliveryDate.value = new Date().toISOString().slice(0, 10)
  createNotes.value = ''
  createLines.value = []
  createError.value = ''
  showCreate.value = true
  if (soId) onSoSelected(soId)
}

async function onSoSelected(soId: number | undefined) {
  createLines.value = []
  stockLevels.value = []
  availableSerials.value = []
  productBatches.value = []
  if (!soId) return
  const so = salesOrders.value.find((s) => s.id === soId)
  loadingSoDetail.value = true
  try {
    const [detail, stockRes, serialRes] = await Promise.all([
      getSalesOrder(soId),
      so ? listStockLevels({ warehouseId: so.warehouseId, size: 500 }) : Promise.resolve({ data: [] }),
      so ? listSerialNumbers({ warehouseId: so.warehouseId, status: 'IN_STOCK', size: 500 }) : Promise.resolve({ data: [] })
    ])
    stockLevels.value = stockRes.data.map((s: any) => ({ productId: s.productId, warehouseId: s.warehouseId, binId: s.binId, quantityOnHand: s.quantityOnHand }))
    availableSerials.value = serialRes.data.map((s: any) => ({ productId: s.productId, binId: s.binId, serialNumber: s.serialNumber }))
    productBatches.value = [...new Map(
      serialRes.data
        .filter((s: any) => s.batchNumber)
        .map((s: any) => [`${s.productId}:${s.batchNumber}`, { productId: s.productId, batchNumber: s.batchNumber as string }])
    ).values()]
    createLines.value = (detail.lines ?? [])
      .map((l) => ({
        salesOrderLineId: l.id,
        productId: l.productId,
        productName: l.productName ?? '',
        productSku: l.productSku ?? '',
        trackingType: products.value.find((p) => p.id === l.productId)?.trackingType ?? 'NONE',
        remaining: l.quantityOrdered - l.quantityDelivered,
        quantityDelivered: l.quantityOrdered - l.quantityDelivered,
        binId: undefined,
        batchNumber: '',
        selectedSerials: []
      }))
      .filter((l) => l.remaining > 0)
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    loadingSoDetail.value = false
  }
}

async function onCreateSubmit() {
  if (!createSoId.value) return
  createError.value = ''
  const linesToSend = createLines.value.filter((l) => l.quantityDelivered > 0)
  if (linesToSend.length === 0) {
    createError.value = 'Enter a quantity for at least one line'
    return
  }
  for (const line of linesToSend) {
    if (line.trackingType === 'BATCH' && !line.batchNumber) {
      createError.value = `${line.productName} is batch-tracked — select a batch/lot`
      return
    }
    if (line.trackingType === 'SERIAL' && line.selectedSerials.length !== line.quantityDelivered) {
      createError.value = `${line.productName} is serial-tracked — select exactly ${line.quantityDelivered} serial number(s)`
      return
    }
  }
  const payload: DeliveryPayload = {
    salesOrderId: createSoId.value,
    deliveryDate: createDeliveryDate.value,
    notes: createNotes.value || undefined,
    lines: linesToSend.map((l) => ({
      salesOrderLineId: l.salesOrderLineId,
      quantityDelivered: l.quantityDelivered,
      binId: l.binId,
      batchNumber: l.trackingType === 'BATCH' ? l.batchNumber : undefined,
      serialNumbers: l.trackingType === 'SERIAL' ? l.selectedSerials : undefined
    }))
  }
  creating.value = true
  try {
    await create(payload)
    toast.add({ title: 'Delivery created — pick, pack, then ship to update stock', color: 'success' })
    showCreate.value = false
    await Promise.all([load(), loadLookups()])
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const showView = ref(false)
const viewingDelivery = ref<Delivery | null>(null)
const loadingView = ref(false)
async function openView(row: Delivery) {
  showView.value = true
  loadingView.value = true
  try {
    viewingDelivery.value = await get(row.id)
  } finally {
    loadingView.value = false
  }
}

const actingId = ref<number | null>(null)
async function onPick(row: Delivery) {
  actingId.value = row.id
  try {
    await pick(row.id)
    toast.add({ title: 'Products picked', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not pick', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onPack(row: Delivery) {
  actingId.value = row.id
  try {
    await pack(row.id)
    toast.add({ title: 'Products packed', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not pack', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onShip(row: Delivery) {
  actingId.value = row.id
  try {
    await ship(row.id)
    toast.add({ title: 'Products shipped — stock updated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not ship', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onComplete(row: Delivery) {
  actingId.value = row.id
  try {
    await complete(row.id)
    toast.add({ title: 'Delivery confirmed', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not confirm delivery', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: Delivery) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'Delivery cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
  const soIdParam = Number(route.query.soId)
  if (soIdParam) openCreate(soIdParam)
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

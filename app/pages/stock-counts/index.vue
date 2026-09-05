<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Stock counts</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">
        New stock count
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
        <UInput v-model="search" placeholder="Search count number" icon="i-lucide-search" class="w-56" />
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
        export-filename="stock-counts"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">
              {{ row.status === 'DRAFT' ? 'Enter counts' : 'View' }}
            </UButton>
            <UButton v-if="row.status === 'DRAFT'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No stock counts match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-clipboard-check" title="No stock counts yet" description="Start the first physical stock count to get going.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New stock count</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Create modal -->
    <UModal v-model:open="showCreate" title="New stock count" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

        <p class="text-xs text-gray-400 mb-3">Only untracked products can be counted — batch/serial-tracked stock isn't supported here.</p>

        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Products to count</p>
          <UButton size="xs" variant="soft" icon="i-lucide-plus" :disabled="!form.warehouseId" @click="addLine">Add product</UButton>
        </div>

        <div class="space-y-2 mb-4">
          <div v-if="form.lines.length === 0" class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
            No products added yet
          </div>
          <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
            <USelect v-model="line.productId" :items="untrackedProductOptionsFor(form.companyId)" placeholder="Product" class="col-span-6" />
            <USelect v-model="line.binId" :items="binOptionsForWarehouse" placeholder="No bin" class="col-span-5" />
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
          </div>
        </div>

        <UAlert v-if="createError" color="error" variant="subtle" class="mb-3" :title="createError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" @click="onCreateSubmit">Start count</UButton>
        </div>
      </template>
    </UModal>

    <!-- View / enter counts / complete / reconcile modal -->
    <UModal v-model:open="showView" :title="`Count — ${viewingCount?.countNumber ?? ''}`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingCount">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><dt class="text-gray-400">Warehouse</dt><dd class="text-gray-900 dark:text-white">{{ viewingCount.warehouseName }}</dd></div>
            <div><dt class="text-gray-400">Status</dt><dd class="text-gray-900 dark:text-white">{{ viewingCount.status }}</dd></div>
            <div><dt class="text-gray-400">Counted by</dt><dd class="text-gray-900 dark:text-white">{{ viewingCount.countedBy ?? '—' }}</dd></div>
            <div v-if="viewingCount.adjustmentNumber"><dt class="text-gray-400">Reconciliation</dt><dd class="text-gray-900 dark:text-white">{{ viewingCount.adjustmentNumber }}</dd></div>
            <div v-if="viewingCount.notes" class="col-span-2"><dt class="text-gray-400">Notes</dt><dd class="text-gray-900 dark:text-white">{{ viewingCount.notes }}</dd></div>
          </dl>

          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines</p>
          <div class="space-y-2 mb-4">
            <div
              v-for="line in viewingLines"
              :key="line.id"
              class="rounded-lg border border-gray-200 dark:border-gray-800 p-3"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-xs text-gray-400 shrink-0">System: {{ line.systemQuantity }}<span v-if="line.binName"> — {{ line.binName }}</span></span>
              </div>
              <UInput
                v-if="viewingCount.status === 'DRAFT'"
                v-model.number="line.countedQuantity"
                type="number"
                min="0"
                step="0.0001"
                placeholder="Counted quantity"
                class="w-full"
              />
              <p v-else class="text-sm">
                Counted: {{ line.countedQuantity ?? '—' }}
                <span v-if="line.varianceQuantity !== null && line.varianceQuantity !== undefined"
                      :class="line.varianceQuantity === 0 ? 'text-gray-400' : line.varianceQuantity > 0 ? 'text-success' : 'text-error'">
                  ({{ line.varianceQuantity > 0 ? '+' : '' }}{{ line.varianceQuantity }})
                </span>
              </p>
            </div>
          </div>

          <UAlert v-if="viewError" color="error" variant="subtle" class="mb-3" :title="viewError" />

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showView = false">Close</UButton>
            <UButton v-if="viewingCount.status === 'DRAFT'" :loading="savingCounts" @click="onSaveCounts">Save counts</UButton>
            <UButton v-if="viewingCount.status === 'DRAFT'" color="success" :loading="completing" :disabled="!allLinesCounted" @click="onComplete">
              Complete count
            </UButton>
            <UButton v-if="viewingCount.status === 'COMPLETED'" color="success" :loading="reconciling" @click="onReconcile">
              Reconcile
            </UButton>
          </div>
        </template>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete stock count"
      :description="`Delete stock count '${confirmDelete?.countNumber ?? ''}'? This cannot be undone.`"
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
import type { StockCount, StockCountPayload, StockCountStatus } from '~/composables/useStockCounts'

definePageMeta({ middleware: 'admin' })

const { list, get, create, submitCounts, complete, reconcile, remove } = useStockCounts()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listBins } = useWarehouseBins()
const toast = useToast()

const rows = ref<StockCount[]>([])
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
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Reconciled', value: 'RECONCILED' }
]

function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId))
    .map((w) => ({ label: w.name, value: w.id }))
}
function untrackedProductOptionsFor(companyId: number | undefined) {
  return products.value.filter((p) => p.status === 'ACTIVE' && p.trackingType === 'NONE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

const filter = reactive<{ warehouseId: number | undefined; status: StockCountStatus | undefined }>({ warehouseId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['countNumber'] })

const columns: ColumnDef<StockCount>[] = [
  { key: 'countNumber', label: 'Count number', sortable: true },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'countDate', label: 'Date', type: 'date' },
  { key: 'countedBy', label: 'Counted by', value: (row) => row.countedBy ?? '—' },
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

// ── Create ─────────────────────────────────────────────────────────────────

interface LineForm {
  productId: number | undefined
  binId: number | undefined
}

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')

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

function onFormCompanyChanged() {
  form.warehouseId = undefined
  form.lines = []
}
function onWarehouseChanged() {
  form.lines = []
}

function addLine() {
  form.lines.push({ productId: undefined, binId: undefined })
}

function openCreate() {
  createError.value = ''
  form.companyId = activeCompanyOptions.value[0]?.value
  form.warehouseId = undefined
  form.countDate = new Date().toISOString().slice(0, 10)
  form.notes = ''
  form.lines = []
  showCreate.value = true
}

async function onCreateSubmit() {
  createError.value = ''
  if (!form.companyId || !form.warehouseId || !form.countDate) {
    createError.value = 'Please fill in company, warehouse, and count date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId)) {
    createError.value = 'Add at least one product to count'
    return
  }
  const payload: StockCountPayload = {
    companyId: form.companyId,
    warehouseId: form.warehouseId,
    countDate: form.countDate,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({ productId: l.productId!, binId: l.binId }))
  }
  creating.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock count started', color: 'success' })
    showCreate.value = false
    await load()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

// ── View / enter counts / complete / reconcile ────────────────────────────

const showView = ref(false)
const viewingCount = ref<StockCount | null>(null)
const viewingLines = ref<NonNullable<StockCount['lines']>>([])
const loadingView = ref(false)
const viewError = ref('')
const savingCounts = ref(false)
const completing = ref(false)
const reconciling = ref(false)

const allLinesCounted = computed(() => viewingLines.value.length > 0 && viewingLines.value.every((l) => l.countedQuantity !== null && l.countedQuantity !== undefined))

async function openView(row: StockCount) {
  showView.value = true
  loadingView.value = true
  viewError.value = ''
  try {
    const detail = await get(row.id)
    viewingCount.value = detail
    viewingLines.value = (detail.lines ?? []).map((l) => ({ ...l }))
  } catch (err) {
    viewError.value = apiErrorMessage(err)
  } finally {
    loadingView.value = false
  }
}

async function onSaveCounts(): Promise<boolean> {
  if (!viewingCount.value) return false
  viewError.value = ''
  const linesToSave = viewingLines.value.filter((l) => l.countedQuantity !== null && l.countedQuantity !== undefined)
  if (linesToSave.length === 0) {
    viewError.value = 'Enter at least one counted quantity'
    return false
  }
  savingCounts.value = true
  try {
    const updated = await submitCounts(viewingCount.value.id, linesToSave.map((l) => ({ lineId: l.id, countedQuantity: l.countedQuantity! })))
    viewingCount.value = updated
    viewingLines.value = (updated.lines ?? []).map((l) => ({ ...l }))
    toast.add({ title: 'Counted quantities saved', color: 'success' })
    return true
  } catch (err) {
    viewError.value = apiErrorMessage(err)
    return false
  } finally {
    savingCounts.value = false
  }
}

async function onComplete() {
  if (!viewingCount.value) return
  viewError.value = ''
  completing.value = true
  try {
    const saved = await onSaveCounts()
    if (!saved) return
    const updated = await complete(viewingCount.value.id)
    viewingCount.value = updated
    viewingLines.value = (updated.lines ?? []).map((l) => ({ ...l }))
    toast.add({ title: 'Stock count completed', color: 'success' })
    await load()
  } catch (err) {
    viewError.value = apiErrorMessage(err)
  } finally {
    completing.value = false
  }
}

async function onReconcile() {
  if (!viewingCount.value) return
  viewError.value = ''
  reconciling.value = true
  try {
    const updated = await reconcile(viewingCount.value.id)
    viewingCount.value = updated
    viewingLines.value = (updated.lines ?? []).map((l) => ({ ...l }))
    toast.add({
      title: 'Stock count reconciled',
      description: updated.adjustmentNumber ? `Adjustment ${updated.adjustmentNumber} created — approve it to apply the change` : 'No variance found — nothing to adjust',
      color: 'success'
    })
    await load()
  } catch (err) {
    viewError.value = apiErrorMessage(err)
  } finally {
    reconciling.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<StockCount | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Stock count deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
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

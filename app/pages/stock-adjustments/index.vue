<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Stock adjustments</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/stock-adjustments/new"> New adjustment </UButton>
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
        export-filename="stock-adjustments"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <UButton
              v-if="row.status === 'PENDING'"
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
              v-if="row.status === 'PENDING'"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :loading="actingId === row.id"
              @click="onReject(row)"
            >
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
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/stock-adjustments/new">New adjustment</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- View modal -->
    <UModal v-model:open="showView" :title="`Adjustment — ${viewingAdjustment?.adjustmentNumber ?? ''}`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingAdjustment">
          <WorkflowStatusStepper
            :status="viewingAdjustment.status"
            :steps="adjustmentWorkflowSteps"
            :next-hint="viewingAdjustment.status === 'PENDING' ? 'Next: approve or reject the adjustment' : ''"
            class="mb-4"
          />
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt class="text-gray-400">Warehouse</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.warehouseName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Status</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.status }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Requested</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingAdjustment.adjustmentDate) }} by {{ viewingAdjustment.requestedBy ?? '—' }}</dd>
            </div>
            <div v-if="viewingAdjustment.approvedBy">
              <dt class="text-gray-400">Resolved by</dt>
              <dd class="text-gray-900 dark:text-white">
                {{ viewingAdjustment.approvedBy }}<span v-if="viewingAdjustment.approvalDate"> on {{ formatDate(viewingAdjustment.approvalDate) }}</span>
              </dd>
            </div>
            <div v-if="viewingAdjustment.notes" class="col-span-2">
              <dt class="text-gray-400">Notes</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingAdjustment.notes }}</dd>
            </div>
          </dl>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines</p>
          <ul class="space-y-1.5">
            <li v-for="line in viewingAdjustment.lines" :key="line.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
              <div class="flex items-center justify-between">
                <span>{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-gray-500 dark:text-gray-400">
                  <span :class="isIncreaseReason(line.reason) ? 'text-success' : 'text-error'"
                    >{{ isIncreaseReason(line.reason) ? '+' : '-' }}{{ line.quantity }}</span
                  >
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
import { isIncreaseReason, type StockAdjustment, type StockAdjustmentStatus } from '~/composables/useStockAdjustments'

definePageMeta({ middleware: 'admin' })

const { list, get, approve, reject, remove } = useStockAdjustments()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const toast = useToast()

const rows = ref<StockAdjustment[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, w] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 })])
    companies.value = c.data
    warehouses.value = w.data
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
  { label: 'Opening balance', value: 'OPENING_BALANCE' },
  { label: 'Stock decrease', value: 'STOCK_DECREASE' },
  { label: 'Damaged', value: 'DAMAGED' },
  { label: 'Lost', value: 'LOST' },
  { label: 'Expired', value: 'EXPIRED' }
]
function reasonLabel(reason: string) {
  return reasonOptions.find((r) => r.value === reason)?.label ?? reason
}

const filter = reactive<{ warehouseId: number | undefined; status: StockAdjustmentStatus | undefined }>({ warehouseId: undefined, status: undefined })

const adjustmentWorkflowSteps = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' }
]

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

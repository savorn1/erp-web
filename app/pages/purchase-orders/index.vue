<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Purchase orders</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">
        New purchase order
      </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company, supplier, and warehouse first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search PO number" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.supplierId" :items="supplierFilterOptions" placeholder="Supplier" class="w-44" />
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
        export-filename="purchase-orders"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton v-if="row.status === 'DRAFT'" size="xs" color="success" variant="soft" icon="i-lucide-send" :loading="actingId === row.id" @click="onSubmit(row)">
              Submit
            </UButton>
            <NuxtLink v-if="row.status === 'SUBMITTED' || row.status === 'PARTIALLY_RECEIVED'" :to="`/goods-receipts?poId=${row.id}`">
              <UButton size="xs" color="info" variant="soft" icon="i-lucide-package-check">Receive</UButton>
            </NuxtLink>
            <UButton v-if="row.status === 'DRAFT' || row.status === 'SUBMITTED'" size="xs" color="warning" variant="soft" icon="i-lucide-ban" :loading="actingId === row.id" @click="onCancel(row)">
              Cancel
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
            title="No purchase orders match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-clipboard-list" title="No purchase orders yet" description="Create the first purchase order to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New purchase order</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal
      v-model:open="showForm"
      :title="formTitle"
      :ui="{ content: 'sm:max-w-4xl' }"
    >
      <template #body>
        <div v-if="loadingDetail" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Supplier" required>
              <USelect v-model="form.supplierId" :items="supplierOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Warehouse" required>
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Order date" required>
              <UInput v-model="form.orderDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Expected date">
              <UInput v-model="form.expectedDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>

          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</p>
            <UButton v-if="formEditable" size="xs" variant="soft" icon="i-lucide-plus" @click="addLine">Add line</UButton>
          </div>

          <div class="space-y-2 mb-4">
            <div v-if="form.lines.length === 0" class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
              No line items yet
            </div>
            <div
              v-for="(line, i) in form.lines"
              :key="i"
              class="grid grid-cols-12 gap-2 items-center"
            >
              <USelect
                v-model="line.productId"
                :items="productOptionsFor(form.companyId)"
                placeholder="Product"
                :disabled="!formEditable"
                class="col-span-5"
              />
              <UInput v-model.number="line.quantityOrdered" type="number" min="0.0001" step="0.0001" placeholder="Qty" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model.number="line.unitCost" type="number" min="0" step="0.01" placeholder="Unit cost" :disabled="!formEditable" class="col-span-2" />
              <div class="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-right">
                {{ formatCurrency((line.quantityOrdered || 0) * (line.unitCost || 0)) }}
              </div>
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
              <span v-else-if="viewingLineReceived[i]" class="col-span-1 text-xs text-gray-400">{{ viewingLineReceived[i] }} recv'd</span>
            </div>
          </div>

          <div class="flex justify-end text-sm font-medium text-gray-900 dark:text-white mb-4">
            Total: {{ formatCurrency(formTotal) }}
          </div>

          <UAlert v-if="formError" color="error" variant="subtle" class="mb-3" :title="formError" />

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showForm = false">Close</UButton>
            <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ editingId ? 'Save changes' : 'Create' }}</UButton>
          </div>
        </template>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete purchase order"
      :description="`Delete purchase order '${confirmDelete?.poNumber ?? ''}'? This cannot be undone.`"
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
import type { PurchaseOrder, PurchaseOrderPayload, PurchaseOrderStatus } from '~/composables/usePurchaseOrders'

definePageMeta({ middleware: 'admin' })

const { list, get, create, update, submit, cancel, remove } = usePurchaseOrders()
const { list: listCompanies } = useCompanies()
const { list: listSuppliers } = useSuppliers()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<PurchaseOrder[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const suppliers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, s, w, p] = await Promise.all([
      listCompanies({ size: 200 }),
      listSuppliers({ size: 200 }),
      listWarehouses({ size: 200 }),
      listProducts({ size: 200 })
    ])
    companies.value = c.data
    suppliers.value = s.data
    warehouses.value = w.data
    products.value = p.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const supplierFilterOptions = computed(() => [{ label: 'All suppliers', value: undefined }, ...suppliers.value.map((s) => ({ label: s.name, value: s.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Partially received', value: 'PARTIALLY_RECEIVED' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

function supplierOptionsFor(companyId: number | undefined) {
  return suppliers.value.filter((s) => s.status === 'ACTIVE' && (companyId === undefined || s.companyId === companyId))
    .map((s) => ({ label: s.name, value: s.id }))
}
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId))
    .map((w) => ({ label: w.name, value: w.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value.filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

const filter = reactive<{
  companyId: number | undefined
  supplierId: number | undefined
  status: PurchaseOrderStatus | undefined
}>({ companyId: undefined, supplierId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['poNumber'] })

const columns: ColumnDef<PurchaseOrder>[] = [
  { key: 'poNumber', label: 'PO number', sortable: true },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'orderDate', label: 'Order date', type: 'date' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      supplierId: filter.supplierId,
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

interface LineForm {
  productId: number | undefined
  quantityOrdered: number | undefined
  unitCost: number | undefined
}

const showForm = ref(false)
const editingId = ref<number | null>(null)
const editingStatus = ref<PurchaseOrderStatus | null>(null)
const loadingDetail = ref(false)
const saving = ref(false)
const formError = ref('')
const viewingLineReceived = ref<Record<number, string>>({})

const form = reactive<{
  companyId: number | undefined
  supplierId: number | undefined
  warehouseId: number | undefined
  orderDate: string
  expectedDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  supplierId: undefined,
  warehouseId: undefined,
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: '',
  notes: '',
  lines: []
})

const formEditable = computed(() => editingStatus.value === null || editingStatus.value === 'DRAFT')
const formTitle = computed(() => (editingId.value === null ? 'New purchase order' : formEditable.value ? 'Edit purchase order' : 'View purchase order'))
const formTotal = computed(() => form.lines.reduce((sum, l) => sum + (l.quantityOrdered || 0) * (l.unitCost || 0), 0))

function addLine() {
  form.lines.push({ productId: undefined, quantityOrdered: undefined, unitCost: undefined })
}

function resetForm() {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.supplierId = undefined
  form.warehouseId = undefined
  form.orderDate = new Date().toISOString().slice(0, 10)
  form.expectedDate = ''
  form.notes = ''
  form.lines = []
  viewingLineReceived.value = {}
}

function openCreate() {
  editingId.value = null
  editingStatus.value = null
  formError.value = ''
  resetForm()
  addLine()
  showForm.value = true
}

async function openView(row: PurchaseOrder) {
  editingId.value = row.id
  editingStatus.value = row.status
  formError.value = ''
  showForm.value = true
  loadingDetail.value = true
  try {
    const detail = await get(row.id)
    form.companyId = detail.companyId
    form.supplierId = detail.supplierId
    form.warehouseId = detail.warehouseId
    form.orderDate = detail.orderDate
    form.expectedDate = detail.expectedDate ?? ''
    form.notes = detail.notes ?? ''
    form.lines = (detail.lines ?? []).map((l) => ({ productId: l.productId, quantityOrdered: l.quantityOrdered, unitCost: l.unitCost }))
    viewingLineReceived.value = Object.fromEntries((detail.lines ?? []).map((l, i) => [i, `${l.quantityReceived}/${l.quantityOrdered}`]))
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.supplierId || !form.warehouseId || !form.orderDate) {
    formError.value = 'Please fill in company, supplier, warehouse, and order date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantityOrdered || l.unitCost === undefined)) {
    formError.value = 'Every line needs a product, quantity, and unit cost'
    return
  }
  const payload: PurchaseOrderPayload = {
    companyId: form.companyId,
    supplierId: form.supplierId,
    warehouseId: form.warehouseId,
    orderDate: form.orderDate,
    expectedDate: form.expectedDate || undefined,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({ productId: l.productId!, quantityOrdered: l.quantityOrdered!, unitCost: l.unitCost! }))
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      await create(payload)
      toast.add({ title: 'Purchase order created', color: 'success' })
    } else {
      await update(editingId.value, payload)
      toast.add({ title: 'Purchase order updated', color: 'success' })
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const actingId = ref<number | null>(null)
async function onSubmit(row: PurchaseOrder) {
  actingId.value = row.id
  try {
    await submit(row.id)
    toast.add({ title: 'Purchase order submitted', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not submit', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: PurchaseOrder) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'Purchase order cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<PurchaseOrder | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Purchase order deleted', color: 'success' })
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
watch(() => [filter.companyId, filter.supplierId, filter.status], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.supplierId !== undefined || filter.status !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.supplierId = undefined
  filter.status = undefined
  load()
}
</script>

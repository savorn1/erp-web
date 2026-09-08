<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Requests for quotation</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New RFQ </UButton>
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
        <UInput v-model="search" placeholder="Search RFQ number" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
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
        export-filename="rfqs"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton
              v-if="row.status === 'DRAFT'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-send"
              :loading="actingId === row.id"
              @click="onSend(row)"
            >
              Send
            </UButton>
            <UButton
              v-if="row.status === 'DRAFT' || row.status === 'SENT'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-ban"
              :loading="actingId === row.id"
              @click="onCancel(row)"
            >
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
            title="No RFQs match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-send" title="No RFQs yet" description="Create the first request for quotation to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New RFQ</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showForm" :title="formTitle" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div v-if="loadingDetail" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <UAlert
            v-if="detail?.purchaseRequestNumber"
            color="info"
            variant="subtle"
            class="mb-4"
            :title="`Raised from purchase request ${detail.purchaseRequestNumber}`"
            icon="i-lucide-link"
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable || editingId !== null" class="w-full" />
            </UFormField>
            <UFormField label="Warehouse" required>
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Issue date" required>
              <UInput v-model="form.issueDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes">
              <UInput v-model="form.notes" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Invited suppliers" required class="sm:col-span-2">
              <USelectMenu
                v-model="form.supplierIds"
                multiple
                :items="supplierOptionsFor(form.companyId)"
                value-key="value"
                :disabled="!formEditable"
                placeholder="Select suppliers to invite"
                class="w-full"
              />
            </UFormField>
          </div>

          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requested products</p>

          <div v-if="formEditable" class="flex flex-wrap items-end gap-2 mb-3">
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

          <div class="space-y-2 mb-4">
            <div
              v-if="form.lines.length === 0"
              class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
            >
              No line items yet
            </div>
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <div class="col-span-8 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
              <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" :disabled="!formEditable" class="col-span-3" />
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
            </div>
          </div>

          <UAlert v-if="formError" color="error" variant="subtle" class="mb-3" :title="formError" />

          <div class="flex justify-end gap-2 mb-6">
            <UButton color="neutral" variant="ghost" @click="showForm = false">Close</UButton>
            <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ editingId ? 'Save changes' : 'Create' }}</UButton>
          </div>

          <div v-if="detail && detail.status !== 'DRAFT'" class="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Supplier quotations</p>

            <UAlert
              v-if="detail.status === 'CLOSED'"
              color="success"
              variant="subtle"
              class="mb-3"
              :title="`Awarded to ${detail.awardedSupplierName ?? 'supplier'}`"
              :description="`Purchase order ${detail.awardedPurchaseOrderNumber ?? ''} was created.`"
              icon="i-lucide-trophy"
            />

            <div class="space-y-3">
              <div
                v-for="s in detail.suppliers ?? []"
                :key="s.supplierId"
                class="border border-gray-200 dark:border-gray-800 rounded-lg p-3"
                :class="{ 'ring-2 ring-success': detail.awardedSupplierId === s.supplierId }"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm text-gray-900 dark:text-white">{{ s.supplierName }}</span>
                    <StatusBadge :status="s.status" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="s.quotedTotal !== null" class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ formatCurrency(s.quotedTotal) }}
                    </span>
                    <UButton
                      v-if="detail.status === 'SENT'"
                      size="xs"
                      variant="soft"
                      icon="i-lucide-pencil"
                      :loading="quotingSupplierId === s.supplierId"
                      @click="openQuotation(s)"
                    >
                      {{ s.status === 'QUOTED' ? 'Edit quote' : 'Record quote' }}
                    </UButton>
                    <UButton
                      v-if="detail.status === 'SENT' && s.status === 'QUOTED'"
                      size="xs"
                      color="success"
                      icon="i-lucide-trophy"
                      :loading="selectingSupplierId === s.supplierId"
                      @click="onSelectSupplier(s)"
                    >
                      Select
                    </UButton>
                  </div>
                </div>
                <table class="w-full text-xs">
                  <tbody>
                    <tr v-for="l in s.lines" :key="l.productId" class="border-t border-gray-100 dark:border-gray-800/60">
                      <td class="py-1 text-gray-600 dark:text-gray-400">{{ l.productName }} ({{ l.productSku }})</td>
                      <td class="py-1 text-right text-gray-500 dark:text-gray-400">{{ l.quantity }}</td>
                      <td class="py-1 text-right text-gray-900 dark:text-white">
                        {{ l.unitPrice === null ? '—' : formatCurrency(l.unitPrice) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
      </template>
    </UModal>

    <UModal v-model:open="showQuotationModal" :title="`Record quotation — ${quotingSupplier?.supplierName ?? ''}`">
      <template #body>
        <div class="space-y-2">
          <div v-for="(line, i) in quotationLines" :key="line.productId" class="grid grid-cols-12 gap-2 items-center">
            <span class="col-span-7 text-sm text-gray-700 dark:text-gray-300">{{ line.productName }} ({{ line.productSku }}) × {{ line.quantity }}</span>
            <UInput v-model.number="quotationLines[i]!.unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" class="col-span-5" />
          </div>
        </div>
        <UAlert v-if="quotationError" color="error" variant="subtle" class="mt-3" :title="quotationError" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="showQuotationModal = false">Cancel</UButton>
          <UButton :loading="savingQuotation" @click="onSaveQuotation">Save quotation</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete RFQ"
      :description="`Delete RFQ '${confirmDelete?.rfqNumber ?? ''}'? This cannot be undone.`"
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
import type { Rfq, RfqPayload, RfqStatus, RfqSupplierQuote } from '~/composables/useRfqs'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, get, create, update, send, recordQuotation, selectSupplier, cancel, remove } = useRfqs()
const { get: getPurchaseRequest } = usePurchaseRequests()
const { list: listCompanies } = useCompanies()
const { list: listSuppliers } = useSuppliers()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<Rfq[]>([])
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
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

function supplierOptionsFor(companyId: number | undefined) {
  return suppliers.value
    .filter((s) => s.status === 'ACTIVE' && (companyId === undefined || s.companyId === companyId))
    .map((s) => ({ label: s.name, value: s.id }))
}
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}

const filter = reactive<{ companyId: number | undefined; status: RfqStatus | undefined }>({ companyId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['rfqNumber'] })

const columns: ColumnDef<Rfq>[] = [
  { key: 'rfqNumber', label: 'RFQ number', sortable: true },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'issueDate', label: 'Issue date', type: 'date' },
  { key: 'awardedSupplierName', label: 'Awarded to', value: (row) => row.awardedSupplierName ?? '—' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
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
  quantity: number | undefined
}

const showForm = ref(false)
const editingId = ref<number | null>(null)
const editingStatus = ref<RfqStatus | null>(null)
const loadingDetail = ref(false)
const saving = ref(false)
const formError = ref('')
const detail = ref<Rfq | null>(null)

const form = reactive<{
  companyId: number | undefined
  warehouseId: number | undefined
  purchaseRequestId: number | undefined
  issueDate: string
  notes: string
  supplierIds: number[]
  lines: LineForm[]
}>({
  companyId: undefined,
  warehouseId: undefined,
  purchaseRequestId: undefined,
  issueDate: new Date().toISOString().slice(0, 10),
  notes: '',
  supplierIds: [],
  lines: []
})

const formEditable = computed(() => editingStatus.value === null || editingStatus.value === 'DRAFT')
const formTitle = computed(() => (editingId.value === null ? 'New RFQ' : formEditable.value ? 'Edit RFQ' : 'View RFQ'))

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  form.lines.push({ productId: addLineProductId.value, quantity: undefined })
  addLineProductId.value = undefined
}

function resetForm() {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.warehouseId = undefined
  form.purchaseRequestId = undefined
  form.issueDate = new Date().toISOString().slice(0, 10)
  form.notes = ''
  form.supplierIds = []
  form.lines = []
  detail.value = null
}

function openCreate() {
  editingId.value = null
  editingStatus.value = null
  formError.value = ''
  resetForm()
  showForm.value = true
}

async function openView(row: Rfq) {
  editingId.value = row.id
  editingStatus.value = row.status
  formError.value = ''
  showForm.value = true
  loadingDetail.value = true
  try {
    const full = await get(row.id)
    detail.value = full
    form.companyId = full.companyId
    form.warehouseId = full.warehouseId
    form.purchaseRequestId = full.purchaseRequestId ?? undefined
    form.issueDate = full.issueDate
    form.notes = full.notes ?? ''
    form.supplierIds = (full.suppliers ?? []).map((s) => s.supplierId)
    form.lines = (full.lines ?? []).map((l) => ({ productId: l.productId, quantity: l.quantity }))
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.warehouseId || !form.issueDate) {
    formError.value = 'Please fill in company, warehouse, and issue date'
    return
  }
  if (form.supplierIds.length === 0) {
    formError.value = 'Invite at least one supplier'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantity)) {
    formError.value = 'Every line needs a product and quantity'
    return
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      const payload: RfqPayload = {
        companyId: form.companyId,
        warehouseId: form.warehouseId,
        purchaseRequestId: form.purchaseRequestId,
        issueDate: form.issueDate,
        notes: form.notes || undefined,
        supplierIds: form.supplierIds,
        lines: form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity! }))
      }
      await create(payload)
      toast.add({ title: 'RFQ created', color: 'success' })
    } else {
      await update(editingId.value, {
        warehouseId: form.warehouseId,
        issueDate: form.issueDate,
        notes: form.notes || undefined,
        supplierIds: form.supplierIds,
        lines: form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity! }))
      })
      toast.add({ title: 'RFQ updated', color: 'success' })
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
async function onSend(row: Rfq) {
  actingId.value = row.id
  try {
    await send(row.id)
    toast.add({ title: 'RFQ sent to suppliers', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not send', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: Rfq) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'RFQ cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<Rfq | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'RFQ deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// ── Supplier quotation recording ──────────────────────────────────────────
interface QuotationLineForm {
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number | undefined
}

const showQuotationModal = ref(false)
const quotingSupplier = ref<RfqSupplierQuote | null>(null)
const quotingSupplierId = ref<number | null>(null)
const quotationLines = ref<QuotationLineForm[]>([])
const quotationError = ref('')
const savingQuotation = ref(false)

function openQuotation(supplier: RfqSupplierQuote) {
  quotingSupplier.value = supplier
  quotationError.value = ''
  quotationLines.value = supplier.lines.map((l) => ({
    productId: l.productId,
    productName: l.productName,
    productSku: l.productSku,
    quantity: l.quantity,
    unitPrice: l.unitPrice ?? undefined
  }))
  showQuotationModal.value = true
}

async function onSaveQuotation() {
  if (!detail.value || !quotingSupplier.value) return
  quotationError.value = ''
  if (quotationLines.value.some((l) => l.unitPrice === undefined || l.unitPrice === null)) {
    quotationError.value = 'Enter a unit price for every product'
    return
  }
  savingQuotation.value = true
  quotingSupplierId.value = quotingSupplier.value.supplierId
  try {
    const updated = await recordQuotation(
      detail.value.id,
      quotingSupplier.value.supplierId,
      quotationLines.value.map((l) => ({ productId: l.productId, unitPrice: l.unitPrice! }))
    )
    detail.value = updated
    showQuotationModal.value = false
    toast.add({ title: 'Quotation recorded', color: 'success' })
  } catch (err) {
    quotationError.value = apiErrorMessage(err)
  } finally {
    savingQuotation.value = false
    quotingSupplierId.value = null
  }
}

const selectingSupplierId = ref<number | null>(null)
async function onSelectSupplier(supplier: RfqSupplierQuote) {
  if (!detail.value) return
  selectingSupplierId.value = supplier.supplierId
  try {
    const updated = await selectSupplier(detail.value.id, supplier.supplierId)
    detail.value = updated
    editingStatus.value = updated.status
    toast.add({ title: 'Supplier selected', description: `Purchase order ${updated.awardedPurchaseOrderNumber ?? ''} created`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not select supplier', description: apiErrorMessage(err), color: 'error' })
  } finally {
    selectingSupplierId.value = null
  }
}

// Deep-linked from the Purchase Requests page's "Create RFQ" action —
// pre-fills company/lines from an approved purchase request.
async function prefillFromPurchaseRequest(id: number) {
  try {
    const pr = await getPurchaseRequest(id)
    editingId.value = null
    editingStatus.value = null
    formError.value = ''
    resetForm()
    form.companyId = pr.companyId
    form.purchaseRequestId = pr.id
    form.notes = `From purchase request ${pr.requestNumber}`
    form.lines = (pr.lines ?? []).map((l) => ({ productId: l.productId, quantity: l.quantity }))
    showForm.value = true
  } catch (err) {
    toast.add({ title: 'Could not load purchase request', description: apiErrorMessage(err), color: 'error' })
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
  const fromPurchaseRequestId = Number(route.query.fromPurchaseRequestId)
  if (Number.isFinite(fromPurchaseRequestId) && fromPurchaseRequestId > 0) {
    await prefillFromPurchaseRequest(fromPurchaseRequestId)
  }
})
watch(sort, load)
watch(() => [filter.companyId, filter.status], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.status !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.status = undefined
  load()
}
</script>

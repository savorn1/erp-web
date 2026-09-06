<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Purchase invoices</h1>
      <UButton icon="i-lucide-plus" @click="openCreate()"> Generate invoice </UButton>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search invoice number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.supplierId" :items="supplierFilterOptions" placeholder="Supplier" class="w-44" />
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
        export-filename="purchase-invoices"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <UButton
              v-if="row.status === 'DRAFT'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onApprove(row)"
            >
              Approve
            </UButton>
            <NuxtLink v-if="row.status === 'APPROVED' && row.paymentStatus !== 'PAID'" :to="`/supplier-payments?fromPurchaseInvoice=${row.id}`">
              <UButton size="xs" color="success" variant="soft" icon="i-lucide-banknote">Record payment</UButton>
            </NuxtLink>
            <UButton
              v-if="row.status === 'DRAFT' || row.status === 'APPROVED'"
              size="xs"
              color="error"
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
            title="No purchase invoices match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState
            v-else
            icon="i-lucide-receipt"
            title="No purchase invoices yet"
            description="Generate one from a sent purchase order or a quality-checked goods receipt."
          >
            <template #action>
              <UButton icon="i-lucide-plus" @click="openCreate()">Generate invoice</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Generate invoice modal -->
    <UModal v-model:open="showCreate" title="Generate invoice" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Source">
            <URadioGroup
              v-model="createSource"
              :items="[
                { label: 'From purchase order (bills full ordered quantity)', value: 'purchaseOrder' },
                { label: 'From goods receipt (bills only what passed quality check)', value: 'goodsReceipt' }
              ]"
            />
          </UFormField>

          <UFormField v-if="createSource === 'purchaseOrder'" label="Purchase order" required>
            <USelect v-model="createSourceId" :items="invoiceablePoOptions" placeholder="Select a sent purchase order" class="w-full" />
          </UFormField>
          <UFormField v-else label="Goods receipt" required>
            <USelect v-model="createSourceId" :items="invoiceableReceiptOptions" placeholder="Select a quality-checked receipt" class="w-full" />
          </UFormField>

          <UFormField label="Invoice date" required>
            <UInput v-model="createInvoiceDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Due date">
            <UInput v-model="createDueDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Notes">
            <UTextarea v-model="createNotes" class="w-full" />
          </UFormField>
        </div>

        <UAlert v-if="createError" color="error" variant="subtle" class="mt-4" :title="createError" />

        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" :disabled="!createSourceId" @click="onCreateSubmit">Generate</UButton>
        </div>
      </template>
    </UModal>

    <!-- View modal -->
    <UModal v-model:open="showView" :title="`Invoice — ${viewingInvoice?.invoiceNumber ?? ''}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingInvoice">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt class="text-gray-400">Supplier</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingInvoice.supplierName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Status</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingInvoice.status }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Source</dt>
              <dd class="text-gray-900 dark:text-white">
                {{ viewingInvoice.poNumber ?? '—' }}<span v-if="viewingInvoice.receiptNumber"> · {{ viewingInvoice.receiptNumber }}</span>
              </dd>
            </div>
            <div>
              <dt class="text-gray-400">Invoice date</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingInvoice.invoiceDate) }}</dd>
            </div>
            <div v-if="viewingInvoice.dueDate">
              <dt class="text-gray-400">Due date</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingInvoice.dueDate) }}</dd>
            </div>
            <div v-if="viewingInvoice.notes" class="col-span-2">
              <dt class="text-gray-400">Notes</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingInvoice.notes }}</dd>
            </div>
          </dl>

          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lines</p>
          <ul class="space-y-1.5 mb-4">
            <li v-for="line in viewingInvoice.lines" :key="line.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
              <div class="flex items-center justify-between">
                <span>{{ line.productName }} ({{ line.productSku }})</span>
                <span class="text-gray-500 dark:text-gray-400"
                  >{{ line.quantity }} × {{ formatCurrency(line.unitCost) }} = {{ formatCurrency(line.lineTotal) }}</span
                >
              </div>
              <p v-if="line.discountPercent > 0 || line.taxRate > 0" class="text-xs text-gray-400 mt-0.5">
                <span v-if="line.discountPercent > 0">Discount {{ line.discountPercent }}%</span>
                <span v-if="line.discountPercent > 0 && line.taxRate > 0"> · </span>
                <span v-if="line.taxRate > 0">Tax {{ line.taxRate }}%</span>
              </p>
            </li>
          </ul>

          <div class="flex justify-end text-sm text-gray-600 dark:text-gray-300 mb-1">Subtotal: {{ formatCurrency(viewingInvoice.subtotal) }}</div>
          <div v-if="viewingInvoice.discountAmount > 0" class="flex justify-end text-sm text-gray-600 dark:text-gray-300 mb-1">
            Discount: -{{ formatCurrency(viewingInvoice.discountAmount) }}
          </div>
          <div v-if="viewingInvoice.taxAmount > 0" class="flex justify-end text-sm text-gray-600 dark:text-gray-300 mb-1">
            Tax: {{ formatCurrency(viewingInvoice.taxAmount) }}
          </div>
          <div class="flex justify-end text-sm font-medium text-gray-900 dark:text-white mb-1">Total: {{ formatCurrency(viewingInvoice.totalAmount) }}</div>
          <div v-if="viewingInvoice.creditedAmount > 0" class="flex justify-end text-sm text-error mb-1">
            Credited: -{{ formatCurrency(viewingInvoice.creditedAmount) }}
          </div>
          <div v-if="viewingInvoice.paidAmount > 0" class="flex justify-end text-sm text-success mb-1">
            Paid: -{{ formatCurrency(viewingInvoice.paidAmount) }}
          </div>
          <div class="flex justify-end text-sm font-medium text-gray-900 dark:text-white mb-4">
            Outstanding ({{ viewingInvoice.paymentStatus }}): {{ formatCurrency(viewingInvoice.outstandingAmount) }}
          </div>

          <template v-if="viewingInvoice.status === 'APPROVED'">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Credit notes</p>
              <UButton size="xs" variant="soft" icon="i-lucide-plus" @click="openCreditNote(viewingInvoice)">Issue credit note</UButton>
            </div>
            <div v-if="loadingCreditNotes" class="text-sm text-gray-400">Loading…</div>
            <EmptyState v-else-if="creditNotes.length === 0" icon="i-lucide-file-minus" title="No credit notes yet" />
            <ul v-else class="space-y-1.5 mb-4">
              <li v-for="cn in creditNotes" :key="cn.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
                <div class="flex items-center justify-between">
                  <span>{{ cn.creditNoteNumber }}</span>
                  <span class="text-error">-{{ formatCurrency(cn.amount) }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ formatDate(cn.creditNoteDate) }}<span v-if="cn.reason"> — {{ cn.reason }}</span>
                </p>
              </li>
            </ul>

            <NuxtLink v-if="viewingInvoice.paymentStatus !== 'PAID'" :to="`/supplier-payments?fromPurchaseInvoice=${viewingInvoice.id}`">
              <UButton size="sm" color="success" variant="soft" icon="i-lucide-banknote">Record payment</UButton>
            </NuxtLink>
          </template>
        </template>
      </template>
    </UModal>

    <!-- Credit note modal -->
    <UModal v-model:open="showCreditNoteForm" :title="`Issue credit note — ${creditNoteTarget?.invoiceNumber ?? ''}`">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Credit note date" required>
            <UInput v-model="creditNoteForm.creditNoteDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="creditNoteForm.amount" type="number" min="0.01" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Reason">
            <UInput v-model="creditNoteForm.reason" class="w-full" />
          </UFormField>
        </div>
        <UAlert v-if="creditNoteError" color="error" variant="subtle" class="mt-4" :title="creditNoteError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showCreditNoteForm = false">Cancel</UButton>
          <UButton :loading="issuingCreditNote" @click="onCreditNoteSubmit">Issue</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete purchase invoice"
      :description="`Delete purchase invoice '${confirmDelete?.invoiceNumber ?? ''}'? This cannot be undone.`"
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
import type { PurchaseInvoice, PurchaseInvoiceStatus } from '~/composables/usePurchaseInvoices'
import type { PurchaseCreditNote } from '~/composables/usePurchaseCreditNotes'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, get, createFromPurchaseOrder, createFromGoodsReceipt, approve, cancel, remove } = usePurchaseInvoices()
const { list: listCreditNotesApi, create: createCreditNote } = usePurchaseCreditNotes()
const { list: listCompanies } = useCompanies()
const { list: listSuppliers } = useSuppliers()
const { list: listPurchaseOrders } = usePurchaseOrders()
const { list: listGoodsReceipts } = useGoodsReceipts()
const toast = useToast()

const rows = ref<PurchaseInvoice[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string }[]>([])
const suppliers = ref<{ id: number; name: string }[]>([])
const purchaseOrders = ref<{ id: number; poNumber: string; status: string }[]>([])
const goodsReceipts = ref<{ id: number; receiptNumber: string; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, s, po, gr] = await Promise.all([
      listCompanies({ size: 200 }),
      listSuppliers({ size: 200 }),
      listPurchaseOrders({ size: 200 }),
      listGoodsReceipts({ size: 200 })
    ])
    companies.value = c.data
    suppliers.value = s.data
    purchaseOrders.value = po.data
    goodsReceipts.value = gr.data
  } finally {
    loadingLookups.value = false
  }
}

const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const supplierFilterOptions = computed(() => [{ label: 'All suppliers', value: undefined }, ...suppliers.value.map((s) => ({ label: s.name, value: s.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const invoiceablePoOptions = computed(() =>
  purchaseOrders.value
    .filter((p) => p.status === 'SENT' || p.status === 'PARTIALLY_RECEIVED' || p.status === 'RECEIVED')
    .map((p) => ({ label: p.poNumber, value: p.id }))
)
const invoiceableReceiptOptions = computed(() =>
  goodsReceipts.value.filter((r) => r.status === 'COMPLETED').map((r) => ({ label: r.receiptNumber, value: r.id }))
)

const filter = reactive<{
  companyId: number | undefined
  supplierId: number | undefined
  status: PurchaseInvoiceStatus | undefined
}>({ companyId: undefined, supplierId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['invoiceNumber'] })

const columns: ColumnDef<PurchaseInvoice>[] = [
  { key: 'invoiceNumber', label: 'Invoice number', sortable: true },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'poNumber', label: 'Source', value: (row) => row.receiptNumber ?? row.poNumber ?? '—' },
  { key: 'invoiceDate', label: 'Invoice date', type: 'date' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
  { key: 'outstandingAmount', label: 'Outstanding', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'paymentStatus', label: 'Payment', type: 'status' },
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

// ── Generate invoice ────────────────────────────────────────────────────────

const showCreate = ref(false)
const createSource = ref<'purchaseOrder' | 'goodsReceipt'>('purchaseOrder')
const createSourceId = ref<number | undefined>(undefined)
const createInvoiceDate = ref(new Date().toISOString().slice(0, 10))
const createDueDate = ref('')
const createNotes = ref('')
const creating = ref(false)
const createError = ref('')

function openCreate(source?: 'purchaseOrder' | 'goodsReceipt', sourceId?: number) {
  createSource.value = source ?? 'purchaseOrder'
  createSourceId.value = sourceId
  createInvoiceDate.value = new Date().toISOString().slice(0, 10)
  createDueDate.value = ''
  createNotes.value = ''
  createError.value = ''
  showCreate.value = true
}

async function onCreateSubmit() {
  if (!createSourceId.value) return
  createError.value = ''
  const payload = { invoiceDate: createInvoiceDate.value, dueDate: createDueDate.value || undefined, notes: createNotes.value || undefined }
  creating.value = true
  try {
    if (createSource.value === 'purchaseOrder') {
      await createFromPurchaseOrder(createSourceId.value, payload)
    } else {
      await createFromGoodsReceipt(createSourceId.value, payload)
    }
    toast.add({ title: 'Purchase invoice generated', color: 'success' })
    showCreate.value = false
    await load()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

// ── Approve / cancel / delete ──────────────────────────────────────────────

const actingId = ref<number | null>(null)
async function onApprove(row: PurchaseInvoice) {
  actingId.value = row.id
  try {
    await approve(row.id)
    toast.add({ title: 'Purchase invoice approved — supplier balance charged', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not approve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: PurchaseInvoice) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'Purchase invoice cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<PurchaseInvoice | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Purchase invoice deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// ── View + credit notes ─────────────────────────────────────────────────────

const showView = ref(false)
const viewingInvoice = ref<PurchaseInvoice | null>(null)
const loadingView = ref(false)
const creditNotes = ref<PurchaseCreditNote[]>([])
const loadingCreditNotes = ref(false)

async function openView(row: PurchaseInvoice) {
  showView.value = true
  loadingView.value = true
  creditNotes.value = []
  try {
    viewingInvoice.value = await get(row.id)
    if (viewingInvoice.value.status === 'APPROVED') {
      await loadCreditNotes(row.id)
    }
  } finally {
    loadingView.value = false
  }
}
async function loadCreditNotes(purchaseInvoiceId: number) {
  loadingCreditNotes.value = true
  try {
    creditNotes.value = (await listCreditNotesApi({ purchaseInvoiceId })).data
  } finally {
    loadingCreditNotes.value = false
  }
}

const showCreditNoteForm = ref(false)
const creditNoteTarget = ref<PurchaseInvoice | null>(null)
const creditNoteForm = reactive<{ creditNoteDate: string; amount: number | undefined; reason: string }>({
  creditNoteDate: new Date().toISOString().slice(0, 10),
  amount: undefined,
  reason: ''
})
const issuingCreditNote = ref(false)
const creditNoteError = ref('')

function openCreditNote(invoice: PurchaseInvoice) {
  creditNoteTarget.value = invoice
  creditNoteForm.creditNoteDate = new Date().toISOString().slice(0, 10)
  creditNoteForm.amount = undefined
  creditNoteForm.reason = ''
  creditNoteError.value = ''
  showCreditNoteForm.value = true
}

async function onCreditNoteSubmit() {
  if (!creditNoteTarget.value || !creditNoteForm.amount) {
    creditNoteError.value = 'Enter an amount'
    return
  }
  issuingCreditNote.value = true
  creditNoteError.value = ''
  try {
    await createCreditNote(creditNoteTarget.value.id, {
      creditNoteDate: creditNoteForm.creditNoteDate,
      amount: creditNoteForm.amount,
      reason: creditNoteForm.reason || undefined
    })
    toast.add({ title: 'Credit note issued', color: 'success' })
    showCreditNoteForm.value = false
    viewingInvoice.value = await get(creditNoteTarget.value.id)
    await loadCreditNotes(creditNoteTarget.value.id)
    await load()
  } catch (err) {
    creditNoteError.value = apiErrorMessage(err)
  } finally {
    issuingCreditNote.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
  const fromPurchaseOrderId = Number(route.query.fromPurchaseOrderId)
  const fromGoodsReceiptId = Number(route.query.fromGoodsReceiptId)
  if (fromPurchaseOrderId) openCreate('purchaseOrder', fromPurchaseOrderId)
  else if (fromGoodsReceiptId) openCreate('goodsReceipt', fromGoodsReceiptId)
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

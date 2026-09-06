<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Supplier payments</h1>
      <UButton icon="i-lucide-plus" @click="openCreate()"> Record payment </UButton>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search payment number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.supplierId" :items="supplierFilterOptions" placeholder="Supplier" class="w-44" />
        <USelect v-model="filter.method" :items="methodFilterOptions" placeholder="Method" class="w-44" />
        <USelect v-model="filter.type" :items="typeFilterOptions" placeholder="Type" class="w-36" />
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
        export-filename="supplier-payments"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-receipt" @click="openView(row)">Receipt</UButton>
            <UButton
              v-if="row.type === 'PAYMENT' && (row.refundedAmount ?? 0) < row.amount"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-undo-2"
              @click="openRefund(row)"
            >
              Refund
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No payments match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState
            v-else
            icon="i-lucide-banknote"
            title="No payments recorded yet"
            description="Record the first payment against an approved purchase invoice."
          >
            <template #action>
              <UButton icon="i-lucide-plus" @click="openCreate()">Record payment</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Record payment modal -->
    <UModal v-model:open="showCreate" title="Record payment" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <UFormField label="Company" required>
            <USelect v-model="form.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onCompanyChanged" />
          </UFormField>
          <UFormField label="Supplier" required>
            <USelect v-model="form.supplierId" :items="supplierOptionsFor(form.companyId)" class="w-full" @update:model-value="onSupplierChanged" />
          </UFormField>
          <UFormField label="Payment date" required>
            <UInput v-model="form.paymentDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Method" required>
            <USelect v-model="form.method" :items="methodOptions" class="w-full" />
          </UFormField>
          <UFormField label="Reference">
            <UInput v-model="form.reference" placeholder="Transaction id, check number…" class="w-full" />
          </UFormField>
          <UFormField label="Notes">
            <UInput v-model="form.notes" class="w-full" />
          </UFormField>
        </div>

        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Allocate to outstanding invoices</p>
        <div v-if="loadingInvoices" class="text-sm text-gray-400 py-4 text-center">Loading…</div>
        <EmptyState
          v-else-if="form.supplierId && outstandingInvoices.length === 0"
          icon="i-lucide-check-circle"
          title="Nothing outstanding"
          description="This supplier has no unpaid approved purchase invoices."
        />
        <div v-else class="space-y-2 mb-4">
          <div
            v-for="line in outstandingInvoices"
            :key="line.invoiceId"
            class="grid grid-cols-12 gap-2 items-center rounded-lg border border-gray-200 dark:border-gray-800 p-2"
          >
            <UCheckbox v-model="line.selected" class="col-span-1" />
            <span class="col-span-5 text-sm text-gray-900 dark:text-white truncate">{{ line.invoiceNumber }}</span>
            <span class="col-span-3 text-xs text-gray-400 text-right">Outstanding: {{ formatCurrency(line.outstandingAmount) }}</span>
            <UInput
              v-model.number="line.amount"
              type="number"
              min="0.01"
              :max="line.outstandingAmount"
              step="0.01"
              placeholder="Amount"
              :disabled="!line.selected"
              class="col-span-3"
            />
          </div>
        </div>

        <div class="flex justify-end text-sm font-medium text-gray-900 dark:text-white mb-4">Total to record: {{ formatCurrency(formTotal) }}</div>

        <UAlert v-if="createError" color="error" variant="subtle" class="mb-3" :title="createError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" :disabled="formTotal <= 0" @click="onCreateSubmit">Record payment</UButton>
        </div>
      </template>
    </UModal>

    <!-- Refund modal -->
    <UModal v-model:open="showRefund" :title="`Issue refund — ${refundTarget?.paymentNumber ?? ''}`">
      <template #body>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Refundable: {{ formatCurrency((refundTarget?.amount ?? 0) - (refundTarget?.refundedAmount ?? 0)) }}
        </p>
        <div class="space-y-4">
          <UFormField label="Refund date" required>
            <UInput v-model="refundForm.refundDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="refundForm.amount" type="number" min="0.01" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Reason">
            <UInput v-model="refundForm.reason" class="w-full" />
          </UFormField>
        </div>
        <UAlert v-if="refundError" color="error" variant="subtle" class="mt-4" :title="refundError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showRefund = false">Cancel</UButton>
          <UButton color="warning" :loading="refunding" @click="onRefundSubmit">Issue refund</UButton>
        </div>
      </template>
    </UModal>

    <!-- Receipt / view modal -->
    <UModal
      v-model:open="showView"
      :title="`${viewingPayment?.type === 'REFUND' ? 'Refund' : 'Payment'} receipt — ${viewingPayment?.paymentNumber ?? ''}`"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <div v-if="loadingView" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
        <template v-else-if="viewingPayment">
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt class="text-gray-400">Supplier</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.supplierName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Date</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingPayment.paymentDate) }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Method</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.method }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Amount</dt>
              <dd class="text-gray-900 dark:text-white font-medium">{{ formatCurrency(viewingPayment.amount) }}</dd>
            </div>
            <div v-if="viewingPayment.reference">
              <dt class="text-gray-400">Reference</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.reference }}</dd>
            </div>
            <div v-if="viewingPayment.relatedPaymentNumber">
              <dt class="text-gray-400">Refund of</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.relatedPaymentNumber }}</dd>
            </div>
            <div v-if="viewingPayment.createdBy">
              <dt class="text-gray-400">Recorded by</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.createdBy }}</dd>
            </div>
            <div v-if="viewingPayment.notes" class="col-span-2">
              <dt class="text-gray-400">Notes</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.notes }}</dd>
            </div>
          </dl>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Allocations</p>
          <ul class="space-y-1.5">
            <li
              v-for="a in viewingPayment.allocations"
              :key="a.id"
              class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5 flex items-center justify-between"
            >
              <span>{{ a.invoiceNumber }}</span>
              <span :class="a.amount >= 0 ? 'text-success' : 'text-error'">{{ a.amount >= 0 ? '' : '-' }}{{ formatCurrency(Math.abs(a.amount)) }}</span>
            </li>
          </ul>
        </template>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SupplierPayment, SupplierPaymentMethod, SupplierPaymentType } from '~/composables/useSupplierPayments'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, get, record, refund } = useSupplierPayments()
const { list: listCompanies } = useCompanies()
const { list: listSuppliers } = useSuppliers()
const { list: listPurchaseInvoices, get: getPurchaseInvoice } = usePurchaseInvoices()
const toast = useToast()

const rows = ref<SupplierPayment[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const suppliers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, s] = await Promise.all([listCompanies({ size: 200 }), listSuppliers({ size: 200 })])
    companies.value = c.data
    suppliers.value = s.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const supplierFilterOptions = computed(() => [{ label: 'All suppliers', value: undefined }, ...suppliers.value.map((s) => ({ label: s.name, value: s.id }))])
function supplierOptionsFor(companyId: number | undefined) {
  return suppliers.value
    .filter((s) => s.status === 'ACTIVE' && (companyId === undefined || s.companyId === companyId))
    .map((s) => ({ label: s.name, value: s.id }))
}

const methodOptions = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'Payment gateway', value: 'PAYMENT_GATEWAY' }
]
const methodFilterOptions = [{ label: 'All methods', value: undefined }, ...methodOptions]
const typeFilterOptions = [
  { label: 'All types', value: undefined },
  { label: 'Payment', value: 'PAYMENT' },
  { label: 'Refund', value: 'REFUND' }
]

const filter = reactive<{
  supplierId: number | undefined
  method: SupplierPaymentMethod | undefined
  type: SupplierPaymentType | undefined
}>({ supplierId: undefined, method: undefined, type: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['paymentNumber'] })

const columns: ColumnDef<SupplierPayment>[] = [
  { key: 'paymentNumber', label: 'Number', sortable: true },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'paymentDate', label: 'Date', type: 'date' },
  { key: 'method', type: 'enum' },
  { key: 'type', type: 'status' },
  { key: 'amount', type: 'currency' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      supplierId: filter.supplierId,
      method: filter.method,
      type: filter.type,
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

// ── Record payment ──────────────────────────────────────────────────────────

interface OutstandingLine {
  invoiceId: number
  invoiceNumber: string
  outstandingAmount: number
  selected: boolean
  amount: number | undefined
}

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const loadingInvoices = ref(false)
const outstandingInvoices = ref<OutstandingLine[]>([])

const form = reactive<{
  companyId: number | undefined
  supplierId: number | undefined
  paymentDate: string
  method: SupplierPaymentMethod
  reference: string
  notes: string
}>({
  companyId: undefined,
  supplierId: undefined,
  paymentDate: new Date().toISOString().slice(0, 10),
  method: 'CASH',
  reference: '',
  notes: ''
})

const formTotal = computed(() => outstandingInvoices.value.filter((l) => l.selected).reduce((sum, l) => sum + (l.amount || 0), 0))

function onCompanyChanged() {
  form.supplierId = undefined
  outstandingInvoices.value = []
}

async function onSupplierChanged(supplierId: number | undefined, preselectInvoiceId?: number) {
  outstandingInvoices.value = []
  if (!supplierId) return
  loadingInvoices.value = true
  try {
    const res = await listPurchaseInvoices({ supplierId, status: 'APPROVED', size: 200 })
    outstandingInvoices.value = res.data
      .filter((inv) => inv.outstandingAmount > 0)
      .map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        outstandingAmount: inv.outstandingAmount,
        selected: inv.id === preselectInvoiceId,
        amount: inv.id === preselectInvoiceId ? inv.outstandingAmount : undefined
      }))
  } finally {
    loadingInvoices.value = false
  }
}

function openCreate(supplierId?: number, invoiceId?: number) {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.supplierId = supplierId
  form.paymentDate = new Date().toISOString().slice(0, 10)
  form.method = 'CASH'
  form.reference = ''
  form.notes = ''
  createError.value = ''
  outstandingInvoices.value = []
  showCreate.value = true
  if (supplierId) onSupplierChanged(supplierId, invoiceId)
}

async function onCreateSubmit() {
  createError.value = ''
  if (!form.companyId || !form.supplierId || !form.paymentDate) {
    createError.value = 'Please fill in company, supplier, and payment date'
    return
  }
  const selected = outstandingInvoices.value.filter((l) => l.selected)
  if (selected.length === 0 || selected.some((l) => !l.amount || l.amount <= 0)) {
    createError.value = 'Select at least one invoice and enter a positive amount'
    return
  }
  creating.value = true
  try {
    await record({
      companyId: form.companyId,
      supplierId: form.supplierId,
      paymentDate: form.paymentDate,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      allocations: selected.map((l) => ({ purchaseInvoiceId: l.invoiceId, amount: l.amount! }))
    })
    toast.add({ title: 'Payment recorded', color: 'success' })
    showCreate.value = false
    await load()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

// ── Refund ───────────────────────────────────────────────────────────────────

const showRefund = ref(false)
const refundTarget = ref<SupplierPayment | null>(null)
const refundForm = reactive<{ refundDate: string; amount: number | undefined; reason: string }>({
  refundDate: new Date().toISOString().slice(0, 10),
  amount: undefined,
  reason: ''
})
const refunding = ref(false)
const refundError = ref('')

function openRefund(payment: SupplierPayment) {
  refundTarget.value = payment
  refundForm.refundDate = new Date().toISOString().slice(0, 10)
  refundForm.amount = undefined
  refundForm.reason = ''
  refundError.value = ''
  showRefund.value = true
}

async function onRefundSubmit() {
  if (!refundTarget.value || !refundForm.amount) {
    refundError.value = 'Enter an amount'
    return
  }
  refunding.value = true
  refundError.value = ''
  try {
    await refund(refundTarget.value.id, {
      refundDate: refundForm.refundDate,
      amount: refundForm.amount,
      reason: refundForm.reason || undefined
    })
    toast.add({ title: 'Refund issued', color: 'success' })
    showRefund.value = false
    await load()
  } catch (err) {
    refundError.value = apiErrorMessage(err)
  } finally {
    refunding.value = false
  }
}

// ── View / receipt ───────────────────────────────────────────────────────────

const showView = ref(false)
const viewingPayment = ref<SupplierPayment | null>(null)
const loadingView = ref(false)
async function openView(row: SupplierPayment) {
  showView.value = true
  loadingView.value = true
  try {
    viewingPayment.value = await get(row.id)
  } finally {
    loadingView.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
  const fromPurchaseInvoice = Number(route.query.fromPurchaseInvoice)
  if (fromPurchaseInvoice) {
    try {
      const invoice = await getPurchaseInvoice(fromPurchaseInvoice)
      openCreate(invoice.supplierId, fromPurchaseInvoice)
      form.companyId = invoice.companyId
    } catch {
      // ignore — user can still record a payment manually
    }
  }
})
watch(sort, load)
watch(() => [filter.supplierId, filter.method, filter.type], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.supplierId !== undefined || filter.method !== undefined || filter.type !== undefined)
function clearFilters() {
  search.value = ''
  filter.supplierId = undefined
  filter.method = undefined
  filter.type = undefined
  load()
}
</script>

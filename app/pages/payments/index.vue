<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Customer payments</h1>
      <UButton icon="i-lucide-plus" @click="openCreate()"> Record payment </UButton>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search payment number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.customerId" :items="customerFilterOptions" placeholder="Customer" class="w-44" />
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
        export-filename="payments"
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
          <EmptyState v-else icon="i-lucide-banknote" title="No payments recorded yet" description="Record the first payment against an approved invoice.">
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
          <UFormField label="Customer" required>
            <USelect v-model="form.customerId" :items="customerOptionsFor(form.companyId)" class="w-full" @update:model-value="onCustomerChanged" />
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

        <div
          v-if="selectedCustomer"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 mb-4 text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">
            Balance owed by this customer
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(selectedCustomer!.currentBalance) }}</span>
          </span>
          <UBadge color="neutral" variant="subtle" size="xs">{{ formatEnum(selectedCustomer!.paymentTerms) }}</UBadge>
        </div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Allocate to outstanding invoices</p>
          <div class="flex items-center gap-2">
            <UInput
              v-model="invoiceSearch"
              size="xs"
              icon="i-lucide-search"
              placeholder="Find invoice no."
              :loading="loadingInvoices && invoiceSearch !== ''"
              class="w-44"
            />
            <UButton v-if="outstandingInvoices.length > 0" size="xs" color="neutral" variant="ghost" @click="selectAllOutstanding"> Select all </UButton>
          </div>
        </div>
        <UAlert
          v-if="invoiceListTruncated"
          color="warning"
          variant="subtle"
          class="mb-2"
          icon="i-lucide-triangle-alert"
          title="Not every invoice is listed"
          :description="`This customer has more than ${INVOICE_FETCH_LIMIT} approved invoices, so older unpaid ones may be missing. Search by invoice number to find a specific one.`"
        />
        <div v-if="loadingInvoices" class="text-sm text-gray-400 py-4 text-center">Loading…</div>
        <EmptyState
          v-else-if="form.customerId && outstandingInvoices.length === 0"
          icon="i-lucide-check-circle"
          title="Nothing outstanding"
          description="This customer has no unpaid approved invoices."
        />
        <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 mb-4">
          <div class="min-w-[560px]">
            <div
              class="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
            >
              <span class="col-span-1" />
              <span class="col-span-5">Invoice</span>
              <span class="col-span-3 text-right">Outstanding</span>
              <span class="col-span-3">Amount</span>
            </div>
            <div class="divide-y divide-gray-200 dark:divide-gray-800">
              <div
                v-for="line in outstandingInvoices"
                :key="line.invoiceId"
                class="grid grid-cols-12 gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40"
                @click="onLineToggle(line, !isSelected(line.invoiceId))"
              >
                <UCheckbox :model-value="isSelected(line.invoiceId)" class="col-span-1 pointer-events-none" />
                <div class="col-span-5 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm text-gray-900 dark:text-white truncate">{{ line.invoiceNumber }}</span>
                    <UBadge v-if="line.overdue" color="error" variant="subtle" size="xs">{{ line.daysOverdue }} days overdue</UBadge>
                  </div>
                  <p v-if="line.dueDate" class="text-xs text-gray-400">Due {{ formatDate(line.dueDate) }}</p>
                </div>
                <span class="col-span-3 text-xs text-gray-400 text-right">{{ formatCurrency(line.outstandingAmount) }}</span>
                <UInput
                  :model-value="amountFor(line.invoiceId)"
                  type="number"
                  min="0.01"
                  :max="line.outstandingAmount"
                  step="0.01"
                  placeholder="Amount"
                  :disabled="!isSelected(line.invoiceId)"
                  class="col-span-3"
                  @click.stop
                  @update:model-value="(v: string | number) => setAmountFor(line.invoiceId, v === '' ? undefined : Number(v))"
                />
                <p
                  v-if="isSelected(line.invoiceId) && (amountFor(line.invoiceId) ?? 0) > line.outstandingAmount"
                  class="col-span-12 text-xs text-error text-right"
                >
                  Exceeds outstanding balance of {{ formatCurrency(line.outstandingAmount) }}
                </p>
              </div>
            </div>
            <p v-if="outstandingInvoices.length === 0" class="text-sm text-gray-400 text-center py-4">No unpaid invoice matches “{{ invoiceSearch }}”</p>
          </div>
        </div>

        <div v-if="outstandingInvoices.length > 0 || selectedCount > 0" class="flex justify-end mb-4">
          <div class="w-full sm:w-72 rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-1.5 text-sm">
            <div v-if="fullListKnown" class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total outstanding</span><span>{{ formatCurrency(totalOutstanding) }}</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Invoices selected</span><span>{{ selectedCount }}</span>
            </div>
            <div class="flex justify-between font-medium text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-800">
              <span>Total to record</span><span>{{ formatCurrency(formTotal) }}</span>
            </div>
            <div v-if="fullListKnown" class="flex justify-between" :class="remainingAfterPayment > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-success'">
              <span>{{ remainingAfterPayment > 0 ? 'Still owing after' : 'Settles in full' }}</span>
              <span v-if="remainingAfterPayment > 0">{{ formatCurrency(remainingAfterPayment) }}</span>
            </div>
          </div>
        </div>

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
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Refundable: {{ formatCurrency(refundableAmount) }}</p>
        <!-- What the original payment actually settled — without this you're choosing
             a refund amount with no view of what it was paying for. -->
        <div
          v-if="refundTarget?.allocations?.length"
          class="rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 mb-4"
        >
          <div class="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">Originally applied to</div>
          <div v-for="a in refundTarget.allocations" :key="a.id" class="flex items-center justify-between px-3 py-1.5 text-sm">
            <span class="text-gray-700 dark:text-gray-300">{{ a.invoiceNumber }}</span>
            <span class="text-gray-900 dark:text-white">{{ formatCurrency(a.amount) }}</span>
          </div>
        </div>
        <div class="space-y-4">
          <UFormField label="Refund date" required>
            <UInput v-model="refundForm.refundDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="refundForm.amount" type="number" min="0.01" :max="refundableAmount" step="0.01" class="w-full" />
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
              <dt class="text-gray-400">Customer</dt>
              <dd class="text-gray-900 dark:text-white">{{ viewingPayment.customerName }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Date</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatDate(viewingPayment.paymentDate) }}</dd>
            </div>
            <div>
              <dt class="text-gray-400">Method</dt>
              <dd class="text-gray-900 dark:text-white">{{ formatEnum(viewingPayment.method) }}</dd>
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
import type { Payment, PaymentMethod, PaymentType } from '~/composables/usePayments'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, get, record, refund } = usePayments()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listInvoices, get: getInvoice } = useInvoices()
const toast = useToast()

const rows = ref<Payment[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string; currentBalance: number; paymentTerms: string }[]>([])

// The customer's ledger balance and terms, shown once one is picked. This balance is
// authoritative and independent of the invoice list, so it stays meaningful even
// when that list is capped and the per-invoice total has to be withheld.
const selectedCustomer = computed(() => customers.value.find((c) => c.id === form.customerId))
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, cu] = await Promise.all([listCompanies({ size: 200 }), listCustomers({ size: 200 })])
    companies.value = c.data
    customers.value = cu.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const customerFilterOptions = computed(() => [{ label: 'All customers', value: undefined }, ...customers.value.map((c) => ({ label: c.name, value: c.id }))])
function customerOptionsFor(companyId: number | undefined) {
  return customers.value
    .filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
    .map((c) => ({ label: c.name, value: c.id }))
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
  customerId: number | undefined
  method: PaymentMethod | undefined
  type: PaymentType | undefined
}>({ customerId: undefined, method: undefined, type: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['paymentNumber'] })

const columns: ColumnDef<Payment>[] = [
  { key: 'paymentNumber', label: 'Number', sortable: true },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
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
      customerId: filter.customerId,
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

// A row as fetched for display. Whether it's ticked, and for how much, lives in
// `selections` instead — that has to outlive the list being replaced by a search.
interface OutstandingLine {
  invoiceId: number
  invoiceNumber: string
  outstandingAmount: number
  dueDate: string | null
  overdue: boolean
  daysOverdue: number
}

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const loadingInvoices = ref(false)
const outstandingInvoices = ref<OutstandingLine[]>([])

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  paymentDate: string
  method: PaymentMethod
  reference: string
  notes: string
}>({
  companyId: undefined,
  customerId: undefined,
  paymentDate: new Date().toISOString().slice(0, 10),
  method: 'CASH',
  reference: '',
  notes: ''
})

// Selections live outside the fetched page. The invoice list is searched on the
// server (the only way to reach invoices beyond the fetch cap), so the displayed
// rows get replaced as you type — anything already ticked has to survive that, and
// has to still be submitted even while hidden behind a search.
interface SelectedLine {
  invoiceId: number
  invoiceNumber: string
  outstandingAmount: number
  amount: number | undefined
}
const selections = ref<Record<number, SelectedLine>>({})

const invoiceSearch = ref('')
// True when the customer has more approved invoices than we fetched, so the list
// on screen is not the whole picture.
const invoiceListTruncated = ref(false)
const INVOICE_FETCH_LIMIT = 200

const formTotal = computed(() => Object.values(selections.value).reduce((sum, l) => sum + (l.amount || 0), 0))
const selectedCount = computed(() => Object.keys(selections.value).length)

// Only meaningful when we actually hold every outstanding invoice: a truncated
// fetch or an active search means the rows on screen are a subset, and summing
// them would state a total we can't stand behind.
const fullListKnown = computed(() => !invoiceListTruncated.value && invoiceSearch.value.trim() === '')
const totalOutstanding = computed(() => outstandingInvoices.value.reduce((sum, l) => sum + l.outstandingAmount, 0))
const remainingAfterPayment = computed(() => totalOutstanding.value - formTotal.value)

function isSelected(invoiceId: number) {
  return selections.value[invoiceId] !== undefined
}
function amountFor(invoiceId: number) {
  return selections.value[invoiceId]?.amount
}
function setAmountFor(invoiceId: number, amount: number | undefined) {
  const selected = selections.value[invoiceId]
  if (selected) selected.amount = amount
}

function onCompanyChanged() {
  form.customerId = undefined
  outstandingInvoices.value = []
  selections.value = {}
}

async function onCustomerChanged(customerId: number | undefined, preselectInvoiceId?: number) {
  outstandingInvoices.value = []
  selections.value = {}
  invoiceSearch.value = ''
  invoiceListTruncated.value = false
  if (!customerId) return
  await loadOutstandingInvoices(customerId, preselectInvoiceId)
}

async function loadOutstandingInvoices(customerId: number, preselectInvoiceId?: number) {
  loadingInvoices.value = true
  try {
    const invoiceNumber = invoiceSearch.value.trim() || undefined
    const res = await listInvoices({ customerId, status: 'APPROVED', invoiceNumber, size: INVOICE_FETCH_LIMIT })
    // The cap applies to *approved* invoices, not unpaid ones, so a customer with a
    // long settled history can overflow it and hide invoices they still owe on.
    invoiceListTruncated.value = (res.metadata?.totalCount ?? 0) > res.data.length
    outstandingInvoices.value = res.data
      .filter((inv) => inv.outstandingAmount > 0)
      .map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        outstandingAmount: inv.outstandingAmount,
        dueDate: inv.dueDate,
        overdue: inv.overdue,
        daysOverdue: inv.daysOverdue
      }))
      // Overdue/soonest-due invoices first — the ones most worth collecting now.
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
    if (preselectInvoiceId) {
      const preselect = outstandingInvoices.value.find((l) => l.invoiceId === preselectInvoiceId)
      if (preselect) selectLine(preselect)
    }
  } finally {
    loadingInvoices.value = false
  }
}

// Typing re-queries the server, so it's debounced rather than fired per keystroke.
let invoiceSearchTimer: ReturnType<typeof setTimeout> | undefined
watch(invoiceSearch, () => {
  if (!form.customerId) return
  clearTimeout(invoiceSearchTimer)
  invoiceSearchTimer = setTimeout(() => {
    if (form.customerId) loadOutstandingInvoices(form.customerId)
  }, 300)
})

function selectLine(line: OutstandingLine) {
  selections.value[line.invoiceId] = {
    invoiceId: line.invoiceId,
    invoiceNumber: line.invoiceNumber,
    outstandingAmount: line.outstandingAmount,
    amount: line.outstandingAmount
  }
}

function onLineToggle(line: OutstandingLine, checked: boolean) {
  if (checked) {
    if (!isSelected(line.invoiceId)) selectLine(line)
    return
  }
  delete selections.value[line.invoiceId]
}
// Applies to what's on screen — selecting rows a filter is hiding would be a surprise.
// Selections already made survive filtering, and the summary keeps counting them.
// Applies to the rows on screen — with a search active, selecting invoices the
// server didn't return would be a surprise. Existing selections are untouched.
function selectAllOutstanding() {
  outstandingInvoices.value.forEach((l) => {
    if (!isSelected(l.invoiceId)) selectLine(l)
  })
}

function openCreate(customerId?: number, invoiceId?: number) {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.customerId = customerId
  form.paymentDate = new Date().toISOString().slice(0, 10)
  form.method = 'CASH'
  form.reference = ''
  form.notes = ''
  createError.value = ''
  outstandingInvoices.value = []
  invoiceSearch.value = ''
  showCreate.value = true
  if (customerId) onCustomerChanged(customerId, invoiceId)
}

async function onCreateSubmit() {
  createError.value = ''
  if (!form.companyId || !form.customerId || !form.paymentDate) {
    createError.value = 'Please fill in company, customer, and payment date'
    return
  }
  const selected = Object.values(selections.value)
  if (selected.length === 0 || selected.some((l) => !l.amount || l.amount <= 0)) {
    createError.value = 'Select at least one invoice and enter a positive amount'
    return
  }
  const overAllocated = selected.find((l) => l.amount! > l.outstandingAmount)
  if (overAllocated) {
    createError.value = `${overAllocated.invoiceNumber}'s amount exceeds its outstanding balance of ${formatCurrency(overAllocated.outstandingAmount)}`
    return
  }
  creating.value = true
  try {
    const created = await record({
      companyId: form.companyId,
      customerId: form.customerId,
      paymentDate: form.paymentDate,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      allocations: selected.map((l) => ({ invoiceId: l.invoiceId, amount: l.amount! }))
    })
    toast.add({ title: `Payment ${created.paymentNumber} recorded`, color: 'success' })
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
const refundTarget = ref<Payment | null>(null)
const refundForm = reactive<{ refundDate: string; amount: number | undefined; reason: string }>({
  refundDate: new Date().toISOString().slice(0, 10),
  amount: undefined,
  reason: ''
})
const refunding = ref(false)
const refundError = ref('')
const refundableAmount = computed(() => (refundTarget.value?.amount ?? 0) - (refundTarget.value?.refundedAmount ?? 0))

function openRefund(payment: Payment) {
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
  if (refundForm.amount > refundableAmount.value) {
    refundError.value = `Amount exceeds the refundable balance of ${formatCurrency(refundableAmount.value)}`
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
const viewingPayment = ref<Payment | null>(null)
const loadingView = ref(false)
async function openView(row: Payment) {
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
  const fromInvoice = Number(route.query.fromInvoice)
  if (fromInvoice) {
    try {
      const invoice = await getInvoice(fromInvoice)
      openCreate(invoice.customerId, fromInvoice)
      form.companyId = invoice.companyId
    } catch (err) {
      toast.add({ title: "Couldn't load that invoice", description: apiErrorMessage(err), color: 'error' })
    }
  }
})
watch(sort, load)
watch(() => [filter.customerId, filter.method, filter.type], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.customerId !== undefined || filter.method !== undefined || filter.type !== undefined)
function clearFilters() {
  search.value = ''
  filter.customerId = undefined
  filter.method = undefined
  filter.type = undefined
  load()
}
</script>

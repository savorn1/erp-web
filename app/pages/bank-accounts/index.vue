<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Bank &amp; cash accounts</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate()"> New account </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name / bank / number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.type" :items="typeFilterOptions" placeholder="Type" class="w-40" />
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
        export-filename="bank-accounts"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-list" @click="openLedger(row)">Ledger</UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmDelete = row" />
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No accounts match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-landmark" title="No bank or cash accounts yet" description="Add the first one to start tracking money.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate()">New account</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Create/edit modal -->
    <UModal v-model:open="showForm" :title="formTitle">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Company" required>
            <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="editingId !== null" class="w-full" />
          </UFormField>
          <UFormField label="Type" required>
            <USelect v-model="form.type" :items="typeOptions" class="w-full" />
          </UFormField>
          <UFormField label="Name" required class="sm:col-span-2">
            <UInput v-model="form.name" placeholder="e.g. Petty Cash, Main Checking" class="w-full" />
          </UFormField>
          <UFormField v-if="form.type === 'BANK'" label="Bank name">
            <UInput v-model="form.bankName" class="w-full" />
          </UFormField>
          <UFormField v-if="form.type === 'BANK'" label="Account number">
            <UInput v-model="form.accountNumber" class="w-full" />
          </UFormField>
          <UFormField label="Currency" required>
            <UInput v-model="form.currency" class="w-full" />
          </UFormField>
          <UFormField label="Opening balance" required>
            <UInput v-model.number="form.openingBalance" type="number" step="0.01" :disabled="editingId !== null" class="w-full" />
          </UFormField>
          <UFormField label="Linked GL account" class="sm:col-span-2">
            <USelect v-model="form.accountId" :items="glAccountOptionsFor(form.companyId)" placeholder="No linked account" class="w-full" />
          </UFormField>
          <UFormField label="Active">
            <USwitch v-model="form.active" />
          </UFormField>
        </div>
        <UAlert v-if="formError" color="error" variant="subtle" class="mt-4" :title="formError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showForm = false">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ editingId ? 'Save changes' : 'Create' }}</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete account"
      :description="`Delete account '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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

    <!-- Ledger modal -->
    <UModal v-model:open="showLedger" :title="`Ledger — ${ledgerAccount?.name ?? ''}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="ledgerAccount" class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm text-gray-400">Current balance</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(ledgerAccount.currentBalance) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton size="sm" color="success" variant="soft" icon="i-lucide-arrow-down-to-line" @click="openTxnForm('DEPOSIT')">Deposit</UButton>
            <UButton size="sm" color="warning" variant="soft" icon="i-lucide-arrow-up-from-line" @click="openTxnForm('WITHDRAWAL')">Withdraw</UButton>
            <UButton size="sm" color="info" variant="soft" icon="i-lucide-repeat" @click="openTransferForm">Transfer</UButton>
            <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-scale" @click="openReconcile">Reconcile</UButton>
          </div>
        </div>

        <div v-if="loadingLedger" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <EmptyState v-else-if="ledgerTransactions.length === 0" icon="i-lucide-receipt" title="No transactions yet" />
        <ul v-else class="space-y-1.5 max-h-96 overflow-y-auto">
          <li v-for="t in ledgerTransactions" :key="t.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <UIcon :name="txnIcon(t.type)" class="w-4 h-4 shrink-0" :class="txnIsInflow(t.type) ? 'text-success' : 'text-error'" />
                <span class="text-gray-900 dark:text-white truncate">{{ t.description || formatEnum(t.type) }}</span>
                <UBadge v-if="t.reconciled" color="success" variant="subtle" size="xs">Reconciled</UBadge>
              </div>
              <span class="font-medium shrink-0" :class="txnIsInflow(t.type) ? 'text-success' : 'text-error'">
                {{ txnIsInflow(t.type) ? '+' : '-' }}{{ formatCurrency(t.amount) }}
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ t.transactionNumber }} · {{ formatDate(t.transactionDate) }}
              <span v-if="t.relatedBankAccountName"> · {{ t.type === 'TRANSFER_OUT' ? 'to' : 'from' }} {{ t.relatedBankAccountName }}</span>
            </p>
          </li>
        </ul>
      </template>
    </UModal>

    <!-- Deposit/withdraw modal -->
    <UModal v-model:open="showTxnForm" :title="txnFormType === 'DEPOSIT' ? 'Record deposit' : 'Record withdrawal'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Date" required>
            <UInput v-model="txnForm.transactionDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="txnForm.amount" type="number" min="0.01" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Reference">
            <UInput v-model="txnForm.reference" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="txnForm.description" class="w-full" />
          </UFormField>
        </div>
        <UAlert v-if="txnFormError" color="error" variant="subtle" class="mt-4" :title="txnFormError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showTxnForm = false">Cancel</UButton>
          <UButton :loading="savingTxn" @click="onSaveTxn">{{ txnFormType === 'DEPOSIT' ? 'Deposit' : 'Withdraw' }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Transfer modal -->
    <UModal v-model:open="showTransferForm" title="Transfer between accounts">
      <template #body>
        <div class="space-y-4">
          <UFormField label="From" required>
            <UInput :model-value="ledgerAccount?.name" disabled class="w-full" />
          </UFormField>
          <UFormField label="To" required>
            <USelect v-model="transferForm.toBankAccountId" :items="transferOptions" class="w-full" />
          </UFormField>
          <UFormField label="Date" required>
            <UInput v-model="transferForm.transactionDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="transferForm.amount" type="number" min="0.01" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Reference">
            <UInput v-model="transferForm.reference" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="transferForm.description" class="w-full" />
          </UFormField>
        </div>
        <UAlert v-if="transferFormError" color="error" variant="subtle" class="mt-4" :title="transferFormError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showTransferForm = false">Cancel</UButton>
          <UButton :loading="savingTransfer" @click="onSaveTransfer">Transfer</UButton>
        </div>
      </template>
    </UModal>

    <!-- Reconcile modal -->
    <UModal v-model:open="showReconcile" title="Reconcile" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <UFormField label="Statement date" required>
            <UInput v-model="reconcileForm.statementDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Statement balance" required>
            <UInput v-model.number="reconcileForm.statementBalance" type="number" step="0.01" class="w-full" />
          </UFormField>
        </div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unreconciled transactions</p>
        <EmptyState v-if="unreconciledTransactions.length === 0" icon="i-lucide-check-circle" title="Everything is reconciled" />
        <div v-else class="space-y-1 max-h-72 overflow-y-auto mb-4">
          <label
            v-for="t in unreconciledTransactions"
            :key="t.id"
            class="flex items-center justify-between gap-2 text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5 cursor-pointer"
          >
            <span class="flex items-center gap-2 min-w-0">
              <UCheckbox v-model="reconcileSelection[t.id]" />
              <span class="text-gray-900 dark:text-white truncate">{{ t.description || formatEnum(t.type) }}</span>
              <span class="text-xs text-gray-400 shrink-0">{{ formatDate(t.transactionDate) }}</span>
            </span>
            <span class="font-medium shrink-0" :class="txnIsInflow(t.type) ? 'text-success' : 'text-error'">
              {{ txnIsInflow(t.type) ? '+' : '-' }}{{ formatCurrency(t.amount) }}
            </span>
          </label>
        </div>
        <div v-if="reconcileResult" class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 mb-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">Reconciled balance</span><span>{{ formatCurrency(reconcileResult.reconciledBalance) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Statement balance</span><span>{{ formatCurrency(reconcileResult.statementBalance) }}</span>
          </div>
          <div class="flex justify-between font-medium" :class="reconcileResult.difference === 0 ? 'text-success' : 'text-error'">
            <span>Difference</span><span>{{ formatCurrency(reconcileResult.difference) }}</span>
          </div>
        </div>
        <UAlert v-if="reconcileError" color="error" variant="subtle" class="mb-3" :title="reconcileError" />
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showReconcile = false">Close</UButton>
          <UButton :loading="reconciling" :disabled="selectedReconcileIds.length === 0" @click="onReconcile">Reconcile selected</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BankAccount, BankAccountPayload, BankAccountType, BankReconciliation, BankTransaction, BankTransactionType } from '~/composables/useBankAccounts'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove, listTransactions, deposit, withdraw, transfer, reconcile } = useBankAccounts()
const { list: listCompanies } = useCompanies()
const { list: listAccounts } = useAccounts()
const toast = useToast()

const rows = ref<BankAccount[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const glAccounts = ref<{ id: number; accountCode: string; name: string; companyId: number; active: boolean; accountType: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, a] = await Promise.all([listCompanies({ size: 200 }), listAccounts({ size: 1000 })])
    companies.value = c.data
    glAccounts.value = a.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const typeOptions = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' }
]
const typeFilterOptions = [{ label: 'All types', value: undefined }, ...typeOptions]

function glAccountOptionsFor(companyId: number | undefined) {
  return glAccounts.value
    .filter((a) => a.active && a.accountType === 'ASSET' && (companyId === undefined || a.companyId === companyId))
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
}

const filter = reactive<{ companyId: number | undefined; type: BankAccountType | undefined }>({ companyId: undefined, type: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const {
  page,
  pageSize,
  total,
  rows: pagedRows,
  truncated,
  search
} = useClientTable(rows, { pageSize: 10, searchFields: ['name', 'bankName', 'accountNumber'] })

const columns: ColumnDef<BankAccount>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', type: 'status' },
  { key: 'bankName', label: 'Bank', value: (row) => row.bankName ?? '—' },
  { key: 'currency', label: 'Currency' },
  { key: 'currentBalance', label: 'Balance', type: 'currency' },
  { key: 'active', type: 'boolean' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
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

// ── Create / edit ────────────────────────────────────────────────────────
const showForm = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')
const formTitle = computed(() => (editingId.value === null ? 'New bank/cash account' : 'Edit account'))

const form = reactive<{
  companyId: number | undefined
  name: string
  type: BankAccountType
  bankName: string
  accountNumber: string
  currency: string
  openingBalance: number
  accountId: number | undefined
  active: boolean
}>({
  companyId: undefined,
  name: '',
  type: 'CASH',
  bankName: '',
  accountNumber: '',
  currency: 'USD',
  openingBalance: 0,
  accountId: undefined,
  active: true
})

function resetForm() {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.name = ''
  form.type = 'CASH'
  form.bankName = ''
  form.accountNumber = ''
  form.currency = 'USD'
  form.openingBalance = 0
  form.accountId = undefined
  form.active = true
}

function openCreate() {
  editingId.value = null
  formError.value = ''
  resetForm()
  showForm.value = true
}

function openEdit(row: BankAccount) {
  editingId.value = row.id
  formError.value = ''
  form.companyId = row.companyId
  form.name = row.name
  form.type = row.type
  form.bankName = row.bankName ?? ''
  form.accountNumber = row.accountNumber ?? ''
  form.currency = row.currency
  form.openingBalance = row.openingBalance
  form.accountId = row.accountId ?? undefined
  form.active = row.active
  showForm.value = true
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.name.trim() || !form.currency.trim()) {
    formError.value = 'Please fill in company, name, and currency'
    return
  }
  const payload: BankAccountPayload = {
    companyId: form.companyId,
    accountId: form.accountId,
    name: form.name.trim(),
    type: form.type,
    bankName: form.bankName || undefined,
    accountNumber: form.accountNumber || undefined,
    currency: form.currency.trim(),
    openingBalance: form.openingBalance,
    active: form.active
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      await create(payload)
      toast.add({ title: 'Account created', color: 'success' })
    } else {
      await update(editingId.value, payload)
      toast.add({ title: 'Account updated', color: 'success' })
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<BankAccount | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Account deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// ── Ledger ───────────────────────────────────────────────────────────────
const showLedger = ref(false)
const ledgerAccount = ref<BankAccount | null>(null)
const ledgerTransactions = ref<BankTransaction[]>([])
const loadingLedger = ref(false)

function txnIsInflow(type: BankTransactionType) {
  return type === 'DEPOSIT' || type === 'TRANSFER_IN'
}
function txnIcon(type: BankTransactionType) {
  if (type === 'DEPOSIT') return 'i-lucide-arrow-down-to-line'
  if (type === 'WITHDRAWAL') return 'i-lucide-arrow-up-from-line'
  return 'i-lucide-repeat'
}

async function openLedger(row: BankAccount) {
  ledgerAccount.value = row
  showLedger.value = true
  await loadLedger()
}

async function loadLedger() {
  if (!ledgerAccount.value) return
  loadingLedger.value = true
  try {
    const res = await listTransactions({ bankAccountId: ledgerAccount.value.id, size: 200, sortBy: 'transactionDate', sortOrder: 'desc' })
    ledgerTransactions.value = res.data
  } finally {
    loadingLedger.value = false
  }
}

async function refreshLedgerAccount() {
  if (!ledgerAccount.value) return
  const currentId = ledgerAccount.value.id
  await load()
  const fresh = rows.value.find((r) => r.id === currentId)
  if (fresh) ledgerAccount.value = fresh
}

// ── Deposit / withdraw ─────────────────────────────────────────────────────
const showTxnForm = ref(false)
const txnFormType = ref<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')
const txnForm = reactive<{ transactionDate: string; amount: number | undefined; reference: string; description: string }>({
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: undefined,
  reference: '',
  description: ''
})
const savingTxn = ref(false)
const txnFormError = ref('')

function openTxnForm(type: 'DEPOSIT' | 'WITHDRAWAL') {
  txnFormType.value = type
  txnForm.transactionDate = new Date().toISOString().slice(0, 10)
  txnForm.amount = undefined
  txnForm.reference = ''
  txnForm.description = ''
  txnFormError.value = ''
  showTxnForm.value = true
}

async function onSaveTxn() {
  if (!ledgerAccount.value || !txnForm.amount) {
    txnFormError.value = 'Enter an amount'
    return
  }
  txnFormError.value = ''
  savingTxn.value = true
  try {
    const payload = {
      transactionDate: txnForm.transactionDate,
      amount: txnForm.amount,
      reference: txnForm.reference || undefined,
      description: txnForm.description || undefined
    }
    if (txnFormType.value === 'DEPOSIT') await deposit(ledgerAccount.value.id, payload)
    else await withdraw(ledgerAccount.value.id, payload)
    toast.add({ title: txnFormType.value === 'DEPOSIT' ? 'Deposit recorded' : 'Withdrawal recorded', color: 'success' })
    showTxnForm.value = false
    await Promise.all([loadLedger(), refreshLedgerAccount()])
  } catch (err) {
    txnFormError.value = apiErrorMessage(err)
  } finally {
    savingTxn.value = false
  }
}

// ── Transfer ─────────────────────────────────────────────────────────────
const showTransferForm = ref(false)
const transferForm = reactive<{
  toBankAccountId: number | undefined
  transactionDate: string
  amount: number | undefined
  reference: string
  description: string
}>({
  toBankAccountId: undefined,
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: undefined,
  reference: '',
  description: ''
})
const savingTransfer = ref(false)
const transferFormError = ref('')

const transferOptions = computed(() =>
  rows.value
    .filter((r) => ledgerAccount.value && r.id !== ledgerAccount.value.id && r.companyId === ledgerAccount.value.companyId)
    .map((r) => ({
      label: r.name,
      value: r.id
    }))
)

function openTransferForm() {
  transferForm.toBankAccountId = undefined
  transferForm.transactionDate = new Date().toISOString().slice(0, 10)
  transferForm.amount = undefined
  transferForm.reference = ''
  transferForm.description = ''
  transferFormError.value = ''
  showTransferForm.value = true
}

async function onSaveTransfer() {
  if (!ledgerAccount.value || !transferForm.toBankAccountId || !transferForm.amount) {
    transferFormError.value = 'Select a destination account and enter an amount'
    return
  }
  transferFormError.value = ''
  savingTransfer.value = true
  try {
    await transfer(ledgerAccount.value.id, {
      toBankAccountId: transferForm.toBankAccountId,
      transactionDate: transferForm.transactionDate,
      amount: transferForm.amount,
      reference: transferForm.reference || undefined,
      description: transferForm.description || undefined
    })
    toast.add({ title: 'Transfer recorded', color: 'success' })
    showTransferForm.value = false
    await Promise.all([loadLedger(), refreshLedgerAccount()])
  } catch (err) {
    transferFormError.value = apiErrorMessage(err)
  } finally {
    savingTransfer.value = false
  }
}

// ── Reconcile ────────────────────────────────────────────────────────────
const showReconcile = ref(false)
const reconcileForm = reactive<{ statementDate: string; statementBalance: number | undefined }>({
  statementDate: new Date().toISOString().slice(0, 10),
  statementBalance: undefined
})
const reconcileSelection = reactive<Record<number, boolean>>({})
const reconciling = ref(false)
const reconcileError = ref('')
const reconcileResult = ref<BankReconciliation | null>(null)

const unreconciledTransactions = computed(() => ledgerTransactions.value.filter((t) => !t.reconciled))
const selectedReconcileIds = computed(() =>
  Object.entries(reconcileSelection)
    .filter(([, v]) => v)
    .map(([k]) => Number(k))
)

function openReconcile() {
  reconcileForm.statementDate = new Date().toISOString().slice(0, 10)
  reconcileForm.statementBalance = undefined
  reconcileError.value = ''
  reconcileResult.value = null
  Object.keys(reconcileSelection).forEach((k) => delete reconcileSelection[Number(k)])
  showReconcile.value = true
}

async function onReconcile() {
  if (!ledgerAccount.value || !reconcileForm.statementBalance || selectedReconcileIds.value.length === 0) {
    reconcileError.value = 'Select at least one transaction and enter the statement balance'
    return
  }
  reconcileError.value = ''
  reconciling.value = true
  try {
    reconcileResult.value = await reconcile(ledgerAccount.value.id, {
      transactionIds: selectedReconcileIds.value,
      statementDate: reconcileForm.statementDate,
      statementBalance: reconcileForm.statementBalance
    })
    toast.add({ title: 'Transactions reconciled', color: 'success' })
    Object.keys(reconcileSelection).forEach((k) => delete reconcileSelection[Number(k)])
    await loadLedger()
  } catch (err) {
    reconcileError.value = apiErrorMessage(err)
  } finally {
    reconciling.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.type], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.type !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.type = undefined
  load()
}
</script>

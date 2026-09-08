<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Financial reports</h1>
    </div>

    <UTabs v-model="activeTab" :items="tabs" :content="false" class="mb-4" />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField v-if="usesAsOfDate" label="As of date">
          <UInput v-model="asOfDate" type="date" class="w-44" />
        </UFormField>
        <template v-if="usesDateRange">
          <UFormField label="From">
            <UInput v-model="dateFrom" type="date" class="w-44" />
          </UFormField>
          <UFormField label="To">
            <UInput v-model="dateTo" type="date" class="w-44" />
          </UFormField>
        </template>
        <UFormField v-if="activeTab === 'general-ledger'" label="Account" required>
          <USelect v-model="accountId" :items="accountOptions" placeholder="Select an account" class="w-56" />
        </UFormField>
      </div>
      <p v-if="glReportNote" class="text-xs text-gray-400 mt-3">
        Reflects only what's been manually posted in
        <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink> — nothing else in the system posts to the general ledger automatically yet.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <!-- Trial balance -->
    <UCard v-else-if="activeTab === 'trial-balance' && trialBalance">
      <EmptyState v-if="trialBalance.rows.length === 0" icon="i-lucide-check-circle" title="Nothing posted yet" />
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <th class="py-2 pr-3">Code</th>
            <th class="py-2 pr-3">Account</th>
            <th class="py-2 pr-3">Type</th>
            <th class="py-2 px-3 text-right">Debit</th>
            <th class="py-2 pl-3 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in trialBalance.rows" :key="row.accountId" class="border-b border-gray-100 dark:border-gray-800/60">
            <td class="py-1.5 pr-3 font-mono text-gray-400">{{ row.accountCode }}</td>
            <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.accountName }}</td>
            <td class="py-1.5 pr-3"><StatusBadge :status="row.accountType" /></td>
            <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.debitBalance > 0 ? formatCurrency(row.debitBalance) : '—' }}</td>
            <td class="py-1.5 pl-3 text-right text-gray-600 dark:text-gray-300">{{ row.creditBalance > 0 ? formatCurrency(row.creditBalance) : '—' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
            <td class="py-2 pr-3" colspan="3">Total</td>
            <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(trialBalance.debitTotal) }}</td>
            <td class="py-2 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(trialBalance.creditTotal) }}</td>
          </tr>
        </tfoot>
      </table>
    </UCard>

    <!-- General ledger -->
    <UCard v-else-if="activeTab === 'general-ledger'">
      <EmptyState v-if="!accountId" icon="i-lucide-book-text" title="Select an account" description="Choose an account above to see its ledger." />
      <template v-else-if="generalLedger">
        <div class="flex items-center justify-between mb-3 text-sm">
          <span class="text-gray-900 dark:text-white font-medium">{{ generalLedger.accountCode }} — {{ generalLedger.accountName }}</span>
          <span class="text-gray-400">Opening: {{ formatCurrency(generalLedger.openingBalance) }}</span>
        </div>
        <EmptyState v-if="generalLedger.lines.length === 0" icon="i-lucide-check-circle" title="No activity in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Date</th>
              <th class="py-2 pr-3">Journal</th>
              <th class="py-2 pr-3">Description</th>
              <th class="py-2 px-3 text-right">Debit</th>
              <th class="py-2 px-3 text-right">Credit</th>
              <th class="py-2 pl-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="line in generalLedger.lines"
              :key="line.journalEntryId + '-' + line.debit + '-' + line.credit"
              class="border-b border-gray-100 dark:border-gray-800/60"
            >
              <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{{ formatDate(line.entryDate) }}</td>
              <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{{ line.journalNumber }}</td>
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ line.description ?? '—' }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ line.debit > 0 ? formatCurrency(line.debit) : '—' }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ line.credit > 0 ? formatCurrency(line.credit) : '—' }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(line.runningBalance) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3" colspan="5">Closing balance</td>
              <td class="py-2 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(generalLedger.closingBalance) }}</td>
            </tr>
          </tfoot>
        </table>
      </template>
    </UCard>

    <!-- Balance sheet -->
    <template v-else-if="activeTab === 'balance-sheet' && balanceSheet">
      <UAlert
        v-if="!balanceSheet.balanced"
        color="error"
        variant="subtle"
        class="mb-4"
        title="Out of balance"
        description="Assets don't equal liabilities + equity — this shouldn't happen for posted double-entry data."
      />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Assets</h2></template>
          <EmptyState v-if="balanceSheet.assets.length === 0" icon="i-lucide-check-circle" title="Nothing posted yet" />
          <ul v-else class="space-y-1 text-sm">
            <li v-for="line in balanceSheet.assets" :key="line.accountId ?? line.accountName" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">{{ line.accountName }}</span>
              <span class="text-gray-900 dark:text-white">{{ formatCurrency(line.amount) }}</span>
            </li>
          </ul>
          <div class="flex justify-between font-medium text-sm border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
            <span>Total assets</span><span>{{ formatCurrency(balanceSheet.assetsTotal) }}</span>
          </div>
        </UCard>
        <div class="space-y-4">
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Liabilities</h2></template>
            <EmptyState v-if="balanceSheet.liabilities.length === 0" icon="i-lucide-check-circle" title="Nothing posted yet" />
            <ul v-else class="space-y-1 text-sm">
              <li v-for="line in balanceSheet.liabilities" :key="line.accountId ?? line.accountName" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-300">{{ line.accountName }}</span>
                <span class="text-gray-900 dark:text-white">{{ formatCurrency(line.amount) }}</span>
              </li>
            </ul>
            <div class="flex justify-between font-medium text-sm border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
              <span>Total liabilities</span><span>{{ formatCurrency(balanceSheet.liabilitiesTotal) }}</span>
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Equity</h2></template>
            <ul class="space-y-1 text-sm">
              <li v-for="line in balanceSheet.equity" :key="line.accountId ?? line.accountName" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-300">{{ line.accountName }}</span>
                <span class="text-gray-900 dark:text-white">{{ formatCurrency(line.amount) }}</span>
              </li>
            </ul>
            <div class="flex justify-between font-medium text-sm border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
              <span>Total equity</span><span>{{ formatCurrency(balanceSheet.equityTotal) }}</span>
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <!-- Profit & loss -->
    <template v-else-if="activeTab === 'profit-and-loss' && profitAndLoss">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <UCard>
          <p class="text-xs text-gray-400">Revenue</p>
          <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(profitAndLoss.revenueTotal) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs text-gray-400">Expenses</p>
          <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(profitAndLoss.expenseTotal) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs text-gray-400">Net income</p>
          <p class="text-xl font-semibold" :class="profitAndLoss.netIncome >= 0 ? 'text-success' : 'text-error'">
            {{ formatCurrency(profitAndLoss.netIncome) }}
          </p>
        </UCard>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Revenue</h2></template>
          <EmptyState v-if="profitAndLoss.revenue.length === 0" icon="i-lucide-check-circle" title="No revenue posted in this period" />
          <ul v-else class="space-y-1 text-sm">
            <li v-for="line in profitAndLoss.revenue" :key="line.accountId ?? line.accountName" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">{{ line.accountName }}</span>
              <span class="text-gray-900 dark:text-white">{{ formatCurrency(line.amount) }}</span>
            </li>
          </ul>
        </UCard>
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Expenses</h2></template>
          <EmptyState v-if="profitAndLoss.expenses.length === 0" icon="i-lucide-check-circle" title="No expenses posted in this period" />
          <ul v-else class="space-y-1 text-sm">
            <li v-for="line in profitAndLoss.expenses" :key="line.accountId ?? line.accountName" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">{{ line.accountName }}</span>
              <span class="text-gray-900 dark:text-white">{{ formatCurrency(line.amount) }}</span>
            </li>
          </ul>
        </UCard>
      </div>
    </template>

    <!-- Cash flow -->
    <UCard v-else-if="activeTab === 'cash-flow' && cashFlow">
      <EmptyState v-if="cashFlow.accounts.length === 0" icon="i-lucide-landmark" title="No bank or cash accounts yet" />
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <th class="py-2 pr-3">Account</th>
            <th class="py-2 px-3 text-right">Opening</th>
            <th class="py-2 px-3 text-right">Inflow</th>
            <th class="py-2 px-3 text-right">Outflow</th>
            <th class="py-2 px-3 text-right">Net change</th>
            <th class="py-2 pl-3 text-right">Closing</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in cashFlow.accounts" :key="row.bankAccountId" class="border-b border-gray-100 dark:border-gray-800/60">
            <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.bankAccountName }}</td>
            <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.openingBalance) }}</td>
            <td class="py-1.5 px-3 text-right text-success">+{{ formatCurrency(row.inflow) }}</td>
            <td class="py-1.5 px-3 text-right text-error">-{{ formatCurrency(row.outflow) }}</td>
            <td class="py-1.5 px-3 text-right" :class="row.netChange >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(row.netChange) }}</td>
            <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.closingBalance) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
            <td class="py-2 pr-3">Total</td>
            <td class="py-2 px-3 text-right">{{ formatCurrency(cashFlow.totalOpeningBalance) }}</td>
            <td class="py-2 px-3 text-right text-success">+{{ formatCurrency(cashFlow.totalInflow) }}</td>
            <td class="py-2 px-3 text-right text-error">-{{ formatCurrency(cashFlow.totalOutflow) }}</td>
            <td class="py-2 px-3 text-right">{{ formatCurrency(cashFlow.totalNetChange) }}</td>
            <td class="py-2 pl-3 text-right">{{ formatCurrency(cashFlow.totalClosingBalance) }}</td>
          </tr>
        </tfoot>
      </table>
    </UCard>

    <!-- AR aging -->
    <UCard v-else-if="activeTab === 'ar-aging' && arAging">
      <EmptyState v-if="arAging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
      <AgingTable v-else :report="arAging!" :entity-label="'Customer'" />
    </UCard>

    <!-- AP aging -->
    <UCard v-else-if="activeTab === 'ap-aging' && apAging">
      <EmptyState v-if="apAging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
      <AgingTable v-else :report="apAgingAsGeneric!" :entity-label="'Supplier'" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { BalanceSheet, CashFlow, GeneralLedger, ProfitAndLoss, TrialBalance } from '~/composables/useFinancialReports'
import type { InvoiceAgingReport } from '~/composables/useInvoices'
import type { PurchaseInvoiceAgingReport } from '~/composables/usePurchaseInvoices'

definePageMeta({ middleware: 'admin' })

const {
  trialBalance: fetchTrialBalance,
  generalLedger: fetchGeneralLedger,
  balanceSheet: fetchBalanceSheet,
  profitAndLoss: fetchProfitAndLoss,
  cashFlow: fetchCashFlow
} = useFinancialReports()
const { agingReport: fetchArAging } = useInvoices()
const { agingReport: fetchApAging } = usePurchaseInvoices()
const { list: listCompanies } = useCompanies()
const { list: listAccounts } = useAccounts()

type Tab = 'trial-balance' | 'general-ledger' | 'balance-sheet' | 'profit-and-loss' | 'cash-flow' | 'ar-aging' | 'ap-aging'
const activeTab = ref<Tab>('trial-balance')
const tabs: TabsItem[] = [
  { label: 'Trial balance', value: 'trial-balance' },
  { label: 'General ledger', value: 'general-ledger' },
  { label: 'Balance sheet', value: 'balance-sheet' },
  { label: 'Profit & loss', value: 'profit-and-loss' },
  { label: 'Cash flow', value: 'cash-flow' },
  { label: 'AR aging', value: 'ar-aging' },
  { label: 'AP aging', value: 'ap-aging' }
]

const usesAsOfDate = computed(
  () => activeTab.value === 'trial-balance' || activeTab.value === 'balance-sheet' || activeTab.value === 'ar-aging' || activeTab.value === 'ap-aging'
)
const usesDateRange = computed(() => activeTab.value === 'profit-and-loss' || activeTab.value === 'cash-flow' || activeTab.value === 'general-ledger')
const glReportNote = computed(() => ['trial-balance', 'general-ledger', 'balance-sheet', 'profit-and-loss'].includes(activeTab.value))

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])

const glAccounts = ref<{ id: number; accountCode: string; name: string; companyId: number }[]>([])
const accountOptions = computed(() =>
  glAccounts.value
    .filter((a) => companyId.value === undefined || a.companyId === companyId.value)
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
)

const companyId = ref<number | undefined>(undefined)
const asOfDate = ref(new Date().toISOString().slice(0, 10))
const dateFrom = ref('')
const dateTo = ref('')
const accountId = ref<number | undefined>(undefined)

const loading = ref(false)
const error = ref('')

const trialBalance = ref<TrialBalance | null>(null)
const generalLedger = ref<GeneralLedger | null>(null)
const balanceSheet = ref<BalanceSheet | null>(null)
const profitAndLoss = ref<ProfitAndLoss | null>(null)
const cashFlow = ref<CashFlow | null>(null)
const arAging = ref<InvoiceAgingReport | null>(null)
const apAging = ref<PurchaseInvoiceAgingReport | null>(null)

// AgingTable takes InvoiceAgingReport's row shape (customerId/customerName) —
// re-key the AP report's supplierId/supplierName rows to match so one
// component can render both.
const apAgingAsGeneric = computed<InvoiceAgingReport | null>(() =>
  apAging.value
    ? {
        asOfDate: apAging.value.asOfDate,
        rows: apAging.value.rows.map((r) => ({
          customerId: r.supplierId,
          customerName: r.supplierName,
          current: r.current,
          days1To30: r.days1To30,
          days31To60: r.days31To60,
          days61To90: r.days61To90,
          days90Plus: r.days90Plus,
          total: r.total
        })),
        totals: {
          customerId: null,
          customerName: apAging.value.totals.supplierName,
          current: apAging.value.totals.current,
          days1To30: apAging.value.totals.days1To30,
          days31To60: apAging.value.totals.days31To60,
          days61To90: apAging.value.totals.days61To90,
          days90Plus: apAging.value.totals.days90Plus,
          total: apAging.value.totals.total
        }
      }
    : null
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'trial-balance') {
      trialBalance.value = await fetchTrialBalance({ companyId: companyId.value, asOfDate: asOfDate.value })
    } else if (activeTab.value === 'general-ledger') {
      generalLedger.value = accountId.value
        ? await fetchGeneralLedger({ accountId: accountId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
        : null
    } else if (activeTab.value === 'balance-sheet') {
      balanceSheet.value = await fetchBalanceSheet({ companyId: companyId.value, asOfDate: asOfDate.value })
    } else if (activeTab.value === 'profit-and-loss') {
      profitAndLoss.value = await fetchProfitAndLoss({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
    } else if (activeTab.value === 'cash-flow') {
      cashFlow.value = await fetchCashFlow({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
    } else if (activeTab.value === 'ar-aging') {
      arAging.value = await fetchArAging({ companyId: companyId.value, asOfDate: asOfDate.value })
    } else if (activeTab.value === 'ap-aging') {
      apAging.value = await fetchApAging({ companyId: companyId.value, asOfDate: asOfDate.value })
    }
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [c, a] = await Promise.all([listCompanies({ size: 200 }), listAccounts({ size: 1000 })])
  companies.value = c.data
  glAccounts.value = a.data
  await load()
})
watch([activeTab, companyId, asOfDate, dateFrom, dateTo, accountId], load)
</script>

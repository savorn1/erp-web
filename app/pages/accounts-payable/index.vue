<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Accounts payable</h1>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="As of date">
          <UInput v-model="asOfDate" type="date" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard class="mb-4">
      <template #header>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Aging report</h2>
      </template>
      <div v-if="loadingAging" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
      <EmptyState v-else-if="aging && aging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
      <div v-else-if="aging" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Supplier</th>
              <th class="py-2 px-3 text-right">Current</th>
              <th class="py-2 px-3 text-right">1-30 days</th>
              <th class="py-2 px-3 text-right">31-60 days</th>
              <th class="py-2 px-3 text-right">61-90 days</th>
              <th class="py-2 px-3 text-right">90+ days</th>
              <th class="py-2 pl-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in aging.rows" :key="row.supplierId ?? 'row'" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.supplierName ?? '—' }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.current) }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.days1To30) }}</td>
              <td class="py-1.5 px-3 text-right" :class="row.days31To60 > 0 ? 'text-warning' : 'text-gray-600 dark:text-gray-300'">
                {{ formatCurrency(row.days31To60) }}
              </td>
              <td class="py-1.5 px-3 text-right" :class="row.days61To90 > 0 ? 'text-warning' : 'text-gray-600 dark:text-gray-300'">
                {{ formatCurrency(row.days61To90) }}
              </td>
              <td class="py-1.5 px-3 text-right font-medium" :class="row.days90Plus > 0 ? 'text-error' : 'text-gray-600 dark:text-gray-300'">
                {{ formatCurrency(row.days90Plus) }}
              </td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.total) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3 text-gray-900 dark:text-white">Total</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.current) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days1To30) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days31To60) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days61To90) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days90Plus) }}</td>
              <td class="py-2 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.total) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Unpaid invoices by due date</h2>
      </template>
      <div v-if="loadingInvoices" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
      <EmptyState v-else-if="unpaidInvoices.length === 0" icon="i-lucide-check-circle" title="Nothing owed" />
      <div v-else class="space-y-2">
        <div
          v-for="inv in unpaidInvoices"
          :key="inv.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ inv.invoiceNumber }}</span>
              <UBadge v-if="inv.overdue" color="error" variant="subtle" size="xs">{{ inv.daysOverdue }} days overdue</UBadge>
              <UBadge v-else-if="inv.dueDate" color="neutral" variant="subtle" size="xs">Due {{ formatDate(inv.dueDate) }}</UBadge>
            </div>
            <p class="text-xs text-gray-400 truncate">{{ inv.supplierName }} · outstanding {{ formatCurrency(inv.outstandingAmount) }}</p>
          </div>
          <NuxtLink :to="`/supplier-payments?fromPurchaseInvoice=${inv.id}`">
            <UButton size="xs" color="success" variant="soft" icon="i-lucide-banknote">Pay</UButton>
          </NuxtLink>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PurchaseInvoice, PurchaseInvoiceAgingReport } from '~/composables/usePurchaseInvoices'

definePageMeta({ middleware: 'admin' })

const { list: listPurchaseInvoices, agingReport } = usePurchaseInvoices()
const { list: listCompanies } = useCompanies()

const error = ref('')
const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const companyId = ref<number | undefined>(undefined)
const asOfDate = ref(new Date().toISOString().slice(0, 10))

const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])

const aging = ref<PurchaseInvoiceAgingReport | null>(null)
const loadingAging = ref(false)
async function loadAging() {
  loadingAging.value = true
  error.value = ''
  try {
    aging.value = await agingReport({ companyId: companyId.value, asOfDate: asOfDate.value })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loadingAging.value = false
  }
}

const unpaidInvoices = ref<PurchaseInvoice[]>([])
const loadingInvoices = ref(false)
async function loadUnpaidInvoices() {
  loadingInvoices.value = true
  try {
    const res = await listPurchaseInvoices({ companyId: companyId.value, status: 'APPROVED', size: 200 })
    unpaidInvoices.value = res.data
      .filter((inv) => inv.outstandingAmount > 0)
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
        if (a.overdue) return b.daysOverdue - a.daysOverdue
        return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
      })
  } finally {
    loadingInvoices.value = false
  }
}

async function loadAll() {
  await Promise.all([loadAging(), loadUnpaidInvoices()])
}

onMounted(async () => {
  const c = await listCompanies({ size: 200 })
  companies.value = c.data
  await loadAll()
})
watch([companyId, asOfDate], loadAll)
</script>

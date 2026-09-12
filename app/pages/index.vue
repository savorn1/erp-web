<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Revenue/expense/sales/purchase are for the period below; cash/receivable/payable/inventory are as of right now.
        </p>
      </div>
      <div v-if="isAdmin" class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-44" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
      </div>
    </div>

    <template v-if="!isAdmin">
      <UCard>
        <EmptyState icon="i-lucide-layout-dashboard" title="Welcome" description="Ask an administrator for a financial overview of your company." />
      </UCard>
    </template>
    <template v-else>
      <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

      <section class="mb-6">
        <DashboardSectionHeader icon="i-lucide-bar-chart-3" label="Financial overview" />
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatTile
            label="Revenue"
            :value="formatCurrency(summary?.revenue ?? 0)"
            icon="i-lucide-trending-up"
            color="success"
            :loading="loading"
            to="/invoices"
          />
          <StatTile
            label="Expense"
            :value="formatCurrency(summary?.expense ?? 0)"
            icon="i-lucide-trending-down"
            color="error"
            :loading="loading"
            to="/purchase-invoices"
          />
          <StatTile
            label="Profit"
            :value="formatCurrency(summary?.profit ?? 0)"
            icon="i-lucide-circle-dollar-sign"
            :color="(summary?.profit ?? 0) >= 0 ? 'success' : 'error'"
            :loading="loading"
            to="/reports?section=accounting&tab=profit-and-loss"
          />
          <StatTile label="Cash" :value="formatCurrency(summary?.cash ?? 0)" icon="i-lucide-landmark" color="info" :loading="loading" to="/bank-accounts" />
          <StatTile
            label="Receivable"
            :value="formatCurrency(summary?.receivable ?? 0)"
            icon="i-lucide-hand-coins"
            color="warning"
            :loading="loading"
            to="/accounts-receivable"
          />
          <StatTile
            label="Payable"
            :value="formatCurrency(summary?.payable ?? 0)"
            icon="i-lucide-credit-card"
            color="warning"
            :loading="loading"
            to="/accounts-payable"
          />
          <StatTile
            label="Inventory value"
            :value="formatCurrency(summary?.inventoryValue ?? 0)"
            icon="i-lucide-boxes"
            color="neutral"
            :loading="loading"
            to="/inventory-overview"
          />
          <StatTile
            label="Sales"
            :value="formatCurrency(summary?.sales ?? 0)"
            icon="i-lucide-file-text"
            color="primary"
            sublabel="Booked orders"
            :loading="loading"
            to="/sales-orders"
          />
          <StatTile
            label="Purchase"
            :value="formatCurrency(summary?.purchase ?? 0)"
            icon="i-lucide-shopping-cart"
            color="primary"
            sublabel="Booked orders"
            :loading="loading"
            to="/purchase-orders"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DashboardSummary } from '~/composables/useDashboard'

const { isAdmin } = useAuth()
const { summary: fetchSummary } = useDashboard()
const { list: listCompanies } = useCompanies()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const companyId = ref<number | undefined>(undefined)

function firstOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
const dateFrom = ref(firstOfMonth())
const dateTo = ref(new Date().toISOString().slice(0, 10))

const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])

const summary = ref<DashboardSummary | null>(null)
const loading = ref(false)
const error = ref('')

async function load() {
  if (!isAdmin.value) return
  loading.value = true
  error.value = ''
  try {
    summary.value = await fetchSummary({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!isAdmin.value) return
  companies.value = (await listCompanies({ size: 200 })).data
  await load()
})
watch([companyId, dateFrom, dateTo], load)
</script>

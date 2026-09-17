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
            to="/reports/accounting/profit-and-loss"
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

      <section class="mb-6">
        <DashboardSectionHeader icon="i-lucide-alert-circle" label="Needs attention" />
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Overdue receivables"
            :value="formatCurrency(overdueReceivable)"
            :sublabel="`${overdueReceivableCount} ${overdueReceivableCount === 1 ? 'customer' : 'customers'}`"
            icon="i-lucide-alert-circle"
            color="error"
            :loading="attentionLoading"
            to="/accounts-receivable"
          />
          <StatTile
            label="Overdue payables"
            :value="formatCurrency(overduePayable)"
            :sublabel="`${overduePayableCount} ${overduePayableCount === 1 ? 'supplier' : 'suppliers'}`"
            icon="i-lucide-alert-circle"
            color="warning"
            :loading="attentionLoading"
            to="/accounts-payable"
          />
          <StatTile
            v-if="stockWarningEnabled"
            label="Low stock items"
            :value="String(lowStockCount)"
            sublabel="Below reorder point"
            icon="i-lucide-triangle-alert"
            color="warning"
            :loading="attentionLoading"
            to="/reports/inventory/low-stock"
          />
          <StatTile
            label="Awaiting approval"
            :value="String(pendingPurchaseOrderCount)"
            sublabel="Purchase orders"
            icon="i-lucide-clipboard-list"
            color="info"
            :loading="attentionLoading"
            to="/purchase-orders?status=SUBMITTED"
          />
        </div>
      </section>

      <section class="mb-6">
        <DashboardSectionHeader icon="i-lucide-line-chart" label="Trend" />
        <UCard>
          <template #header>
            <span class="font-semibold text-gray-900 dark:text-white">Sales vs. purchase — last 6 months</span>
          </template>
          <div v-if="trendLoading" class="h-64">
            <USkeleton class="w-full h-full" />
          </div>
          <div v-else class="h-64">
            <ClientOnly>
              <Line :data="trendChartData" :options="trendChartOptions" />
            </ClientOnly>
          </div>
        </UCard>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, type TooltipItem } from 'chart.js'
import { Line } from 'vue-chartjs'
import type { DashboardSummary, DashboardTrend } from '~/composables/useDashboard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const { isAdmin } = useAuth()
const { summary: fetchSummary, trend: fetchTrend } = useDashboard()
const { list: listCompanies } = useCompanies()
const { agingReport: fetchArAging } = useInvoices()
const { agingReport: fetchApAging } = usePurchaseInvoices()
const { lowStock: fetchLowStock } = useInventoryReports()
const { list: listPurchaseOrders } = usePurchaseOrders()

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

// Point-in-time snapshots, independent of the revenue/expense date filter
// above — only refetch when the company changes.
const overdueReceivable = ref(0)
const overdueReceivableCount = ref(0)
const overduePayable = ref(0)
const overduePayableCount = ref(0)
const lowStockCount = ref(0)
const pendingPurchaseOrderCount = ref(0)
const attentionLoading = ref(false)

// Display-only — hides the "Low stock items" tile when the selected
// company's Inventory Settings turn Stock Warning off. Stays visible
// (default true) when no single company is selected ("All companies"),
// since InventorySettings is per-company.
const stockWarningEnabled = ref(true)
const { getForCompany: getInventorySettings } = useInventorySettings()

async function loadAttention() {
  if (!isAdmin.value) return
  attentionLoading.value = true
  try {
    const [arAging, apAging, lowStock, pendingPOs] = await Promise.all([
      fetchArAging({ companyId: companyId.value }),
      fetchApAging({ companyId: companyId.value }),
      fetchLowStock({ companyId: companyId.value }),
      listPurchaseOrders({ companyId: companyId.value, status: 'SUBMITTED', size: 1 })
    ])
    overdueReceivable.value = arAging.totals.total - arAging.totals.current
    overdueReceivableCount.value = arAging.rows.filter((r) => r.total - r.current > 0).length
    overduePayable.value = apAging.totals.total - apAging.totals.current
    overduePayableCount.value = apAging.rows.filter((r) => r.total - r.current > 0).length
    lowStockCount.value = lowStock.count
    pendingPurchaseOrderCount.value = pendingPOs.metadata.totalCount
  } catch {
    // Non-critical overview — tiles just stay at their zero fallback on failure.
  } finally {
    attentionLoading.value = false
  }
}
onMounted(loadAttention)
watch(companyId, loadAttention)

async function loadStockWarningSetting() {
  if (!companyId.value) {
    stockWarningEnabled.value = true
    return
  }
  try {
    stockWarningEnabled.value = (await getInventorySettings(companyId.value)).stockWarningEnabled
  } catch {
    stockWarningEnabled.value = true
  }
}
onMounted(loadStockWarningSetting)
watch(companyId, loadStockWarningSetting)

// Server-computed, one call per (re)fetch — see /reports's identical trend
// chart and DashboardServiceImpl.trend() for why this isn't done by looping
// /summary calls client-side.
const trend = ref<DashboardTrend | null>(null)
const trendLoading = ref(false)
async function loadTrend() {
  if (!isAdmin.value) return
  trendLoading.value = true
  try {
    trend.value = await fetchTrend({ companyId: companyId.value, months: 6 })
  } catch {
    // Non-critical overview — the chart just renders empty on failure.
  } finally {
    trendLoading.value = false
  }
}
onMounted(loadTrend)
watch(companyId, loadTrend)

function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number)
  return new Date(year!, m! - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const trendChartData = computed(() => ({
  labels: (trend.value?.months ?? []).map((m) => monthLabel(m.month)),
  datasets: [
    {
      label: 'Sales',
      data: (trend.value?.months ?? []).map((m) => m.sales),
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      tension: 0.35,
      pointRadius: 3
    },
    {
      label: 'Purchase',
      data: (trend.value?.months ?? []).map((m) => m.purchase),
      borderColor: '#14b8a6',
      backgroundColor: '#14b8a6',
      tension: 0.35,
      pointRadius: 3
    }
  ]
}))

const trendChartOptions = computed(() => {
  const gridColor = isDark.value ? '#374151' : '#e5e7eb'
  const textColor = isDark.value ? '#9ca3af' : '#6b7280'
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, labels: { color: textColor, usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, callback: (value: string | number) => formatCurrency(Number(value)) }
      }
    }
  }
})
</script>

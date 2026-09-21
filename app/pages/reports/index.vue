<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Pick a report below to open it on its own page.</p>
    </div>

    <nav
      v-if="!search.trim()"
      class="sticky top-0 z-10 -mx-1 mb-4 flex gap-1 overflow-x-auto px-1 py-2 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur"
      aria-label="Jump to report category"
    >
      <a
        v-for="section in jumpNavSections"
        :key="section.id"
        :href="`#${section.id}`"
        class="shrink-0 rounded-full px-3 py-1 text-xs font-medium border whitespace-nowrap transition-colors"
        :class="tilePillClasses(section.color)"
      >
        {{ section.label }}
      </a>
    </nav>

    <UAlert
      v-if="!hintDismissed"
      icon="i-lucide-lightbulb"
      color="primary"
      variant="subtle"
      class="mb-4"
      title="Tip: pin your favorites"
      description="Click the star on any report to pin it here, or use the category bar above to jump straight to a section."
      :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @close="dismissHint"
    />

    <UCard class="mb-4">
      <UInput v-model="search" icon="i-lucide-search" size="lg" placeholder="Search all reports…" />
    </UCard>

    <div v-if="!search.trim()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <StatTile label="Sales this month" :value="formatCurrency(summary?.sales ?? 0)" icon="i-lucide-file-text" color="primary" :loading="summaryLoading" />
      <StatTile
        label="Purchase this month"
        :value="formatCurrency(summary?.purchase ?? 0)"
        icon="i-lucide-shopping-cart"
        color="primary"
        :loading="summaryLoading"
      />
      <StatTile
        label="Profit this month"
        :value="formatCurrency(summary?.profit ?? 0)"
        icon="i-lucide-circle-dollar-sign"
        :color="(summary?.profit ?? 0) >= 0 ? 'success' : 'error'"
        :loading="summaryLoading"
      />
      <StatTile label="Cash on hand" :value="formatCurrency(summary?.cash ?? 0)" icon="i-lucide-landmark" color="info" :loading="summaryLoading" />
    </div>

    <UCard v-if="!search.trim()" class="mb-4">
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

    <UCard v-if="search.trim()">
      <template #header>
        <span class="font-semibold text-gray-900 dark:text-white"
          >{{ searchResults.length }} matching {{ searchResults.length === 1 ? 'report' : 'reports' }}</span
        >
      </template>
      <DataTable :rows="searchResults" :columns="searchColumns" :exportable="false" @select="(row) => router.push(row.to)">
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <UButton
              icon="i-lucide-star"
              :class="isPinned(row.to) ? 'text-warning-700 dark:text-warning-400' : 'text-gray-400 dark:text-gray-500'"
              variant="ghost"
              color="neutral"
              size="xs"
              aria-label="Toggle pin"
              @click.stop="togglePin(row.to)"
            />
            <div class="shrink-0 rounded-lg p-2" :class="tileIconClasses(row.color)">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-search-x" title="No matches" :description="`Nothing matches '${search}'`" />
        </template>
      </DataTable>
    </UCard>

    <template v-else>
      <ReportCategoryCard v-if="pinnedTiles.length > 0" title="Pinned reports" :tiles="pinnedTiles" clearable class="mb-4" @clear="clearPinned" />
      <ReportCategoryCard v-if="recentTiles.length > 0" title="Recently viewed" :tiles="recentTiles" clearable class="mb-4" @clear="clearRecent" />

      <ReportCategoryCard id="sales" title="Sales reports" :tiles="salesReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-sales" title="More sales reports" :tiles="salesExternalReportTiles" class="mb-4" />
      <ReportCategoryCard id="purchase" title="Purchase reports" :tiles="purchaseReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-purchase" title="More purchase reports" :tiles="purchaseExternalReportTiles" class="mb-4" />
      <ReportCategoryCard id="inventory" title="Inventory reports" :tiles="inventoryReportTiles" class="mb-4" />
      <ReportCategoryCard id="accounting" title="Accounting reports" :tiles="accountingReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-accounting" title="More accounting reports" :tiles="accountingExternalReportTiles" class="mb-4" />
      <ReportCategoryCard id="ar" title="Accounts receivable reports" :tiles="arReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-ar" title="More accounts receivable reports" :tiles="arExternalReportTiles" class="mb-4" />
      <ReportCategoryCard id="ap" title="Accounts payable reports" :tiles="apReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-ap" title="More accounts payable reports" :tiles="apExternalReportTiles" class="mb-4" />
      <ReportCategoryCard id="manufacturing" title="Manufacturing reports" :tiles="manufacturingReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-manufacturing" title="More manufacturing reports" :tiles="manufacturingExternalReportTiles" class="mb-4" />
      <ReportCategoryCard id="payments" title="Payment reports" :tiles="paymentReportTiles" class="mb-4" />
      <ReportCategoryCard id="more-payments" title="More payment reports" :tiles="paymentExternalReportTiles" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, type TooltipItem } from 'chart.js'
import { Line } from 'vue-chartjs'
import type { ColumnDef } from '#shared/types'
import type { ReportTile } from '~/components/ReportCategoryCard.vue'
import type { DashboardSummary, DashboardTrend } from '~/composables/useDashboard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

definePageMeta({ middleware: 'admin' })

const router = useRouter()
const route = useRoute()
const {
  salesReportTiles,
  salesExternalReportTiles,
  purchaseReportTiles,
  purchaseExternalReportTiles,
  inventoryReportTiles,
  accountingReportTiles,
  accountingExternalReportTiles,
  arReportTiles,
  arExternalReportTiles,
  apReportTiles,
  apExternalReportTiles,
  manufacturingReportTiles,
  manufacturingExternalReportTiles,
  paymentReportTiles,
  paymentExternalReportTiles
} = useReportCatalog()
const { pinned, isPinned, togglePin, clearAll: clearPinned } = usePinnedReports()
const { recent, clearAll: clearRecent } = useRecentReports()

// ReportBackButton arrives here as `/reports#<sectionId>`. Nuxt's own router
// scrollBehavior can't be trusted for this: it scrolls `window`, but this
// page's actual scroll container is UDashboardPanel's inner `overflow-y-auto`
// body div (window itself never scrolls in this layout) — so that hash lands
// as a silent no-op. `scrollIntoView()` walks up to the real scrollable
// ancestor instead, which is why it's used here (same reason the jump-nav
// pills above, plain `<a href="#...">` tags relying on the browser's own
// native anchor-jump, already worked without any of this). Waiting a tick
// first matters too: pinned/recent are only populated from localStorage
// inside their composables' own onMounted (registered above, so it already
// ran by the time this one starts), and until that DOM update lands, those
// cards are still collapsed and every section below sits higher than its
// settled position.
onMounted(async () => {
  if (!route.hash) return
  await nextTick()
  document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: 'start' })
})

// Colors mirror each category's own tiles (see useReportCatalog.ts) and
// SidebarNav's group accents.
const jumpNavSections = [
  { id: 'sales', label: 'Sales reports', color: 'emerald' },
  { id: 'more-sales', label: 'More sales reports', color: 'emerald' },
  { id: 'purchase', label: 'Purchase reports', color: 'orange' },
  { id: 'more-purchase', label: 'More purchase reports', color: 'orange' },
  { id: 'inventory', label: 'Inventory reports', color: 'teal' },
  { id: 'accounting', label: 'Accounting reports', color: 'indigo' },
  { id: 'more-accounting', label: 'More accounting reports', color: 'indigo' },
  { id: 'ar', label: 'Accounts receivable reports', color: 'indigo' },
  { id: 'more-ar', label: 'More accounts receivable reports', color: 'indigo' },
  { id: 'ap', label: 'Accounts payable reports', color: 'orange' },
  { id: 'more-ap', label: 'More accounts payable reports', color: 'orange' },
  { id: 'manufacturing', label: 'Manufacturing reports', color: 'amber' },
  { id: 'more-manufacturing', label: 'More manufacturing reports', color: 'amber' },
  { id: 'payments', label: 'Payment reports', color: 'indigo' },
  { id: 'more-payments', label: 'More payment reports', color: 'indigo' }
]

const HINT_STORAGE_KEY = 'erp-reports-hint-dismissed'
const hintDismissed = ref(true)
onMounted(() => {
  try {
    hintDismissed.value = localStorage.getItem(HINT_STORAGE_KEY) === 'true'
  } catch {
    hintDismissed.value = false
  }
})
function dismissHint() {
  hintDismissed.value = true
  try {
    localStorage.setItem(HINT_STORAGE_KEY, 'true')
  } catch {
    // ignore write failures
  }
}

const { summary: fetchSummary } = useDashboard()
const summary = ref<DashboardSummary | null>(null)
const summaryLoading = ref(false)
onMounted(async () => {
  summaryLoading.value = true
  try {
    summary.value = await fetchSummary()
  } catch {
    // Non-critical overview — a failed fetch just leaves the stat tiles at their zero fallback.
  } finally {
    summaryLoading.value = false
  }
})

// Last 6 calendar months, computed and bucketed server-side in one call
// (GET /api/admin/dashboard/trend) rather than calling /summary once per
// month from the client.
const { trend: fetchTrend } = useDashboard()
const trend = ref<DashboardTrend | null>(null)
const trendLoading = ref(false)
onMounted(async () => {
  trendLoading.value = true
  try {
    trend.value = await fetchTrend({ months: 6 })
  } catch {
    // Non-critical overview — the chart just renders empty on failure.
  } finally {
    trendLoading.value = false
  }
})

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

const allTiles = computed<ReportTile[]>(() => [
  ...salesReportTiles,
  ...salesExternalReportTiles,
  ...purchaseReportTiles,
  ...purchaseExternalReportTiles,
  ...inventoryReportTiles,
  ...accountingReportTiles,
  ...accountingExternalReportTiles,
  ...arReportTiles,
  ...arExternalReportTiles,
  ...apReportTiles,
  ...apExternalReportTiles,
  ...manufacturingReportTiles,
  ...manufacturingExternalReportTiles,
  ...paymentReportTiles,
  ...paymentExternalReportTiles
])

// Order follows the stored pin/visit order (most recently pinned/visited
// first), not the catalog's own order.
function tilesFor(paths: string[]): ReportTile[] {
  const byPath = new Map(allTiles.value.map((t) => [t.to, t]))
  return paths.map((p) => byPath.get(p)).filter((t): t is ReportTile => !!t)
}
const pinnedTiles = computed(() => tilesFor(pinned.value))
const recentTiles = computed(() => tilesFor(recent.value))

const search = ref('')

const searchResults = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return allTiles.value.filter((t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
})

const searchColumns: ColumnDef<ReportTile>[] = [
  { key: 'label', label: 'Report' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: '', type: 'link', value: () => 'Open', href: (row) => row.to }
]
</script>

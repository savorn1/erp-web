<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Growth"
      description="Revenue and order count for a period vs. the equivalent period before it."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'Growth' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        The "previous period" is the same number of days immediately before "From" — e.g. picking a 30-day range compares it to the 30 days before that.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="growth">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile
          label="Revenue growth"
          :value="growth.revenueGrowthPercent === null ? '—' : `${growth.revenueGrowthPercent >= 0 ? '+' : ''}${growth.revenueGrowthPercent}%`"
          icon="i-lucide-trending-up"
          :color="(growth.revenueGrowthPercent ?? 0) >= 0 ? 'success' : 'error'"
        />
        <StatTile
          label="Order growth"
          :value="growth.orderGrowthPercent === null ? '—' : `${growth.orderGrowthPercent >= 0 ? '+' : ''}${growth.orderGrowthPercent}%`"
          icon="i-lucide-file-text"
          :color="(growth.orderGrowthPercent ?? 0) >= 0 ? 'success' : 'error'"
        />
      </div>
      <UCard>
        <DataTable :rows="comparisonRows" :columns="columns" exportable export-filename="sales-growth" />
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SalesGrowth } from '~/composables/useSalesReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { growth: fetchGrowth } = useSalesReports()

const loading = ref(false)
const error = ref('')
const growth = ref<SalesGrowth | null>(null)

interface ComparisonRow {
  period: string
  range: string
  orderCount: number
  revenue: number
}
const comparisonRows = computed<ComparisonRow[]>(() => {
  if (!growth.value) return []
  return [
    {
      period: 'Current',
      range: `${growth.value.currentFrom} – ${growth.value.currentTo}`,
      orderCount: growth.value.currentOrderCount,
      revenue: growth.value.currentRevenue
    },
    {
      period: 'Previous',
      range: `${growth.value.previousFrom} – ${growth.value.previousTo}`,
      orderCount: growth.value.previousOrderCount,
      revenue: growth.value.previousRevenue
    }
  ]
})
const columns: ColumnDef<ComparisonRow>[] = [
  { key: 'period', label: 'Period' },
  { key: 'range', label: 'Date range' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'revenue', label: 'Revenue', type: 'currency' }
]

async function load() {
  if (!dateFrom.value || !dateTo.value) return
  loading.value = true
  error.value = ''
  try {
    growth.value = await fetchGrowth({ companyId: companyId.value, dateFrom: dateFrom.value, dateTo: dateTo.value })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  await load()
})
watch([companyId, dateFrom, dateTo], load)
</script>

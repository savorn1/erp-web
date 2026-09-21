<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Inventory count"
      description="Every physical stock count, with how many lines had a variance."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Inventory count' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="counts" :columns="columns" exportable export-filename="inventory-inventory-count">
        <template #empty-state>
          <EmptyState icon="i-lucide-clipboard-check" title="No stock counts yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface CountSummary {
  stockCountId: number
  countNumber: string
  countDate: string
  status: string
  warehouseName: string | null
  lineCount: number
  varianceLineCount: number
}

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockCountVariance } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const counts = ref<CountSummary[]>([])

const columns: ColumnDef<CountSummary>[] = [
  { key: 'countNumber', label: 'Count #' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'countDate', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'lineCount', label: 'Lines counted' },
  { key: 'varianceLineCount', label: 'Lines with variance', class: (row) => (row.varianceLineCount > 0 ? 'text-warning-700 dark:text-warning-400' : '') }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await stockCountVariance({ companyId: companyId.value, warehouseId: warehouseId.value })
    const byCount = new Map<number, CountSummary>()
    for (const line of result.rows) {
      let summary = byCount.get(line.stockCountId)
      if (!summary) {
        summary = {
          stockCountId: line.stockCountId,
          countNumber: line.countNumber,
          countDate: line.countDate,
          status: line.status,
          warehouseName: line.warehouseName,
          lineCount: 0,
          varianceLineCount: 0
        }
        byCount.set(line.stockCountId, summary)
      }
      summary.lineCount++
      if (line.varianceQuantity && line.varianceQuantity !== 0) summary.varianceLineCount++
    }
    counts.value = Array.from(byCount.values()).sort((a, b) => (a.countDate < b.countDate ? 1 : -1))
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
watch([companyId, warehouseId], load)
</script>

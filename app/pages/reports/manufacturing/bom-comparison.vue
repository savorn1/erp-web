<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="BOM comparison"
      description="Side-by-side cost and component comparison between two versions of the same recipe."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'BOM comparison' }]"
    />

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="comparison">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <UCard v-for="side in [comparison.left, comparison.right]" :key="side.bomId">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ side.bomNumber }} — v{{ side.version }}</h2>
              <UBadge size="xs">{{ side.status }}</UBadge>
            </div>
          </template>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">{{ side.name }}</div>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div><div class="text-gray-400">Output qty</div><div class="font-medium">{{ side.outputQuantity }}</div></div>
            <div><div class="text-gray-400">Cost/batch</div><div class="font-medium">{{ formatCurrency(side.materialCostPerBatch) }}</div></div>
            <div><div class="text-gray-400">Cost/unit</div><div class="font-medium">{{ formatCurrency(side.materialCostPerUnit) }}</div></div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Components</h2></template>
        <DataTable :rows="componentRows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-list" title="No components on either version" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BomComparison } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { bomComparison: fetchBomComparison } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const comparison = ref<BomComparison | null>(null)

interface ComponentRow {
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  leftQuantity: number | null
  leftCost: number | null
  rightQuantity: number | null
  rightCost: number | null
}

const componentRows = computed<ComponentRow[]>(() => {
  if (!comparison.value) return []
  const byId = new Map<number, ComponentRow>()
  for (const line of comparison.value.left.lines) {
    byId.set(line.componentProductId, {
      componentProductId: line.componentProductId,
      componentProductName: line.componentProductName,
      componentProductSku: line.componentProductSku,
      leftQuantity: line.quantity,
      leftCost: line.lineCost,
      rightQuantity: null,
      rightCost: null
    })
  }
  for (const line of comparison.value.right.lines) {
    const existing = byId.get(line.componentProductId)
    if (existing) {
      existing.rightQuantity = line.quantity
      existing.rightCost = line.lineCost
    } else {
      byId.set(line.componentProductId, {
        componentProductId: line.componentProductId,
        componentProductName: line.componentProductName,
        componentProductSku: line.componentProductSku,
        leftQuantity: null,
        leftCost: null,
        rightQuantity: line.quantity,
        rightCost: line.lineCost
      })
    }
  }
  return [...byId.values()]
})

const columns: ColumnDef<ComponentRow>[] = [
  { key: 'componentProductName', label: 'Component', value: (row) => `${row.componentProductName ?? '—'} (${row.componentProductSku ?? '—'})` },
  { key: 'leftQuantity', label: 'Qty (left)', value: (row) => row.leftQuantity ?? '—' },
  { key: 'leftCost', label: 'Cost (left)', value: (row) => (row.leftCost === null ? '—' : formatCurrency(row.leftCost)) },
  { key: 'rightQuantity', label: 'Qty (right)', value: (row) => row.rightQuantity ?? '—' },
  { key: 'rightCost', label: 'Cost (right)', value: (row) => (row.rightCost === null ? '—' : formatCurrency(row.rightCost)) }
]

async function load() {
  const bomId = Number(route.query.bomId)
  const compareToBomId = Number(route.query.compareToBomId)
  if (!bomId || !compareToBomId) {
    error.value = 'Missing bomId or compareToBomId in the URL'
    return
  }
  loading.value = true
  error.value = ''
  try {
    comparison.value = await fetchBomComparison(bomId, compareToBomId)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

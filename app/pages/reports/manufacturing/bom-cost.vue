<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="BOM cost"
      description="Standard material cost of every active recipe, computed live from current component costs."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'BOM cost' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="report">
      <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-bom-cost">
        <template #empty-state>
          <EmptyState icon="i-lucide-list-tree" title="No active BOMs" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BomCost, BomCostRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { bomCost: fetchBomCost } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<BomCost | null>(null)

const columns: ColumnDef<BomCostRow>[] = [
  { key: 'bomNumber', label: 'BOM number', value: (row) => `${row.bomNumber} (v${row.version})` },
  { key: 'name', label: 'Name' },
  { key: 'productName', label: 'Finished good', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'outputQuantity', label: 'Output qty' },
  { key: 'materialCostPerBatch', label: 'Cost per batch', type: 'currency' },
  { key: 'materialCostPerUnit', label: 'Cost per unit', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchBomCost({ companyId: companyId.value })
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
watch(companyId, load)
</script>

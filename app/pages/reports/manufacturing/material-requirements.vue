<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Material requirements"
      description="Outstanding material needed across draft and released orders, per warehouse — for procurement planning."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Material requirements' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-52" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">A live snapshot of draft/released orders — not date-ranged.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <StatTile
        label="Components short"
        :value="String(report.shortageCount)"
        icon="i-lucide-package-search"
        :color="report.shortageCount > 0 ? 'error' : 'success'"
        class="mb-4"
      />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No open manufacturing orders" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { MaterialRequirements, MaterialRequirementRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { materialRequirements: fetchMaterialRequirements } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<MaterialRequirements | null>(null)

const columns: ColumnDef<MaterialRequirementRow>[] = [
  { key: 'componentProductName', label: 'Component', value: (row) => `${row.componentProductName ?? '—'} (${row.componentProductSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'totalRequiredQuantity', label: 'Required', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
  { key: 'availableQuantity', label: 'Available', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
  {
    key: 'shortfallQuantity',
    label: 'Shortfall',
    suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}`,
    class: (row) => (row.shortfallQuantity > 0 ? 'text-error' : 'text-gray-400')
  }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchMaterialRequirements({ companyId: companyId.value, warehouseId: warehouseId.value })
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

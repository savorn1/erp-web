<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock by batch / lot"
      description="Current quantity per batch/lot, aggregated across every warehouse — same data as Batch/Lot Stock."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock by batch / lot' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Include depleted">
          <USwitch v-model="includeDepleted" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-package-2" title="No batches yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BatchLotStockRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { batchLotStock } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const includeDepleted = ref(false)
const rows = ref<BatchLotStockRow[]>([])

const columns: ColumnDef<BatchLotStockRow>[] = [
  { key: 'batchNumber', label: 'Batch / lot' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'expirationDate', label: 'Expiration', value: (row) => row.expirationDate ?? 'None', type: 'date' },
  { key: 'currentQuantity', label: 'Current qty' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await batchLotStock({ companyId: companyId.value, includeDepleted: includeDepleted.value })).rows
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
watch([companyId, includeDepleted], load)
</script>

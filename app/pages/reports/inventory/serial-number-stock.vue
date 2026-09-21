<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Serial number stock"
      description="Every individually-tracked unit currently in stock."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Serial number stock' }]"
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
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-serial-number-stock">
        <template #empty-state>
          <EmptyState icon="i-lucide-scan-barcode" title="No serial-tracked stock" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SerialNumber } from '~/composables/useSerialNumbers'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { list } = useSerialNumbers()

const loading = ref(false)
const error = ref('')
const rows = ref<SerialNumber[]>([])

const columns: ColumnDef<SerialNumber>[] = [
  { key: 'serialNumber', label: 'Serial #' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'binName', label: 'Bin', value: (row) => row.binName ?? 'Unassigned' },
  { key: 'batchNumber', label: 'Batch', value: (row) => row.batchNumber ?? '—' },
  { key: 'expirationDate', label: 'Expiration', value: (row) => row.expirationDate ?? '—', type: 'date' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await list({ companyId: companyId.value, warehouseId: warehouseId.value, status: 'IN_STOCK', size: 1000 })).data
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

<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Pending deliveries"
      description="Deliveries not yet shipped or completed."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'Pending deliveries' }]"
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
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="pendingDeliveries">
      <div class="mb-4">
        <StatTile label="Pending deliveries" :value="String(pendingDeliveries.deliveryCount)" icon="i-lucide-package-search" color="warning" />
      </div>
      <UCard>
        <DataTable :rows="pendingDeliveries.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="Nothing pending" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SalesPendingDeliveries, SalesPendingDeliveryRow } from '~/composables/useSalesReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { pendingDeliveries: fetchPendingDeliveries } = useSalesReports()

const loading = ref(false)
const error = ref('')
const pendingDeliveries = ref<SalesPendingDeliveries | null>(null)

const columns: ColumnDef<SalesPendingDeliveryRow>[] = [
  { key: 'deliveryNumber', label: 'Delivery', value: (row) => row.deliveryNumber ?? '—' },
  { key: 'deliveryDate', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'soNumber', label: 'Order', value: (row) => row.soNumber ?? '—' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'lineCount', label: 'Lines' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    pendingDeliveries.value = await fetchPendingDeliveries({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })
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

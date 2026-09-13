<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="By date"
      description="Order count and revenue per order date."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'By date' }]"
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
        <UFormField label="Status">
          <USelect v-model="salesStatus" :items="salesStatusOptions" placeholder="All except cancelled" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="byDate">
      <DataTable :rows="byDate.rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No sales in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SalesByDate, SalesByDateRow } from '~/composables/useSalesReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, salesStatus, activeCompanyOptions, salesStatusOptions, ensureLoaded } = useReportFilters()
const { byDate: fetchByDate } = useSalesReports()

const loading = ref(false)
const error = ref('')
const byDate = ref<SalesByDate | null>(null)

const columns = computed<ColumnDef<SalesByDateRow>[]>(() => [
  { key: 'date', label: 'Date', type: 'date', footer: () => 'Total' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'revenue', label: 'Revenue', type: 'currency', footer: () => byDate.value?.totalRevenue }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    byDate.value = await fetchByDate({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      status: salesStatus.value
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
watch([companyId, dateFrom, dateTo, salesStatus], load)
</script>

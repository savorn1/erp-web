<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Depreciation schedule"
      description="Period-by-period depreciation posted per fixed asset."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Depreciation schedule' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Asset">
          <USelect v-model="assetId" :items="assetOptions" placeholder="All assets" class="w-56" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="accounting-depreciation-schedule">
        <template #empty-state>
          <EmptyState icon="i-lucide-trending-down" title="No depreciation posted yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { DepreciationEntry } from '~/composables/useFixedAssets'

definePageMeta({ middleware: 'admin' })

const { list: listFixedAssets, listDepreciationEntries } = useFixedAssets()
const { list: listCompanies } = useCompanies()

const loading = ref(false)
const error = ref('')
const rows = ref<DepreciationEntry[]>([])

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const assets = ref<{ id: number; assetCode: string; name: string; companyId: number }[]>([])
const companyId = ref<number | undefined>(undefined)
const assetId = ref<number | undefined>(undefined)

const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])
const assetOptions = computed(() => [
  { label: 'All assets', value: undefined },
  ...assets.value
    .filter((a) => companyId.value === undefined || a.companyId === companyId.value)
    .map((a) => ({ label: `${a.assetCode} — ${a.name}`, value: a.id }))
])

const columns: ColumnDef<DepreciationEntry>[] = [
  { key: 'runDate', label: 'Run date', type: 'date' },
  { key: 'accountingPeriodName', label: 'Period', value: (row) => row.accountingPeriodName ?? '—' },
  { key: 'assetName', label: 'Asset', value: (row) => `${row.assetName ?? '—'} (${row.assetCode ?? '—'})` },
  { key: 'amount', label: 'Depreciation', type: 'currency' },
  { key: 'accumulatedAfter', label: 'Accumulated after', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await listDepreciationEntries({ companyId: companyId.value, assetId: assetId.value, size: 500 })).data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [c, a] = await Promise.all([listCompanies({ size: 200 }), listFixedAssets({ size: 1000 })])
  companies.value = c.data
  assets.value = a.data
  await load()
})
watch([companyId, assetId], load)
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/fiscal-years" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ year?.name ?? 'Fiscal year' }}</h1>
      <UBadge v-if="year" class="ml-auto">{{ year.status }}</UBadge>
    </div>

    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">Loading…</div>
    <template v-else-if="year">
      <UCard class="mb-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="text-gray-500 dark:text-gray-400">Company</div>
            <div class="font-medium">{{ year.companyName ?? '—' }}</div>
          </div>
          <div>
            <div class="text-gray-500 dark:text-gray-400">Period</div>
            <div class="font-medium">{{ year.startDate }} – {{ year.endDate }}</div>
          </div>
          <div>
            <div class="text-gray-500 dark:text-gray-400">Periods</div>
            <div class="font-medium">{{ year.periodCount }}</div>
          </div>
          <div>
            <div class="text-gray-500 dark:text-gray-400">Open periods</div>
            <div class="font-medium">{{ year.openPeriodCount }}</div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Accounting periods</h2></template>
        <DataTable :rows="periods" :columns="columns" :exportable="false">
          <template #actions-data="{ row }">
            <UButton
              v-if="row.status === 'OPEN'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-lock"
              :loading="actingId === row.id"
              @click="onClosePeriod(row)"
            >
              Close
            </UButton>
            <UButton v-else size="xs" color="success" variant="soft" icon="i-lucide-lock-open" :loading="actingId === row.id" @click="onReopenPeriod(row)">
              Reopen
            </UButton>
          </template>
          <template #empty-state>
            <EmptyState icon="i-lucide-calendar" title="No periods" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { FiscalYear } from '~/composables/useFiscalYears'
import type { AccountingPeriod } from '~/composables/useAccountingPeriods'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const idParam = Number(route.params.id)
const { get: getFiscalYear } = useFiscalYears()
const { list: listPeriods, close: closePeriod, reopen: reopenPeriod } = useAccountingPeriods()
const toast = useToast()

const loading = ref(true)
const year = ref<FiscalYear | null>(null)
const periods = ref<AccountingPeriod[]>([])

const columns: ColumnDef<AccountingPeriod>[] = [
  { key: 'periodNumber', label: '#' },
  { key: 'name', label: 'Period' },
  { key: 'startDate', label: 'Start', type: 'date' },
  { key: 'endDate', label: 'End', type: 'date' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  try {
    const [y, p] = await Promise.all([getFiscalYear(idParam), listPeriods({ fiscalYearId: idParam, size: 100 })])
    year.value = y
    periods.value = p.data
  } finally {
    loading.value = false
  }
}

const actingId = ref<number | null>(null)
async function onClosePeriod(period: AccountingPeriod) {
  actingId.value = period.id
  try {
    await closePeriod(period.id)
    toast.add({ title: 'Period closed', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not close period', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReopenPeriod(period: AccountingPeriod) {
  actingId.value = period.id
  try {
    await reopenPeriod(period.id)
    toast.add({ title: 'Period reopened', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reopen period', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

onMounted(load)
</script>

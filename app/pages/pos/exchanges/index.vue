<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">POS exchanges</h1>
      <UButton icon="i-lucide-plus" :to="'/pos/exchanges/new'">New exchange</UButton>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search exchange number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.registerId" :items="registerFilterOptions" placeholder="Register" class="w-44" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-repeat" title="No exchanges yet" />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showView" :title="viewing?.exchangeNumber ?? ''">
      <template #body>
        <div v-if="viewing" class="space-y-3 text-sm">
          <dl class="grid grid-cols-2 gap-2">
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Original sale</dt>
              <dd>{{ viewing.originalSaleNumber ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Register</dt>
              <dd>{{ viewing.registerName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Date</dt>
              <dd>{{ formatDateTime(viewing.exchangeDate) }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Settlement</dt>
              <dd>{{ viewing.settlementMethod ?? '—' }}</dd>
            </div>
          </dl>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Returned</p>
          <ul class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="line in viewing.returnLines" :key="line.id" class="py-1.5 flex justify-between">
              <span>{{ line.quantity }} × {{ line.productName }}</span>
              <span>-{{ formatCurrency(line.lineValue) }}</span>
            </li>
            <li v-if="viewing.returnLines.length === 0" class="py-1.5 text-gray-500 dark:text-gray-400">None</li>
          </ul>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">New items</p>
          <ul class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="line in viewing.newLines" :key="line.id" class="py-1.5 flex justify-between">
              <span>{{ line.quantity }} × {{ line.productName }}</span>
              <span>{{ formatCurrency(line.lineTotal) }}</span>
            </li>
            <li v-if="viewing.newLines.length === 0" class="py-1.5 text-gray-500 dark:text-gray-400">None</li>
          </ul>
          <dl class="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div class="flex justify-between font-semibold">
              <dt>{{ viewing.netAmount > 0 ? 'Customer paid' : viewing.netAmount < 0 ? 'Refunded' : 'Even exchange' }}</dt>
              <dd>{{ formatCurrency(Math.abs(viewing.netAmount)) }}</dd>
            </div>
          </dl>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PosExchange } from '~/composables/usePosExchanges'

definePageMeta({ middleware: 'admin' })

const { list } = usePosExchanges()
const { list: listRegisters } = useRegisters()

const rows = ref<PosExchange[]>([])
const loading = ref(false)
const error = ref('')

const registers = ref<{ id: number; name: string }[]>([])
const registerFilterOptions = computed(() => [{ label: 'All registers', value: undefined }, ...registers.value.map((r) => ({ label: r.name, value: r.id }))])
const filter = reactive<{ registerId: number | undefined }>({ registerId: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 15, searchFields: ['exchangeNumber'] })

const columns: ColumnDef<PosExchange>[] = [
  { key: 'exchangeNumber', label: 'Exchange #', sortable: true },
  { key: 'exchangeDate', label: 'Date', type: 'datetime' },
  { key: 'originalSaleNumber', label: 'Original sale', value: (row) => row.originalSaleNumber ?? '—' },
  { key: 'registerName', label: 'Register', value: (row) => row.registerName ?? '—' },
  {
    key: 'netAmount',
    label: 'Net',
    value: (row) => `${row.netAmount > 0 ? '+' : row.netAmount < 0 ? '-' : ''}${formatCurrency(Math.abs(row.netAmount))}`,
    class: (row) => (row.netAmount > 0 ? 'text-error-600 dark:text-error-400' : row.netAmount < 0 ? 'text-success-700 dark:text-success-400' : '')
  },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ registerId: filter.registerId, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const showView = ref(false)
const viewing = ref<PosExchange | null>(null)
function openView(row: PosExchange) {
  viewing.value = row
  showView.value = true
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  const r = await listRegisters({ size: 200 })
  registers.value = r.data
  await load()
})
watch(sort, load)
watch(() => filter.registerId, load)

const hasActiveFilter = computed(() => search.value !== '' || filter.registerId !== undefined)
function clearFilters() {
  search.value = ''
  filter.registerId = undefined
  load()
}
</script>

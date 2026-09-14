<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Work orders</h1>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.workCenterId" :items="workCenterFilterOptions" placeholder="Work center" class="w-48" />
        <USelect v-model="filter.machineId" :items="machineFilterOptions" placeholder="Machine" class="w-48" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/manufacturing-orders/${row.manufacturingOrderId}`">
              View order
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState icon="i-lucide-route" title="No work orders match your filters" />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { WorkOrder, WorkOrderStatus } from '~/composables/useWorkOrders'

definePageMeta({ middleware: 'admin' })

const { list } = useWorkOrders()
const { list: listWorkCenters } = useWorkCenters()
const { list: listMachines } = useMachines()

const rows = ref<WorkOrder[]>([])
const loading = ref(false)
const error = ref('')

const workCenters = ref<{ id: number; name: string }[]>([])
const machines = ref<{ id: number; name: string }[]>([])

const workCenterFilterOptions = computed(() => [
  { label: 'All work centers', value: undefined },
  ...workCenters.value.map((w) => ({ label: w.name, value: w.id }))
])
const machineFilterOptions = computed(() => [{ label: 'All machines', value: undefined }, ...machines.value.map((m) => ({ label: m.name, value: m.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' }
]

const filter = reactive<{ workCenterId: number | undefined; machineId: number | undefined; status: WorkOrderStatus | undefined }>({
  workCenterId: undefined,
  machineId: undefined,
  status: undefined
})

const { page, pageSize, total, rows: pagedRows } = useClientTable(rows, { pageSize: 15 })

const columns: ColumnDef<WorkOrder>[] = [
  { key: 'moNumber', label: 'MO number', value: (row) => row.moNumber ?? '—' },
  { key: 'sequenceNumber', label: '#' },
  { key: 'name', label: 'Operation' },
  { key: 'workCenterName', label: 'Work center', value: (row) => row.workCenterName ?? '—' },
  { key: 'machineName', label: 'Machine', value: (row) => row.machineName ?? '—' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      workCenterId: filter.workCenterId,
      machineId: filter.machineId,
      status: filter.status,
      size: 200
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [w, m] = await Promise.all([listWorkCenters({ size: 200 }), listMachines({ size: 200 })])
  workCenters.value = w.data
  machines.value = m.data
  await load()
})
watch(() => [filter.workCenterId, filter.machineId, filter.status], load)

const hasActiveFilter = computed(() => filter.workCenterId !== undefined || filter.machineId !== undefined || filter.status !== undefined)
function clearFilters() {
  filter.workCenterId = undefined
  filter.machineId = undefined
  filter.status = undefined
  load()
}
</script>

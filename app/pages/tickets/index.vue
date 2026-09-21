<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Support tickets</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/tickets/new"> New ticket </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company and a customer first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search subject" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.customerId" :items="customerFilterOptions" placeholder="Customer" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-36" />
        <USelect v-model="filter.priority" :items="priorityFilterOptions" placeholder="Priority" class="w-36" />
        <UButton
          size="sm"
          :color="overdueOnly ? 'error' : 'neutral'"
          :variant="overdueOnly ? 'solid' : 'soft'"
          icon="i-lucide-alarm-clock"
          @click="overdueOnly = !overdueOnly"
        >
          Overdue only
        </UButton>
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="visibleRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="tickets"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #status-data="{ row }">
          <div class="flex items-center gap-2">
            <StatusBadge :status="row.status" />
            <UBadge v-if="row.overdue" color="error" variant="subtle" size="xs">Overdue</UBadge>
          </div>
        </template>
        <template #priority-data="{ row }">
          <UBadge :color="priorityColor(row.priority)" variant="subtle">{{ formatEnum(row.priority) }}</UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/tickets/${row.id}`">View</UButton>
            <UButton
              v-if="row.status === 'OPEN'"
              size="xs"
              color="info"
              variant="soft"
              icon="i-lucide-play"
              :loading="actingId === row.id"
              @click="onStart(row)"
            >
              Start
            </UButton>
            <UButton
              v-if="row.status === 'OPEN' || row.status === 'IN_PROGRESS'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onResolve(row)"
            >
              Resolve
            </UButton>
            <UButton
              v-if="row.status === 'RESOLVED'"
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-lock"
              :loading="actingId === row.id"
              @click="onClose(row)"
            >
              Close
            </UButton>
            <UButton
              v-if="row.status === 'RESOLVED' || row.status === 'CLOSED'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-undo-2"
              :loading="actingId === row.id"
              @click="onReopen(row)"
            >
              Reopen
            </UButton>
            <UButton v-if="row.status === 'OPEN'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row"> Delete </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No tickets match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-life-buoy" title="No tickets yet" description="Create the first support ticket to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/tickets/new">New ticket</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete ticket"
      :description="`Delete ticket '${confirmDelete?.ticketNumber ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { Ticket, TicketPriority, TicketStatus } from '~/composables/useTickets'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { list, start, resolve, close, reopen, remove } = useTickets()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const toast = useToast()

const rows = ref<Ticket[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, cu] = await Promise.all([listCompanies({ size: 200 }), listCustomers({ size: 200 })])
    companies.value = c.data
    customers.value = cu.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const customerFilterOptions = computed(() => [{ label: 'All customers', value: undefined }, ...customers.value.map((c) => ({ label: c.name, value: c.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]
const priorityFilterOptions = [
  { label: 'All priorities', value: undefined },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' }
]
function priorityColor(priority: TicketPriority) {
  return { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'error' }[priority] as 'neutral' | 'info' | 'warning' | 'error'
}

const filter = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  status: TicketStatus | undefined
  priority: TicketPriority | undefined
}>({ companyId: undefined, customerId: undefined, status: undefined, priority: undefined })
const overdueOnly = ref(route.query.overdue === 'true')

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['subject', 'ticketNumber'] })
const visibleRows = computed(() => (overdueOnly.value ? pagedRows.value.filter((r) => r.overdue) : pagedRows.value))

const columns: ColumnDef<Ticket>[] = [
  { key: 'ticketNumber', label: 'Ticket', sortable: true },
  { key: 'subject', label: 'Subject' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignedToUsername', label: 'Assignee', value: (row) => row.assignedToUsername ?? '—' },
  { key: 'daysOpen', label: 'Days open' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      customerId: filter.customerId,
      status: filter.status,
      priority: filter.priority,
      sortBy: sort.value?.column,
      sortOrder: sort.value?.direction,
      size: 200
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const actingId = ref<number | null>(null)
async function onStart(row: Ticket) {
  actingId.value = row.id
  try {
    await start(row.id)
    toast.add({ title: 'Ticket started', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not start', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onResolve(row: Ticket) {
  actingId.value = row.id
  try {
    await resolve(row.id)
    toast.add({ title: 'Ticket resolved', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not resolve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onClose(row: Ticket) {
  actingId.value = row.id
  try {
    await close(row.id)
    toast.add({ title: 'Ticket closed', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not close', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReopen(row: Ticket) {
  actingId.value = row.id
  try {
    await reopen(row.id)
    toast.add({ title: 'Ticket reopened', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reopen', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<Ticket | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Ticket deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.customerId, filter.status, filter.priority], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.companyId !== undefined || filter.customerId !== undefined || filter.status !== undefined || filter.priority !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.customerId = undefined
  filter.status = undefined
  filter.priority = undefined
  overdueOnly.value = false
  load()
}
</script>

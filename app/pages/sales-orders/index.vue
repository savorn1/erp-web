<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Sales orders</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/sales-orders/new"> New sales order </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company, customer, and warehouse first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search SO number" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.customerId" :items="customerFilterOptions" placeholder="Customer" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="pagedRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="sales-orders"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #status-data="{ row }">
          <div class="flex items-center gap-2">
            <StatusBadge :status="row.status" />
            <span v-if="row.status === 'SUBMITTED' && row.approvalsRequired && row.approvalsRequired > 1" class="text-xs text-gray-400">
              {{ row.approvalsRecorded }}/{{ row.approvalsRequired }} approvals
            </span>
          </div>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/sales-orders/${row.id}`">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton
              v-if="row.status === 'DRAFT'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-send"
              :loading="actingId === row.id"
              @click="onSubmit(row)"
            >
              Submit
            </UButton>
            <UButton
              v-if="row.status === 'SUBMITTED'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onApprove(row)"
            >
              Approve
            </UButton>
            <NuxtLink v-if="row.status === 'CONFIRMED' || row.status === 'PARTIALLY_DELIVERED'" :to="`/deliveries?soId=${row.id}`">
              <UButton size="xs" color="info" variant="soft" icon="i-lucide-truck">Deliver</UButton>
            </NuxtLink>
            <NuxtLink
              v-if="row.status === 'CONFIRMED' || row.status === 'PARTIALLY_DELIVERED' || row.status === 'DELIVERED'"
              :to="`/invoices?fromSalesOrder=${row.id}`"
            >
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-receipt">Invoice</UButton>
            </NuxtLink>
            <UButton
              v-if="row.status === 'DRAFT' || row.status === 'SUBMITTED' || row.status === 'CONFIRMED'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-ban"
              :loading="actingId === row.id"
              @click="onCancel(row)"
            >
              Cancel
            </UButton>
            <UButton v-if="row.status === 'DRAFT'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No sales orders match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-clipboard-list" title="No sales orders yet" description="Create the first sales order to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/sales-orders/new">New sales order</UButton>
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
      title="Delete sales order"
      :description="`Delete sales order '${confirmDelete?.soNumber ?? ''}'? This cannot be undone.`"
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
import type { SalesOrder, SalesOrderStatus } from '~/composables/useSalesOrders'

definePageMeta({ middleware: 'admin' })

const { list, submit, approve, cancel, remove } = useSalesOrders()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const toast = useToast()

const rows = ref<SalesOrder[]>([])
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
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Partially delivered', value: 'PARTIALLY_DELIVERED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const filter = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  status: SalesOrderStatus | undefined
}>({ companyId: undefined, customerId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['soNumber'] })

// Keeps filters/search/page in the URL so opening an order and coming back
// doesn't reset the list. Must run before onMounted's load().
useListQuerySync({ filter, search, page })

const columns: ColumnDef<SalesOrder>[] = [
  { key: 'soNumber', label: 'SO number', sortable: true },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'orderDate', label: 'Order date', type: 'date' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
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
async function onSubmit(row: SalesOrder) {
  actingId.value = row.id
  try {
    await submit(row.id)
    toast.add({ title: 'Sales order submitted', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not submit', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onApprove(row: SalesOrder) {
  actingId.value = row.id
  try {
    const updated = await approve(row.id)
    if (updated.status === 'SUBMITTED') {
      toast.add({ title: `Approval recorded — ${updated.approvalsRecorded} of ${updated.approvalsRequired} needed`, color: 'success' })
    } else {
      toast.add({ title: 'Sales order confirmed', color: 'success' })
    }
    await load()
  } catch (err) {
    toast.add({ title: 'Could not confirm', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: SalesOrder) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'Sales order cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<SalesOrder | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Sales order deleted', color: 'success' })
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
watch(() => [filter.companyId, filter.customerId, filter.status], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.customerId !== undefined || filter.status !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.customerId = undefined
  filter.status = undefined
  load()
}
</script>

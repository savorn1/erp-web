<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Manufacturing orders</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/manufacturing-orders/new"> New manufacturing order </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company, warehouse, and an active BOM first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search MO number" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/manufacturing-orders/${row.id}`">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton
              v-if="row.status === 'DRAFT'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onRelease(row)"
            >
              Release
            </UButton>
            <UButton
              v-if="row.status === 'RELEASED'"
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
              v-if="row.status === 'DRAFT' || row.status === 'RELEASED'"
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
            title="No manufacturing orders match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-cog" title="No manufacturing orders yet" description="Create the first one to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/manufacturing-orders/new">New manufacturing order</UButton>
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
      title="Delete manufacturing order"
      :description="`Delete manufacturing order '${confirmDelete?.moNumber ?? ''}'? This cannot be undone.`"
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
import type { ManufacturingOrder, ManufacturingOrderStatus } from '~/composables/useManufacturingOrders'

definePageMeta({ middleware: 'admin' })

const { list, release, start, cancel, remove } = useManufacturingOrders()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<ManufacturingOrder[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const c = await listCompanies({ size: 200 })
    companies.value = c.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Released', value: 'RELEASED' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Pending QC', value: 'PENDING_QC' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const filter = reactive<{ companyId: number | undefined; status: ManufacturingOrderStatus | undefined }>({ companyId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 10, searchFields: ['moNumber'] })

const columns: ColumnDef<ManufacturingOrder>[] = [
  { key: 'moNumber', label: 'MO number', sortable: true },
  { key: 'productName', label: 'Finished good', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'plannedQuantity', label: 'Planned qty' },
  { key: 'producedQuantity', label: 'Produced qty' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

// Deep-linkable, e.g. a production plan's "View orders" button links here
// with its id.
const route = useRoute()
const productionPlanId = route.query.productionPlanId ? Number(route.query.productionPlanId) : undefined

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      productionPlanId,
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
async function onRelease(row: ManufacturingOrder) {
  actingId.value = row.id
  try {
    await release(row.id)
    toast.add({ title: 'Manufacturing order released', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not release', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onStart(row: ManufacturingOrder) {
  actingId.value = row.id
  try {
    await start(row.id)
    toast.add({ title: 'Production started', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not start production', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onCancel(row: ManufacturingOrder) {
  actingId.value = row.id
  try {
    await cancel(row.id)
    toast.add({ title: 'Manufacturing order cancelled', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<ManufacturingOrder | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Manufacturing order deleted', color: 'success' })
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
watch(() => [filter.companyId, filter.status], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.status !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.status = undefined
  load()
}
</script>

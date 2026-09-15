<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Quotations</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/quotations/new"> New quotation </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every quotation belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search quotation number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
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
        export-filename="quotations"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/quotations/${row.id}`">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton
              v-if="row.status === 'DRAFT'"
              size="xs"
              color="info"
              variant="soft"
              icon="i-lucide-send"
              :loading="actingId === row.id"
              @click="onSend(row)"
            >
              Send
            </UButton>
            <UButton
              v-if="row.status === 'SENT'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onAccept(row)"
            >
              Accept
            </UButton>
            <UButton
              v-if="row.status === 'SENT'"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :loading="actingId === row.id"
              @click="onReject(row)"
            >
              Reject
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
            title="No quotations match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-file-text" title="No quotations yet" description="Create the first quotation, or convert an opportunity.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/quotations/new">New quotation</UButton>
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
      title="Delete quotation"
      :description="`Delete quotation '${confirmDelete?.quotationNumber ?? ''}'? This cannot be undone.`"
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
import type { Quotation, QuotationStatus } from '~/composables/useQuotations'

definePageMeta({ middleware: 'admin' })

const { list, send, accept, reject, remove } = useQuotations()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<Quotation[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    companies.value = (await listCompanies({ size: 200 })).data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const filter = reactive<{ companyId: number | undefined; status: QuotationStatus | undefined }>({ companyId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['quotationNumber'] })

const columns: ColumnDef<Quotation>[] = [
  { key: 'quotationNumber', label: 'Quotation number', sortable: true },
  { key: 'opportunityName', label: 'From opportunity', value: (row) => row.opportunityName ?? '—' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'quotationDate', label: 'Date', type: 'date' },
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
async function onSend(row: Quotation) {
  actingId.value = row.id
  try {
    await send(row.id)
    toast.add({ title: 'Quotation sent', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not send', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onAccept(row: Quotation) {
  actingId.value = row.id
  try {
    await accept(row.id)
    toast.add({ title: 'Quotation accepted', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not accept', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReject(row: Quotation) {
  actingId.value = row.id
  try {
    await reject(row.id)
    toast.add({ title: 'Quotation rejected', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reject', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<Quotation | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Quotation deleted', color: 'success' })
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

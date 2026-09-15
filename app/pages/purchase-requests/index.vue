<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Purchase requests</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/purchase-requests/new"> New purchase request </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company and department first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search PR number" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.departmentId" :items="departmentFilterOptions" placeholder="Department" class="w-44" />
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
        export-filename="purchase-requests"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/purchase-requests/${row.id}`">
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
            <UButton
              v-if="row.status === 'SUBMITTED'"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :loading="actingId === row.id"
              @click="openReject(row)"
            >
              Reject
            </UButton>
            <NuxtLink v-if="row.status === 'APPROVED'" :to="`/rfqs?fromPurchaseRequestId=${row.id}`">
              <UButton size="xs" color="info" variant="soft" icon="i-lucide-send-horizontal">Create RFQ</UButton>
            </NuxtLink>
            <UButton v-if="row.status === 'DRAFT'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">
              Delete
            </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No purchase requests match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-clipboard-list" title="No purchase requests yet" description="Create the first purchase request to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/purchase-requests/new">New purchase request</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showRejectModal" title="Reject purchase request" :description="`Reject request '${rejecting?.requestNumber ?? ''}'?`">
      <template #body>
        <UFormField label="Reason (optional)">
          <UTextarea v-model="rejectReason" class="w-full" placeholder="Why is this request being rejected?" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" :disabled="rejecting !== null && actingId === rejecting.id" @click="showRejectModal = false">Cancel</UButton>
          <UButton color="error" :loading="rejecting !== null && actingId === rejecting.id" @click="onReject">Reject</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete purchase request"
      :description="`Delete purchase request '${confirmDelete?.requestNumber ?? ''}'? This cannot be undone.`"
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
import type { PurchaseRequest, PurchaseRequestStatus } from '~/composables/usePurchaseRequests'

definePageMeta({ middleware: 'admin' })

const { list, submit, approve, reject, remove } = usePurchaseRequests()
const { list: listCompanies } = useCompanies()
const { list: listDepartments } = useDepartments()
const toast = useToast()

const rows = ref<PurchaseRequest[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const departments = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, d] = await Promise.all([listCompanies({ size: 200 }), listDepartments({ size: 200 })])
    companies.value = c.data
    departments.value = d.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const departmentFilterOptions = computed(() => [
  { label: 'All departments', value: undefined },
  ...departments.value.map((d) => ({ label: d.name, value: d.id }))
])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const filter = reactive<{
  companyId: number | undefined
  departmentId: number | undefined
  status: PurchaseRequestStatus | undefined
}>({ companyId: undefined, departmentId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['requestNumber'] })

const columns: ColumnDef<PurchaseRequest>[] = [
  { key: 'requestNumber', label: 'PR number', sortable: true },
  { key: 'departmentName', label: 'Department', value: (row) => row.departmentName ?? '—' },
  { key: 'requestDate', label: 'Request date', type: 'date' },
  { key: 'requiredDate', label: 'Required date', type: 'date' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      departmentId: filter.departmentId,
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
async function onSubmit(row: PurchaseRequest) {
  actingId.value = row.id
  try {
    await submit(row.id)
    toast.add({ title: 'Purchase request submitted', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not submit', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onApprove(row: PurchaseRequest) {
  actingId.value = row.id
  try {
    await approve(row.id)
    toast.add({ title: 'Purchase request approved', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not approve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const showRejectModal = ref(false)
const rejecting = ref<PurchaseRequest | null>(null)
const rejectReason = ref('')
function openReject(row: PurchaseRequest) {
  rejecting.value = row
  rejectReason.value = ''
  showRejectModal.value = true
}
async function onReject() {
  if (!rejecting.value) return
  actingId.value = rejecting.value.id
  try {
    await reject(rejecting.value.id, rejectReason.value || undefined)
    toast.add({ title: 'Purchase request rejected', color: 'success' })
    showRejectModal.value = false
    rejecting.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reject', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<PurchaseRequest | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Purchase request deleted', color: 'success' })
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
watch(() => [filter.companyId, filter.departmentId, filter.status], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.companyId !== undefined || filter.departmentId !== undefined || filter.status !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.departmentId = undefined
  filter.status = undefined
  load()
}
</script>

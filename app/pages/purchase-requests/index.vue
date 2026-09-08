<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Purchase requests</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New purchase request </UButton>
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
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">
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
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New purchase request</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showForm" :title="formTitle" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="loadingDetail" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <div v-if="editingStatus === 'REJECTED' && rejectionReasonView" class="mb-4">
            <UAlert color="error" variant="subtle" title="Rejected" :description="rejectionReasonView" icon="i-lucide-triangle-alert" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable || editingId !== null" class="w-full" />
            </UFormField>
            <UFormField label="Department" required>
              <USelect v-model="form.departmentId" :items="departmentOptionsFor()" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Request date" required>
              <UInput v-model="form.requestDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Required date">
              <UInput v-model="form.requiredDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>

          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requested products</p>

          <div v-if="formEditable" class="flex flex-wrap items-end gap-2 mb-3">
            <UFormField label="Product" class="flex-1 min-w-[240px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="productOptionsFor(form.companyId)"
                value-key="value"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UButton icon="i-lucide-plus" :disabled="!addLineProductId" @click="addLine">Add line</UButton>
          </div>

          <div class="space-y-2 mb-4">
            <div
              v-if="form.lines.length === 0"
              class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
            >
              No line items yet
            </div>
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <div class="col-span-5 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
              <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model="line.notes" placeholder="Notes (optional)" :disabled="!formEditable" class="col-span-4" />
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
            </div>
          </div>

          <UAlert v-if="formError" color="error" variant="subtle" class="mb-3" :title="formError" />

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showForm = false">Close</UButton>
            <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ editingId ? 'Save changes' : 'Create' }}</UButton>
          </div>
        </template>
      </template>
    </UModal>

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
import type { PurchaseRequest, PurchaseRequestPayload, PurchaseRequestStatus } from '~/composables/usePurchaseRequests'

definePageMeta({ middleware: 'admin' })

const { list, get, create, update, submit, approve, reject, remove } = usePurchaseRequests()
const { list: listCompanies } = useCompanies()
const { list: listDepartments } = useDepartments()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<PurchaseRequest[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const departments = ref<{ id: number; name: string; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, d, p] = await Promise.all([listCompanies({ size: 200 }), listDepartments({ size: 200 }), listProducts({ size: 200 })])
    companies.value = c.data
    departments.value = d.data
    products.value = p.data
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

function departmentOptionsFor() {
  return departments.value.filter((d) => d.active).map((d) => ({ label: d.name, value: d.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}

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

interface LineForm {
  productId: number | undefined
  quantity: number | undefined
  notes: string
}

const showForm = ref(false)
const editingId = ref<number | null>(null)
const editingStatus = ref<PurchaseRequestStatus | null>(null)
const loadingDetail = ref(false)
const saving = ref(false)
const formError = ref('')
const rejectionReasonView = ref('')

const form = reactive<{
  companyId: number | undefined
  departmentId: number | undefined
  requestDate: string
  requiredDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  departmentId: undefined,
  requestDate: new Date().toISOString().slice(0, 10),
  requiredDate: '',
  notes: '',
  lines: []
})

const formEditable = computed(() => editingStatus.value === null || editingStatus.value === 'DRAFT')
const formTitle = computed(() => (editingId.value === null ? 'New purchase request' : formEditable.value ? 'Edit purchase request' : 'View purchase request'))

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  form.lines.push({ productId: addLineProductId.value, quantity: undefined, notes: '' })
  addLineProductId.value = undefined
}

function resetForm() {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.departmentId = undefined
  form.requestDate = new Date().toISOString().slice(0, 10)
  form.requiredDate = ''
  form.notes = ''
  form.lines = []
  rejectionReasonView.value = ''
}

function openCreate() {
  editingId.value = null
  editingStatus.value = null
  formError.value = ''
  resetForm()
  showForm.value = true
}

async function openView(row: PurchaseRequest) {
  editingId.value = row.id
  editingStatus.value = row.status
  formError.value = ''
  showForm.value = true
  loadingDetail.value = true
  try {
    const detail = await get(row.id)
    form.companyId = detail.companyId
    form.departmentId = detail.departmentId
    form.requestDate = detail.requestDate
    form.requiredDate = detail.requiredDate ?? ''
    form.notes = detail.notes ?? ''
    form.lines = (detail.lines ?? []).map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes ?? '' }))
    rejectionReasonView.value = detail.rejectionReason ?? ''
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.departmentId || !form.requestDate) {
    formError.value = 'Please fill in company, department, and request date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantity)) {
    formError.value = 'Every line needs a product and quantity'
    return
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      const payload: PurchaseRequestPayload = {
        companyId: form.companyId,
        departmentId: form.departmentId,
        requestDate: form.requestDate,
        requiredDate: form.requiredDate || undefined,
        notes: form.notes || undefined,
        lines: form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity!, notes: l.notes || undefined }))
      }
      await create(payload)
      toast.add({ title: 'Purchase request created', color: 'success' })
    } else {
      await update(editingId.value, {
        departmentId: form.departmentId,
        requestDate: form.requestDate,
        requiredDate: form.requiredDate || undefined,
        notes: form.notes || undefined,
        lines: form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity!, notes: l.notes || undefined }))
      })
      toast.add({ title: 'Purchase request updated', color: 'success' })
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
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

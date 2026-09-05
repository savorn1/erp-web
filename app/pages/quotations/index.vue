<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Quotations</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">
        New quotation
      </UButton>
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
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters">
          Clear filters
        </UButton>
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
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton v-if="row.status === 'DRAFT'" size="xs" color="info" variant="soft" icon="i-lucide-send" :loading="actingId === row.id" @click="onSend(row)">
              Send
            </UButton>
            <UButton v-if="row.status === 'SENT'" size="xs" color="success" variant="soft" icon="i-lucide-check" :loading="actingId === row.id" @click="onAccept(row)">
              Accept
            </UButton>
            <UButton v-if="row.status === 'SENT'" size="xs" color="error" variant="soft" icon="i-lucide-x" :loading="actingId === row.id" @click="onReject(row)">
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
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New quotation</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal
      v-model:open="showForm"
      :title="formTitle"
      :ui="{ content: 'sm:max-w-4xl' }"
    >
      <template #body>
        <div v-if="loadingDetail" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable || editingId !== null" class="w-full" @update:model-value="onFormCompanyChanged" />
            </UFormField>
            <UFormField label="Customer (optional)">
              <USelect v-model="form.customerId" :items="customerOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Quotation date" required>
              <UInput v-model="form.quotationDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Valid until">
              <UInput v-model="form.validUntil" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>

          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</p>
            <UButton v-if="formEditable" size="xs" variant="soft" icon="i-lucide-plus" @click="addLine">Add line</UButton>
          </div>

          <div class="space-y-2 mb-4">
            <div v-if="form.lines.length === 0" class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
              No line items yet
            </div>
            <div
              v-for="(line, i) in form.lines"
              :key="i"
              class="grid grid-cols-12 gap-2 items-center"
            >
              <USelect
                v-model="line.productId"
                :items="productOptionsFor(form.companyId)"
                placeholder="Product"
                :disabled="!formEditable"
                class="col-span-5"
              />
              <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model.number="line.unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" :disabled="!formEditable" class="col-span-2" />
              <div class="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-right">
                {{ formatCurrency((line.quantity || 0) * (line.unitPrice || 0)) }}
              </div>
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
            </div>
          </div>

          <div class="flex justify-end text-sm font-medium text-gray-900 dark:text-white mb-4">
            Total: {{ formatCurrency(formTotal) }}
          </div>

          <UAlert v-if="formError" color="error" variant="subtle" class="mb-3" :title="formError" />

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showForm = false">Close</UButton>
            <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ editingId ? 'Save changes' : 'Create' }}</UButton>
          </div>
        </template>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete quotation"
      :description="`Delete quotation '${confirmDelete?.quotationNumber ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { Quotation, QuotationPayload, QuotationStatus } from '~/composables/useQuotations'

definePageMeta({ middleware: 'admin' })

const { list, get, create, update, send, accept, reject, remove } = useQuotations()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<Quotation[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, cu, p] = await Promise.all([
      listCompanies({ size: 200 }),
      listCustomers({ size: 200 }),
      listProducts({ size: 200 })
    ])
    companies.value = c.data
    customers.value = cu.data
    products.value = p.data
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

function customerOptionsFor(companyId: number | undefined) {
  return [
    { label: 'No customer', value: undefined },
    ...customers.value.filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
      .map((c) => ({ label: c.name, value: c.id }))
  ]
}
function productOptionsFor(companyId: number | undefined) {
  return products.value.filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function onFormCompanyChanged() {
  form.customerId = undefined
  form.lines = []
}

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

interface LineForm {
  productId: number | undefined
  quantity: number | undefined
  unitPrice: number | undefined
}

const showForm = ref(false)
const editingId = ref<number | null>(null)
const editingStatus = ref<QuotationStatus | null>(null)
const loadingDetail = ref(false)
const saving = ref(false)
const formError = ref('')

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  quotationDate: string
  validUntil: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  customerId: undefined,
  quotationDate: new Date().toISOString().slice(0, 10),
  validUntil: '',
  notes: '',
  lines: []
})

const formEditable = computed(() => editingStatus.value === null || editingStatus.value === 'DRAFT')
const formTitle = computed(() => (editingId.value === null ? 'New quotation' : formEditable.value ? 'Edit quotation' : 'View quotation'))
const formTotal = computed(() => form.lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0))

function addLine() {
  form.lines.push({ productId: undefined, quantity: undefined, unitPrice: undefined })
}

function resetForm() {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.customerId = undefined
  form.quotationDate = new Date().toISOString().slice(0, 10)
  form.validUntil = ''
  form.notes = ''
  form.lines = []
}

function openCreate() {
  editingId.value = null
  editingStatus.value = null
  formError.value = ''
  resetForm()
  addLine()
  showForm.value = true
}

async function openView(row: Quotation) {
  editingId.value = row.id
  editingStatus.value = row.status
  formError.value = ''
  showForm.value = true
  loadingDetail.value = true
  try {
    const detail = await get(row.id)
    form.companyId = detail.companyId
    form.customerId = detail.customerId ?? undefined
    form.quotationDate = detail.quotationDate
    form.validUntil = detail.validUntil ?? ''
    form.notes = detail.notes ?? ''
    form.lines = (detail.lines ?? []).map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice }))
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.quotationDate) {
    formError.value = 'Please fill in company and quotation date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantity || l.unitPrice === undefined)) {
    formError.value = 'Every line needs a product, quantity, and unit price'
    return
  }
  const linesPayload = form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity!, unitPrice: l.unitPrice! }))
  saving.value = true
  try {
    if (editingId.value === null) {
      const payload: QuotationPayload = {
        companyId: form.companyId,
        customerId: form.customerId,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
        lines: linesPayload
      }
      await create(payload)
      toast.add({ title: 'Quotation created', color: 'success' })
    } else {
      await update(editingId.value, {
        customerId: form.customerId,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
        lines: linesPayload
      })
      toast.add({ title: 'Quotation updated', color: 'success' })
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

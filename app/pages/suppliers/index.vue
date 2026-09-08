<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New supplier </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every supplier belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.supplierTypeId" :items="typeFilterOptions" placeholder="Type" class="w-40" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-36" />
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
        export-filename="suppliers"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-wallet" @click="openBalanceWith(row)">Balance</UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-history" @click="openHistoryFor(row)">History</UButton>
            <UDropdownMenu :items="statusMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Status</UButton>
            </UDropdownMenu>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No suppliers match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-truck" title="No suppliers yet" description="Create the first supplier to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New supplier</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New supplier" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="supplierFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit supplier '${editingSupplier?.name ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="supplierFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showBalance" :title="`Balance — ${balanceTarget?.name ?? ''}`">
      <template #body>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Current balance:
          <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(balanceTarget?.currentBalance) }}</span>
        </p>
        <DynamicForm
          v-model="balanceForm"
          :fields="balanceFields"
          :loading="adjustingBalance"
          :error="balanceError"
          submit-label="Apply"
          cancelable
          @submit="onBalanceSubmit"
          @cancel="showBalance = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showHistory" :title="`History — ${historyTarget?.name ?? ''}`" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UForm :state="{}" class="flex gap-2" @submit="onAddNote">
            <UInput v-model="noteText" placeholder="Add a note…" class="flex-1" />
            <UButton type="submit" :loading="addingNote" :disabled="!noteText.trim()" icon="i-lucide-plus">Add</UButton>
          </UForm>

          <div v-if="loadingActivities" class="text-sm text-gray-400">Loading…</div>
          <EmptyState v-else-if="activities.length === 0" icon="i-lucide-history" title="No history yet" />
          <ul v-else class="space-y-2 max-h-96 overflow-y-auto">
            <li v-for="a in activities" :key="a.id" class="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ a.description }}</span>
                <span v-if="a.amount != null" :class="Number(a.amount) >= 0 ? 'text-error' : 'text-success'" class="font-semibold shrink-0">
                  {{ Number(a.amount) >= 0 ? '+' : '' }}{{ formatCurrency(a.amount) }}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ formatDateTime(a.createdAt) }}<span v-if="a.createdBy"> · {{ a.createdBy }}</span>
              </p>
            </li>
          </ul>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete supplier"
      :description="`Delete supplier '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { ColumnDef, FieldDef } from '#shared/types'
import type { SupplierBalanceAdjustmentType, Supplier, SupplierActivity, SupplierPayload, SupplierStatus } from '~/composables/useSuppliers'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove, adjustBalance, listActivities, addNote } = useSuppliers()
const { list: listCompanies } = useCompanies()
const { list: listTypes } = useSupplierTypes()
const toast = useToast()

const rows = ref<Supplier[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const types = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, t] = await Promise.all([listCompanies({ size: 200 }), listTypes({ size: 200 })])
    companies.value = c.data
    types.value = t.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const typeFilterOptions = computed(() => [{ label: 'All types', value: undefined }, ...types.value.map((t) => ({ label: t.name, value: t.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Blocked', value: 'BLOCKED' }
]
const paymentTermsOptions = [
  { label: 'Due on receipt', value: 'DUE_ON_RECEIPT' },
  { label: 'Net 15', value: 'NET_15' },
  { label: 'Net 30', value: 'NET_30' },
  { label: 'Net 45', value: 'NET_45' },
  { label: 'Net 60', value: 'NET_60' },
  { label: 'Cash on delivery', value: 'COD' }
]

function optionsFor(list: { id: number; name: string; active: boolean }[]) {
  return list.filter((item) => item.active).map((item) => ({ label: item.name, value: item.id }))
}

const filter = reactive<{
  companyId: number | undefined
  supplierTypeId: number | undefined
  status: SupplierStatus | undefined
}>({ companyId: undefined, supplierTypeId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name', 'contactName', 'email'] })

const columns: ColumnDef<Supplier>[] = [
  { key: 'name', sortable: true },
  { key: 'supplierTypeName', label: 'Type', value: (row) => row.supplierTypeName ?? '—' },
  { key: 'phone', value: (row) => row.phone ?? row.email ?? '—' },
  { key: 'creditLimit', label: 'Credit limit', type: 'currency' },
  { key: 'currentBalance', label: 'Balance', type: 'currency' },
  { key: 'paymentTerms', label: 'Terms', type: 'enum' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      supplierTypeId: filter.supplierTypeId,
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

const activeFormTarget = ref<'create' | 'edit'>('create')

const supplierFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true },
  { name: 'supplierTypeId', label: 'Supplier type', type: 'select', options: optionsFor(types.value) },
  { name: 'contactName', label: 'Contact name' },
  { name: 'phone' },
  { name: 'email', type: 'email' },
  { name: 'paymentTerms', label: 'Payment terms', type: 'select', required: true, options: paymentTermsOptions },
  { name: 'creditLimit', label: 'Credit limit', type: 'currency', required: true, hint: 'Maximum credit this supplier extends to us.' },

  { name: 'addressLine1', label: 'Address line 1', wrapper: 'full' },
  { name: 'addressLine2', label: 'Address line 2', wrapper: 'full' },
  { name: 'city' },
  { name: 'state', label: 'State / province' },
  { name: 'postalCode', label: 'Postal code' },
  { name: 'country' }
])

const {
  showCreate,
  creating,
  error: createError,
  createForm,
  openCreate: openCreateModal,
  onCreate,
  showEdit,
  editing,
  editError,
  editingRow: editingSupplier,
  editForm,
  openEdit: openEditModal,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Supplier, SupplierPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Supplier',
    createDefaults: () => ({ paymentTerms: 'NET_30', creditLimit: 0 }),
    toForm: (row) => ({
      companyId: row.companyId,
      supplierTypeId: row.supplierTypeId ?? undefined,
      name: row.name,
      contactName: row.contactName ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      paymentTerms: row.paymentTerms,
      creditLimit: row.creditLimit,
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      postalCode: row.postalCode ?? '',
      country: row.country ?? ''
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      supplierTypeId: values.supplierTypeId || undefined,
      name: values.name,
      contactName: values.contactName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      paymentTerms: values.paymentTerms,
      creditLimit: values.creditLimit ?? 0,
      addressLine1: values.addressLine1 || undefined,
      addressLine2: values.addressLine2 || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      postalCode: values.postalCode || undefined,
      country: values.country || undefined
    })
  }
)

function openCreate() {
  activeFormTarget.value = 'create'
  openCreateModal()
}
function openEdit(row: Supplier) {
  activeFormTarget.value = 'edit'
  openEditModal(row)
}

function statusMenuItems(row: Supplier) {
  const options: { label: string; status: SupplierStatus }[] = [
    { label: 'Active', status: 'ACTIVE' },
    { label: 'Inactive', status: 'INACTIVE' },
    { label: 'Blocked', status: 'BLOCKED' }
  ]
  return [
    options
      .filter((o) => o.status !== row.status)
      .map((o) => ({
        label: o.label,
        onSelect: () => onStatusChange(row, o.status)
      }))
  ]
}
async function onStatusChange(row: Supplier, status: SupplierStatus) {
  try {
    await updateStatus(row.id, status)
    toast.add({ title: `Status changed to ${status.toLowerCase()}`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not update status', description: apiErrorMessage(err), color: 'error' })
  }
}

const { open: showBalance, target: balanceTarget, openWith: openBalanceWith } = useTargetModal<Supplier>()

const balanceForm = ref<{ type: SupplierBalanceAdjustmentType; amount: number | undefined; note: string }>({ type: 'CHARGE', amount: undefined, note: '' })
const balanceFields: FieldDef[] = [
  {
    name: 'type',
    label: 'Adjustment type',
    type: 'select',
    required: true,
    options: [
      { label: 'Charge (increases balance owed)', value: 'CHARGE' },
      { label: 'Payment (reduces balance owed)', value: 'PAYMENT' }
    ]
  },
  { name: 'amount', type: 'currency', required: true },
  { name: 'note' }
]
const adjustingBalance = ref(false)
const balanceError = ref('')

watch(showBalance, (open) => {
  if (open) {
    balanceForm.value = { type: 'CHARGE', amount: undefined, note: '' }
    balanceError.value = ''
  }
})

async function onBalanceSubmit(values: Record<string, any>) {
  if (!balanceTarget.value) return
  adjustingBalance.value = true
  balanceError.value = ''
  try {
    await adjustBalance(balanceTarget.value.id, values.type, values.amount, values.note || undefined)
    toast.add({ title: 'Balance updated', color: 'success' })
    showBalance.value = false
    await load()
  } catch (err) {
    balanceError.value = apiErrorMessage(err)
  } finally {
    adjustingBalance.value = false
  }
}

const { open: showHistory, target: historyTarget, openWith: openHistoryWith } = useTargetModal<Supplier>()

const activities = ref<SupplierActivity[]>([])
const loadingActivities = ref(false)
const noteText = ref('')
const addingNote = ref(false)

async function openHistoryFor(row: Supplier) {
  openHistoryWith(row)
  noteText.value = ''
  await loadActivities()
}
async function loadActivities() {
  if (!historyTarget.value) return
  loadingActivities.value = true
  try {
    activities.value = (await listActivities(historyTarget.value.id)).data
  } finally {
    loadingActivities.value = false
  }
}
async function onAddNote() {
  if (!historyTarget.value || !noteText.value.trim()) return
  addingNote.value = true
  try {
    await addNote(historyTarget.value.id, noteText.value.trim())
    noteText.value = ''
    await loadActivities()
  } catch (err) {
    toast.add({ title: 'Could not add note', description: apiErrorMessage(err), color: 'error' })
  } finally {
    addingNote.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.supplierTypeId, filter.status], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.companyId !== undefined || filter.supplierTypeId !== undefined || filter.status !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.supplierTypeId = undefined
  filter.status = undefined
  load()
}
</script>

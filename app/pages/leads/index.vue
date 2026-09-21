<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
      <div class="flex items-center gap-2">
        <UButtonGroup>
          <UButton
            size="sm"
            icon="i-lucide-table"
            :color="view === 'table' ? 'primary' : 'neutral'"
            :variant="view === 'table' ? 'solid' : 'soft'"
            @click="view = 'table'"
          >
            Table
          </UButton>
          <UButton
            size="sm"
            icon="i-lucide-columns-3"
            :color="view === 'board' ? 'primary' : 'neutral'"
            :variant="view === 'board' ? 'solid' : 'soft'"
            @click="view = 'board'"
          >
            Board
          </UButton>
        </UButtonGroup>
        <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New lead </UButton>
      </div>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every lead belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search contact / organization" icon="i-lucide-search" class="w-60" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-44" />
        <USelect v-model="filter.source" :items="sourceFilterOptions" placeholder="Source" class="w-40" />
        <USelect v-model="filter.assignedToUserId" :items="userFilterOptions" placeholder="Salesperson" class="w-44" />
        <UButton
          size="sm"
          icon="i-lucide-phone-call"
          :color="followUpDueOnly ? 'error' : 'neutral'"
          :variant="followUpDueOnly ? 'solid' : 'soft'"
          @click="followUpDueOnly = !followUpDueOnly"
        >
          Follow-up due
        </UButton>
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard v-if="view === 'table'">
      <DataTable
        v-model:sort="sort"
        :rows="visibleRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="leads"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #contactName-data="{ row }">
          <div class="flex items-center gap-2">
            <span>{{ row.dealName ?? row.contactName }}</span>
            <UBadge v-if="row.followUpDue" color="error" variant="subtle" size="xs">Follow-up due</UBadge>
          </div>
        </template>
        <template #assignedToUsername-data="{ row }">
          <UserChip :name="row.assignedToUsername" />
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" :disabled="isClosed(row)" @click="openEditLead(row)">Edit</UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-history" @click="openHistoryFor(row)">Activity</UButton>
            <UDropdownMenu v-if="!isClosed(row)" :items="statusMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Status</UButton>
            </UDropdownMenu>
            <UDropdownMenu v-if="!isClosed(row)" :items="assignMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Assign</UButton>
            </UDropdownMenu>
            <UButton v-if="!isClosed(row)" size="xs" color="info" variant="soft" icon="i-lucide-file-text" @click="openQuoteFor(row)">
              Convert to quotation
            </UButton>
            <UButton v-if="!isClosed(row)" size="xs" color="success" variant="soft" icon="i-lucide-trophy" :loading="actingId === row.id" @click="onWin(row)">
              Win
            </UButton>
            <UButton v-if="!isClosed(row)" size="xs" color="error" variant="soft" icon="i-lucide-thumbs-down" @click="openLose(row)"> Lose </UButton>
            <UButton v-if="!isClosed(row)" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No leads match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-user-plus" title="No leads yet" description="Create the first lead to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New lead</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <div v-else class="flex gap-3 overflow-x-auto pb-2">
      <div
        v-for="column in boardColumns"
        :key="column.status"
        class="flex-none w-72 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 border-t-4"
        :class="BOARD_COLUMN_ACCENT[column.status]"
        @dragover.prevent
        @drop="onDropToStatus(column.status)"
      >
        <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ column.label }}</p>
            <UBadge :color="column.color" variant="subtle" size="xs">{{ column.rows.length }}</UBadge>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">{{ formatCurrency(column.total) }}</p>
        </div>
        <div class="p-2 space-y-2 min-h-[80px] max-h-[70vh] overflow-y-auto">
          <div
            v-for="row in column.rows"
            :key="row.id"
            draggable="true"
            class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 cursor-grab active:cursor-grabbing shadow-sm"
            @dragstart="onDragStart(row)"
            @click="openHistoryFor(row)"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ row.dealName ?? row.contactName }}</span>
              <UBadge v-if="row.followUpDue" color="error" variant="subtle" size="xs">Due</UBadge>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">{{ row.customerName ?? row.organizationName ?? '—' }}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ formatCurrency(row.amount ?? row.estimatedValue) }}</span>
              <UBadge v-if="row.probability != null" color="neutral" variant="subtle" size="xs">{{ row.probability }}%</UBadge>
            </div>
            <div class="mt-2">
              <UserChip :name="row.assignedToUsername" />
            </div>
          </div>
          <p v-if="column.rows.length === 0" class="text-xs text-gray-400 text-center py-4">No leads</p>
        </div>
      </div>
    </div>

    <UModal v-model:open="showCreate" title="New lead" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="leadFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit lead '${editingLead?.contactName ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="leadFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showLose" :title="`Mark lost — ${loseTarget?.contactName ?? ''}`">
      <template #body>
        <UFormField label="Reason (optional)" class="mb-4">
          <UInput v-model="loseReason" placeholder="e.g. Went with a competitor" class="w-full" />
        </UFormField>
        <UAlert v-if="loseError" color="error" variant="subtle" class="mb-3" :title="loseError" />
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showLose = false">Cancel</UButton>
          <UButton color="error" :loading="losing" @click="onLoseSubmit">Mark lost</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showHistory" :title="`Activity — ${historyTarget?.contactName ?? ''}`" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UForm :state="{}" class="space-y-2" @submit="onAddFollowUp">
            <UInput v-model="followUpText" placeholder="Log a follow-up…" class="w-full" />
            <div class="flex gap-2">
              <UInput v-model="followUpNextDate" type="date" placeholder="Next follow-up date" class="flex-1" />
              <UButton type="submit" :loading="addingFollowUp" :disabled="!followUpText.trim()" icon="i-lucide-phone-call">Follow-up</UButton>
            </div>
            <p v-if="historyTarget?.nextFollowUpDate" class="text-xs text-gray-400">
              Next follow-up scheduled: {{ formatDate(historyTarget.nextFollowUpDate) }}
            </p>
          </UForm>
          <UForm :state="{}" class="flex gap-2" @submit="onAddNote">
            <UInput v-model="noteText" placeholder="Add a note…" class="flex-1" />
            <UButton type="submit" :loading="addingNote" :disabled="!noteText.trim()" icon="i-lucide-plus">Note</UButton>
          </UForm>

          <ActivityTimeline :activities="activities" :loading="loadingActivities" empty-title="No activity yet" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showQuote" :title="`Convert to quotation — ${quoteTarget?.contactName ?? ''}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <UFormField label="Quotation date" required>
            <UInput v-model="quoteForm.quotationDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Valid until">
            <UInput v-model="quoteForm.validUntil" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Notes" class="sm:col-span-2">
            <UTextarea v-model="quoteForm.notes" class="w-full" />
          </UFormField>
        </div>

        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</p>
          <UButton size="xs" variant="soft" icon="i-lucide-plus" @click="addQuoteLine">Add line</UButton>
        </div>
        <div
          v-if="quoteForm.lines.length === 0"
          class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
        >
          No line items yet
        </div>
        <div v-else class="space-y-2">
          <div v-for="(line, i) in quoteForm.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
            <div class="col-span-5">
              <USelectMenu v-model="line.productId" :items="productOptionsFor(quoteTarget?.companyId)" value-key="value" placeholder="Product" class="w-full" />
            </div>
            <UInput v-model.number="line.quantity" type="number" min="0" step="0.01" placeholder="Qty" class="col-span-2" />
            <UInput v-model.number="line.unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" class="col-span-3" />
            <div class="col-span-2 flex items-center justify-end">
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="quoteForm.lines.splice(i, 1)" />
            </div>
          </div>
        </div>

        <p class="text-sm font-semibold text-right mt-3">Total: {{ formatCurrency(quoteTotal) }}</p>
        <UAlert v-if="quoteError" color="error" variant="subtle" class="mt-3" :title="quoteError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showQuote = false">Cancel</UButton>
          <UButton :loading="quoting" @click="onQuoteSubmit">Create quotation</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete lead"
      :description="`Delete lead '${confirmDelete?.contactName ?? ''}'? This cannot be undone.`"
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
import type { Lead, LeadActivity, LeadPayload, LeadSource, LeadStatus } from '~/composables/useLeads'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const view = useState<'table' | 'board'>('leads-view', () => 'table')
const { list, create, update, updateStatus, assign, win, lose, remove, listActivities, addNote, addFollowUp, convertToQuotation } = useLeads()
const { list: listCompanies } = useCompanies()
const { list: listUsers } = useUsers()
const { list: listCustomers } = useCustomers()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<Lead[]>([])
const loading = ref(false)
const error = ref('')

const followUpDueOnly = ref(route.query.followUpDue === 'true')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const users = ref<{ id: number; username: string; enabled: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, u, cu, p] = await Promise.all([listCompanies({ size: 200 }), listUsers({ size: 200 }), listCustomers({ size: 200 }), listProducts({ size: 200 })])
    companies.value = c.data
    users.value = u.data
    customers.value = cu.data
    products.value = p.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const activeUserOptions = computed(() => users.value.filter((u) => u.enabled).map((u) => ({ label: u.username, value: u.id })))
const userFilterOptions = computed(() => [{ label: 'All salespeople', value: undefined }, ...users.value.map((u) => ({ label: u.username, value: u.id }))])
function customerOptionsFor(companyId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...customers.value
      .filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
      .map((c) => ({ label: c.name, value: c.id }))
  ]
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

const openStatusOptions = [
  { label: 'New', value: 'NEW' },
  { label: 'Qualified', value: 'QUALIFIED' },
  { label: 'Needs analysis', value: 'NEEDS_ANALYSIS' },
  { label: 'Quotation', value: 'QUOTATION' },
  { label: 'Negotiation', value: 'NEGOTIATION' }
]
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  ...openStatusOptions,
  { label: 'Won', value: 'WON' },
  { label: 'Lost', value: 'LOST' }
]
const sourceOptions = [
  { label: 'Website', value: 'WEBSITE' },
  { label: 'Referral', value: 'REFERRAL' },
  { label: 'Cold call', value: 'COLD_CALL' },
  { label: 'Social media', value: 'SOCIAL_MEDIA' },
  { label: 'Advertisement', value: 'ADVERTISEMENT' },
  { label: 'Trade show', value: 'TRADE_SHOW' },
  { label: 'Email campaign', value: 'EMAIL_CAMPAIGN' },
  { label: 'Other', value: 'OTHER' }
]
const sourceFilterOptions = [{ label: 'All sources', value: undefined }, ...sourceOptions]

function isClosed(row: Lead) {
  return row.status === 'WON' || row.status === 'LOST'
}

const filter = reactive<{
  companyId: number | undefined
  status: LeadStatus | undefined
  source: LeadSource | undefined
  assignedToUserId: number | undefined
}>({ companyId: undefined, status: undefined, source: undefined, assignedToUserId: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const {
  page,
  pageSize,
  total,
  rows: pagedRows,
  truncated,
  search,
  filtered
} = useClientTable(rows, { pageSize: 10, searchFields: ['contactName', 'organizationName', 'email'] })

const visibleRows = computed(() => (followUpDueOnly.value ? pagedRows.value.filter((r) => r.followUpDue) : pagedRows.value))

// Mirrors StatusBadge's LeadStatus -> color mapping so the board's column
// accents and count badges read as "the same colors" as the table view's
// status column, not a second palette to learn.
type BoardColor = 'neutral' | 'info' | 'secondary' | 'warning' | 'error' | 'success' | 'cancelled'
const BOARD_STATUSES: { status: LeadStatus; label: string; color: BoardColor }[] = [
  { status: 'NEW', label: 'New', color: 'neutral' },
  { status: 'QUALIFIED', label: 'Qualified', color: 'info' },
  { status: 'NEEDS_ANALYSIS', label: 'Needs analysis', color: 'secondary' },
  { status: 'QUOTATION', label: 'Quotation', color: 'warning' },
  { status: 'NEGOTIATION', label: 'Negotiation', color: 'error' },
  { status: 'WON', label: 'Won', color: 'success' },
  { status: 'LOST', label: 'Lost', color: 'cancelled' }
]
// Written out in full so Tailwind's static scan can find each class name —
// a template string built from `column.color` at runtime wouldn't appear
// literally in this file and would silently generate no CSS.
const BOARD_COLUMN_ACCENT: Record<LeadStatus, string> = {
  NEW: 'border-t-neutral-400 dark:border-t-neutral-600',
  QUALIFIED: 'border-t-info-500',
  NEEDS_ANALYSIS: 'border-t-secondary-500',
  QUOTATION: 'border-t-warning-500',
  NEGOTIATION: 'border-t-error-500',
  WON: 'border-t-success-500',
  LOST: 'border-t-cancelled-500'
}
const boardColumns = computed(() =>
  BOARD_STATUSES.map(({ status, label, color }) => {
    const statusRows = filtered.value.filter((r) => r.status === status && (!followUpDueOnly.value || r.followUpDue))
    return {
      status,
      label,
      color,
      rows: statusRows,
      total: statusRows.reduce((sum, r) => sum + (r.amount ?? r.estimatedValue ?? 0), 0)
    }
  })
)

const draggingLead = ref<Lead | null>(null)
function onDragStart(row: Lead) {
  draggingLead.value = row
}
async function onDropToStatus(status: LeadStatus) {
  const row = draggingLead.value
  draggingLead.value = null
  if (!row || row.status === status) return
  if (status === 'WON') {
    await onWin(row)
  } else if (status === 'LOST') {
    openLose(row)
  } else {
    await onStatusChange(row, status)
  }
}

const columns: ColumnDef<Lead>[] = [
  { key: 'contactName', label: 'Contact', sortable: true },
  { key: 'organizationName', label: 'Organization', value: (row) => row.organizationName ?? '—' },
  { key: 'source', type: 'enum' },
  { key: 'assignedToUsername', label: 'Salesperson', value: (row) => row.assignedToUsername ?? 'Unassigned' },
  { key: 'estimatedValue', label: 'Est. value', type: 'currency' },
  { key: 'amount', label: 'Deal amount', type: 'currency', value: (row) => row.amount },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
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
      source: filter.source,
      assignedToUserId: filter.assignedToUserId,
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

const activeFormCompanyId = ref<number | undefined>(undefined)
const leadFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'contactName', label: 'Contact name', required: true },
  { name: 'organizationName', label: 'Organization' },
  { name: 'phone' },
  { name: 'email', type: 'email' },
  { name: 'source', type: 'select', required: true, options: sourceOptions },
  { name: 'assignedToUserId', label: 'Salesperson', type: 'select', options: activeUserOptions.value },
  { name: 'customerId', label: 'Existing customer (optional)', type: 'select', options: customerOptionsFor(activeFormCompanyId.value) },
  { name: 'dealName', label: 'Deal name (optional)' },
  { name: 'estimatedValue', label: 'Estimated value' },
  { name: 'amount', label: 'Deal amount', type: 'currency' },
  { name: 'probability', label: 'Probability (%)', type: 'number' },
  { name: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
  { name: 'notes', type: 'textarea', wrapper: 'full' }
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
  editingRow: editingLead,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Lead, LeadPayload, Omit<LeadPayload, 'assignedToUserId'>>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Lead',
    createDefaults: () => ({ source: 'WEBSITE' }),
    toForm: (row) => ({
      companyId: row.companyId,
      contactName: row.contactName,
      organizationName: row.organizationName ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      source: row.source,
      customerId: row.customerId ?? undefined,
      dealName: row.dealName ?? '',
      estimatedValue: row.estimatedValue ?? undefined,
      amount: row.amount ?? undefined,
      probability: row.probability ?? undefined,
      expectedCloseDate: row.expectedCloseDate ?? '',
      notes: row.notes ?? ''
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      contactName: values.contactName,
      organizationName: values.organizationName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      source: values.source,
      assignedToUserId: values.assignedToUserId || undefined,
      customerId: values.customerId || undefined,
      dealName: values.dealName || undefined,
      estimatedValue: values.estimatedValue || undefined,
      amount: values.amount || undefined,
      probability: values.probability || undefined,
      expectedCloseDate: values.expectedCloseDate || undefined,
      notes: values.notes || undefined
    }),
    toEditPayload: (values) => ({
      companyId: values.companyId,
      contactName: values.contactName,
      organizationName: values.organizationName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      source: values.source,
      customerId: values.customerId || undefined,
      dealName: values.dealName || undefined,
      estimatedValue: values.estimatedValue || undefined,
      amount: values.amount || undefined,
      probability: values.probability || undefined,
      expectedCloseDate: values.expectedCloseDate || undefined,
      notes: values.notes || undefined
    })
  }
)

function openCreate() {
  activeFormCompanyId.value = activeCompanyOptions.value[0]?.value
  openCreateModal()
}
function openEditLead(row: Lead) {
  activeFormCompanyId.value = row.companyId
  openEdit(row)
}
watch(
  () => createForm.value?.companyId,
  (id) => {
    if (showCreate.value) activeFormCompanyId.value = id
  }
)
watch(
  () => editForm.value?.companyId,
  (id) => {
    if (showEdit.value) activeFormCompanyId.value = id
  }
)

function statusMenuItems(row: Lead) {
  return [
    openStatusOptions
      .filter((o) => o.value !== row.status)
      .map((o) => ({
        label: o.label,
        onSelect: () => onStatusChange(row, o.value as LeadStatus)
      }))
  ]
}
async function onStatusChange(row: Lead, status: LeadStatus) {
  try {
    await updateStatus(row.id, status)
    toast.add({ title: `Status changed to ${status.toLowerCase().replace('_', ' ')}`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not update status', description: apiErrorMessage(err), color: 'error' })
  }
}

function assignMenuItems(row: Lead) {
  const items = activeUserOptions.value.filter((u) => u.value !== row.assignedToUserId).map((u) => ({ label: u.label, onSelect: () => onAssign(row, u.value) }))
  if (row.assignedToUserId !== null) {
    items.push({ label: 'Unassign', onSelect: () => onAssign(row, undefined) })
  }
  return [items]
}
async function onAssign(row: Lead, userId: number | undefined) {
  try {
    await assign(row.id, userId)
    toast.add({ title: userId ? 'Lead assigned' : 'Lead unassigned', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not assign lead', description: apiErrorMessage(err), color: 'error' })
  }
}

const actingId = ref<number | null>(null)
async function onWin(row: Lead) {
  actingId.value = row.id
  try {
    const won = await win(row.id)
    toast.add({ title: `Won! Customer: ${won.customerName ?? ''}`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not mark as won', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const { open: showLose, target: loseTarget, openWith: openLoseWith } = useTargetModal<Lead>()
const loseReason = ref('')
const losing = ref(false)
const loseError = ref('')
function openLose(row: Lead) {
  loseReason.value = ''
  loseError.value = ''
  openLoseWith(row)
}
async function onLoseSubmit() {
  if (!loseTarget.value) return
  losing.value = true
  loseError.value = ''
  try {
    await lose(loseTarget.value.id, loseReason.value || undefined)
    toast.add({ title: 'Lead marked lost', color: 'success' })
    showLose.value = false
    await load()
  } catch (err) {
    loseError.value = apiErrorMessage(err)
  } finally {
    losing.value = false
  }
}

const { open: showHistory, target: historyTarget, openWith: openHistoryWith } = useTargetModal<Lead>()

const activities = ref<LeadActivity[]>([])
const loadingActivities = ref(false)
const noteText = ref('')
const addingNote = ref(false)
const followUpText = ref('')
const followUpNextDate = ref('')
const addingFollowUp = ref(false)

async function openHistoryFor(row: Lead) {
  openHistoryWith(row)
  noteText.value = ''
  followUpText.value = ''
  followUpNextDate.value = row.nextFollowUpDate ?? ''
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
async function onAddFollowUp() {
  if (!historyTarget.value || !followUpText.value.trim()) return
  addingFollowUp.value = true
  try {
    await addFollowUp(historyTarget.value.id, followUpText.value.trim(), followUpNextDate.value || undefined)
    followUpText.value = ''
    if (historyTarget.value) historyTarget.value.nextFollowUpDate = followUpNextDate.value || null
    await loadActivities()
    await load()
  } catch (err) {
    toast.add({ title: 'Could not add follow-up', description: apiErrorMessage(err), color: 'error' })
  } finally {
    addingFollowUp.value = false
  }
}

// ── Convert to quotation ───────────────────────────────────────────────────

interface QuoteLineForm {
  productId: number | undefined
  quantity: number | undefined
  unitPrice: number | undefined
}

const { open: showQuote, target: quoteTarget, openWith: openQuoteWith } = useTargetModal<Lead>()

const quoteForm = reactive<{ quotationDate: string; validUntil: string; notes: string; lines: QuoteLineForm[] }>({
  quotationDate: new Date().toISOString().slice(0, 10),
  validUntil: '',
  notes: '',
  lines: []
})
const quoting = ref(false)
const quoteError = ref('')
const quoteTotal = computed(() => quoteForm.lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0))

function addQuoteLine() {
  quoteForm.lines.push({ productId: undefined, quantity: undefined, unitPrice: undefined })
}

function openQuoteFor(row: Lead) {
  quoteForm.quotationDate = new Date().toISOString().slice(0, 10)
  quoteForm.validUntil = ''
  quoteForm.notes = ''
  quoteForm.lines = [{ productId: undefined, quantity: undefined, unitPrice: undefined }]
  quoteError.value = ''
  openQuoteWith(row)
}

async function onQuoteSubmit() {
  if (!quoteTarget.value) return
  quoteError.value = ''
  if (!quoteForm.quotationDate) {
    quoteError.value = 'Please select a quotation date'
    return
  }
  if (quoteForm.lines.length === 0 || quoteForm.lines.some((l) => !l.productId || !l.quantity || l.unitPrice === undefined)) {
    quoteError.value = 'Every line needs a product, quantity, and unit price'
    return
  }
  quoting.value = true
  try {
    const quotation = await convertToQuotation(quoteTarget.value.id, {
      quotationDate: quoteForm.quotationDate,
      validUntil: quoteForm.validUntil || undefined,
      notes: quoteForm.notes || undefined,
      lines: quoteForm.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity!, unitPrice: l.unitPrice! }))
    })
    toast.add({ title: `Quotation ${quotation.quotationNumber} created`, color: 'success' })
    showQuote.value = false
    await load()
  } catch (err) {
    quoteError.value = apiErrorMessage(err)
  } finally {
    quoting.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.status, filter.source, filter.assignedToUserId], load)

const hasActiveFilter = computed(
  () =>
    search.value !== '' ||
    filter.companyId !== undefined ||
    filter.status !== undefined ||
    filter.source !== undefined ||
    filter.assignedToUserId !== undefined ||
    followUpDueOnly.value
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.status = undefined
  filter.source = undefined
  filter.assignedToUserId = undefined
  followUpDueOnly.value = false
  load()
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Opportunities</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New opportunity </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first — every opportunity belongs to one."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search opportunity name" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.stage" :items="stageFilterOptions" placeholder="Stage" class="w-44" />
        <USelect v-model="filter.assignedToUserId" :items="userFilterOptions" placeholder="Salesperson" class="w-44" />
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
        export-filename="opportunities"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" :disabled="isClosed(row)" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-history" @click="openHistoryFor(row)">Activity</UButton>
            <UDropdownMenu v-if="!isClosed(row)" :items="stageMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Stage</UButton>
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
            title="No opportunities match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-target" title="No opportunities yet" description="Create the first opportunity, or convert a qualified lead.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New opportunity</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New opportunity" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit opportunity '${editingOpportunity?.name ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="editFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showLose" :title="`Mark lost — ${loseTarget?.name ?? ''}`">
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

    <UModal v-model:open="showHistory" :title="`Activity — ${historyTarget?.name ?? ''}`" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UForm :state="{}" class="flex gap-2" @submit="onAddFollowUp">
            <UInput v-model="followUpText" placeholder="Log a follow-up…" class="flex-1" />
            <UButton type="submit" :loading="addingFollowUp" :disabled="!followUpText.trim()" icon="i-lucide-phone-call">Follow-up</UButton>
          </UForm>
          <UForm :state="{}" class="flex gap-2" @submit="onAddNote">
            <UInput v-model="noteText" placeholder="Add a note…" class="flex-1" />
            <UButton type="submit" :loading="addingNote" :disabled="!noteText.trim()" icon="i-lucide-plus">Note</UButton>
          </UForm>

          <div v-if="loadingActivities" class="text-sm text-gray-400">Loading…</div>
          <EmptyState v-else-if="activities.length === 0" icon="i-lucide-history" title="No activity yet" />
          <ul v-else class="space-y-2 max-h-96 overflow-y-auto">
            <li v-for="a in activities" :key="a.id" class="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ a.description }}</span>
                <span class="text-xs text-gray-400 shrink-0">{{ activityTypeLabel(a.type) }}</span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ formatDateTime(a.createdAt) }}<span v-if="a.createdBy"> · {{ a.createdBy }}</span>
              </p>
            </li>
          </ul>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showQuote" :title="`Convert to quotation — ${quoteTarget?.name ?? ''}`" :ui="{ content: 'sm:max-w-3xl' }">
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

        <div class="space-y-2 mb-4">
          <div
            v-if="quoteForm.lines.length === 0"
            class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No line items yet
          </div>
          <div v-for="(line, i) in quoteForm.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
            <USelect v-model="line.productId" :items="productOptionsFor(quoteTarget?.companyId)" placeholder="Product" class="col-span-5" />
            <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" class="col-span-2" />
            <UInput v-model.number="line.unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" class="col-span-2" />
            <div class="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency((line.quantity || 0) * (line.unitPrice || 0)) }}
            </div>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="quoteForm.lines.splice(i, 1)" />
          </div>
        </div>

        <div class="flex justify-end text-sm font-medium text-gray-900 dark:text-white mb-4">Total: {{ formatCurrency(quoteTotal) }}</div>

        <UAlert v-if="quoteError" color="error" variant="subtle" class="mb-3" :title="quoteError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showQuote = false">Cancel</UButton>
          <UButton :loading="quoting" @click="onQuoteSubmit">Create quotation</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete opportunity"
      :description="`Delete opportunity '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { Opportunity, OpportunityActivity, OpportunityPayload, OpportunityStage } from '~/composables/useOpportunities'

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStage, win, lose, remove, listActivities, addNote, addFollowUp, convertToQuotation } = useOpportunities()
const { list: listCompanies } = useCompanies()
const { list: listUsers } = useUsers()
const { list: listCustomers } = useCustomers()
const { list: listProducts } = useProducts()
const toast = useToast()

const rows = ref<Opportunity[]>([])
const loading = ref(false)
const error = ref('')

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
  return customers.value
    .filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
    .map((c) => ({ label: c.name, value: c.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

const openStageOptions = [
  { label: 'Qualification', value: 'QUALIFICATION' },
  { label: 'Needs analysis', value: 'NEEDS_ANALYSIS' },
  { label: 'Proposal', value: 'PROPOSAL' },
  { label: 'Negotiation', value: 'NEGOTIATION' }
]
const stageFilterOptions = [
  { label: 'All stages', value: undefined },
  ...openStageOptions,
  { label: 'Closed won', value: 'CLOSED_WON' },
  { label: 'Closed lost', value: 'CLOSED_LOST' }
]

function isClosed(row: Opportunity) {
  return row.stage === 'CLOSED_WON' || row.stage === 'CLOSED_LOST'
}
function activityTypeLabel(type: string) {
  return type
    .replace('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

const filter = reactive<{
  companyId: number | undefined
  stage: OpportunityStage | undefined
  assignedToUserId: number | undefined
}>({ companyId: undefined, stage: undefined, assignedToUserId: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<Opportunity>[] = [
  { key: 'name', sortable: true },
  { key: 'leadContactName', label: 'From lead', value: (row) => row.leadContactName ?? '—' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'assignedToUsername', label: 'Salesperson', value: (row) => row.assignedToUsername ?? 'Unassigned' },
  { key: 'expectedCloseDate', label: 'Expected close', type: 'date' },
  { key: 'stage', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      stage: filter.stage,
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
const createFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', label: 'Opportunity name', required: true, wrapper: 'full' },
  { name: 'customerId', label: 'Existing customer (optional)', type: 'select', options: customerOptionsFor(activeFormCompanyId.value) },
  { name: 'amount', type: 'currency' },
  { name: 'probability', label: 'Probability (%)', type: 'number' },
  { name: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
  { name: 'assignedToUserId', label: 'Salesperson', type: 'select', options: activeUserOptions.value },
  { name: 'notes', type: 'textarea', wrapper: 'full' }
])
const editFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', label: 'Opportunity name', required: true, wrapper: 'full' },
  { name: 'amount', type: 'currency' },
  { name: 'probability', label: 'Probability (%)', type: 'number' },
  { name: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
  { name: 'assignedToUserId', label: 'Salesperson', type: 'select', options: activeUserOptions.value },
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
  editingRow: editingOpportunity,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Opportunity, OpportunityPayload, Omit<OpportunityPayload, 'leadId' | 'customerId'>>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Opportunity',
    createDefaults: () => ({}),
    toForm: (row) => ({
      companyId: row.companyId,
      name: row.name,
      amount: row.amount ?? undefined,
      probability: row.probability ?? undefined,
      expectedCloseDate: row.expectedCloseDate ?? '',
      assignedToUserId: row.assignedToUserId ?? undefined,
      notes: row.notes ?? ''
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      customerId: values.customerId || undefined,
      name: values.name,
      amount: values.amount || undefined,
      probability: values.probability || undefined,
      expectedCloseDate: values.expectedCloseDate || undefined,
      assignedToUserId: values.assignedToUserId || undefined,
      notes: values.notes || undefined
    }),
    toEditPayload: (values) => ({
      companyId: values.companyId,
      name: values.name,
      amount: values.amount || undefined,
      probability: values.probability || undefined,
      expectedCloseDate: values.expectedCloseDate || undefined,
      assignedToUserId: values.assignedToUserId || undefined,
      notes: values.notes || undefined
    })
  }
)

function openCreate() {
  activeFormCompanyId.value = activeCompanyOptions.value[0]?.value
  openCreateModal()
}
watch(
  () => createForm.value?.companyId,
  (id) => {
    activeFormCompanyId.value = id
  }
)

function stageMenuItems(row: Opportunity) {
  return [
    openStageOptions
      .filter((o) => o.value !== row.stage)
      .map((o) => ({
        label: o.label,
        onSelect: () => onStageChange(row, o.value as OpportunityStage)
      }))
  ]
}
async function onStageChange(row: Opportunity, stage: OpportunityStage) {
  try {
    await updateStage(row.id, stage)
    toast.add({ title: `Stage changed to ${stage.toLowerCase().replace('_', ' ')}`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not update stage', description: apiErrorMessage(err), color: 'error' })
  }
}

const actingId = ref<number | null>(null)
async function onWin(row: Opportunity) {
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

const { open: showLose, target: loseTarget, openWith: openLoseWith } = useTargetModal<Opportunity>()
const loseReason = ref('')
const losing = ref(false)
const loseError = ref('')
function openLose(row: Opportunity) {
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
    toast.add({ title: 'Opportunity marked lost', color: 'success' })
    showLose.value = false
    await load()
  } catch (err) {
    loseError.value = apiErrorMessage(err)
  } finally {
    losing.value = false
  }
}

const { open: showHistory, target: historyTarget, openWith: openHistoryWith } = useTargetModal<Opportunity>()

const activities = ref<OpportunityActivity[]>([])
const loadingActivities = ref(false)
const noteText = ref('')
const addingNote = ref(false)
const followUpText = ref('')
const addingFollowUp = ref(false)

async function openHistoryFor(row: Opportunity) {
  openHistoryWith(row)
  noteText.value = ''
  followUpText.value = ''
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
    await addFollowUp(historyTarget.value.id, followUpText.value.trim())
    followUpText.value = ''
    await loadActivities()
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

const { open: showQuote, target: quoteTarget, openWith: openQuoteWith } = useTargetModal<Opportunity>()

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

function openQuoteFor(row: Opportunity) {
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
watch(() => [filter.companyId, filter.stage, filter.assignedToUserId], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.companyId !== undefined || filter.stage !== undefined || filter.assignedToUserId !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.stage = undefined
  filter.assignedToUserId = undefined
  load()
}
</script>

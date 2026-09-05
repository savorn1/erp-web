<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New lead </UButton>
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
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <USelect v-model="filter.source" :items="sourceFilterOptions" placeholder="Source" class="w-40" />
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
        export-filename="leads"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" :disabled="row.status === 'CONVERTED'" @click="openEdit(row)"
              >Edit</UButton
            >
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-history" @click="openHistoryFor(row)">Follow-ups</UButton>
            <UDropdownMenu v-if="row.status !== 'CONVERTED'" :items="statusMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Status</UButton>
            </UDropdownMenu>
            <UDropdownMenu v-if="row.status !== 'CONVERTED'" :items="assignMenuItems(row)">
              <UButton size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">Assign</UButton>
            </UDropdownMenu>
            <UButton
              v-if="canConvert(row)"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-user-check"
              :loading="convertingId === row.id"
              @click="onConvert(row)"
            >
              Convert to opportunity
            </UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
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

    <UModal v-model:open="showHistory" :title="`Follow-ups — ${historyTarget?.contactName ?? ''}`" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UForm :state="{}" class="flex gap-2" @submit="onAddFollowUp">
            <UInput v-model="followUpText" placeholder="Log a follow-up…" class="flex-1" />
            <UButton type="submit" :loading="addingFollowUp" :disabled="!followUpText.trim()" icon="i-lucide-plus">Add</UButton>
          </UForm>

          <div v-if="loadingActivities" class="text-sm text-gray-400">Loading…</div>
          <EmptyState v-else-if="activities.length === 0" icon="i-lucide-history" title="No follow-ups yet" />
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

const { list, create, update, updateStatus, assign, convert, remove, listActivities, addFollowUp } = useLeads()
const { list: listCompanies } = useCompanies()
const { list: listUsers } = useUsers()
const toast = useToast()

const rows = ref<Lead[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const users = ref<{ id: number; username: string; enabled: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, u] = await Promise.all([listCompanies({ size: 200 }), listUsers({ size: 200 })])
    companies.value = c.data
    users.value = u.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const activeUserOptions = computed(() => users.value.filter((u) => u.enabled).map((u) => ({ label: u.username, value: u.id })))
const userFilterOptions = computed(() => [{ label: 'All salespeople', value: undefined }, ...users.value.map((u) => ({ label: u.username, value: u.id }))])

const statusOptions = [
  { label: 'New', value: 'NEW' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Qualified', value: 'QUALIFIED' },
  { label: 'Proposal', value: 'PROPOSAL' },
  { label: 'Negotiation', value: 'NEGOTIATION' },
  { label: 'Lost', value: 'LOST' }
]
const statusFilterOptions = [{ label: 'All statuses', value: undefined }, ...statusOptions, { label: 'Converted', value: 'CONVERTED' }]
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

function activityTypeLabel(type: string) {
  return type
    .replace('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
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
  search
} = useClientTable(rows, { pageSize: 10, searchFields: ['contactName', 'organizationName', 'email'] })

const columns: ColumnDef<Lead>[] = [
  { key: 'contactName', label: 'Contact', sortable: true },
  { key: 'organizationName', label: 'Organization', value: (row) => row.organizationName ?? '—' },
  { key: 'source', type: 'enum' },
  { key: 'assignedToUsername', label: 'Salesperson', value: (row) => row.assignedToUsername ?? 'Unassigned' },
  { key: 'estimatedValue', label: 'Est. value', type: 'currency' },
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

const leadFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'contactName', label: 'Contact name', required: true },
  { name: 'organizationName', label: 'Organization' },
  { name: 'phone' },
  { name: 'email', type: 'email' },
  { name: 'source', type: 'select', required: true, options: sourceOptions },
  { name: 'assignedToUserId', label: 'Salesperson', type: 'select', options: activeUserOptions.value },
  { name: 'estimatedValue', label: 'Estimated value', type: 'currency' },
  { name: 'notes', type: 'textarea', wrapper: 'full' }
])

const {
  showCreate,
  creating,
  error: createError,
  createForm,
  openCreate,
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
      estimatedValue: row.estimatedValue ?? undefined,
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
      estimatedValue: values.estimatedValue || undefined,
      notes: values.notes || undefined
    }),
    toEditPayload: (values) => ({
      companyId: values.companyId,
      contactName: values.contactName,
      organizationName: values.organizationName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      source: values.source,
      estimatedValue: values.estimatedValue || undefined,
      notes: values.notes || undefined
    })
  }
)

function statusMenuItems(row: Lead) {
  const options = [...statusOptions]
  return [
    options
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
    toast.add({ title: `Status changed to ${status.toLowerCase()}`, color: 'success' })
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

function canConvert(row: Lead) {
  return row.status === 'QUALIFIED' || row.status === 'PROPOSAL' || row.status === 'NEGOTIATION'
}

const convertingId = ref<number | null>(null)
async function onConvert(row: Lead) {
  convertingId.value = row.id
  try {
    const converted = await convert(row.id)
    toast.add({ title: `Converted to opportunity ${converted.convertedOpportunityName ?? ''}`, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not convert lead', description: apiErrorMessage(err), color: 'error' })
  } finally {
    convertingId.value = null
  }
}

const { open: showHistory, target: historyTarget, openWith: openHistoryWith } = useTargetModal<Lead>()

const activities = ref<LeadActivity[]>([])
const loadingActivities = ref(false)
const followUpText = ref('')
const addingFollowUp = ref(false)

async function openHistoryFor(row: Lead) {
  openHistoryWith(row)
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

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.status, filter.source, filter.assignedToUserId], load)

const hasActiveFilter = computed(
  () =>
    search.value !== '' || filter.companyId !== undefined || filter.status !== undefined || filter.source !== undefined || filter.assignedToUserId !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.status = undefined
  filter.source = undefined
  filter.assignedToUserId = undefined
  load()
}
</script>

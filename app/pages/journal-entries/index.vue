<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Journal entries</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate()"> New journal entry </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search journal number" icon="i-lucide-search" class="w-56" />
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
        export-filename="journal-entries"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">
              {{ row.status === 'DRAFT' ? 'Edit' : 'View' }}
            </UButton>
            <UButton
              v-if="row.status === 'DRAFT'"
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="actingId === row.id"
              @click="onPost(row)"
            >
              Post
            </UButton>
            <UButton
              v-if="row.status === 'POSTED' && !row.reversedByJournalEntryId"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-undo-2"
              :loading="actingId === row.id"
              @click="onReverse(row)"
            >
              Reverse
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
            title="No journal entries match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-book-text" title="No journal entries yet" description="Create the first manual journal entry.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate()">New journal entry</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <!-- Create/edit/view modal -->
    <UModal v-model:open="showForm" :title="formTitle" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="loadingDetail" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
        <template v-else>
          <div v-if="detail" class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div v-if="detail.reversalOfJournalNumber">
              <dt class="text-gray-400">Reverses</dt>
              <dd class="text-gray-900 dark:text-white">{{ detail.reversalOfJournalNumber }}</dd>
            </div>
            <div v-if="detail.reversedByJournalNumber">
              <dt class="text-gray-400">Reversed by</dt>
              <dd class="text-gray-900 dark:text-white">{{ detail.reversedByJournalNumber }}</dd>
            </div>
            <div v-if="detail.postedBy">
              <dt class="text-gray-400">Posted by</dt>
              <dd class="text-gray-900 dark:text-white">{{ detail.postedBy }} · {{ formatDate(detail.postedAt!) }}</dd>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable || editingId !== null" class="w-full" />
            </UFormField>
            <UFormField label="Entry date" required>
              <UInput v-model="form.entryDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Description" class="sm:col-span-2">
              <UTextarea v-model="form.description" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>

          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Lines</p>
            <UButton v-if="formEditable" size="xs" variant="soft" icon="i-lucide-plus" @click="addLine">Add line</UButton>
          </div>

          <div class="space-y-2 mb-4">
            <div
              v-if="form.lines.length === 0"
              class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
            >
              No lines yet
            </div>
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <USelect
                v-model="line.accountId"
                :items="accountOptionsFor(form.companyId)"
                placeholder="Account"
                :disabled="!formEditable"
                class="col-span-5"
              />
              <UInput v-model.number="line.debit" type="number" min="0" step="0.01" placeholder="Debit" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model.number="line.credit" type="number" min="0" step="0.01" placeholder="Credit" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model="line.description" placeholder="Memo (optional)" :disabled="!formEditable" class="col-span-2" />
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
            </div>
          </div>

          <div class="flex justify-end gap-6 text-sm mb-1">
            <span class="text-gray-600 dark:text-gray-300">Total debit: {{ formatCurrency(formTotalDebit) }}</span>
            <span class="text-gray-600 dark:text-gray-300">Total credit: {{ formatCurrency(formTotalCredit) }}</span>
          </div>
          <div class="flex justify-end mb-4">
            <span v-if="formTotalDebit === formTotalCredit && formTotalDebit > 0" class="text-sm text-success flex items-center gap-1">
              <UIcon name="i-lucide-check-circle" class="w-4 h-4" /> Balanced
            </span>
            <span v-else class="text-sm text-error flex items-center gap-1">
              <UIcon name="i-lucide-triangle-alert" class="w-4 h-4" /> Not balanced
            </span>
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
      title="Delete journal entry"
      :description="`Delete journal entry '${confirmDelete?.journalNumber ?? ''}'? This cannot be undone.`"
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
import type { JournalEntry, JournalEntryPayload, JournalEntryStatus } from '~/composables/useJournalEntries'

definePageMeta({ middleware: 'admin' })

const { list, get, create, update, remove, post, reverse } = useJournalEntries()
const { list: listCompanies } = useCompanies()
const { list: listAccounts } = useAccounts()
const toast = useToast()

const rows = ref<JournalEntry[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const accounts = ref<{ id: number; accountCode: string; name: string; companyId: number; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, a] = await Promise.all([listCompanies({ size: 200 }), listAccounts({ size: 1000 })])
    companies.value = c.data
    accounts.value = a.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Posted', value: 'POSTED' }
]

function accountOptionsFor(companyId: number | undefined) {
  return accounts.value
    .filter((a) => a.active && (companyId === undefined || a.companyId === companyId))
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
}

const filter = reactive<{ companyId: number | undefined; status: JournalEntryStatus | undefined }>({ companyId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 10, searchFields: ['journalNumber'] })

const columns: ColumnDef<JournalEntry>[] = [
  { key: 'journalNumber', label: 'Journal number', sortable: true },
  { key: 'entryDate', label: 'Date', type: 'date' },
  { key: 'description', label: 'Description', value: (row) => row.description ?? '—' },
  { key: 'totalDebit', label: 'Amount', type: 'currency' },
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
  accountId: number | undefined
  debit: number | undefined
  credit: number | undefined
  description: string
}

const showForm = ref(false)
const editingId = ref<number | null>(null)
const editingStatus = ref<JournalEntryStatus | null>(null)
const loadingDetail = ref(false)
const saving = ref(false)
const formError = ref('')
const detail = ref<JournalEntry | null>(null)

const form = reactive<{
  companyId: number | undefined
  entryDate: string
  description: string
  lines: LineForm[]
}>({
  companyId: undefined,
  entryDate: new Date().toISOString().slice(0, 10),
  description: '',
  lines: []
})

const formEditable = computed(() => editingStatus.value === null || editingStatus.value === 'DRAFT')
const formTitle = computed(() => (editingId.value === null ? 'New journal entry' : formEditable.value ? 'Edit journal entry' : 'View journal entry'))
const formTotalDebit = computed(() => form.lines.reduce((sum, l) => sum + (l.debit || 0), 0))
const formTotalCredit = computed(() => form.lines.reduce((sum, l) => sum + (l.credit || 0), 0))

function addLine() {
  form.lines.push({ accountId: undefined, debit: undefined, credit: undefined, description: '' })
}

function resetForm() {
  form.companyId = activeCompanyOptions.value[0]?.value
  form.entryDate = new Date().toISOString().slice(0, 10)
  form.description = ''
  form.lines = []
  detail.value = null
}

function openCreate() {
  editingId.value = null
  editingStatus.value = null
  formError.value = ''
  resetForm()
  addLine()
  addLine()
  showForm.value = true
}

async function openView(row: JournalEntry) {
  editingId.value = row.id
  editingStatus.value = row.status
  formError.value = ''
  showForm.value = true
  loadingDetail.value = true
  try {
    const full = await get(row.id)
    detail.value = full
    form.companyId = full.companyId
    form.entryDate = full.entryDate
    form.description = full.description ?? ''
    form.lines = (full.lines ?? []).map((l) => ({ accountId: l.accountId, debit: l.debit || undefined, credit: l.credit || undefined, description: l.description ?? '' }))
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.entryDate) {
    formError.value = 'Please fill in company and entry date'
    return
  }
  if (form.lines.length < 2 || form.lines.some((l) => !l.accountId || (!l.debit && !l.credit) || (l.debit && l.credit))) {
    formError.value = 'Every line needs an account and exactly one of debit or credit'
    return
  }
  if (formTotalDebit.value !== formTotalCredit.value) {
    formError.value = 'Total debit must equal total credit'
    return
  }
  const payload: JournalEntryPayload = {
    companyId: form.companyId,
    entryDate: form.entryDate,
    description: form.description || undefined,
    lines: form.lines.map((l) => ({ accountId: l.accountId!, debit: l.debit || 0, credit: l.credit || 0, description: l.description || undefined }))
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      await create(payload)
      toast.add({ title: 'Journal entry created', color: 'success' })
    } else {
      await update(editingId.value, payload)
      toast.add({ title: 'Journal entry updated', color: 'success' })
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
async function onPost(row: JournalEntry) {
  actingId.value = row.id
  try {
    await post(row.id)
    toast.add({ title: 'Journal entry posted', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not post', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReverse(row: JournalEntry) {
  actingId.value = row.id
  try {
    const reversal = await reverse(row.id)
    toast.add({ title: 'Reversing entry created', description: reversal.journalNumber, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reverse', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<JournalEntry | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Journal entry deleted', color: 'success' })
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

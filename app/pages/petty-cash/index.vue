<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Petty cash</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">New entry</UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      icon="i-lucide-triangle-alert"
    />

    <div v-if="filter.companyId" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <StatTile label="Balance" :value="formatCurrency(summaryData?.balance ?? 0)" icon="i-lucide-wallet" color="primary" :loading="summaryLoading" />
      <StatTile
        label="Total topped up"
        :value="formatCurrency(summaryData?.toppedUp ?? 0)"
        icon="i-lucide-arrow-down-to-line"
        color="success"
        :loading="summaryLoading"
      />
      <StatTile
        label="Total expensed"
        :value="formatCurrency(summaryData?.expensed ?? 0)"
        icon="i-lucide-arrow-up-from-line"
        color="error"
        :loading="summaryLoading"
      />
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.type" :items="typeFilterOptions" placeholder="Type" class="w-40" />
        <UInput v-model="filter.entryDateFrom" type="date" placeholder="From" class="w-40" />
        <UInput v-model="filter.entryDateTo" type="date" placeholder="To" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="pagedRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="petty-cash"
        @refresh="load"
      >
        <template #type-data="{ row }">
          <UBadge :color="row.type === 'TOPUP' ? 'success' : 'error'" variant="subtle">
            {{ row.type === 'TOPUP' ? 'Top-up' : 'Expense' }}
          </UBadge>
        </template>
        <template #amount-data="{ row }">
          <span :class="row.type === 'TOPUP' ? 'text-success-700 dark:text-success-400' : 'text-error-600 dark:text-error-400'">
            {{ row.type === 'TOPUP' ? '+' : '-' }}{{ formatCurrency(row.amount) }}
          </span>
        </template>

        <template #empty-state>
          <EmptyState icon="i-lucide-wallet" title="No petty cash entries yet" description="Record a top-up or an expense to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New entry</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New petty cash entry" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Company" required>
            <USelect v-model="form.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onFormCompanyChanged" />
          </UFormField>
          <UFormField label="Type">
            <URadioGroup
              v-model="form.type"
              :items="[
                { label: 'Top-up (fund petty cash)', value: 'TOPUP' },
                { label: 'Expense (spend petty cash)', value: 'EXPENSE' }
              ]"
              @update:model-value="form.accountId = undefined"
            />
          </UFormField>
          <!-- Full width: the label changes with the type and the searchable
               account list needs the room. -->
          <UFormField :label="form.type === 'TOPUP' ? 'Funding source (cash/bank account)' : 'Expense account'" required class="sm:col-span-2">
            <USelectMenu v-model="form.accountId" :items="accountOptionsForType" value-key="value" placeholder="Select an account" class="w-full" />
          </UFormField>
          <UFormField label="Date" required>
            <UInput v-model="form.entryDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="form.amount" type="number" min="0.01" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Description" class="sm:col-span-2">
            <UTextarea v-model="form.description" :rows="2" class="w-full" />
          </UFormField>
        </div>

        <UAlert v-if="createError" color="error" variant="subtle" class="mt-4" :title="createError" />

        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showCreate = false">Cancel</UButton>
          <UButton :loading="creating" @click="onCreateSubmit">Save</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PettyCashEntry, PettyCashEntryType, PettyCashSummary } from '~/composables/usePettyCash'

definePageMeta({ middleware: 'admin' })

const { list, create, summary } = usePettyCash()
const { list: listCompanies } = useCompanies()
const { list: listAccounts } = useAccounts()
const toast = useToast()

const rows = ref<PettyCashEntry[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const accounts = ref<{ id: number; accountCode: string; name: string; accountType: string; companyId: number; active: boolean }[]>([])
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
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...activeCompanyOptions.value])
const typeFilterOptions = [
  { label: 'All types', value: undefined },
  { label: 'Top-up', value: 'TOPUP' },
  { label: 'Expense', value: 'EXPENSE' }
]

const filter = reactive<{
  companyId: number | undefined
  type: PettyCashEntryType | undefined
  entryDateFrom: string | undefined
  entryDateTo: string | undefined
}>({ companyId: undefined, type: undefined, entryDateFrom: undefined, entryDateTo: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows } = useClientTable(rows, { pageSize: 10 })

const columns: ColumnDef<PettyCashEntry>[] = [
  { key: 'entryNumber', label: 'Entry number', sortable: true },
  { key: 'type', label: 'Type' },
  { key: 'entryDate', label: 'Date', type: 'date' },
  { key: 'accountLabel', label: 'Account', value: (row) => row.accountLabel ?? '—' },
  { key: 'amount', label: 'Amount' },
  { key: 'description', label: 'Description', value: (row) => row.description ?? '—' },
  { key: 'createdBy', label: 'Created by', value: (row) => row.createdBy ?? '—' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      type: filter.type,
      entryDateFrom: filter.entryDateFrom,
      entryDateTo: filter.entryDateTo,
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

const summaryData = ref<PettyCashSummary | null>(null)
const summaryLoading = ref(false)
async function loadSummary() {
  if (!filter.companyId) {
    summaryData.value = null
    return
  }
  summaryLoading.value = true
  try {
    summaryData.value = await summary(filter.companyId)
  } catch {
    summaryData.value = null
  } finally {
    summaryLoading.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  filter.companyId = activeCompanyOptions.value[0]?.value
  await Promise.all([load(), loadSummary()])
})
watch(sort, load)
watch(
  () => [filter.companyId, filter.type, filter.entryDateFrom, filter.entryDateTo],
  () => {
    load()
    loadSummary()
  }
)

const hasActiveFilter = computed(() => filter.type !== undefined || filter.entryDateFrom !== undefined || filter.entryDateTo !== undefined)
function clearFilters() {
  filter.type = undefined
  filter.entryDateFrom = undefined
  filter.entryDateTo = undefined
}

// ── Create ───────────────────────────────────────────────────────────────

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const form = reactive<{
  companyId: number | undefined
  type: PettyCashEntryType
  accountId: number | undefined
  entryDate: string
  amount: number | undefined
  description: string
}>({
  companyId: undefined,
  type: 'TOPUP',
  accountId: undefined,
  entryDate: new Date().toISOString().slice(0, 10),
  amount: undefined,
  description: ''
})

const accountOptionsForType = computed(() => {
  const wantType = form.type === 'TOPUP' ? 'ASSET' : 'EXPENSE'
  return accounts.value
    .filter((a) => a.active && a.companyId === form.companyId && a.accountType === wantType)
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
})

function onFormCompanyChanged() {
  form.accountId = undefined
}

function openCreate() {
  form.companyId = filter.companyId ?? activeCompanyOptions.value[0]?.value
  form.type = 'TOPUP'
  form.accountId = undefined
  form.entryDate = new Date().toISOString().slice(0, 10)
  form.amount = undefined
  form.description = ''
  createError.value = ''
  showCreate.value = true
}

async function onCreateSubmit() {
  createError.value = ''
  if (!form.companyId || !form.accountId || !form.entryDate || !form.amount) {
    createError.value = 'Please fill in every required field'
    return
  }
  creating.value = true
  try {
    await create({
      companyId: form.companyId,
      type: form.type,
      entryDate: form.entryDate,
      accountId: form.accountId,
      amount: form.amount,
      description: form.description || undefined
    })
    toast.add({ title: 'Petty cash entry recorded', color: 'success' })
    showCreate.value = false
    await Promise.all([load(), loadSummary()])
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>

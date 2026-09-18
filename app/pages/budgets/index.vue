<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New budget </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.fiscalYearId" :items="fiscalYearFilterOptionsFor(filter.companyId)" placeholder="Fiscal year" class="w-44" />
        <USelect v-model="filter.costCenterId" :items="costCenterFilterOptionsFor(filter.companyId)" placeholder="Cost center" class="w-44" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState icon="i-lucide-calculator" title="No budgets entered yet" description="Enter a budget amount per account and period.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New budget</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showForm" :title="formTitle" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Company" required>
            <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="editingId !== null" class="w-full" @update:model-value="onCompanyChanged" />
          </UFormField>
          <UFormField label="Fiscal year" required>
            <USelect
              v-model="form.fiscalYearId"
              :items="fiscalYearOptionsFor(form.companyId)"
              :disabled="editingId !== null"
              class="w-full"
              @update:model-value="onFiscalYearChanged"
            />
          </UFormField>
          <UFormField label="Accounting period" required>
            <USelect v-model="form.accountingPeriodId" :items="periodOptionsFor(form.fiscalYearId)" :disabled="editingId !== null" class="w-full" />
          </UFormField>
          <UFormField label="Account" required>
            <USelectMenu
              v-model="form.accountId"
              :items="accountOptionsFor(form.companyId)"
              value-key="value"
              :disabled="editingId !== null"
              placeholder="Search accounts…"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Cost center" hint="Optional">
            <USelect v-model="form.costCenterId" :items="costCenterOptionsFor(form.companyId)" :disabled="editingId !== null" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required>
            <UInput v-model.number="form.amount" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Notes">
            <UTextarea v-model="form.notes" :rows="2" class="w-full" />
          </UFormField>
        </div>

        <UAlert v-if="formError" color="error" variant="subtle" class="mt-4" :title="formError" />

        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showForm = false">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">Save</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete budget"
      :description="`Delete this budget for '${confirmDelete?.accountName ?? ''}'? This cannot be undone.`"
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
import type { Budget } from '~/composables/useBudgets'

definePageMeta({ middleware: 'admin' })

const { list, upsert, remove } = useBudgets()
const { list: listCompanies } = useCompanies()
const { list: listFiscalYears } = useFiscalYears()
const { list: listPeriods } = useAccountingPeriods()
const { list: listCostCenters } = useCostCenters()
const { list: listAccounts } = useAccounts()
const toast = useToast()

const rows = ref<Budget[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const fiscalYears = ref<{ id: number; name: string; companyId: number }[]>([])
const periods = ref<{ id: number; fiscalYearId: number; name: string }[]>([])
const costCenters = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const accounts = ref<{ id: number; accountCode: string; name: string; companyId: number; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, fy, p, cc, a] = await Promise.all([
      listCompanies({ size: 200 }),
      listFiscalYears({ size: 200 }),
      listPeriods({ size: 1000 }),
      listCostCenters({ size: 200 }),
      listAccounts({ size: 1000 })
    ])
    companies.value = c.data
    fiscalYears.value = fy.data
    periods.value = p.data
    costCenters.value = cc.data
    accounts.value = a.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...activeCompanyOptions.value])

function fiscalYearOptionsFor(companyId: number | undefined) {
  return fiscalYears.value.filter((fy) => companyId === undefined || fy.companyId === companyId).map((fy) => ({ label: fy.name, value: fy.id }))
}
function fiscalYearFilterOptionsFor(companyId: number | undefined) {
  return [{ label: 'All fiscal years', value: undefined }, ...fiscalYearOptionsFor(companyId)]
}
function periodOptionsFor(fiscalYearId: number | undefined) {
  if (!fiscalYearId) return []
  return periods.value.filter((p) => p.fiscalYearId === fiscalYearId).map((p) => ({ label: p.name, value: p.id }))
}
function costCenterOptionsFor(companyId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...costCenters.value.filter((cc) => cc.active && (companyId === undefined || cc.companyId === companyId)).map((cc) => ({ label: cc.name, value: cc.id }))
  ]
}
function costCenterFilterOptionsFor(companyId: number | undefined) {
  return [
    { label: 'All cost centers', value: undefined },
    ...costCenters.value.filter((cc) => cc.active && (companyId === undefined || cc.companyId === companyId)).map((cc) => ({ label: cc.name, value: cc.id }))
  ]
}
function accountOptionsFor(companyId: number | undefined) {
  return accounts.value
    .filter((a) => a.active && (companyId === undefined || a.companyId === companyId))
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
}

const filter = reactive<{ companyId: number | undefined; fiscalYearId: number | undefined; costCenterId: number | undefined }>({
  companyId: undefined,
  fiscalYearId: undefined,
  costCenterId: undefined
})

const { page, pageSize, total, rows: pagedRows } = useClientTable(rows, { pageSize: 10 })

const columns: ColumnDef<Budget>[] = [
  { key: 'accountName', label: 'Account', value: (row) => `${row.accountCode ?? ''} — ${row.accountName ?? ''}` },
  { key: 'costCenterName', label: 'Cost center', value: (row) => row.costCenterName ?? '—' },
  { key: 'periodName', label: 'Period', value: (row) => row.periodName ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'notes', label: 'Notes', value: (row) => row.notes ?? '—' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      fiscalYearId: filter.fiscalYearId,
      costCenterId: filter.costCenterId,
      size: 200
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(() => [filter.companyId, filter.fiscalYearId, filter.costCenterId], load)

const hasActiveFilter = computed(() => filter.companyId !== undefined || filter.fiscalYearId !== undefined || filter.costCenterId !== undefined)
function clearFilters() {
  filter.companyId = undefined
  filter.fiscalYearId = undefined
  filter.costCenterId = undefined
}

const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)
const form = reactive<{
  companyId: number | undefined
  fiscalYearId: number | undefined
  accountingPeriodId: number | undefined
  accountId: number | undefined
  costCenterId: number | undefined
  amount: number | undefined
  notes: string
}>({
  companyId: undefined,
  fiscalYearId: undefined,
  accountingPeriodId: undefined,
  accountId: undefined,
  costCenterId: undefined,
  amount: undefined,
  notes: ''
})

const formTitle = computed(() => (editingId.value !== null ? 'Edit budget' : 'New budget'))

function onCompanyChanged() {
  form.fiscalYearId = undefined
  form.accountingPeriodId = undefined
  form.accountId = undefined
  form.costCenterId = undefined
}
function onFiscalYearChanged() {
  form.accountingPeriodId = undefined
}

function openCreate() {
  editingId.value = null
  form.companyId = filter.companyId ?? activeCompanyOptions.value[0]?.value
  form.fiscalYearId = undefined
  form.accountingPeriodId = undefined
  form.accountId = undefined
  form.costCenterId = undefined
  form.amount = undefined
  form.notes = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(row: Budget) {
  editingId.value = row.id
  const period = periods.value.find((p) => p.id === row.accountingPeriodId)
  form.companyId = row.companyId
  form.fiscalYearId = period?.fiscalYearId
  form.accountingPeriodId = row.accountingPeriodId
  form.accountId = row.accountId
  form.costCenterId = row.costCenterId ?? undefined
  form.amount = row.amount
  form.notes = row.notes ?? ''
  formError.value = ''
  showForm.value = true
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.accountingPeriodId || !form.accountId || form.amount === undefined) {
    formError.value = 'Please fill in company, period, account, and amount'
    return
  }
  saving.value = true
  try {
    await upsert({
      companyId: form.companyId,
      accountId: form.accountId,
      costCenterId: form.costCenterId,
      accountingPeriodId: form.accountingPeriodId,
      amount: form.amount,
      notes: form.notes || undefined
    })
    toast.add({ title: 'Budget saved', color: 'success' })
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<Budget | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Budget deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

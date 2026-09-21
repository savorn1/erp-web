<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Fixed assets</h1>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-calculator" :disabled="activeCompanyOptions.length === 0" @click="openRunDepreciation">
          Run depreciation
        </UButton>
        <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate">New asset</UButton>
      </div>
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
        <UInput v-model="search" placeholder="Search asset code" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-48" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-44" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton v-if="row.status !== 'DISPOSED'" size="xs" color="warning" variant="soft" icon="i-lucide-package-x" @click="openDispose(row)">
              Dispose
            </UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No fixed assets match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-landmark" title="No fixed assets yet" description="Register the first asset to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New asset</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New fixed asset">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="formFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit asset '${editingAsset?.name ?? ''}'`">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="formFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showDispose" :title="`Dispose asset '${disposingAsset?.name ?? ''}'`">
      <template #body>
        <DynamicForm
          v-model="disposeForm"
          :fields="disposeFields"
          :loading="disposing"
          :error="disposeError"
          submit-label="Dispose"
          cancelable
          @submit="onDispose"
          @cancel="showDispose = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showRunDepreciation" title="Run depreciation">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Company" required>
            <USelect v-model="runForm.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onRunCompanyChanged" />
          </UFormField>
          <UFormField label="Accounting period" required>
            <USelect v-model="runForm.accountingPeriodId" :items="periodOptions" placeholder="Select a period" class="w-full" />
          </UFormField>
          <UAlert v-if="runError" color="error" variant="subtle" :title="runError" />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showRunDepreciation = false">Cancel</UButton>
            <UButton :loading="running" :disabled="!runForm.companyId || !runForm.accountingPeriodId" @click="onRunDepreciation">Run</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete fixed asset"
      :description="`Delete asset '${confirmDelete?.name ?? ''}'? This reverses its acquisition entry and cannot be undone.`"
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
import type { FixedAsset, FixedAssetPayload, FixedAssetStatus } from '~/composables/useFixedAssets'
import type { AccountingPeriod } from '~/composables/useAccountingPeriods'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove, dispose, runDepreciation } = useFixedAssets()
const { list: listCompanies } = useCompanies()
const { list: listAccountingPeriods } = useAccountingPeriods()
const toast = useToast()

const rows = ref<FixedAsset[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)
async function loadLookups() {
  loadingLookups.value = true
  try {
    companies.value = (await listCompanies({ size: 200 })).data
  } finally {
    loadingLookups.value = false
  }
}
const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])

const filter = reactive<{ companyId: number | undefined; status: FixedAssetStatus | undefined }>({ companyId: undefined, status: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Fully depreciated', value: 'FULLY_DEPRECIATED' },
  { label: 'Disposed', value: 'DISPOSED' }
]
const depreciationMethodOptions = [
  { label: 'Straight line', value: 'STRAIGHT_LINE' },
  { label: 'Declining balance', value: 'DECLINING_BALANCE' }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 10, searchFields: ['assetCode', 'name'] })

const columns: ColumnDef<FixedAsset>[] = [
  { key: 'assetCode', label: 'Asset code', sortable: true },
  { key: 'name' },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'category', value: (row) => row.category ?? '—' },
  { key: 'acquisitionCost', label: 'Cost', type: 'currency' },
  { key: 'accumulatedDepreciation', label: 'Accum. depreciation', type: 'currency' },
  { key: 'bookValue', label: 'Book value', type: 'currency' },
  {
    key: 'status',
    type: 'badge',
    color: (row) => (row.status === 'ACTIVE' ? 'success' : row.status === 'DISPOSED' ? 'neutral' : 'warning')
  },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ companyId: filter.companyId, status: filter.status, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const formFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'assetCode', label: 'Asset code', required: true, hint: 'e.g. FA-000123.' },
  { name: 'name', required: true, hint: 'e.g. Delivery van.' },
  { name: 'description', type: 'textarea', wrapper: 'full' },
  { name: 'category', hint: 'e.g. Vehicles, IT Equipment.' },
  { name: 'acquisitionDate', label: 'Acquisition date', type: 'date', required: true },
  { name: 'acquisitionCost', label: 'Acquisition cost', type: 'currency', required: true },
  { name: 'salvageValue', label: 'Salvage value', type: 'currency' },
  { name: 'usefulLifeMonths', label: 'Useful life (months)', type: 'number', required: true, min: 1 },
  { name: 'depreciationMethod', label: 'Depreciation method', type: 'select', required: true, options: depreciationMethodOptions },
  {
    name: 'decliningBalanceRate',
    label: 'Declining balance rate (% per year)',
    type: 'number',
    hint: 'Only used when method is Declining balance — e.g. 40 for double-declining on a 5-year life.'
  }
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
  editingRow: editingAsset,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<FixedAsset, FixedAssetPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Fixed asset',
    createDefaults: () => ({ salvageValue: 0, depreciationMethod: 'STRAIGHT_LINE' }),
    toForm: (row) => ({
      companyId: row.companyId,
      assetCode: row.assetCode,
      name: row.name,
      description: row.description ?? '',
      category: row.category ?? '',
      acquisitionDate: row.acquisitionDate,
      acquisitionCost: row.acquisitionCost,
      salvageValue: row.salvageValue,
      usefulLifeMonths: row.usefulLifeMonths,
      depreciationMethod: row.depreciationMethod,
      decliningBalanceRate: row.decliningBalanceRate ?? undefined
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      assetCode: values.assetCode,
      name: values.name,
      description: values.description || undefined,
      category: values.category || undefined,
      acquisitionDate: values.acquisitionDate,
      acquisitionCost: values.acquisitionCost,
      salvageValue: values.salvageValue ?? 0,
      usefulLifeMonths: values.usefulLifeMonths,
      depreciationMethod: values.depreciationMethod,
      decliningBalanceRate: values.decliningBalanceRate || undefined
    })
  }
)

// ── Dispose ──────────────────────────────────────────────────────────────
const showDispose = ref(false)
const disposingAsset = ref<FixedAsset | null>(null)
const disposeForm = ref<Record<string, any>>({})
const disposing = ref(false)
const disposeError = ref('')
const disposeFields: FieldDef[] = [
  { name: 'disposalDate', label: 'Disposal date', type: 'date', required: true },
  { name: 'proceeds', label: 'Proceeds received', type: 'currency', required: true }
]

function openDispose(row: FixedAsset) {
  disposingAsset.value = row
  disposeForm.value = { disposalDate: new Date().toISOString().slice(0, 10), proceeds: undefined }
  disposeError.value = ''
  showDispose.value = true
}

async function onDispose(values: Record<string, any>) {
  if (!disposingAsset.value) return
  disposing.value = true
  disposeError.value = ''
  try {
    await dispose(disposingAsset.value.id, { disposalDate: values.disposalDate, proceeds: values.proceeds })
    toast.add({ title: 'Fixed asset disposed', color: 'success' })
    showDispose.value = false
    await load()
  } catch (err) {
    disposeError.value = apiErrorMessage(err)
  } finally {
    disposing.value = false
  }
}

// ── Run depreciation ─────────────────────────────────────────────────────
const showRunDepreciation = ref(false)
const runForm = reactive<{ companyId: number | undefined; accountingPeriodId: number | undefined }>({
  companyId: undefined,
  accountingPeriodId: undefined
})
const running = ref(false)
const runError = ref('')
const periods = ref<AccountingPeriod[]>([])
const periodOptions = computed(() => periods.value.map((p) => ({ label: p.name, value: p.id })))

async function onRunCompanyChanged(companyId: number | undefined) {
  runForm.accountingPeriodId = undefined
  periods.value = companyId ? (await listAccountingPeriods({ companyId, status: 'OPEN', size: 200 })).data : []
}

async function openRunDepreciation() {
  runForm.companyId = activeCompanyOptions.value[0]?.value
  runError.value = ''
  showRunDepreciation.value = true
  await onRunCompanyChanged(runForm.companyId)
}

async function onRunDepreciation() {
  if (!runForm.companyId || !runForm.accountingPeriodId) return
  running.value = true
  runError.value = ''
  try {
    const result = await runDepreciation(runForm.companyId, runForm.accountingPeriodId)
    toast.add({
      title: result.assetCount > 0 ? `Depreciation posted for ${result.assetCount} asset(s)` : 'No assets needed depreciation this period',
      description: result.journalNumber ? `Journal entry ${result.journalNumber}` : undefined,
      color: 'success'
    })
    showRunDepreciation.value = false
    await load()
  } catch (err) {
    runError.value = apiErrorMessage(err)
  } finally {
    running.value = false
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

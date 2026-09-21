<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Fiscal years</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New fiscal year </UButton>
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
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-48" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2 flex-wrap">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/fiscal-years/${row.id}`">Periods</UButton>
            <UButton v-if="row.status === 'OPEN'" size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton
              v-if="row.status === 'OPEN'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-lock"
              :loading="actingId === row.id"
              @click="onClose(row)"
            >
              Close
            </UButton>
            <UButton v-else size="xs" color="success" variant="soft" icon="i-lucide-lock-open" :loading="actingId === row.id" @click="onReopen(row)">
              Reopen
            </UButton>
            <UButton v-if="row.status === 'OPEN'" size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row"> Delete </UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState v-if="hasActiveFilter" icon="i-lucide-search-x" title="No fiscal years match your filters">
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-calendar" title="No fiscal years yet" description="Create the first one to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New fiscal year</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New fiscal year">
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

    <UModal v-model:open="showEdit" :title="`Edit fiscal year '${editingYear?.name ?? ''}'`">
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

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete fiscal year"
      :description="`Delete fiscal year '${confirmDelete?.name ?? ''}' and all its periods? This cannot be undone.`"
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
import type { FiscalYear, FiscalYearPayload, FiscalYearStatus } from '~/composables/useFiscalYears'

definePageMeta({ middleware: 'admin' })

const { list, create, update, close, reopen, remove } = useFiscalYears()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<FiscalYear[]>([])
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

const filter = reactive<{ companyId: number | undefined; status: FiscalYearStatus | undefined }>({ companyId: undefined, status: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' }
]

const { page, pageSize, total, rows: pagedRows } = useClientTable(rows, { pageSize: 10 })

const columns: ColumnDef<FiscalYear>[] = [
  { key: 'name', label: 'Name' },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'startDate', label: 'Start', type: 'date' },
  { key: 'endDate', label: 'End', type: 'date' },
  { key: 'periodCount', label: 'Periods' },
  { key: 'openPeriodCount', label: 'Open periods' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ companyId: filter.companyId, status: filter.status, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const createFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'name', required: true, hint: 'e.g. FY2026' },
  { name: 'startDate', type: 'date', required: true },
  { name: 'endDate', type: 'date', required: true },
  { name: 'generateMonthlyPeriods', label: 'Generate monthly periods', type: 'switch', onLabel: 'Yes', offLabel: 'No', default: true }
])
const editFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value, disabled: true },
  { name: 'name', required: true },
  { name: 'startDate', type: 'date', required: true },
  { name: 'endDate', type: 'date', required: true }
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
  editingRow: editingYear,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<FiscalYear, FiscalYearPayload>(
  {
    create: (payload) => create(payload),
    update: (row, payload) => update(row.id, payload),
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Fiscal year',
    createDefaults: () => ({ companyId: activeCompanyOptions.value[0]?.value, generateMonthlyPeriods: true }),
    toForm: (row) => ({ companyId: row.companyId, name: row.name, startDate: row.startDate, endDate: row.endDate }),
    toPayload: (values) => ({
      companyId: values.companyId,
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      generateMonthlyPeriods: values.generateMonthlyPeriods ?? true
    })
  }
)

const actingId = ref<number | null>(null)
async function onClose(row: FiscalYear) {
  actingId.value = row.id
  try {
    await close(row.id)
    toast.add({ title: 'Fiscal year closed', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not close', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onReopen(row: FiscalYear) {
  actingId.value = row.id
  try {
    await reopen(row.id)
    toast.add({ title: 'Fiscal year reopened', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not reopen', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(() => [filter.companyId, filter.status], load)

const hasActiveFilter = computed(() => filter.companyId !== undefined || filter.status !== undefined)
function clearFilters() {
  filter.companyId = undefined
  filter.status = undefined
  load()
}
</script>

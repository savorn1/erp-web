<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Machines</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New machine </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company and work center first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-48" />
        <USelect v-model="filter.workCenterId" :items="workCenterFilterOptions" placeholder="Work center" class="w-48" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No machines match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-cog" title="No machines yet" description="Create the first machine to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New machine</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showCreate" title="New machine" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="createForm"
          :fields="machineFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showEdit" :title="`Edit machine '${editingMachine?.name ?? ''}'`" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <DynamicForm
          v-model="editForm"
          :fields="editMachineFields"
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
      title="Delete machine"
      :description="`Delete machine '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { Machine, MachinePayload, MachineStatus } from '~/composables/useMachines'

type MachineEditPayload = Omit<MachinePayload, 'companyId'> & { status?: MachineStatus }

definePageMeta({ middleware: 'admin' })

const { list, create, update, updateStatus, remove } = useMachines()
const { list: listCompanies } = useCompanies()
const { list: listWorkCenters } = useWorkCenters()
const toast = useToast()

const rows = ref<Machine[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const workCenters = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, w] = await Promise.all([listCompanies({ size: 200 }), listWorkCenters({ size: 200 })])
    companies.value = c.data
    workCenters.value = w.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
function workCenterOptionsFor(companyId: number | undefined) {
  return workCenters.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
const workCenterFilterOptions = computed(() => [{ label: 'All work centers', value: undefined }, ...workCenterOptionsFor(undefined)])

const filter = reactive<{ companyId: number | undefined; workCenterId: number | undefined; status: MachineStatus | undefined }>({
  companyId: undefined,
  workCenterId: undefined,
  status: undefined
})
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Operational', value: 'OPERATIONAL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Down', value: 'DOWN' }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<Machine>[] = [
  { key: 'name', sortable: true },
  { key: 'workCenterName', label: 'Work center', value: (row) => row.workCenterName ?? '—' },
  { key: 'costPerHour', label: 'Cost/hr', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      workCenterId: filter.workCenterId,
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

const machineFields = computed<FieldDef[]>(() => [
  { name: 'companyId', label: 'Company', type: 'select', required: true, options: activeCompanyOptions.value },
  { name: 'workCenterId', label: 'Work center', type: 'select', required: true, options: workCenterOptionsFor(createForm.value.companyId) },
  { name: 'name', required: true },
  { name: 'code' },
  { name: 'costPerHour', label: 'Cost per hour', type: 'number', hint: 'Optional — feeds the Machine Cost report.' }
])
const editMachineFields = computed<FieldDef[]>(() => [
  { name: 'workCenterId', label: 'Work center', type: 'select', required: true, options: workCenterOptionsFor(editingMachine.value?.companyId) },
  { name: 'name', required: true },
  { name: 'code' },
  { name: 'costPerHour', label: 'Cost per hour', type: 'number', hint: 'Optional — feeds the Machine Cost report.' },
  { name: 'status', type: 'select', required: true, options: statusFilterOptions.filter((o) => o.value !== undefined) }
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
  editingRow: editingMachine,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<Machine, MachinePayload, MachineEditPayload>(
  {
    create: (payload) => create(payload),
    update: async (row, payload) => {
      const updated = await update(row.id, payload)
      if (payload.status && payload.status !== row.status) {
        return await updateStatus(row.id, payload.status)
      }
      return updated
    },
    remove: (row) => remove(row.id)
  },
  load,
  {
    entityName: 'Machine',
    createDefaults: () => ({}),
    toForm: (row) => ({
      workCenterId: row.workCenterId,
      name: row.name,
      code: row.code ?? '',
      costPerHour: row.costPerHour ?? undefined,
      status: row.status
    }),
    toPayload: (values) => ({
      companyId: values.companyId,
      workCenterId: values.workCenterId,
      name: values.name,
      code: values.code || undefined,
      costPerHour: values.costPerHour || undefined
    }),
    toEditPayload: (values) => ({
      workCenterId: values.workCenterId,
      name: values.name,
      code: values.code || undefined,
      costPerHour: values.costPerHour || undefined,
      status: values.status
    })
  }
)

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.workCenterId, filter.status], load)

const hasActiveFilter = computed(
  () => search.value !== '' || filter.companyId !== undefined || filter.workCenterId !== undefined || filter.status !== undefined
)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.workCenterId = undefined
  filter.status = undefined
  load()
}
</script>

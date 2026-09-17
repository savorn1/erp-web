<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Audit log</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
      Approvals, user/role changes, and logins — not every action in the system. See each report's own history for everyday activity.
    </p>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="filter.companyId" :items="companyOptions" placeholder="All companies" class="w-48" />
        </UFormField>
        <UFormField label="Module">
          <USelect v-model="filter.module" :items="moduleOptions" placeholder="All modules" class="w-52" />
        </UFormField>
        <UFormField label="Action">
          <USelect v-model="filter.action" :items="actionOptions" placeholder="All actions" class="w-36" />
        </UFormField>
        <UFormField label="User">
          <UInput v-model="search" placeholder="Username" class="w-40" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="filter.dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="filter.dateTo" type="date" class="w-40" />
        </UFormField>
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #empty-state>
          <EmptyState icon="i-lucide-history" title="No audit entries yet" />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { AuditLogAction, AuditLogEntry } from '~/composables/useAuditLogs'

definePageMeta({ middleware: 'admin' })

const { list } = useAuditLogs()
const { list: listCompanies } = useCompanies()
const { catalog } = useModuleCatalog()

const rows = ref<AuditLogEntry[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string }[]>([])
const companyOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])

const moduleOptions = computed(() => [
  { label: 'All modules', value: undefined },
  ...catalog.flatMap((group) => group.modules).map((m) => ({ label: m.label, value: m.key }))
])

const actionOptions: { label: string; value: AuditLogAction | undefined }[] = [
  { label: 'All actions', value: undefined },
  { label: 'Approve', value: 'APPROVE' },
  { label: 'Write', value: 'WRITE' },
  { label: 'Login', value: 'LOGIN' },
  { label: 'Logout', value: 'LOGOUT' }
]

const filter = reactive<{
  companyId: number | undefined
  module: string | undefined
  action: AuditLogAction | undefined
  dateFrom: string
  dateTo: string
}>({
  companyId: undefined,
  module: undefined,
  action: undefined,
  dateFrom: '',
  dateTo: ''
})

const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 20, searchFields: ['actingUsername'] })

const columns: ColumnDef<AuditLogEntry>[] = [
  { key: 'createdAt', label: 'When', type: 'datetime' },
  { key: 'actingUsername', label: 'User', value: (row) => row.actingUsername ?? '—' },
  {
    key: 'action',
    label: 'Action',
    type: 'badge',
    color: (row) => (row.action === 'APPROVE' ? 'success' : row.action === 'LOGIN' ? 'info' : row.action === 'LOGOUT' ? 'neutral' : 'warning')
  },
  { key: 'module', label: 'Module', value: (row) => row.module ?? '—' },
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'path', label: 'Path', value: (row) => row.path ?? '—' },
  { key: 'sourceId', label: 'Record #', value: (row) => (row.sourceId != null ? String(row.sourceId) : '—') },
  {
    key: 'statusCode',
    label: 'Status',
    type: 'badge',
    value: (row) => (row.statusCode != null ? String(row.statusCode) : '—'),
    color: (row) => (row.statusCode == null ? 'neutral' : row.statusCode < 300 ? 'success' : row.statusCode < 500 ? 'warning' : 'error')
  }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      module: filter.module,
      action: filter.action,
      dateFrom: filter.dateFrom || undefined,
      dateTo: filter.dateTo || undefined,
      sortBy: 'id',
      sortOrder: 'desc',
      size: 500
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const hasActiveFilter = computed(
  () => !!filter.companyId || !!filter.module || !!filter.action || !!search.value || !!filter.dateFrom || !!filter.dateTo
)
function clearFilters() {
  filter.companyId = undefined
  filter.module = undefined
  filter.action = undefined
  search.value = ''
  filter.dateFrom = ''
  filter.dateTo = ''
  load()
}

onMounted(async () => {
  const c = await listCompanies({ size: 200 })
  companies.value = c.data
  await load()
})
watch(() => [filter.companyId, filter.module, filter.action, filter.dateFrom, filter.dateTo], load)
</script>

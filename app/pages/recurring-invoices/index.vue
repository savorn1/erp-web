<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Recurring invoices</h1>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-play" :disabled="activeCompanyOptions.length === 0" @click="openGenerate">
          Generate due invoices
        </UButton>
        <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/recurring-invoices/new"> New template </UButton>
      </div>
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
        <USelect v-model="filter.customerId" :items="customerFilterOptions" placeholder="Customer" class="w-44" />
        <USelect v-model="filter.active" :items="activeFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #active-data="{ row }">
          <UBadge :color="row.active ? 'success' : 'neutral'" variant="subtle">{{ row.active ? 'Active' : 'Paused' }}</UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" :to="`/recurring-invoices/${row.id}`">Edit</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState icon="i-lucide-repeat" title="No recurring invoice templates yet" description="Create one to start billing a customer on a schedule.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/recurring-invoices/new">New template</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showGenerate" title="Generate due invoices" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div v-if="!generateResult" class="space-y-4">
          <UFormField label="Company" required>
            <USelect v-model="generateCompanyId" :items="activeCompanyOptions" class="w-full" />
          </UFormField>
          <p class="text-xs text-gray-400">Generates a Sales Order and Invoice for every active template whose next run date has arrived.</p>
        </div>

        <div v-else class="space-y-3">
          <p class="text-sm">
            <span class="font-semibold text-success">{{ generateResult.successCount }} generated</span>
            <span v-if="generateResult.failureCount > 0" class="text-error"> · {{ generateResult.failureCount }} failed</span>
            <span class="text-gray-400"> (of {{ generateResult.processedCount }} due)</span>
          </p>
          <ul v-if="generateResult.results.length > 0" class="space-y-1 max-h-64 overflow-y-auto">
            <li
              v-for="r in generateResult.results"
              :key="r.templateId"
              class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5"
              :class="r.success ? 'text-success' : 'text-error'"
            >
              {{ r.templateName }}: {{ r.success ? `Invoice ${r.invoiceNumber} created` : r.errorMessage }}
            </li>
          </ul>
        </div>

        <UAlert v-if="generateError" color="error" variant="subtle" class="mt-4" :title="generateError" />

        <div class="flex justify-end gap-2 mt-4">
          <UButton v-if="!generateResult" color="neutral" variant="ghost" @click="showGenerate = false">Cancel</UButton>
          <UButton v-if="!generateResult" :loading="generating" @click="onGenerate">Generate</UButton>
          <UButton v-else @click="onGenerateDone">Done</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete recurring invoice template"
      :description="`Delete '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { GenerateDueInvoicesResponse, RecurringInvoiceTemplate } from '~/composables/useRecurringInvoices'

definePageMeta({ middleware: 'admin' })

const { list, remove, generateDue } = useRecurringInvoices()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const toast = useToast()

const rows = ref<RecurringInvoiceTemplate[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const [c, cu] = await Promise.all([listCompanies({ size: 200 }), listCustomers({ size: 200 })])
    companies.value = c.data
    customers.value = cu.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...activeCompanyOptions.value])
const customerFilterOptions = computed(() => [{ label: 'All customers', value: undefined }, ...customers.value.map((c) => ({ label: c.name, value: c.id }))])
const activeFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Paused', value: false }
]

const filter = reactive<{ companyId: number | undefined; customerId: number | undefined; active: boolean | undefined }>({
  companyId: undefined,
  customerId: undefined,
  active: undefined
})

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows } = useClientTable(rows, { pageSize: 10 })

const columns: ColumnDef<RecurringInvoiceTemplate>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'nextRunDate', label: 'Next run', type: 'date' },
  { key: 'lastGeneratedDate', label: 'Last generated', value: (row) => (row.lastGeneratedDate ? row.lastGeneratedDate : '—') },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      customerId: filter.customerId,
      active: filter.active,
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

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.customerId, filter.active], load)

const hasActiveFilter = computed(() => filter.companyId !== undefined || filter.customerId !== undefined || filter.active !== undefined)
function clearFilters() {
  filter.companyId = undefined
  filter.customerId = undefined
  filter.active = undefined
}

const deleting = ref(false)
const confirmDelete = ref<RecurringInvoiceTemplate | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Recurring invoice template deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

const showGenerate = ref(false)
const generateCompanyId = ref<number | undefined>(undefined)
const generating = ref(false)
const generateError = ref('')
const generateResult = ref<GenerateDueInvoicesResponse | null>(null)

function openGenerate() {
  generateCompanyId.value = filter.companyId ?? activeCompanyOptions.value[0]?.value
  generateError.value = ''
  generateResult.value = null
  showGenerate.value = true
}

async function onGenerate() {
  if (!generateCompanyId.value) return
  generateError.value = ''
  generating.value = true
  try {
    generateResult.value = await generateDue(generateCompanyId.value)
  } catch (err) {
    generateError.value = apiErrorMessage(err)
  } finally {
    generating.value = false
  }
}

function onGenerateDone() {
  showGenerate.value = false
  load()
}
</script>

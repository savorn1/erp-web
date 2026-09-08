<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Chart of accounts</h1>
      <div class="flex items-center gap-2">
        <UButton v-if="filter.companyId" color="neutral" variant="soft" icon="i-lucide-sparkles" :loading="seeding" @click="onSeedSample">
          Seed sample data
        </UButton>
        <UButton icon="i-lucide-plus" :disabled="!filter.companyId" @click="openCreate()"> New account </UButton>
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
        <USelect v-model="filter.companyId" :items="activeCompanyOptions" placeholder="Company" class="w-52" />
        <UInput v-model="search" placeholder="Search code or name" icon="i-lucide-search" class="w-56" :disabled="!filter.companyId" />
        <USelect v-model="filter.accountType" :items="typeFilterOptions" placeholder="Type" class="w-44" :disabled="!filter.companyId" />
        <USelect v-model="filter.active" :items="activeFilterOptions" placeholder="Status" class="w-40" :disabled="!filter.companyId" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard v-if="!filter.companyId">
      <EmptyState icon="i-lucide-building-2" title="Select a company" description="Choose a company above to view or manage its chart of accounts." />
    </UCard>

    <UCard v-else>
      <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
      <template v-else>
        <EmptyState
          v-if="allAccounts.length === 0"
          icon="i-lucide-book-open"
          title="No accounts yet"
          description="Create the first account, or seed the standard demo chart of accounts."
        >
          <template #action>
            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="soft" icon="i-lucide-sparkles" :loading="seeding" @click="onSeedSample">Seed sample data</UButton>
              <UButton icon="i-lucide-plus" @click="openCreate()">New account</UButton>
            </div>
          </template>
        </EmptyState>

        <template v-else-if="hasActiveFilter">
          <EmptyState
            v-if="pagedRows.length === 0"
            icon="i-lucide-search-x"
            title="No accounts match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <div v-else class="space-y-1">
            <div v-for="row in pagedRows" :key="row.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800/60">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-mono text-gray-400 shrink-0">{{ row.accountCode }}</span>
                <span class="text-sm text-gray-900 dark:text-white truncate">{{ row.name }}</span>
                <span v-if="row.parentAccountName" class="text-xs text-gray-400 truncate shrink-0">under {{ row.parentAccountName }}</span>
                <UBadge v-if="!row.active" color="neutral" variant="subtle" size="xs">Inactive</UBadge>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <StatusBadge :status="row.accountType" />
                <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :disabled="row.hasChildren" @click="confirmDelete = row" />
              </div>
            </div>
          </div>
          <div v-if="total > 0" class="pt-4">
            <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
          </div>
        </template>

        <template v-else>
          <AccountTreeRow
            v-for="node in tree"
            :key="node.id"
            :node="node"
            :depth="0"
            @add-child="(n) => openCreate(n)"
            @edit="openEdit"
            @delete="(n) => (confirmDelete = n)"
          />
        </template>
      </template>
    </UCard>

    <!-- Create/edit modal -->
    <UModal v-model:open="showForm" :title="formTitle">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Account code" required>
            <UInput v-model="form.accountCode" placeholder="e.g. 1100" class="w-full" />
          </UFormField>
          <UFormField label="Name" required>
            <UInput v-model="form.name" placeholder="e.g. Cash" class="w-full" />
          </UFormField>
          <UFormField label="Type" required>
            <USelect v-model="form.accountType" :items="typeOptions" class="w-full" />
          </UFormField>
          <UFormField label="Parent account" :hint="form.accountType ? undefined : 'Pick a type first'">
            <USelect v-model="form.parentAccountId" :items="parentOptionsFor(form.accountType, editingId)" placeholder="No parent (top-level)" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="form.description" class="w-full" />
          </UFormField>
          <UFormField label="Active">
            <USwitch v-model="form.active" />
          </UFormField>
        </div>
        <UAlert v-if="formError" color="error" variant="subtle" class="mt-4" :title="formError" />
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" @click="showForm = false">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ editingId ? 'Save changes' : 'Create' }}</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete account"
      :description="`Delete account '${confirmDelete?.accountCode ?? ''} ${confirmDelete?.name ?? ''}'? This cannot be undone.`"
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
import type { AccountTreeNode } from '~/components/AccountTreeRow.vue'
import type { Account, AccountPayload, AccountType } from '~/composables/useAccounts'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove, seedSample } = useAccounts()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const allAccounts = ref<Account[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)

async function loadLookups() {
  loadingLookups.value = true
  try {
    const c = await listCompanies({ size: 200 })
    companies.value = c.data
  } finally {
    loadingLookups.value = false
  }
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))

const typeOptions = [
  { label: 'Asset', value: 'ASSET' },
  { label: 'Liability', value: 'LIABILITY' },
  { label: 'Equity', value: 'EQUITY' },
  { label: 'Revenue', value: 'REVENUE' },
  { label: 'Expense', value: 'EXPENSE' }
]
const typeFilterOptions = [{ label: 'All types', value: undefined }, ...typeOptions]
const activeFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
]

const filter = reactive<{ companyId: number | undefined; accountType: AccountType | undefined; active: boolean | undefined }>({
  companyId: undefined,
  accountType: undefined,
  active: undefined
})

const preFiltered = computed(() =>
  allAccounts.value.filter(
    (a) => (filter.accountType === undefined || a.accountType === filter.accountType) && (filter.active === undefined || a.active === filter.active)
  )
)
const {
  page,
  pageSize,
  total,
  rows: pagedRows,
  truncated,
  search
} = useClientTable(preFiltered, {
  pageSize: 15,
  searchFields: ['accountCode', 'name'],
  cap: 500
})

function buildTree(accounts: Account[]): AccountTreeNode[] {
  const nodes = new Map<number, AccountTreeNode>()
  accounts.forEach((a) => nodes.set(a.id, { ...a, children: [] }))
  const roots: AccountTreeNode[] = []
  accounts.forEach((a) => {
    const node = nodes.get(a.id)!
    const parent = a.parentAccountId ? nodes.get(a.parentAccountId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  const sortByCode = (list: AccountTreeNode[]) => {
    list.sort((x, y) => x.accountCode.localeCompare(y.accountCode))
    list.forEach((n) => sortByCode(n.children))
  }
  sortByCode(roots)
  return roots
}
const tree = computed(() => buildTree(allAccounts.value))

async function load() {
  if (!filter.companyId) {
    allAccounts.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await list({ companyId: filter.companyId, size: 500 })
    allAccounts.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function parentOptionsFor(accountType: AccountType | undefined, excludeId: number | null) {
  const matches = allAccounts.value
    .filter((a) => a.id !== excludeId && (accountType === undefined || a.accountType === accountType))
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
  return [{ label: 'No parent (top-level)', value: undefined }, ...matches]
}

// ── Create / edit ────────────────────────────────────────────────────────
const showForm = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive<{
  accountCode: string
  name: string
  accountType: AccountType
  parentAccountId: number | undefined
  description: string
  active: boolean
}>({
  accountCode: '',
  name: '',
  accountType: 'ASSET',
  parentAccountId: undefined,
  description: '',
  active: true
})

watch(
  () => form.accountType,
  () => {
    const parent = allAccounts.value.find((a) => a.id === form.parentAccountId)
    if (parent && parent.accountType !== form.accountType) form.parentAccountId = undefined
  }
)

const formTitle = computed(() => (editingId.value === null ? 'New account' : 'Edit account'))

function resetForm() {
  form.accountCode = ''
  form.name = ''
  form.accountType = 'ASSET'
  form.parentAccountId = undefined
  form.description = ''
  form.active = true
}

function openCreate(parentNode?: AccountTreeNode) {
  editingId.value = null
  formError.value = ''
  resetForm()
  if (parentNode) {
    form.accountType = parentNode.accountType
    form.parentAccountId = parentNode.id
  }
  showForm.value = true
}

function openEdit(row: Account) {
  editingId.value = row.id
  formError.value = ''
  form.accountCode = row.accountCode
  form.name = row.name
  form.accountType = row.accountType
  form.parentAccountId = row.parentAccountId ?? undefined
  form.description = row.description ?? ''
  form.active = row.active
  showForm.value = true
}

async function onSaveForm() {
  formError.value = ''
  if (!filter.companyId || !form.accountCode.trim() || !form.name.trim()) {
    formError.value = 'Please fill in account code and name'
    return
  }
  const payload: AccountPayload = {
    companyId: filter.companyId,
    accountCode: form.accountCode.trim(),
    name: form.name.trim(),
    accountType: form.accountType,
    parentAccountId: form.parentAccountId,
    description: form.description || undefined,
    active: form.active
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      await create(payload)
      toast.add({ title: 'Account created', color: 'success' })
    } else {
      await update(editingId.value, payload)
      toast.add({ title: 'Account updated', color: 'success' })
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

// ── Delete ───────────────────────────────────────────────────────────────
const deleting = ref(false)
const confirmDelete = ref<Account | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Account deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// ── Seed sample data ─────────────────────────────────────────────────────
const seeding = ref(false)
async function onSeedSample() {
  if (!filter.companyId) return
  seeding.value = true
  try {
    await seedSample(filter.companyId)
    toast.add({ title: 'Sample chart of accounts created', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not seed sample data', description: apiErrorMessage(err), color: 'error' })
  } finally {
    seeding.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  filter.companyId = activeCompanyOptions.value[0]?.value
  await load()
})
watch(() => filter.companyId, load)

const hasActiveFilter = computed(() => search.value !== '' || filter.accountType !== undefined || filter.active !== undefined)
function clearFilters() {
  search.value = ''
  filter.accountType = undefined
  filter.active = undefined
}
</script>

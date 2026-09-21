<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Approval rules</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" @click="openCreate"> New rule </UButton>
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
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Require more than one distinct person to approve a Sales Order or Purchase Order, either always or only above a chosen amount. With no rule configured
        for a document type, approval stays single-click exactly as before.
      </p>
    </UCard>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.documentType" :items="documentTypeFilterOptions" placeholder="Document type" class="w-48" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #active-data="{ row }">
          <UBadge :color="row.active ? 'success' : 'neutral'" variant="subtle">{{ row.active ? 'Active' : 'Inactive' }}</UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState icon="i-lucide-check-check" title="No approval rules yet" description="Every approval stays single-click until you add one.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" @click="openCreate">New rule</UButton>
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
            <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="editingId !== null" class="w-full" />
          </UFormField>
          <UFormField label="Document type" required>
            <USelect v-model="form.documentType" :items="documentTypeOptions" :disabled="editingId !== null" class="w-full" />
          </UFormField>
          <UFormField label="Minimum amount" hint="Leave blank to apply regardless of amount">
            <UInput v-model.number="form.minAmount" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Required approvals" required>
            <UInput v-model.number="form.requiredApprovals" type="number" min="1" step="1" class="w-full" />
          </UFormField>
          <UFormField label="Active">
            <USwitch v-model="form.active" />
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
      title="Delete approval rule"
      description="Delete this approval rule? This cannot be undone."
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
import type { ApprovalDocumentType, ApprovalRule } from '~/composables/useApprovalRules'

definePageMeta({ middleware: 'admin' })

const { list, create, update, remove } = useApprovalRules()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<ApprovalRule[]>([])
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
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...activeCompanyOptions.value])
const documentTypeOptions = [
  { label: 'Sales order', value: 'SALES_ORDER' },
  { label: 'Purchase order', value: 'PURCHASE_ORDER' }
]
const documentTypeFilterOptions = [{ label: 'All document types', value: undefined }, ...documentTypeOptions]

const filter = reactive<{ companyId: number | undefined; documentType: ApprovalDocumentType | undefined }>({
  companyId: undefined,
  documentType: undefined
})

const { page, pageSize, total, rows: pagedRows } = useClientTable(rows, { pageSize: 10 })

const columns: ColumnDef<ApprovalRule>[] = [
  { key: 'companyName', label: 'Company', value: (row) => row.companyName ?? '—' },
  { key: 'documentType', label: 'Document type', value: (row) => (row.documentType === 'SALES_ORDER' ? 'Sales order' : 'Purchase order') },
  { key: 'minAmount', label: 'Min amount', value: (row) => (row.minAmount !== null ? formatCurrency(row.minAmount) : 'Any amount') },
  { key: 'requiredApprovals', label: 'Required approvals' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ companyId: filter.companyId, documentType: filter.documentType, size: 200 })
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
watch(() => [filter.companyId, filter.documentType], load)

const hasActiveFilter = computed(() => filter.companyId !== undefined || filter.documentType !== undefined)
function clearFilters() {
  filter.companyId = undefined
  filter.documentType = undefined
}

const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)
const form = reactive<{
  companyId: number | undefined
  documentType: ApprovalDocumentType
  minAmount: number | undefined
  requiredApprovals: number
  active: boolean
}>({
  companyId: undefined,
  documentType: 'SALES_ORDER',
  minAmount: undefined,
  requiredApprovals: 2,
  active: true
})

const formTitle = computed(() => (editingId.value !== null ? 'Edit approval rule' : 'New approval rule'))

function openCreate() {
  editingId.value = null
  form.companyId = filter.companyId ?? activeCompanyOptions.value[0]?.value
  form.documentType = 'SALES_ORDER'
  form.minAmount = undefined
  form.requiredApprovals = 2
  form.active = true
  formError.value = ''
  showForm.value = true
}

function openEdit(row: ApprovalRule) {
  editingId.value = row.id
  form.companyId = row.companyId
  form.documentType = row.documentType
  form.minAmount = row.minAmount ?? undefined
  form.requiredApprovals = row.requiredApprovals
  form.active = row.active
  formError.value = ''
  showForm.value = true
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.requiredApprovals || form.requiredApprovals < 1) {
    formError.value = 'Please fill in company and a required-approvals count of at least 1'
    return
  }
  saving.value = true
  try {
    const payload = {
      companyId: form.companyId,
      documentType: form.documentType,
      minAmount: form.minAmount,
      requiredApprovals: form.requiredApprovals,
      active: form.active
    }
    if (editingId.value !== null) {
      await update(editingId.value, payload)
      toast.add({ title: 'Approval rule updated', color: 'success' })
    } else {
      await create(payload)
      toast.add({ title: 'Approval rule created', color: 'success' })
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<ApprovalRule | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Approval rule deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

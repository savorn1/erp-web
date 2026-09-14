<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Bill of materials</h1>
      <UButton icon="i-lucide-plus" :disabled="activeCompanyOptions.length === 0" to="/bill-of-materials/new"> New BOM </UButton>
    </div>

    <UAlert
      v-if="!loadingLookups && activeCompanyOptions.length === 0"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="No active companies yet"
      description="Create a company and some products first."
      icon="i-lucide-triangle-alert"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search BOM number" icon="i-lucide-search" class="w-52" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" :to="`/bill-of-materials/${row.id}`">View</UButton>
            <UButton
              v-if="row.status === 'ACTIVE'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-pause"
              :loading="actingId === row.id"
              @click="onDeactivate(row)"
            >
              Deactivate
            </UButton>
            <UButton
              v-else
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-play"
              :loading="actingId === row.id"
              @click="onActivate(row)"
            >
              Activate
            </UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>

        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No BOMs match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-list-tree" title="No bills of materials yet" description="Create the first recipe to get started.">
            <template #action>
              <UButton :disabled="activeCompanyOptions.length === 0" icon="i-lucide-plus" to="/bill-of-materials/new">New BOM</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete bill of materials"
      :description="`Delete BOM '${confirmDelete?.bomNumber ?? ''}'? This cannot be undone.`"
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
import type { BillOfMaterial, BillOfMaterialStatus } from '~/composables/useBillOfMaterials'

definePageMeta({ middleware: 'admin' })

const { list, activate, deactivate, remove } = useBillOfMaterials()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<BillOfMaterial[]>([])
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
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
]

const filter = reactive<{ companyId: number | undefined; status: BillOfMaterialStatus | undefined }>({ companyId: undefined, status: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 10, searchFields: ['bomNumber'] })

const columns: ColumnDef<BillOfMaterial>[] = [
  { key: 'bomNumber', label: 'BOM number', sortable: true },
  { key: 'name', label: 'Name' },
  { key: 'productName', label: 'Finished good', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'outputQuantity', label: 'Output qty', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
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

const actingId = ref<number | null>(null)
async function onActivate(row: BillOfMaterial) {
  actingId.value = row.id
  try {
    await activate(row.id)
    toast.add({ title: 'BOM activated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not activate', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}
async function onDeactivate(row: BillOfMaterial) {
  actingId.value = row.id
  try {
    await deactivate(row.id)
    toast.add({ title: 'BOM deactivated', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Could not deactivate', description: apiErrorMessage(err), color: 'error' })
  } finally {
    actingId.value = null
  }
}

const deleting = ref(false)
const confirmDelete = ref<BillOfMaterial | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'BOM deleted', color: 'success' })
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

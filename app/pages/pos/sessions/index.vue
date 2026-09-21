<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">POS sessions</h1>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-48" />
        <USelect v-model="filter.registerId" :items="registerFilterOptions" placeholder="Register" class="w-48" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-36" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="rows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <UButton v-if="row.status === 'OPEN'" size="xs" color="warning" variant="soft" icon="i-lucide-door-closed" @click="openClose(row)"> Close </UButton>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-door-open" title="No sessions yet" description="Open a register from the Checkout screen to start one." />
        </template>
      </DataTable>
    </UCard>

    <UModal v-model:open="showClose" :title="`Close session — register '${closing?.registerName ?? ''}'`">
      <template #body>
        <div class="space-y-4">
          <dl class="text-sm space-y-1">
            <div class="flex justify-between">
              <dt class="text-gray-500 dark:text-gray-400">Opening float</dt>
              <dd>{{ formatCurrency(closing?.openingFloat ?? 0) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500 dark:text-gray-400">Sales so far</dt>
              <dd>{{ formatCurrency(closing?.salesTotalSoFar ?? 0) }}</dd>
            </div>
          </dl>
          <UFormField label="Counted cash" required>
            <UInput v-model.number="countedCash" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
          <UAlert v-if="closeError" color="error" variant="subtle" :title="closeError" />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showClose = false">Cancel</UButton>
            <UButton :loading="closingSession" @click="onCloseConfirm">Close session</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PosSession, PosSessionStatus } from '~/composables/usePosSessions'

definePageMeta({ middleware: 'admin' })

const { list, close } = usePosSessions()
const { list: listRegisters } = useRegisters()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const rows = ref<PosSession[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string }[]>([])
const registers = ref<{ id: number; name: string; companyId: number }[]>([])
const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const registerFilterOptions = computed(() => [{ label: 'All registers', value: undefined }, ...registers.value.map((r) => ({ label: r.name, value: r.id }))])
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' }
]

const filter = reactive<{ companyId: number | undefined; registerId: number | undefined; status: PosSessionStatus | undefined }>({
  companyId: undefined,
  registerId: undefined,
  status: undefined
})

const columns: ColumnDef<PosSession>[] = [
  { key: 'registerName', label: 'Register', value: (row) => row.registerName ?? '—' },
  { key: 'openedBy', label: 'Opened by', value: (row) => row.openedBy ?? '—' },
  { key: 'openedAt', label: 'Opened', type: 'datetime' },
  { key: 'openingFloat', label: 'Float', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'closedAt', label: 'Closed', type: 'datetime', value: (row) => row.closedAt ?? '—' },
  {
    key: 'cashVariance',
    label: 'Variance',
    value: (row) => (row.cashVariance === null ? '—' : formatCurrency(row.cashVariance)),
    class: (row) =>
      row.cashVariance && row.cashVariance !== 0 ? (row.cashVariance > 0 ? 'text-success-700 dark:text-success-400' : 'text-error-600 dark:text-error-400') : ''
  },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      registerId: filter.registerId,
      status: filter.status,
      sortBy: 'id',
      sortOrder: 'desc',
      size: 200
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const showClose = ref(false)
const closing = ref<PosSession | null>(null)
const countedCash = ref(0)
const closingSession = ref(false)
const closeError = ref('')

function openClose(row: PosSession) {
  closing.value = row
  countedCash.value = row.expectedCash ?? row.openingFloat + row.salesTotalSoFar
  closeError.value = ''
  showClose.value = true
}

async function onCloseConfirm() {
  if (!closing.value) return
  closingSession.value = true
  closeError.value = ''
  try {
    await close(closing.value.id, countedCash.value)
    toast.add({ title: 'Session closed', color: 'success' })
    showClose.value = false
    await load()
  } catch (err) {
    closeError.value = apiErrorMessage(err)
  } finally {
    closingSession.value = false
  }
}

const hasActiveFilter = computed(() => filter.companyId !== undefined || filter.registerId !== undefined || filter.status !== undefined)
function clearFilters() {
  filter.companyId = undefined
  filter.registerId = undefined
  filter.status = undefined
  load()
}

onMounted(async () => {
  const [c, r] = await Promise.all([listCompanies({ size: 200 }), listRegisters({ size: 200 })])
  companies.value = c.data
  registers.value = r.data
  await load()
})
watch(() => [filter.companyId, filter.registerId, filter.status], load)
</script>

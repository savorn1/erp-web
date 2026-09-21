<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">POS sales</h1>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search sale number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.registerId" :items="registerFilterOptions" placeholder="Register" class="w-44" />
        <USelect v-model="filter.status" :items="statusFilterOptions" placeholder="Status" class="w-36" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-eye" @click="openView(row)">View</UButton>
            <UButton
              v-if="row.status === 'COMPLETED'"
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-repeat"
              :to="`/pos/exchanges/new?saleId=${row.id}`"
            >
              Exchange
            </UButton>
            <UButton v-if="row.status === 'COMPLETED'" size="xs" color="error" variant="soft" icon="i-lucide-undo-2" @click="confirmVoid = row"> Void </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-receipt-text" title="No POS sales yet" />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model:open="showView" :title="viewing?.saleNumber ?? ''">
      <template #body>
        <div v-if="viewing" class="space-y-3 text-sm">
          <dl class="grid grid-cols-2 gap-2">
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Register</dt>
              <dd>{{ viewing.registerName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Customer</dt>
              <dd>{{ viewing.customerName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Date</dt>
              <dd>{{ formatDateTime(viewing.saleDate) }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Status</dt>
              <dd>{{ viewing.status }}</dd>
            </div>
          </dl>
          <ul class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="line in viewing.lines" :key="line.id" class="py-1.5 flex justify-between">
              <span>{{ line.quantity }} × {{ line.productName }} ({{ line.productSku }})</span>
              <span>{{ formatCurrency(line.lineTotal) }}</span>
            </li>
          </ul>
          <dl class="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div class="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{{ formatCurrency(viewing.subtotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Discount</dt>
              <dd>-{{ formatCurrency(viewing.discountAmount) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Tax</dt>
              <dd>{{ formatCurrency(viewing.taxAmount) }}</dd>
            </div>
            <div class="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{{ formatCurrency(viewing.totalAmount) }}</dd>
            </div>
          </dl>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Tenders</p>
          <ul class="space-y-1">
            <li v-for="p in viewing.payments" :key="p.id" class="flex justify-between">
              <span>{{ p.method }}</span>
              <span>{{ formatCurrency(p.amount) }}</span>
            </li>
          </ul>
          <UAlert
            v-if="viewing.status === 'VOIDED'"
            color="error"
            variant="subtle"
            title="Voided"
            :description="`By ${viewing.voidedBy ?? '—'} on ${viewing.voidedAt ? formatDateTime(viewing.voidedAt) : '—'}${viewing.voidReason ? ' — ' + viewing.voidReason : ''}`"
          />
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="confirmVoid !== null"
      title="Void sale"
      :description="`Void sale '${confirmVoid?.saleNumber ?? ''}'? This reverses its stock and accounting effects.`"
      confirm-label="Void"
      color="error"
      :loading="voiding"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmVoid = null
        }
      "
      @confirm="onVoidConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PosSale, PosSaleStatus } from '~/composables/usePosSales'

definePageMeta({ middleware: 'admin' })

const { list, voidSale } = usePosSales()
const { list: listRegisters } = useRegisters()
const toast = useToast()

const rows = ref<PosSale[]>([])
const loading = ref(false)
const error = ref('')

const registers = ref<{ id: number; name: string }[]>([])
const registerFilterOptions = computed(() => [{ label: 'All registers', value: undefined }, ...registers.value.map((r) => ({ label: r.name, value: r.id }))])

const filter = reactive<{ registerId: number | undefined; status: PosSaleStatus | undefined }>({ registerId: undefined, status: undefined })
const statusFilterOptions = [
  { label: 'All statuses', value: undefined },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Voided', value: 'VOIDED' }
]

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 15, searchFields: ['saleNumber'] })

const columns: ColumnDef<PosSale>[] = [
  { key: 'saleNumber', label: 'Sale #', sortable: true },
  { key: 'saleDate', label: 'Date', type: 'datetime' },
  { key: 'registerName', label: 'Register', value: (row) => row.registerName ?? '—' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ registerId: filter.registerId, status: filter.status, sortBy: sort.value?.column, sortOrder: sort.value?.direction, size: 200 })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const showView = ref(false)
const viewing = ref<PosSale | null>(null)
function openView(row: PosSale) {
  viewing.value = row
  showView.value = true
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

const voiding = ref(false)
const confirmVoid = ref<PosSale | null>(null)
async function onVoidConfirm() {
  if (!confirmVoid.value) return
  voiding.value = true
  try {
    await voidSale(confirmVoid.value.id)
    toast.add({ title: 'Sale voided', color: 'success' })
    confirmVoid.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not void sale', description: apiErrorMessage(err), color: 'error' })
  } finally {
    voiding.value = false
  }
}

onMounted(async () => {
  const r = await listRegisters({ size: 200 })
  registers.value = r.data
  await load()
})
watch(sort, load)
watch(() => [filter.registerId, filter.status], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.registerId !== undefined || filter.status !== undefined)
function clearFilters() {
  search.value = ''
  filter.registerId = undefined
  filter.status = undefined
  load()
}
</script>

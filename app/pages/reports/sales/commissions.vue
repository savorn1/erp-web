<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Commissions"
      description="Commission earned per salesperson, accrued on the paid portion of invoices — see Commission rules to set rates."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'Commissions' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
        <UFormField label="Sales rep">
          <USelect v-model="salesRepUserId" :items="userFilterOptions" placeholder="All reps" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="report">
      <DataTable :rows="report.rows" :columns="columns" exportable export-filename="sales-commissions">
        <template #actions-data="{ row }">
          <UButton v-if="row.unpaidCommissionAmount > 0" size="xs" color="primary" variant="soft" icon="i-lucide-banknote" @click="openMarkPaid(row)">
            Mark paid
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No commission earned in this period" />
        </template>
      </DataTable>
    </UCard>

    <UModal v-model:open="showMarkPaid" title="Mark commission as paid">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Marks every unpaid commission entry for <strong>{{ markPaidTarget?.salesRepName ?? 'this rep' }}</strong> earned on or before the date below as paid
            out.
          </p>
          <UFormField label="Through date">
            <UInput v-model="markPaidThroughDate" type="date" class="w-full" />
          </UFormField>
          <UAlert v-if="markPaidError" color="error" variant="subtle" :title="markPaidError" />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showMarkPaid = false">Cancel</UButton>
            <UButton :loading="markingPaid" @click="confirmMarkPaid">Mark paid</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CommissionReport, CommissionReportRow } from '~/composables/useCommissions'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { report: fetchReport, markPaid } = useCommissions()
const { list: listUsers } = useUsers()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const report = ref<CommissionReport | null>(null)
const salesRepUserId = ref<number | undefined>(undefined)

const users = ref<{ id: number; username: string }[]>([])
const userFilterOptions = computed(() => [{ label: 'All reps', value: undefined }, ...users.value.map((u) => ({ label: u.username, value: u.id }))])

const columns: ColumnDef<CommissionReportRow>[] = [
  { key: 'salesRepName', label: 'Sales rep', value: (row) => row.salesRepName ?? '—', footer: () => 'Total' },
  { key: 'entryCount', label: 'Payments' },
  { key: 'totalBasisAmount', label: 'Paid basis', type: 'currency' },
  { key: 'totalCommissionAmount', label: 'Commission', type: 'currency', footer: () => report.value?.totalCommissionAmount },
  { key: 'paidCommissionAmount', label: 'Paid out', type: 'currency' },
  { key: 'unpaidCommissionAmount', label: 'Unpaid', type: 'currency' },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchReport({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      salesRepUserId: salesRepUserId.value
    })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const showMarkPaid = ref(false)
const markPaidTarget = ref<CommissionReportRow | null>(null)
const markPaidThroughDate = ref(new Date().toISOString().slice(0, 10))
const markPaidError = ref('')
const markingPaid = ref(false)

function openMarkPaid(row: CommissionReportRow) {
  markPaidTarget.value = row
  markPaidThroughDate.value = new Date().toISOString().slice(0, 10)
  markPaidError.value = ''
  showMarkPaid.value = true
}

async function confirmMarkPaid() {
  if (!markPaidTarget.value) return
  markingPaid.value = true
  markPaidError.value = ''
  try {
    await markPaid(markPaidTarget.value.salesRepUserId, markPaidThroughDate.value)
    toast.add({ title: 'Commission marked as paid', color: 'success' })
    showMarkPaid.value = false
    await load()
  } catch (err) {
    markPaidError.value = apiErrorMessage(err)
  } finally {
    markingPaid.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  const u = await listUsers({ size: 200 })
  users.value = u.data
  await load()
})
watch([companyId, dateFrom, dateTo, salesRepUserId], load)
</script>

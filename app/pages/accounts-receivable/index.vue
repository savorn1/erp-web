<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Accounts receivable</h1>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="As of date">
          <UInput v-model="asOfDate" type="date" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard class="mb-4">
      <template #header>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Aging report</h2>
      </template>
      <div v-if="loadingAging" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
      <EmptyState v-else-if="aging && aging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
      <div v-else-if="aging" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Customer</th>
              <th class="py-2 px-3 text-right">Current</th>
              <th class="py-2 px-3 text-right">1-30 days</th>
              <th class="py-2 px-3 text-right">31-60 days</th>
              <th class="py-2 px-3 text-right">61-90 days</th>
              <th class="py-2 px-3 text-right">90+ days</th>
              <th class="py-2 pl-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in aging.rows" :key="row.customerId ?? 'row'" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.customerName ?? '—' }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.current) }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.days1To30) }}</td>
              <td class="py-1.5 px-3 text-right" :class="row.days31To60 > 0 ? 'text-warning' : 'text-gray-600 dark:text-gray-300'">
                {{ formatCurrency(row.days31To60) }}
              </td>
              <td class="py-1.5 px-3 text-right" :class="row.days61To90 > 0 ? 'text-warning' : 'text-gray-600 dark:text-gray-300'">
                {{ formatCurrency(row.days61To90) }}
              </td>
              <td class="py-1.5 px-3 text-right font-medium" :class="row.days90Plus > 0 ? 'text-error' : 'text-gray-600 dark:text-gray-300'">
                {{ formatCurrency(row.days90Plus) }}
              </td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.total) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3 text-gray-900 dark:text-white">Total</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.current) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days1To30) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days31To60) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days61To90) }}</td>
              <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.days90Plus) }}</td>
              <td class="py-2 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(aging.totals.total) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Overdue invoices</h2>
      </template>
      <div v-if="loadingInvoices" class="text-sm text-gray-400 py-6 text-center">Loading…</div>
      <EmptyState v-else-if="overdueInvoices.length === 0" icon="i-lucide-check-circle" title="No overdue invoices" />
      <div v-else class="space-y-2">
        <div
          v-for="inv in overdueInvoices"
          :key="inv.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ inv.invoiceNumber }}</span>
              <UBadge color="error" variant="subtle" size="xs">{{ inv.daysOverdue }} days overdue</UBadge>
            </div>
            <p class="text-xs text-gray-400 truncate">
              {{ inv.customerName }} · due {{ formatDate(inv.dueDate!) }} · outstanding {{ formatCurrency(inv.outstandingAmount) }}
            </p>
          </div>
          <UButton size="xs" variant="soft" icon="i-lucide-phone-call" @click="openCollections(inv)">Collections</UButton>
        </div>
      </div>
    </UCard>

    <!-- Collections modal -->
    <UModal v-model:open="showCollections" :title="`Collections — ${collectionsTarget?.invoiceNumber ?? ''}`" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div v-if="loadingActivities" class="text-sm text-gray-400 py-4 text-center">Loading…</div>
        <template v-else>
          <EmptyState v-if="activities.length === 0" icon="i-lucide-file-minus" title="No collection activity logged yet" />
          <ul v-else class="space-y-1.5 mb-4">
            <li v-for="a in activities" :key="a.id" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-900 dark:text-white">{{ formatEnum(a.method) }}</span>
                <div class="flex items-center gap-2">
                  <UBadge :color="a.resolved ? 'success' : 'warning'" variant="subtle" size="xs">{{ a.resolved ? 'Resolved' : 'Open' }}</UBadge>
                  <span class="text-xs text-gray-400">{{ formatDate(a.activityDate) }}</span>
                </div>
              </div>
              <p v-if="a.notes" class="text-xs text-gray-400 mt-0.5">{{ a.notes }}</p>
              <p v-if="a.followUpDate" class="text-xs text-gray-400 mt-0.5">Follow up {{ formatDate(a.followUpDate) }}</p>
            </li>
          </ul>
        </template>

        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Log a new activity</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <UFormField label="Date" required>
            <UInput v-model="activityForm.activityDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Method" required>
            <USelect v-model="activityForm.method" :items="methodOptions" class="w-full" />
          </UFormField>
          <UFormField label="Follow-up date">
            <UInput v-model="activityForm.followUpDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Resolved">
            <USwitch v-model="activityForm.resolved" />
          </UFormField>
          <UFormField label="Notes" class="sm:col-span-2">
            <UTextarea v-model="activityForm.notes" class="w-full" />
          </UFormField>
        </div>
        <UAlert v-if="activityError" color="error" variant="subtle" class="mb-3" :title="activityError" />
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showCollections = false">Close</UButton>
          <UButton :loading="loggingActivity" @click="onLogActivity">Log activity</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Invoice, InvoiceAgingReport } from '~/composables/useInvoices'
import type { CollectionActivity, CollectionContactMethod } from '~/composables/useCollectionActivities'

definePageMeta({ middleware: 'admin' })

const { list: listInvoices, agingReport } = useInvoices()
const {
  list: listCollectionActivities,
  create: createCollectionActivity
} = useCollectionActivities()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const error = ref('')
const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const companyId = ref<number | undefined>(undefined)
const asOfDate = ref(new Date().toISOString().slice(0, 10))

const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])

const aging = ref<InvoiceAgingReport | null>(null)
const loadingAging = ref(false)
async function loadAging() {
  loadingAging.value = true
  error.value = ''
  try {
    aging.value = await agingReport({ companyId: companyId.value, asOfDate: asOfDate.value })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loadingAging.value = false
  }
}

const overdueInvoices = ref<Invoice[]>([])
const loadingInvoices = ref(false)
async function loadOverdueInvoices() {
  loadingInvoices.value = true
  try {
    const res = await listInvoices({ companyId: companyId.value, status: 'APPROVED', size: 200 })
    overdueInvoices.value = res.data.filter((inv) => inv.overdue).sort((a, b) => b.daysOverdue - a.daysOverdue)
  } finally {
    loadingInvoices.value = false
  }
}

async function loadAll() {
  await Promise.all([loadAging(), loadOverdueInvoices()])
}

onMounted(async () => {
  const c = await listCompanies({ size: 200 })
  companies.value = c.data
  await loadAll()
})
watch([companyId, asOfDate], loadAll)

// ── Collections ──────────────────────────────────────────────────────────
const methodOptions = [
  { label: 'Phone', value: 'PHONE' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Letter', value: 'LETTER' },
  { label: 'In person', value: 'IN_PERSON' },
  { label: 'Other', value: 'OTHER' }
]

const showCollections = ref(false)
const collectionsTarget = ref<Invoice | null>(null)
const activities = ref<CollectionActivity[]>([])
const loadingActivities = ref(false)
const activityForm = reactive<{
  activityDate: string
  method: CollectionContactMethod
  notes: string
  followUpDate: string
  resolved: boolean
}>({
  activityDate: new Date().toISOString().slice(0, 10),
  method: 'PHONE',
  notes: '',
  followUpDate: '',
  resolved: false
})
const loggingActivity = ref(false)
const activityError = ref('')

async function openCollections(invoice: Invoice) {
  collectionsTarget.value = invoice
  activityForm.activityDate = new Date().toISOString().slice(0, 10)
  activityForm.method = 'PHONE'
  activityForm.notes = ''
  activityForm.followUpDate = ''
  activityForm.resolved = false
  activityError.value = ''
  showCollections.value = true
  await loadActivities(invoice.id)
}

async function loadActivities(invoiceId: number) {
  loadingActivities.value = true
  try {
    activities.value = (await listCollectionActivities({ invoiceId, size: 100, sortBy: 'activityDate', sortOrder: 'desc' })).data
  } finally {
    loadingActivities.value = false
  }
}

async function onLogActivity() {
  if (!collectionsTarget.value) return
  activityError.value = ''
  loggingActivity.value = true
  try {
    await createCollectionActivity({
      invoiceId: collectionsTarget.value.id,
      activityDate: activityForm.activityDate,
      method: activityForm.method,
      notes: activityForm.notes || undefined,
      followUpDate: activityForm.followUpDate || undefined,
      resolved: activityForm.resolved
    })
    toast.add({ title: 'Collection activity logged', color: 'success' })
    await loadActivities(collectionsTarget.value.id)
  } catch (err) {
    activityError.value = apiErrorMessage(err)
  } finally {
    loggingActivity.value = false
  }
}
</script>

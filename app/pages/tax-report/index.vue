<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tax report</h1>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-44" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-44" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        Groups approved sales and purchase invoices by the tax percent typed on their lines — it can't attribute a rate to a named VAT/withholding
        <NuxtLink to="/tax-rates" class="underline">tax rate</NuxtLink> since order and invoice lines aren't linked to one.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>
    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <UCard>
          <p class="text-xs text-gray-400">Output tax (sales)</p>
          <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(report.outputTaxTotal) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs text-gray-400">Input tax (purchases)</p>
          <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(report.inputTaxTotal) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs text-gray-400">Net tax payable</p>
          <p class="text-xl font-semibold" :class="report.netTaxPayable >= 0 ? 'text-error' : 'text-success'">
            {{ formatCurrency(report.netTaxPayable) }}
          </p>
        </UCard>
      </div>

      <UCard class="mb-4">
        <template #header>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Output tax — sales invoices</h2>
        </template>
        <EmptyState v-if="report.outputTax.length === 0" icon="i-lucide-check-circle" title="No output tax in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Rate</th>
              <th class="py-2 px-3 text-right">Taxable amount</th>
              <th class="py-2 pl-3 text-right">Tax amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.outputTax" :key="row.taxRatePercent" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.taxRatePercent }}%</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.taxableAmount) }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.taxAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Input tax — purchase invoices</h2>
        </template>
        <EmptyState v-if="report.inputTax.length === 0" icon="i-lucide-check-circle" title="No input tax in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Rate</th>
              <th class="py-2 px-3 text-right">Taxable amount</th>
              <th class="py-2 pl-3 text-right">Tax amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.inputTax" :key="row.taxRatePercent" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.taxRatePercent }}%</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(row.taxableAmount) }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.taxAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TaxReport } from '~/composables/useTaxReport'

definePageMeta({ middleware: 'admin' })

const { generate } = useTaxReport()
const { list: listCompanies } = useCompanies()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const companyId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')

const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])

const report = ref<TaxReport | null>(null)
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await generate({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  companies.value = (await listCompanies({ size: 200 })).data
  await load()
})
watch([companyId, dateFrom, dateTo], load)
</script>

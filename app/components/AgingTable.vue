<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
          <th class="py-2 pr-3">{{ entityLabel }}</th>
          <th class="py-2 px-3 text-right">Current</th>
          <th class="py-2 px-3 text-right">1-30 days</th>
          <th class="py-2 px-3 text-right">31-60 days</th>
          <th class="py-2 px-3 text-right">61-90 days</th>
          <th class="py-2 px-3 text-right">90+ days</th>
          <th class="py-2 pl-3 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in report.rows" :key="row.customerId ?? 'row'" class="border-b border-gray-100 dark:border-gray-800/60">
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
          <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(report.totals.current) }}</td>
          <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(report.totals.days1To30) }}</td>
          <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(report.totals.days31To60) }}</td>
          <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(report.totals.days61To90) }}</td>
          <td class="py-2 px-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(report.totals.days90Plus) }}</td>
          <td class="py-2 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(report.totals.total) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { InvoiceAgingReport } from '~/composables/useInvoices'

defineProps<{ report: InvoiceAgingReport; entityLabel: string }>()
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">POS dashboard</h1>
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Register">
          <USelect v-model="registerId" :items="registerFilterOptions" placeholder="All registers" class="w-44" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
        <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-calendar" @click="setToday">Today</UButton>
      </div>
    </div>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <section class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Revenue" :value="formatCurrency(revenue)" icon="i-lucide-circle-dollar-sign" color="success" :loading="loading" />
        <StatTile label="Transactions" :value="String(transactionCount)" icon="i-lucide-receipt-text" color="primary" :loading="loading" to="/pos/sales" />
        <StatTile label="Average sale" :value="formatCurrency(averageSale)" icon="i-lucide-trending-up" color="info" :loading="loading" />
        <StatTile label="Items sold" :value="String(itemsSold)" icon="i-lucide-package" color="neutral" :loading="loading" />
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <section>
        <DashboardSectionHeader icon="i-lucide-bar-chart-3" label="Sales by hour" />
        <UCard>
          <div v-if="loading" class="h-64"><USkeleton class="w-full h-full" /></div>
          <div v-else class="h-64">
            <ClientOnly>
              <Bar :data="hourlyChartData" :options="hourlyChartOptions" />
            </ClientOnly>
          </div>
        </UCard>
      </section>

      <section>
        <DashboardSectionHeader icon="i-lucide-credit-card" label="Payment methods" />
        <UCard>
          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 3" :key="i" class="h-8 w-full" />
          </div>
          <div v-else-if="paymentBreakdown.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No sales in this range</div>
          <ul v-else class="space-y-3">
            <li v-for="p in paymentBreakdown" :key="p.method">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-gray-900 dark:text-white">{{ formatEnum(p.method) }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ formatCurrency(p.amount) }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div class="h-full bg-primary-500 rounded-full" :style="{ width: `${revenue > 0 ? (p.amount / revenue) * 100 : 0}%` }" />
              </div>
            </li>
          </ul>
        </UCard>
      </section>
    </div>

    <section>
      <DashboardSectionHeader icon="i-lucide-trophy" label="Top products" />
      <UCard>
        <div v-if="loading" class="space-y-2">
          <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
        </div>
        <EmptyState v-else-if="topProducts.length === 0" icon="i-lucide-package" title="No sales in this range" />
        <DataTable v-else :rows="topProducts" :columns="topProductColumns" numbered :columns-toggleable="false" />
      </UCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, type TooltipItem } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { ColumnDef } from '#shared/types'
import type { PosSale } from '~/composables/usePosSales'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

definePageMeta({ middleware: 'admin' })

const { list } = usePosSales()
const { list: listRegisters } = useRegisters()

const registers = ref<{ id: number; name: string }[]>([])
const registerId = ref<number | undefined>(undefined)
const registerFilterOptions = computed(() => [{ label: 'All registers', value: undefined }, ...registers.value.map((r) => ({ label: r.name, value: r.id }))])

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
const dateFrom = ref(todayIso())
const dateTo = ref(todayIso())
function setToday() {
  dateFrom.value = todayIso()
  dateTo.value = todayIso()
}

const sales = ref<PosSale[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({ registerId: registerId.value, status: 'COMPLETED', dateFrom: dateFrom.value, dateTo: dateTo.value, size: 5000 })
    sales.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const revenue = computed(() => sales.value.reduce((sum, s) => sum + s.totalAmount, 0))
const transactionCount = computed(() => sales.value.length)
const averageSale = computed(() => (transactionCount.value > 0 ? revenue.value / transactionCount.value : 0))
const itemsSold = computed(() => sales.value.reduce((sum, s) => sum + s.lines.reduce((a, l) => a + l.quantity, 0), 0))

interface TopProduct {
  productId: number
  name: string
  quantity: number
  revenue: number
}
const topProducts = computed<TopProduct[]>(() => {
  const map = new Map<number, TopProduct>()
  for (const sale of sales.value) {
    for (const line of sale.lines) {
      const entry = map.get(line.productId) ?? { productId: line.productId, name: line.productName ?? 'Unknown product', quantity: 0, revenue: 0 }
      entry.quantity += line.quantity
      entry.revenue += line.lineTotal
      map.set(line.productId, entry)
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8)
})
const topProductColumns: ColumnDef<TopProduct>[] = [
  { key: 'name', label: 'Product' },
  { key: 'quantity', label: 'Qty sold' },
  { key: 'revenue', label: 'Revenue', type: 'currency' }
]

const paymentBreakdown = computed(() => {
  const map = new Map<string, number>()
  for (const sale of sales.value) {
    for (const p of sale.payments) {
      map.set(p.method, (map.get(p.method) ?? 0) + p.amount)
    }
  }
  return [...map.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount)
})

const hourLabels = Array.from({ length: 24 }, (_, h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`)
const hourlyRevenue = computed(() => {
  const buckets = Array.from({ length: 24 }, () => 0)
  for (const sale of sales.value) {
    buckets[new Date(sale.saleDate).getHours()] += sale.totalAmount
  }
  return buckets
})

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const hourlyChartData = computed(() => ({
  labels: hourLabels,
  datasets: [{ label: 'Revenue', data: hourlyRevenue.value, backgroundColor: '#3670d3', borderRadius: 4, maxBarThickness: 24 }]
}))
const hourlyChartOptions = computed(() => {
  const gridColor = isDark.value ? '#374151' : '#e5e7eb'
  const textColor = isDark.value ? '#9ca3af' : '#6b7280'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: TooltipItem<'bar'>) => ` ${formatCurrency(ctx.parsed.y)}` } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (value: string | number) => formatCurrency(Number(value)) } }
    }
  }
})

onMounted(async () => {
  const r = await listRegisters({ size: 200 })
  registers.value = r.data
  await load()
})
watch([registerId, dateFrom, dateTo], load)
</script>

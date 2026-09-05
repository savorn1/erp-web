<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Price lookup</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Check what price a customer would actually pay for a product, and which rule of the pricing cascade produced it — without creating a sales order.
      </p>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Company</label>
          <USelect v-model="companyId" :items="companyOptions" placeholder="Select a company" class="w-56" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</label>
          <USelect v-model="customerId" :items="customerOptions" :disabled="!companyId" placeholder="Select a customer" class="w-64" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
          <USelect v-model="productId" :items="productOptions" :disabled="!companyId" placeholder="Select a product" class="w-64" />
        </div>
        <UButton icon="i-lucide-search" :loading="loading" :disabled="!companyId || !customerId || !productId" @click="runLookup"> Look up price </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard v-if="result">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400">{{ result.customerName }} pays for {{ result.productName }} ({{ result.productSku }})</div>
          <div class="text-3xl font-bold text-gray-900 dark:text-white">{{ formatMoney(result.resolvedUnitPrice) }}</div>
        </div>
        <UBadge :color="sourceColor(result.source)" variant="subtle" size="lg" class="self-start sm:self-auto">
          {{ sourceLabel(result.source) }}
        </UBadge>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <span class="text-gray-500 dark:text-gray-400">Product selling price</span>
          <span class="font-medium text-gray-900 dark:text-white">{{ formatMoney(result.sellingPrice) }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <span class="text-gray-500 dark:text-gray-400">Customer group</span>
          <span class="font-medium text-gray-900 dark:text-white">{{ result.customerGroupName ?? 'None' }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <span class="text-gray-500 dark:text-gray-400">Price group</span>
          <span class="font-medium text-gray-900 dark:text-white">{{ result.priceGroupName ?? 'None' }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <span class="text-gray-500 dark:text-gray-400">Price group default discount</span>
          <span class="font-medium text-gray-900 dark:text-white">{{ result.discountPercent != null ? `${result.discountPercent}%` : 'None' }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2 sm:col-span-2">
          <span class="text-gray-500 dark:text-gray-400">Per-product override applied</span>
          <span class="font-medium text-gray-900 dark:text-white">{{ result.productPriceId ? `Yes (#${result.productPriceId})` : 'No' }}</span>
        </div>
      </div>

      <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {{ explanation(result) }}
      </p>
    </UCard>

    <EmptyState
      v-else-if="!loading"
      icon="i-lucide-search"
      title="No lookup yet"
      description="Pick a company, customer, and product above to see the resolved price."
    />
  </div>
</template>

<script setup lang="ts">
import type { PriceLookupResult, PriceLookupSource } from '~/composables/usePricing'

definePageMeta({ middleware: 'admin' })

const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listProducts } = useProducts()
const { lookup } = usePricing()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number }[]>([])

const companyId = ref<number | undefined>(undefined)
const customerId = ref<number | undefined>(undefined)
const productId = ref<number | undefined>(undefined)

const loading = ref(false)
const error = ref('')
const result = ref<PriceLookupResult | null>(null)

const companyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const customerOptions = computed(() => customers.value.filter((c) => c.companyId === companyId.value).map((c) => ({ label: c.name, value: c.id })))
const productOptions = computed(() =>
  products.value.filter((p) => p.companyId === companyId.value).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
)

function formatMoney(value: number) {
  return value.toFixed(2)
}

function sourceLabel(source: PriceLookupSource) {
  switch (source) {
    case 'PRODUCT_PRICE_OVERRIDE':
      return 'Per-product override'
    case 'PRICE_GROUP_DISCOUNT':
      return 'Price group discount'
    default:
      return 'Selling price'
  }
}
function sourceColor(source: PriceLookupSource) {
  switch (source) {
    case 'PRODUCT_PRICE_OVERRIDE':
      return 'primary'
    case 'PRICE_GROUP_DISCOUNT':
      return 'success'
    default:
      return 'neutral'
  }
}
function explanation(r: PriceLookupResult) {
  if (r.source === 'PRODUCT_PRICE_OVERRIDE') {
    return `A per-product price override (#${r.productPriceId}) for ${r.priceGroupName} sets this product's price directly, ahead of any price group discount.`
  }
  if (r.source === 'PRICE_GROUP_DISCOUNT') {
    return `No per-product override exists, so the ${r.priceGroupName} price group's ${r.discountPercent}% default discount was applied to the selling price.`
  }
  return r.priceGroupName
    ? `No per-product override or discount is set for ${r.priceGroupName}, so the plain selling price applies.`
    : 'This customer has no customer group (or the group has no price group), so the plain selling price applies.'
}

watch(companyId, () => {
  customerId.value = undefined
  productId.value = undefined
  result.value = null
})

async function runLookup() {
  if (!companyId.value || !customerId.value || !productId.value) return
  loading.value = true
  error.value = ''
  try {
    result.value = await lookup(companyId.value, customerId.value, productId.value)
  } catch (err) {
    error.value = apiErrorMessage(err)
    result.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [companiesRes, customersRes, productsRes] = await Promise.all([
    listCompanies({ size: 200 }),
    listCustomers({ size: 1000 }),
    listProducts({ size: 1000 })
  ])
  companies.value = companiesRes.data
  customers.value = customersRes.data
  products.value = productsRes.data
})
</script>

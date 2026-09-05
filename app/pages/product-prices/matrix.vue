<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Product prices — matrix</h1>
      <div class="flex items-center gap-2">
        <UButton to="/product-prices" size="sm" color="neutral" variant="soft" icon="i-lucide-list">List view</UButton>
        <UButton size="sm" icon="i-lucide-save" :loading="saving" :disabled="dirtyKeys.size === 0" @click="saveChanges">
          Save changes ({{ dirtyKeys.size }})
        </UButton>
      </div>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <USelect v-model="companyId" :items="companyOptions" placeholder="Select a company" class="w-56" />
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Edit any cell to set a per-product price override for that price group. Leave a cell blank to fall back to the price group's default discount (if
          any), then the product's own selling price.
        </span>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UAlert
      v-if="!companyId"
      color="neutral"
      variant="subtle"
      title="Select a company"
      description="Choose a company above to see its products and price groups."
      icon="i-lucide-info"
    />

    <UAlert
      v-else-if="!loading && priceGroups.length === 0"
      color="warning"
      variant="subtle"
      title="No price groups yet"
      description="Create at least one price group for this company before setting per-product prices."
      icon="i-lucide-triangle-alert"
    />

    <UCard v-else>
      <div v-if="loading" class="py-10 text-center text-gray-500 dark:text-gray-400">Loading…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-2 pr-4 sticky left-0 bg-white dark:bg-gray-900 min-w-[14rem]">Product</th>
              <th v-for="pg in priceGroups" :key="pg.id" class="text-left py-2 px-3 min-w-[10rem]">
                {{ pg.name }}
                <span v-if="pg.discountPercent != null" class="block text-xs font-normal text-gray-500 dark:text-gray-400">
                  {{ pg.discountPercent }}% off default
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-4 sticky left-0 bg-white dark:bg-gray-900">
                <div class="font-medium text-gray-900 dark:text-white">{{ p.name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ p.sku }} · list {{ formatMoney(p.sellingPrice) }}</div>
              </td>
              <td v-for="pg in priceGroups" :key="pg.id" class="py-1.5 px-3">
                <UInput
                  :model-value="cellDisplay(p, pg)"
                  type="number"
                  min="0"
                  step="0.01"
                  :placeholder="formatMoney(defaultPriceFor(p, pg))"
                  class="w-32"
                  @update:model-value="(v: string | number) => onCellInput(p, pg, v)"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="products.length === 0" icon="i-lucide-package" title="No products for this company" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '~/composables/useProducts'
import type { PriceGroup } from '~/composables/usePriceGroups'
import type { ProductPrice } from '~/composables/useProductPrices'

definePageMeta({ middleware: 'admin' })

const { list: listCompanies } = useCompanies()
const { list: listProducts } = useProducts()
const { list: listPriceGroups } = usePriceGroups()
const { list: listProductPrices, create, update, remove } = useProductPrices()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const companyId = ref<number | undefined>(undefined)
const companyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))

const products = ref<Product[]>([])
const priceGroups = ref<PriceGroup[]>([])
const productPrices = ref<ProductPrice[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

// key = `${productId}:${priceGroupId}`
const originalMap = ref<Map<string, ProductPrice>>(new Map())
const edits = reactive<Record<string, string>>({})
const dirtyKeys = ref<Set<string>>(new Set())

function keyOf(productId: number, priceGroupId: number) {
  return `${productId}:${priceGroupId}`
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return value.toFixed(2)
}

function defaultPriceFor(product: Product, priceGroup: PriceGroup) {
  if (priceGroup.discountPercent == null) return product.sellingPrice
  return Math.round(product.sellingPrice * (1 - priceGroup.discountPercent / 100) * 100) / 100
}

function cellDisplay(product: Product, priceGroup: PriceGroup): string {
  const key = keyOf(product.id, priceGroup.id)
  if (key in edits) return edits[key] ?? ''
  const original = originalMap.value.get(key)
  return original ? String(original.price) : ''
}

function onCellInput(product: Product, priceGroup: PriceGroup, value: string | number) {
  const key = keyOf(product.id, priceGroup.id)
  edits[key] = value === null || value === undefined ? '' : String(value)
  dirtyKeys.value.add(key)
}

async function loadScope() {
  if (!companyId.value) {
    products.value = []
    priceGroups.value = []
    productPrices.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [prodRes, pgRes, ppRes] = await Promise.all([
      listProducts({ companyId: companyId.value, size: 500 }),
      listPriceGroups({ companyId: companyId.value, active: true, size: 200 }),
      listProductPrices({ companyId: companyId.value, size: 1000 })
    ])
    products.value = prodRes.data
    priceGroups.value = pgRes.data
    productPrices.value = ppRes.data
    originalMap.value = new Map(productPrices.value.map((pp) => [keyOf(pp.productId, pp.priceGroupId), pp]))
    for (const k of Object.keys(edits)) delete edits[k]
    dirtyKeys.value = new Set()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  saving.value = true
  error.value = ''
  try {
    for (const key of dirtyKeys.value) {
      const [productIdStr, priceGroupIdStr] = key.split(':')
      const productId = Number(productIdStr)
      const priceGroupId = Number(priceGroupIdStr)
      const raw = edits[key]
      const original = originalMap.value.get(key)
      const price = raw === '' || raw === undefined ? null : Number(raw)

      if (price === null) {
        if (original) await remove(original.id)
      } else if (original) {
        await update(original.id, { companyId: companyId.value!, productId, priceGroupId, price })
      } else {
        await create({ companyId: companyId.value!, productId, priceGroupId, price })
      }
    }
    toast.add({ title: 'Price overrides saved', color: 'success' })
    await loadScope()
  } catch (err) {
    error.value = apiErrorMessage(err)
    toast.add({ title: 'Could not save all changes', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  companies.value = (await listCompanies({ size: 200 })).data
  const firstActive = companies.value.find((c) => c.active)
  if (firstActive) companyId.value = firstActive.id
})
watch(companyId, loadScope)
</script>

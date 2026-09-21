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
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Edit any cell to set a per-product price override for that price group. Leave a cell blank to fall back to the price group's default discount (if any),
        then the product's own selling price.
      </span>
      <!-- Every price here is per one base unit. Since an order line in a
           larger unit multiplies this by the conversion factor, someone
           entering a per-case figure would overcharge by the factor — so the
           unit is spelled out on every row rather than left to be inferred. -->
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Prices are per the product's <span class="font-medium text-gray-700 dark:text-gray-300">base unit</span>, shown after each product below. An order line
        in a larger unit is priced at this figure times its conversion factor — a case of 12 costs 12&times; the unit price.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UAlert
      v-if="productsTruncated || pricesTruncated"
      color="warning"
      variant="subtle"
      class="mb-4"
      icon="i-lucide-triangle-alert"
      title="Showing a partial matrix"
      :description="
        productsTruncated
          ? 'Only the first 500 products were loaded. Use the list view and its product filter to reach the rest.'
          : 'Only the first 1000 existing overrides were loaded, so some cells may look blank when they are not. Use the list view to check.'
      "
    />

    <UAlert
      v-if="!loading && priceGroups.length === 0"
      color="warning"
      variant="subtle"
      title="No price groups yet"
      description="Create at least one price group before setting per-product prices."
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
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ p.sku }} · list {{ formatMoney(p.sellingPrice) }}{{ perUnit(p) }}</div>
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
        <EmptyState v-if="products.length === 0" icon="i-lucide-package" title="No products yet" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '~/composables/useProducts'
import type { PriceGroup } from '~/composables/usePriceGroups'
import type { ProductPrice } from '~/composables/useProductPrices'

definePageMeta({ middleware: 'admin' })

const { list: listProducts } = useProducts()
const { list: listPriceGroups } = usePriceGroups()
const { list: listProductPrices, create, update, remove } = useProductPrices()
const toast = useToast()

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

// Unsaved cells only live in `edits` until Save is pressed, and a sidebar
// click, browser back or refresh threw the lot away silently. Same guard the
// detail forms use.
useUnsavedChangesGuard(computed(() => dirtyKeys.value.size > 0))

// The lists below are fetched as single capped pages. Coming back full means
// there may be more on the server that this grid never loaded — and an
// unlabelled partial matrix looks exactly like a complete one.
const productsTruncated = computed(() => products.value.length >= 500)
const pricesTruncated = computed(() => productPrices.value.length >= 1000)

function keyOf(productId: number, priceGroupId: number) {
  return `${productId}:${priceGroupId}`
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return value.toFixed(2)
}

// " / PCS" — every figure in this grid is per one of these, and an order line
// in a bigger unit multiplies by the conversion factor.
function perUnit(product: Product) {
  return product.unitOfMeasureAbbreviation ? ` / ${product.unitOfMeasureAbbreviation}` : ''
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
  loading.value = true
  error.value = ''
  try {
    const [prodRes, pgRes, ppRes] = await Promise.all([
      listProducts({ size: 500 }),
      listPriceGroups({ active: true, size: 200 }),
      listProductPrices({ size: 1000 })
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

  // Each cell is its own request, so a failure partway through leaves earlier
  // cells already saved. Wrapping the whole loop in one try meant the toast
  // said "could not save" while some edits had in fact persisted, and nothing
  // said which. Failures are collected per cell instead, then restored as
  // pending edits after the reload so they can be retried without retyping.
  const failedEdits = new Map<string, string>()
  let savedCount = 0
  let lastError: unknown = null

  for (const key of [...dirtyKeys.value]) {
    const [productIdStr, priceGroupIdStr] = key.split(':')
    const productId = Number(productIdStr)
    const priceGroupId = Number(priceGroupIdStr)
    const raw = edits[key]
    const original = originalMap.value.get(key)
    const price = raw === '' || raw === undefined ? null : Number(raw)

    try {
      if (price === null) {
        if (original) await remove(original.id)
      } else if (original) {
        await update(original.id, { productId, priceGroupId, price })
      } else {
        await create({ productId, priceGroupId, price })
      }
      savedCount++
    } catch (err) {
      failedEdits.set(key, raw ?? '')
      lastError = err
    }
  }

  // Reload first so saved cells show the server's values, then put the failed
  // ones back as dirty — the user's typing survives for a retry.
  await loadScope()
  for (const [key, raw] of failedEdits) {
    edits[key] = raw
    dirtyKeys.value.add(key)
  }

  if (failedEdits.size === 0) {
    toast.add({ title: `${savedCount} price ${savedCount === 1 ? 'override' : 'overrides'} saved`, color: 'success' })
  } else {
    error.value = apiErrorMessage(lastError)
    toast.add({
      title: `Saved ${savedCount}, ${failedEdits.size} failed`,
      description: `${apiErrorMessage(lastError)} — the failed cells are still highlighted for retry.`,
      color: 'error'
    })
  }
  saving.value = false
}

onMounted(loadScope)
</script>

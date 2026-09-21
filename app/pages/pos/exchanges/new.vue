<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" :to="'/pos/exchanges'" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">New exchange</h1>
      </div>
      <UButton v-if="session" size="sm" color="neutral" variant="soft" :icon="kioskMode ? 'i-lucide-minimize' : 'i-lucide-maximize'" @click="toggleKiosk">
        {{ kioskMode ? 'Exit full screen' : 'Full screen' }}
      </UButton>
    </div>

    <!-- ── No register selected / no session open ─────────────────────── -->
    <UCard v-if="!session">
      <div class="space-y-4 max-w-md">
        <UFormField label="Register" required>
          <USelect v-model="selectedRegisterId" :items="registerOptions" placeholder="Select a register" class="w-full" />
        </UFormField>
        <template v-if="selectedRegister">
          <UAlert
            v-if="selectedRegister.hasOpenSession"
            color="info"
            variant="subtle"
            title="This register already has an open session"
            description="Resuming it now."
          />
          <UFormField v-else label="Opening float">
            <UInput v-model.number="openingFloat" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
        </template>
        <UAlert v-if="sessionError" color="error" variant="subtle" :title="sessionError" />
        <UButton :loading="openingSession" :disabled="!selectedRegisterId" @click="onStart">
          {{ selectedRegister?.hasOpenSession ? 'Resume session' : 'Open session' }}
        </UButton>
      </div>
    </UCard>

    <template v-else>
      <!-- ── Find the original sale ────────────────────────────────────── -->
      <UCard v-if="!originalSale" class="mb-4">
        <div class="flex flex-wrap gap-3 items-end">
          <UFormField label="Sale number" class="w-64">
            <UInput v-model="saleSearchTerm" placeholder="POS-000123" icon="i-lucide-search" @keyup.enter="onSearchSale" />
          </UFormField>
          <UButton :loading="searchingSale" @click="onSearchSale">Find</UButton>
        </div>
        <UAlert v-if="searchError" color="error" variant="subtle" class="mt-3" :title="searchError" />
        <div v-if="searchResults.length > 0" class="mt-4">
          <DataTable :rows="searchResults" :columns="searchColumns" numbered>
            <template #actions-data="{ row }">
              <UButton size="xs" color="primary" variant="soft" @click="selectSale(row)">Select</UButton>
            </template>
          </DataTable>
        </div>
      </UCard>

      <template v-else>
        <UCard class="mb-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Exchanging against</p>
              <p class="font-semibold text-gray-900 dark:text-white">{{ originalSale.saleNumber }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(originalSale.saleDate) }} — {{ originalSale.customerName ?? 'Walk-in' }}</p>
            </div>
            <UButton size="sm" color="neutral" variant="soft" @click="clearSale">Change sale</UButton>
          </div>
        </UCard>

        <!-- ── Return lines ─────────────────────────────────────────────── -->
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Return items</h2>
              <UInput v-model="scanTerm" placeholder="Scan barcode to return" icon="i-lucide-scan-barcode" size="sm" class="w-56" @keyup.enter="onScanReturn" />
            </div>
          </template>
          <div v-if="returnableLines.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            Every line on this sale has already been fully returned
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="line in returnableLines"
              :key="line.id"
              class="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div class="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img v-if="imageUrlFor(line.productId)" :src="imageUrlFor(line.productId)!" :alt="line.productName ?? ''" class="w-full h-full object-cover" />
                <UIcon v-else name="i-lucide-package" class="w-5 h-5 text-gray-300 dark:text-gray-700" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ line.productName }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Sold {{ line.quantity }} · Remaining to return: {{ remainingOf(line) }}</p>
              </div>
              <UInput
                v-model.number="returnQuantities[line.id]"
                type="number"
                min="0"
                :max="remainingOf(line)"
                step="1"
                class="w-24"
                @update:model-value="(v: number) => clampReturnQuantity(line, v)"
              />
              <span class="w-24 text-right text-sm font-medium">{{ formatCurrency(returnLineValue(line)) }}</span>
            </div>
          </div>
        </UCard>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <!-- ── New items ──────────────────────────────────────────────── -->
          <div class="lg:col-span-2 space-y-4">
            <UCard>
              <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">New items (optional)</h2></template>
              <UInput v-model="search" placeholder="Search products…" icon="i-lucide-search" class="w-full mb-3" />
              <div v-if="visibleProducts.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No products match</div>
              <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button
                  v-for="product in visibleProducts"
                  :key="product.id"
                  type="button"
                  class="text-left rounded-xl border bg-white dark:bg-gray-900 overflow-hidden transition-shadow"
                  :class="[
                    stockTierFor(product.id) === 'out' ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-800' : 'hover:shadow-md',
                    stockTierFor(product.id) === 'low' ? 'border-warning/40' : 'border-gray-200 dark:border-gray-800'
                  ]"
                  :disabled="stockTierFor(product.id) === 'out'"
                  @click="addToCart(product)"
                >
                  <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-lucide-package" class="w-10 h-10 text-gray-300 dark:text-gray-700" />
                  </div>
                  <div class="p-3">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ product.name }}</p>
                    <p
                      v-if="showAvailableStock || stockTierFor(product.id) === 'out'"
                      class="text-xs truncate flex items-center gap-1"
                      :class="{
                        'text-error': stockTierFor(product.id) === 'out',
                        'text-warning': stockTierFor(product.id) === 'low',
                        'text-gray-500 dark:text-gray-400': stockTierFor(product.id) === 'ok'
                      }"
                    >
                      <UIcon v-if="stockTierFor(product.id) === 'low'" name="i-lucide-triangle-alert" class="w-3 h-3" />
                      {{ stockTierFor(product.id) === 'out' ? 'Out of stock' : `${availableFor(product.id)} available` }}
                    </p>
                    <div class="flex items-center justify-between mt-2">
                      <span class="font-semibold text-primary-600 dark:text-primary-400">{{ formatCurrency(product.sellingPrice) }}</span>
                      <UButton size="xs" icon="i-lucide-plus" color="primary" :disabled="remainingStockFor(product.id) <= 0" @click.stop="addToCart(product)" />
                    </div>
                  </div>
                </button>
              </div>
            </UCard>

            <UCard v-if="newCart.length > 0">
              <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">New items selected</h2></template>
              <div class="space-y-3">
                <div v-for="(line, i) in newCart" :key="i" class="flex items-center gap-3">
                  <div class="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img v-if="line.imageUrl" :src="line.imageUrl" :alt="line.name" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-lucide-package" class="w-5 h-5 text-gray-300 dark:text-gray-700" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ line.name }}</p>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UButton size="xs" icon="i-lucide-minus" variant="soft" color="neutral" @click="decrementLine(i)" />
                    <span class="w-5 text-center text-sm tabular-nums">{{ line.quantity }}</span>
                    <UButton size="xs" icon="i-lucide-plus" variant="soft" color="neutral" @click="incrementLine(i)" />
                  </div>
                  <span class="w-16 text-right text-sm font-medium">{{ formatCurrency(newLineTotal(line)) }}</span>
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" @click="newCart.splice(i, 1)" />
                </div>
              </div>
            </UCard>
          </div>

          <!-- ── Settlement panel ───────────────────────────────────────── -->
          <UCard class="lg:sticky lg:top-4">
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Settlement</h2></template>

            <dl class="text-sm space-y-1">
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Return value</dt>
                <dd>-{{ formatCurrency(returnTotal) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">New items</dt>
                <dd>{{ formatCurrency(newTotal) }}</dd>
              </div>
              <div class="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-800">
                <dt>{{ netLabel }}</dt>
                <dd :class="netAmount > 0 ? 'text-error' : netAmount < 0 ? 'text-success' : ''">{{ formatCurrency(Math.abs(netAmount)) }}</dd>
              </div>
            </dl>

            <template v-if="netAmount !== 0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white mt-4 mb-2">Settlement method</p>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="m in tenderMethodOptions"
                  :key="m.value"
                  type="button"
                  class="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors"
                  :class="
                    settlementMethod === m.value
                      ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                  "
                  @click="settlementMethod = m.value"
                >
                  <UIcon :name="m.icon" class="w-5 h-5" />
                  {{ m.label }}
                </button>
              </div>

              <template v-if="settlementMethod === 'CASH' && netAmount > 0">
                <UFormField label="Cash tendered" class="mt-3">
                  <UInput v-model.number="cashTendered" type="number" min="0" step="0.01" class="w-full" />
                </UFormField>
                <dl class="text-sm space-y-1 mt-2">
                  <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">Change due</dt>
                    <dd>{{ formatCurrency(changeDuePreview) }}</dd>
                  </div>
                </dl>
              </template>
            </template>

            <UAlert v-if="createError" color="error" variant="subtle" class="mt-3" :title="createError" />
            <UButton block size="lg" class="mt-4" :loading="creating" :disabled="!canSubmit" @click="onSubmit">Complete exchange</UButton>
          </UCard>
        </div>
      </template>
    </template>

    <!-- ── Confirmation ─────────────────────────────────────────────────── -->
    <UModal v-model:open="showConfirm" title="Exchange complete">
      <template #body>
        <div v-if="completedExchange" class="max-w-xs mx-auto space-y-3 text-sm font-mono text-gray-900 dark:text-white">
          <div class="text-center space-y-0.5">
            <p class="font-semibold text-base">{{ completedExchange.exchangeNumber }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Against {{ completedExchange.originalSaleNumber }}</p>
          </div>
          <div class="border-t border-dashed border-gray-200 dark:border-gray-800" />
          <dl class="space-y-1">
            <div class="flex justify-between">
              <dt>Return value</dt>
              <dd>-{{ formatCurrency(completedExchange.returnValue + completedExchange.returnTaxValue) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>New items</dt>
              <dd>{{ formatCurrency(completedExchange.newValue + completedExchange.newTaxValue) }}</dd>
            </div>
            <div class="flex justify-between font-semibold text-base pt-1 border-t border-dashed border-gray-200 dark:border-gray-800">
              <dt>{{ completedExchange.netAmount > 0 ? 'Customer paid' : completedExchange.netAmount < 0 ? 'Refunded' : 'Even exchange' }}</dt>
              <dd>{{ formatCurrency(Math.abs(completedExchange.netAmount)) }}</dd>
            </div>
            <div v-if="completedExchange.changeDue" class="flex justify-between">
              <dt>Change</dt>
              <dd>{{ formatCurrency(completedExchange.changeDue) }}</dd>
            </div>
          </dl>
          <p class="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">Thank you!</p>
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <UButton @click="onDone">Done</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Register } from '~/composables/useRegisters'
import type { PosSession } from '~/composables/usePosSessions'
import type { PosSale, PosSaleLine, PosTenderMethod } from '~/composables/usePosSales'
import type { PosExchange } from '~/composables/usePosExchanges'
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()

const { list: listRegisters } = useRegisters()
const { open: openSession, get: getSession } = usePosSessions()
const { list: listSales, get: getSale } = usePosSales()
const { create: createExchange } = usePosExchanges()
const { list: listProducts } = useProducts()
const { get: getInventoryOverview } = useInventoryOverview()
const { kioskMode, toggle: toggleKiosk, disable: disableKiosk } = useKioskMode()
const { getForCompany: getInventorySettings } = useInventorySettings()
const toast = useToast()

onBeforeUnmount(disableKiosk)

// Display-only toggles from the register's company's Inventory Settings —
// same convention as pos/index.vue.
const showAvailableStock = ref(true)
const stockWarningEnabled = ref(true)
async function loadInventorySettings() {
  if (!selectedRegister.value) return
  try {
    const settings = await getInventorySettings(selectedRegister.value.companyId)
    showAvailableStock.value = settings.showAvailableStock
    stockWarningEnabled.value = settings.stockWarningEnabled
  } catch {
    // Non-critical — badges just keep showing at their default.
  }
}

// ── Register / session ────────────────────────────────────────────────
const registers = ref<Register[]>([])
const selectedRegisterId = ref<number | undefined>(undefined)
const selectedRegister = computed(() => registers.value.find((r) => r.id === selectedRegisterId.value))
const registerOptions = computed(() => registers.value.filter((r) => r.active).map((r) => ({ label: r.name, value: r.id })))

const openingFloat = ref(0)
const openingSession = ref(false)
const sessionError = ref('')
const session = ref<PosSession | null>(null)

async function onStart() {
  if (!selectedRegisterId.value) return
  openingSession.value = true
  sessionError.value = ''
  try {
    if (selectedRegister.value?.hasOpenSession && selectedRegister.value.openPosSessionId) {
      session.value = await getSession(selectedRegister.value.openPosSessionId)
    } else {
      session.value = await openSession(selectedRegisterId.value, openingFloat.value || 0)
    }
    rememberRegister(selectedRegisterId.value)
    await loadStock()
    await loadInventorySettings()
  } catch (err) {
    sessionError.value = apiErrorMessage(err)
  } finally {
    openingSession.value = false
  }
}

// Same per-browser "last register used" convenience as the checkout page
// (see pos/index.vue) — kept under the same localStorage key so picking a
// register once covers both screens.
const LAST_REGISTER_KEY = 'pos:lastRegisterId'
function rememberRegister(id: number) {
  try {
    localStorage.setItem(LAST_REGISTER_KEY, String(id))
  } catch {
    // Non-critical — just skip remembering it.
  }
}

// ── Find the original sale ────────────────────────────────────────────
const originalSale = ref<PosSale | null>(null)
const saleSearchTerm = ref('')
const searchingSale = ref(false)
const searchError = ref('')
const searchResults = ref<PosSale[]>([])
const searchColumns: ColumnDef<PosSale>[] = [
  { key: 'saleNumber', label: 'Sale #' },
  { key: 'saleDate', label: 'Date', type: 'datetime' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
  { key: 'actions', label: '' }
]

async function onSearchSale() {
  if (!saleSearchTerm.value.trim()) return
  searchingSale.value = true
  searchError.value = ''
  try {
    const res = await listSales({ saleNumber: saleSearchTerm.value.trim(), status: 'COMPLETED', size: 20 })
    searchResults.value = res.data
    if (res.data.length === 0) searchError.value = 'No completed sale matches that number'
  } catch (err) {
    searchError.value = apiErrorMessage(err)
  } finally {
    searchingSale.value = false
  }
}

function selectSale(sale: PosSale) {
  originalSale.value = sale
  initReturnQuantities()
  searchResults.value = []
}

function clearSale() {
  originalSale.value = null
  returnQuantities.value = {}
  newCart.value = []
  settlementMethod.value = undefined
  cashTendered.value = 0
}

async function loadSaleFromQuery() {
  const saleId = Number(route.query.saleId)
  if (!saleId) return
  try {
    originalSale.value = await getSale(saleId)
    initReturnQuantities()
  } catch (err) {
    toast.add({ title: 'Could not load that sale', description: apiErrorMessage(err), color: 'error' })
  }
}

// ── Return lines ───────────────────────────────────────────────────────
const returnQuantities = ref<Record<number, number>>({})
function initReturnQuantities() {
  const quantities: Record<number, number> = {}
  for (const line of originalSale.value?.lines ?? []) {
    if (remainingOf(line) > 0) quantities[line.id] = 0
  }
  returnQuantities.value = quantities
}
const returnableLines = computed(() => (originalSale.value?.lines ?? []).filter((l) => remainingOf(l) > 0))
function remainingOf(line: PosSaleLine): number {
  return line.quantity - line.returnedQuantity
}
function clampReturnQuantity(line: PosSaleLine, value: number) {
  const max = remainingOf(line)
  const clamped = Math.max(0, Math.min(value || 0, max))
  returnQuantities.value[line.id] = clamped
}
function returnLineValue(line: PosSaleLine): number {
  const qty = returnQuantities.value[line.id] || 0
  const gross = qty * line.unitPrice
  const net = gross - gross * (line.discountPercent / 100)
  return net + net * (line.taxRate / 100)
}

// Scan the physical item being returned instead of typing a quantity —
// finds the matching line on this sale by the product's barcode and bumps
// its return quantity by one, clamped the same way manual entry is.
const scanTerm = ref('')
function onScanReturn() {
  const term = scanTerm.value.trim().toLowerCase()
  scanTerm.value = ''
  if (!term) return
  const product = products.value.find((p) => p.barcode?.toLowerCase() === term)
  if (!product) {
    toast.add({ title: 'No product matches that barcode', color: 'warning' })
    return
  }
  const line = returnableLines.value.find((l) => l.productId === product.id)
  if (!line) {
    toast.add({ title: `${product.name} isn't returnable on this sale`, color: 'warning' })
    return
  }
  clampReturnQuantity(line, (returnQuantities.value[line.id] || 0) + 1)
}
const returnTotal = computed(() => (originalSale.value?.lines ?? []).reduce((sum, l) => sum + returnLineValue(l), 0))

// ── New items ──────────────────────────────────────────────────────────
interface ProductLite {
  id: number
  name: string
  sku: string
  barcode: string | null
  sellingPrice: number
  taxRate: number
  companyId: number
  status: string
  imageUrl: string | null
}
interface NewCartLine {
  productId: number
  name: string
  unitPrice: number
  taxRate: number
  quantity: number
  discountPercent: number
  imageUrl: string | null
}

const products = ref<ProductLite[]>([])
// Original sale lines carry no imageUrl of their own (see PosSaleLineResponse) —
// this joins a return line's productId against the already-loaded product
// catalog so its thumbnail can reuse the exact same fallback the new-items
// grid uses instead of going without an image entirely.
function imageUrlFor(productId: number): string | null {
  return products.value.find((p) => p.id === productId)?.imageUrl ?? null
}
const search = ref('')
const visibleProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return products.value.filter((p) => {
    if (p.status !== 'ACTIVE' || p.companyId !== selectedRegister.value?.companyId) return false
    if (!term) return true
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.barcode?.toLowerCase() === term
  })
})

const stockByProduct = ref<Map<number, number>>(new Map())
async function loadStock() {
  if (!selectedRegister.value) return
  const res = await getInventoryOverview({ warehouseId: selectedRegister.value.warehouseId, size: 10000 })
  stockByProduct.value = new Map(res.data.map((row) => [row.productId, row.availableStock]))
}
function availableFor(productId: number): number {
  return stockByProduct.value.get(productId) ?? 0
}
function newCartQuantityFor(productId: number): number {
  return newCart.value.find((l) => l.productId === productId)?.quantity ?? 0
}
function remainingStockFor(productId: number): number {
  return availableFor(productId) - newCartQuantityFor(productId)
}
const LOW_STOCK_THRESHOLD = 5
function stockTierFor(productId: number): 'out' | 'low' | 'ok' {
  const remaining = remainingStockFor(productId)
  if (remaining <= 0) return 'out'
  if (remaining <= LOW_STOCK_THRESHOLD && stockWarningEnabled.value) return 'low'
  return 'ok'
}

const newCart = ref<NewCartLine[]>([])
function addToCart(product: ProductLite) {
  if (remainingStockFor(product.id) <= 0) {
    toast.add({ title: `${product.name} is out of stock`, color: 'warning' })
    return
  }
  const existing = newCart.value.find((l) => l.productId === product.id)
  if (existing) {
    existing.quantity += 1
  } else {
    newCart.value.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.sellingPrice,
      taxRate: product.taxRate,
      quantity: 1,
      discountPercent: 0,
      imageUrl: product.imageUrl
    })
  }
}
function incrementLine(index: number) {
  const line = newCart.value[index]
  if (!line) return
  if (remainingStockFor(line.productId) <= 0) {
    toast.add({ title: 'No more stock available', color: 'warning' })
    return
  }
  line.quantity += 1
}
function decrementLine(index: number) {
  const line = newCart.value[index]
  if (!line) return
  if (line.quantity <= 1) {
    newCart.value.splice(index, 1)
  } else {
    line.quantity -= 1
  }
}
function newLineNet(line: NewCartLine) {
  const gross = line.quantity * line.unitPrice
  return gross - gross * (line.discountPercent / 100)
}
function newLineTax(line: NewCartLine) {
  return newLineNet(line) * (line.taxRate / 100)
}
function newLineTotal(line: NewCartLine) {
  return newLineNet(line) + newLineTax(line)
}
const newTotal = computed(() => newCart.value.reduce((sum, l) => sum + newLineTotal(l), 0))

// ── Net settlement ─────────────────────────────────────────────────────
const netAmount = computed(() => Math.round((newTotal.value - returnTotal.value) * 100) / 100)
const netLabel = computed(() => (netAmount.value > 0 ? 'Customer owes' : netAmount.value < 0 ? 'Refund due' : 'Even exchange'))

const settlementMethod = ref<PosTenderMethod | undefined>(undefined)
const tenderMethodOptions: { label: string; value: PosTenderMethod; icon: string }[] = [
  { label: 'Cash', value: 'CASH', icon: 'i-lucide-wallet' },
  { label: 'Card', value: 'CARD', icon: 'i-lucide-credit-card' },
  { label: 'Bank', value: 'BANK_TRANSFER', icon: 'i-lucide-landmark' },
  { label: 'QRS', value: 'PAYMENT_GATEWAY', icon: 'i-lucide-qr-code' }
]
const cashTendered = ref(0)
const changeDuePreview = computed(() => Math.max((cashTendered.value || 0) - netAmount.value, 0))

const hasReturnSelection = computed(() => Object.values(returnQuantities.value).some((q) => (q || 0) > 0))
const canSubmit = computed(() => {
  if (!hasReturnSelection.value) return false
  if (netAmount.value !== 0 && !settlementMethod.value) return false
  if (settlementMethod.value === 'CASH' && netAmount.value > 0 && cashTendered.value < netAmount.value) return false
  return true
})

// ── Submit ─────────────────────────────────────────────────────────────
const creating = ref(false)
const createError = ref('')
const completedExchange = ref<PosExchange | null>(null)
const showConfirm = ref(false)

async function onSubmit() {
  if (!session.value || !originalSale.value) return
  creating.value = true
  createError.value = ''
  try {
    completedExchange.value = await createExchange({
      posSessionId: session.value.id,
      originalPosSaleId: originalSale.value.id,
      returnLines: Object.entries(returnQuantities.value)
        .filter(([, qty]) => (qty || 0) > 0)
        .map(([posSaleLineId, quantity]) => ({ posSaleLineId: Number(posSaleLineId), quantity })),
      newLines: newCart.value.map((l) => ({ productId: l.productId, quantity: l.quantity, discountPercent: l.discountPercent })),
      settlementMethod: netAmount.value !== 0 ? settlementMethod.value : undefined,
      cashTendered: settlementMethod.value === 'CASH' && netAmount.value > 0 ? cashTendered.value : undefined
    })
    showConfirm.value = true
    await loadStock()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

function onDone() {
  router.push('/pos/exchanges')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  const r = await listRegisters({ active: true, size: 200 })
  registers.value = r.data
  if (registers.value.length === 1) {
    selectedRegisterId.value = registers.value[0]?.id
  } else {
    let lastId = 0
    try {
      lastId = Number(localStorage.getItem(LAST_REGISTER_KEY))
    } catch {
      // Non-critical — just skip the pre-selection.
    }
    if (lastId && registers.value.some((r) => r.id === lastId)) {
      selectedRegisterId.value = lastId
    }
  }
  const productsRes = await listProducts({ size: 10000 })
  products.value = productsRes.data
  await loadSaleFromQuery()
})
</script>

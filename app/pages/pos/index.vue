<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Checkout</h1>

    <!-- ── No register selected / no session open ─────────────────────── -->
    <UCard v-if="!session">
      <div class="space-y-4 max-w-md">
        <UFormField label="Register" required>
          <USelect v-model="selectedRegisterId" :items="registerOptions" placeholder="Select a register" class="w-full" @update:model-value="onRegisterChanged" />
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

    <!-- ── Active checkout ──────────────────────────────────────────────── -->
    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Register <span class="font-medium text-gray-900 dark:text-white">{{ selectedRegister?.name }}</span>
          — session opened {{ formatDateTime(session.openedAt) }}
        </p>
        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :icon="kioskMode ? 'i-lucide-minimize' : 'i-lucide-maximize'"
            @click="toggleKiosk"
          >
            {{ kioskMode ? 'Exit full screen' : 'Full screen' }}
          </UButton>
          <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-clock" @click="openHeldSales">
            Held sales<template v-if="heldSales.length > 0"> ({{ heldSales.length }})</template>
          </UButton>
          <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-door-closed" :to="'/pos/sessions'">Close session</UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <!-- ── Browse ─────────────────────────────────────────────────────── -->
        <div class="lg:col-span-2 space-y-4">
          <UInput
            v-model="search"
            placeholder="Search menu…"
            icon="i-lucide-search"
            size="lg"
            class="w-full"
            autofocus
            @keyup.enter="onSearchEnter"
          />

          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="cat in categoryChips"
              :key="cat.id ?? 'all'"
              type="button"
              class="flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors"
              :class="
                selectedCategoryId === cat.id
                  ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              "
              @click="selectedCategoryId = cat.id"
            >
              <UIcon :name="cat.icon" class="w-5 h-5" />
              {{ cat.name }}
            </button>
          </div>

          <div v-if="productsLoading" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <USkeleton class="aspect-square w-full" />
              <div class="p-3 space-y-2">
                <USkeleton class="h-4 w-3/4" />
                <USkeleton class="h-3 w-1/2" />
              </div>
            </div>
          </div>
          <div v-else-if="visibleProducts.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">No products match</div>
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
                  <UButton
                    size="xs"
                    icon="i-lucide-plus"
                    color="primary"
                    :disabled="stockTierFor(product.id) === 'out'"
                    @click.stop="addToCart(product)"
                  />
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- ── Cart / checkout panel ────────────────────────────────────────── -->
        <UCard class="lg:sticky lg:top-4">
          <template #header>
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Cart</h2>
          </template>

          <div v-if="cart.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
            <UIcon name="i-lucide-shopping-cart" class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
            Tap a product to add it
          </div>
          <div v-else class="space-y-3 max-h-72 overflow-y-auto pr-1">
            <div v-for="(line, i) in cart" :key="i" class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img v-if="line.imageUrl" :src="line.imageUrl" :alt="line.name" class="w-full h-full object-cover" />
                <UIcon v-else name="i-lucide-package" class="w-5 h-5 text-gray-300 dark:text-gray-700" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ line.name }}</p>
                <p class="text-xs truncate flex items-center gap-1" :class="stockTierFor(line.productId) === 'low' ? 'text-warning' : 'text-gray-500 dark:text-gray-400'">
                  <UIcon v-if="stockTierFor(line.productId) === 'low'" name="i-lucide-triangle-alert" class="w-3 h-3 shrink-0" />
                  {{ stockTierFor(line.productId) === 'low' ? `Only ${availableFor(line.productId)} in stock` : (line.categoryName ?? '—') }}
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <UButton size="xs" icon="i-lucide-minus" variant="soft" color="neutral" @click="decrementLine(i)" />
                <UInput
                  :model-value="line.quantity"
                  type="number"
                  min="1"
                  size="xs"
                  class="w-14"
                  :ui="{ base: 'text-center' }"
                  @update:model-value="(v) => setLineQuantity(i, Number(v))"
                />
                <UButton size="xs" icon="i-lucide-plus" variant="soft" color="neutral" @click="incrementLine(i)" />
              </div>
              <span class="w-16 text-right text-sm font-medium">{{ formatCurrency(lineTotal(line)) }}</span>
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" @click="cart.splice(i, 1)" />
            </div>
          </div>

          <UFormField label="Customer" class="mt-4">
            <USelectMenu v-model="customerId" :items="customerOptions" value-key="value" placeholder="Walk-in" class="w-full" />
          </UFormField>

          <dl class="text-sm space-y-1 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div class="flex justify-between text-gray-500 dark:text-gray-400"><dt>Items</dt><dd>{{ itemCount }} ({{ cart.length }} item{{ cart.length === 1 ? '' : 's' }})</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Subtotal</dt><dd>{{ formatCurrency(totals.subtotal) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Discount</dt><dd class="text-error">-{{ formatCurrency(totals.discountAmount) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Tax</dt><dd>{{ formatCurrency(totals.taxAmount) }}</dd></div>
            <div class="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-800">
              <dt>Total</dt><dd>{{ formatCurrency(totals.totalAmount) }}</dd>
            </div>
          </dl>

          <div class="mt-4">
            <p class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Payment method</p>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="m in tenderMethodOptions"
                :key="m.value"
                type="button"
                class="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors"
                :class="
                  quickMethod === m.value
                    ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                "
                @click="selectQuickMethod(m.value)"
              >
                <UIcon :name="m.icon" class="w-5 h-5" />
                {{ m.label }}
              </button>
            </div>
            <div v-if="quickMethod === 'CASH'" class="flex flex-wrap gap-2 mt-2">
              <UButton v-for="amt in cashQuickAmounts" :key="amt" size="xs" variant="soft" color="neutral" @click="setCashAmount(amt)">
                {{ formatCurrency(amt) }}
              </UButton>
            </div>
          </div>

          <div v-if="tenders.length > 0" class="space-y-2 mt-3">
            <div v-for="(tender, i) in tenders" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <USelect v-model="tender.method" :items="tenderSelectOptions" class="col-span-5" />
              <UInput v-model.number="tender.amount" type="number" min="0" step="0.01" class="col-span-6" />
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="tenders.splice(i, 1)" />
            </div>
          </div>
          <UButton size="xs" variant="link" icon="i-lucide-plus" class="mt-1 px-0" @click="addTender">Split payment</UButton>

          <dl class="text-sm space-y-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Tendered</dt><dd>{{ formatCurrency(tenderedTotal) }}</dd></div>
            <div class="flex justify-between font-medium">
              <dt>{{ remaining > 0 ? 'Remaining' : 'Change due' }}</dt>
              <dd :class="remaining > 0 ? 'text-error' : 'text-success'">{{ formatCurrency(Math.abs(remaining)) }}</dd>
            </div>
          </dl>

          <UAlert v-if="checkoutError" color="error" variant="subtle" class="mt-3" :title="checkoutError" />
          <div class="flex gap-2 mt-4">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-trash-2"
              :disabled="cart.length === 0"
              @click="confirmClearCart = true"
            />
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-clock"
              :disabled="cart.length === 0"
              @click="openHoldModal"
            >
              Hold
            </UButton>
            <UButton block size="lg" class="flex-1" :loading="checkingOut" :disabled="cart.length === 0 || remaining > 0" @click="onCheckout">
              Process transaction
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

    <!-- ── Receipt ──────────────────────────────────────────────────────── -->
    <UModal v-model:open="showReceipt" title="Sale complete">
      <template #body>
        <div v-if="completedSale" id="pos-receipt" class="max-w-xs mx-auto space-y-3 text-sm font-mono text-gray-900 dark:text-white">
          <div class="text-center space-y-0.5">
            <p class="font-semibold text-base">{{ selectedRegister?.companyName ?? 'Receipt' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ selectedRegister?.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ completedSale.saleNumber }} · {{ formatDateTime(completedSale.saleDate) }}</p>
          </div>
          <div class="border-t border-dashed border-gray-200 dark:border-gray-800" />
          <ul class="space-y-1.5">
            <li v-for="line in completedSale.lines" :key="line.id">
              <div class="flex justify-between gap-2">
                <span class="truncate">{{ line.productName }}</span>
                <span class="shrink-0">{{ formatCurrency(line.lineTotal) }}</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ line.quantity }} × {{ formatCurrency(line.unitPrice) }}<span v-if="line.discountPercent > 0"> · -{{ line.discountPercent }}%</span>
              </p>
            </li>
          </ul>
          <div class="border-t border-dashed border-gray-200 dark:border-gray-800" />
          <dl class="space-y-1">
            <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ formatCurrency(completedSale.subtotal) }}</dd></div>
            <div class="flex justify-between"><dt>Discount</dt><dd>-{{ formatCurrency(completedSale.discountAmount) }}</dd></div>
            <div v-for="tb in receiptTaxBreakdown" :key="tb.rate" class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <dt>Tax @ {{ tb.rate }}%</dt>
              <dd>{{ formatCurrency(tb.amount) }}</dd>
            </div>
            <div class="flex justify-between font-semibold text-base pt-1 border-t border-dashed border-gray-200 dark:border-gray-800">
              <dt>Total</dt>
              <dd>{{ formatCurrency(completedSale.totalAmount) }}</dd>
            </div>
            <div v-if="completedSale.changeDue" class="flex justify-between"><dt>Change</dt><dd>{{ formatCurrency(completedSale.changeDue) }}</dd></div>
          </dl>
          <p class="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">Thank you!</p>
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <UButton color="neutral" variant="soft" icon="i-lucide-printer" @click="printReceipt">Print</UButton>
          <UButton @click="onNewSale">New sale</UButton>
        </div>
      </template>
    </UModal>

    <!-- ── Hold sale ────────────────────────────────────────────────────── -->
    <UModal v-model:open="showHoldModal" title="Hold this sale">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            The cart is saved and cleared — resume it later from "Held sales" to pick up right where you left off.
          </p>
          <UFormField label="Note (optional)">
            <UInput v-model="holdNote" placeholder="e.g. Window customer" class="w-full" />
          </UFormField>
          <UAlert v-if="holdError" color="error" variant="subtle" :title="holdError" />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showHoldModal = false">Cancel</UButton>
            <UButton :loading="holding" @click="onHoldSale">Hold sale</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ── Held sales ───────────────────────────────────────────────────── -->
    <UModal v-model:open="showHeldSales" title="Held sales">
      <template #body>
        <div v-if="heldSales.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No sales on hold</div>
        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
          <li v-for="held in heldSales" :key="held.id" class="py-3 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ held.note || held.heldNumber }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ held.itemCount }} item{{ held.itemCount === 1 ? '' : 's' }} · {{ formatCurrency(held.estimatedTotal) }} ·
                {{ formatDateTime(held.heldAt) }}
              </p>
            </div>
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :loading="discardingId === held.id" @click="onDiscardHeld(held)" />
            <UButton size="xs" color="primary" :loading="resumingId === held.id" @click="onResumeHeld(held)">Resume</UButton>
          </li>
        </ul>
      </template>
    </UModal>

    <ConfirmModal
      v-model="confirmClearCart"
      title="Clear cart"
      description="Removes every item currently in the cart. This doesn't affect anything already saved as a held sale."
      confirm-label="Clear cart"
      color="error"
      @confirm="onClearCart"
    />
  </div>
</template>

<script setup lang="ts">
import type { Register } from '~/composables/useRegisters'
import type { PosSession } from '~/composables/usePosSessions'
import type { PosSale, PosTenderMethod, PosTenderPayload } from '~/composables/usePosSales'
import type { PosHeldSale } from '~/composables/usePosHeldSales'

definePageMeta({ middleware: 'admin' })

const { list: listRegisters } = useRegisters()
const { open: openSession, get: getSession } = usePosSessions()
const { checkout } = usePosSales()
const { list: listProducts } = useProducts()
const { list: listCustomers } = useCustomers()
const { list: listCategories } = useProductCategories()
const { get: getInventoryOverview } = useInventoryOverview()
const { kioskMode, toggle: toggleKiosk, disable: disableKiosk } = useKioskMode()
const { list: listHeldSales, hold: holdSale, resume: resumeHeldSale, discard: discardHeldSale } = usePosHeldSales()
const { getForCompany: getInventorySettings } = useInventorySettings()
const toast = useToast()

// Display-only toggles from the register's company's Inventory Settings —
// default to the on/shown state until loaded, so the badges don't flicker
// hidden-then-shown on every session start.
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

// Full-screen mode is only meant for this page's own use — leaving it any
// way (nav, back button) always restores the sidebar for whatever page is
// visited next.
onBeforeUnmount(disableKiosk)

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
  categoryId: number | null
  categoryName: string | null
}

const registers = ref<Register[]>([])
const selectedRegisterId = ref<number | undefined>(undefined)
const selectedRegister = computed(() => registers.value.find((r) => r.id === selectedRegisterId.value))
const registerOptions = computed(() => registers.value.filter((r) => r.active).map((r) => ({ label: r.name, value: r.id })))

const openingFloat = ref(0)
const openingSession = ref(false)
const sessionError = ref('')
const session = ref<PosSession | null>(null)

async function onRegisterChanged() {
  sessionError.value = ''
}

// Remembers the cashier's last register across visits (per browser) so the
// next shift skips straight to it instead of re-picking from the dropdown
// every time — wrapped in try/catch since localStorage can throw (private
// browsing, blocked site data) and this is purely a convenience, never
// required for checkout to work.
const LAST_REGISTER_KEY = 'pos:lastRegisterId'
function rememberRegister(id: number) {
  try {
    localStorage.setItem(LAST_REGISTER_KEY, String(id))
  } catch {
    // Non-critical — just skip remembering it.
  }
}

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
    await loadHeldSales()
    await loadInventorySettings()
  } catch (err) {
    sessionError.value = apiErrorMessage(err)
  } finally {
    openingSession.value = false
  }
}

const products = ref<ProductLite[]>([])
const customers = ref<{ id: number; name: string; companyId: number }[]>([])
const customerId = ref<number | undefined>(undefined)
const customerOptions = computed(() => [
  { label: 'Walk-in', value: undefined },
  ...customers.value.filter((c) => c.companyId === selectedRegister.value?.companyId).map((c) => ({ label: c.name, value: c.id }))
])

const categories = ref<{ id: number; name: string; active: boolean }[]>([])
const selectedCategoryId = ref<number | undefined>(undefined)
const categoryChips = computed(() => [
  { id: undefined, name: 'All', icon: 'i-lucide-layout-grid' },
  ...categories.value.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name, icon: 'i-lucide-tag' }))
])

const search = ref('')
const visibleProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return products.value.filter((p) => {
    if (p.status !== 'ACTIVE' || p.companyId !== selectedRegister.value?.companyId) return false
    if (selectedCategoryId.value !== undefined && p.categoryId !== selectedCategoryId.value) return false
    if (!term) return true
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.barcode?.toLowerCase() === term
  })
})

interface CartLine {
  productId: number
  name: string
  unitPrice: number
  taxRate: number
  quantity: number
  discountPercent: number
  imageUrl: string | null
  categoryName: string | null
}
const cart = ref<CartLine[]>([])

// Available stock at the register's warehouse, keyed by productId — reused
// from the existing Inventory Overview report data, no new backend endpoint
// needed. Refreshed whenever the register changes and after each completed
// sale (stock just moved).
const stockByProduct = ref<Map<number, number>>(new Map())
async function loadStock() {
  if (!selectedRegister.value) return
  const res = await getInventoryOverview({ warehouseId: selectedRegister.value.warehouseId, size: 10000 })
  stockByProduct.value = new Map(res.data.map((row) => [row.productId, row.availableStock]))
}
function availableFor(productId: number): number {
  return stockByProduct.value.get(productId) ?? 0
}
function cartQuantityFor(productId: number): number {
  return cart.value.find((l) => l.productId === productId)?.quantity ?? 0
}
// What's left to sell after accounting for what's already sitting in the
// cart — this, not the raw available figure, is what gates adding more.
function remainingStockFor(productId: number): number {
  return availableFor(productId) - cartQuantityFor(productId)
}

// A visual "running low" tier between "plenty" and "out" — flags stock a
// cashier should know about before it actually blocks a sale. Collapses to
// 'ok' when the company's Inventory Settings turn Stock Warning off — 'out'
// stays 'out' either way, since that's a hard fact, not a warning.
const LOW_STOCK_THRESHOLD = 5
function stockTierFor(productId: number): 'out' | 'low' | 'ok' {
  const remaining = remainingStockFor(productId)
  if (remaining <= 0) return 'out'
  if (remaining <= LOW_STOCK_THRESHOLD && stockWarningEnabled.value) return 'low'
  return 'ok'
}

function addToCart(product: ProductLite) {
  if (remainingStockFor(product.id) <= 0) {
    toast.add({ title: `${product.name} is out of stock`, color: 'warning' })
    return
  }
  const existing = cart.value.find((l) => l.productId === product.id)
  if (existing) {
    existing.quantity += 1
  } else {
    cart.value.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.sellingPrice,
      taxRate: product.taxRate,
      quantity: 1,
      discountPercent: 0,
      imageUrl: product.imageUrl,
      categoryName: product.categoryName
    })
  }
}

function incrementLine(index: number) {
  const line = cart.value[index]
  if (!line) return
  if (remainingStockFor(line.productId) <= 0) {
    toast.add({ title: 'No more stock available', color: 'warning' })
    return
  }
  line.quantity += 1
}

function decrementLine(index: number) {
  const line = cart.value[index]
  if (!line) return
  if (line.quantity <= 1) {
    cart.value.splice(index, 1)
  } else {
    line.quantity -= 1
  }
}

const confirmClearCart = ref(false)
function onClearCart() {
  cart.value = []
  confirmClearCart.value = false
}

// Typing a quantity directly into a cart line — clamped against total
// available stock (not the "remaining after cart" figure, since this line's
// own current quantity is itself part of what's already reserved).
function setLineQuantity(index: number, value: number) {
  const line = cart.value[index]
  if (!line) return
  const desired = Math.floor(value || 0)
  if (desired <= 0) {
    cart.value.splice(index, 1)
    return
  }
  const max = availableFor(line.productId)
  if (desired > max) {
    toast.add({ title: `Only ${max} available`, color: 'warning' })
    line.quantity = max
  } else {
    line.quantity = desired
  }
}

// ── Held sales ───────────────────────────────────────────────────────────
const heldSales = ref<PosHeldSale[]>([])
async function loadHeldSales() {
  if (!session.value) return
  const res = await listHeldSales({ posSessionId: session.value.id, size: 100 })
  heldSales.value = res.data
}

const showHeldSales = ref(false)
function openHeldSales() {
  loadHeldSales()
  showHeldSales.value = true
}

const showHoldModal = ref(false)
const holdNote = ref('')
const holding = ref(false)
const holdError = ref('')
function openHoldModal() {
  holdNote.value = ''
  holdError.value = ''
  showHoldModal.value = true
}
async function onHoldSale() {
  if (!session.value || cart.value.length === 0) return
  holding.value = true
  holdError.value = ''
  try {
    await holdSale({
      posSessionId: session.value.id,
      customerId: customerId.value,
      note: holdNote.value || undefined,
      lines: cart.value.map((l) => ({ productId: l.productId, quantity: l.quantity, discountPercent: l.discountPercent }))
    })
    onNewSale()
    showHoldModal.value = false
    toast.add({ title: 'Sale held', color: 'success' })
    await loadHeldSales()
  } catch (err) {
    holdError.value = apiErrorMessage(err)
  } finally {
    holding.value = false
  }
}

// Re-prices every line against each product's *current* selling price/tax
// rather than trusting anything from the held-sale response, the same way
// addToCart does for a freshly-picked product.
const resumingId = ref<number | null>(null)
async function onResumeHeld(held: PosHeldSale) {
  resumingId.value = held.id
  try {
    const resumed = await resumeHeldSale(held.id)
    cart.value = resumed.lines.map((line) => {
      const product = products.value.find((p) => p.id === line.productId)
      return {
        productId: line.productId,
        name: line.productName ?? product?.name ?? 'Unknown product',
        unitPrice: product?.sellingPrice ?? 0,
        taxRate: product?.taxRate ?? 0,
        quantity: line.quantity,
        discountPercent: line.discountPercent,
        imageUrl: line.imageUrl,
        categoryName: product?.categoryName ?? null
      }
    })
    customerId.value = resumed.customerId ?? undefined
    showHeldSales.value = false
    heldSales.value = heldSales.value.filter((h) => h.id !== held.id)
  } catch (err) {
    toast.add({ title: 'Could not resume sale', description: apiErrorMessage(err), color: 'error' })
  } finally {
    resumingId.value = null
  }
}

const discardingId = ref<number | null>(null)
async function onDiscardHeld(held: PosHeldSale) {
  discardingId.value = held.id
  try {
    await discardHeldSale(held.id)
    heldSales.value = heldSales.value.filter((h) => h.id !== held.id)
  } catch (err) {
    toast.add({ title: 'Could not discard sale', description: apiErrorMessage(err), color: 'error' })
  } finally {
    discardingId.value = null
  }
}

const itemCount = computed(() => cart.value.reduce((sum, l) => sum + l.quantity, 0))

// Fast path for a USB barcode scanner (types the barcode + Enter): if the
// current search text is an exact barcode match, add it directly instead of
// requiring a click from the results list.
function onSearchEnter() {
  const term = search.value.trim().toLowerCase()
  const exact = products.value.find((p) => p.barcode?.toLowerCase() === term)
  if (exact) {
    addToCart(exact)
    search.value = ''
  }
}

function lineNet(line: CartLine) {
  const gross = line.quantity * line.unitPrice
  return gross - gross * (line.discountPercent / 100)
}
function lineTax(line: CartLine) {
  return lineNet(line) * (line.taxRate / 100)
}
function lineTotal(line: CartLine) {
  return lineNet(line) + lineTax(line)
}

const totals = computed(() => {
  const subtotal = cart.value.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const net = cart.value.reduce((sum, l) => sum + lineNet(l), 0)
  const taxAmount = cart.value.reduce((sum, l) => sum + lineTax(l), 0)
  return { subtotal, discountAmount: subtotal - net, taxAmount, totalAmount: net + taxAmount }
})

const tenders = ref<PosTenderPayload[]>([])
const tenderMethodOptions: { label: string; value: PosTenderMethod; icon: string }[] = [
  { label: 'Cash', value: 'CASH', icon: 'i-lucide-wallet' },
  { label: 'Card', value: 'CARD', icon: 'i-lucide-credit-card' },
  { label: 'Bank', value: 'BANK_TRANSFER', icon: 'i-lucide-landmark' },
  { label: 'QRS', value: 'PAYMENT_GATEWAY', icon: 'i-lucide-qr-code' }
]
const tenderSelectOptions = tenderMethodOptions.map(({ label, value }) => ({ label, value }))

// Quick path: tapping a payment method replaces any existing tenders with a
// single one covering the full remaining total — matches how a real
// checkout usually goes (one method for the whole sale). "Split payment"
// below still supports mixing methods for the less common case.
const quickMethod = ref<PosTenderMethod | undefined>(undefined)
function selectQuickMethod(method: PosTenderMethod) {
  quickMethod.value = method
  tenders.value = [{ method, amount: totals.value.totalAmount }]
}

function addTender() {
  quickMethod.value = undefined
  tenders.value.push({ method: 'CASH', amount: Math.max(totals.value.totalAmount - tenderedTotal.value, 0) })
}
const tenderedTotal = computed(() => tenders.value.reduce((sum, t) => sum + (t.amount || 0), 0))
const remaining = computed(() => Math.round((totals.value.totalAmount - tenderedTotal.value) * 100) / 100)

// Common cash-drawer amounts a cashier can tap instead of typing — the exact
// total, then the total rounded up to the next 5/10/20/50/100, deduped so a
// round total doesn't show the same button twice.
const cashQuickAmounts = computed(() => {
  const total = totals.value.totalAmount
  if (total <= 0) return []
  const roundUp = (n: number, step: number) => Math.ceil(n / step) * step
  const candidates = [total, roundUp(total, 5), roundUp(total, 10), roundUp(total, 20), roundUp(total, 50), roundUp(total, 100)]
  const unique = [...new Set(candidates.map((n) => Math.round(n * 100) / 100))]
  return unique.slice(0, 4)
})
function setCashAmount(amount: number) {
  quickMethod.value = 'CASH'
  tenders.value = [{ method: 'CASH', amount }]
}

const checkingOut = ref(false)
const checkoutError = ref('')
const completedSale = ref<PosSale | null>(null)
const showReceipt = ref(false)

async function onCheckout() {
  if (!session.value) return
  checkingOut.value = true
  checkoutError.value = ''
  try {
    completedSale.value = await checkout({
      posSessionId: session.value.id,
      customerId: customerId.value,
      lines: cart.value.map((l) => ({ productId: l.productId, quantity: l.quantity, discountPercent: l.discountPercent })),
      tenders: tenders.value
    })
    showReceipt.value = true
    await loadStock()
  } catch (err) {
    checkoutError.value = apiErrorMessage(err)
  } finally {
    checkingOut.value = false
  }
}

function onNewSale() {
  cart.value = []
  tenders.value = []
  quickMethod.value = undefined
  customerId.value = undefined
  checkoutError.value = ''
  showReceipt.value = false
}

function printReceipt() {
  window.print()
}

// Tax shown per rate on the receipt (e.g. a mixed-VAT-rate basket), derived
// from the completed sale's own lines rather than re-fetching anything.
const receiptTaxBreakdown = computed(() => {
  if (!completedSale.value) return []
  const byRate = new Map<number, number>()
  for (const line of completedSale.value.lines) {
    const gross = line.quantity * line.unitPrice
    const net = gross - gross * (line.discountPercent / 100)
    const tax = net * (line.taxRate / 100)
    byRate.set(line.taxRate, (byRate.get(line.taxRate) ?? 0) + tax)
  }
  return [...byRate.entries()].map(([rate, amount]) => ({ rate, amount })).sort((a, b) => a.rate - b.rate)
})

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

const productsLoading = ref(true)
onMounted(async () => {
  productsLoading.value = true
  try {
    const [r, c, cat] = await Promise.all([listRegisters({ active: true, size: 200 }), listCustomers({ size: 1000 }), listCategories({ size: 200 })])
    registers.value = r.data
    customers.value = c.data
    categories.value = cat.data
    const productsRes = await listProducts({ size: 10000 })
    products.value = productsRes.data
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
  } finally {
    productsLoading.value = false
  }
})
</script>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #pos-receipt,
  #pos-receipt * {
    visibility: visible;
  }
  #pos-receipt {
    position: absolute;
    top: 0;
    left: 0;
  }
}
</style>

<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
    </div>

    <div v-if="loadingDetail" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Customer" required>
              <USelect v-model="form.customerId" :items="customerOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Warehouse" required>
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Order date" required>
              <UInput v-model="form.orderDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Expected date">
              <UInput v-model="form.expectedDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :disabled="!formEditable" :rows="2" class="w-full" />
            </UFormField>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UCheckbox v-model="foreignCurrencyEnabled" :disabled="!formEditable" label="Foreign currency document" />
            <div v-if="foreignCurrencyEnabled" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <UFormField label="Currency" required>
                <UInput v-model="form.foreignCurrency" :disabled="!formEditable" placeholder="EUR" maxlength="3" class="w-full uppercase" />
              </UFormField>
              <UFormField label="Exchange rate" required>
                <UInput v-model.number="form.exchangeRate" type="number" min="0" step="0.000001" :disabled="!formEditable" class="w-full" />
              </UFormField>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line items</h2>
            </div>
          </template>

          <div v-if="formEditable" class="flex flex-wrap items-end gap-2 mb-4">
            <UFormField label="Product" class="flex-1 min-w-[240px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="productOptionsFor(form.companyId)"
                value-key="value"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UButton icon="i-lucide-plus" :disabled="!addLineProductId" @click="addLine">Add line</UButton>
          </div>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No line items yet
          </div>
          <div v-else class="space-y-2">
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <div class="col-span-4 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
              <UInput
                v-model.number="line.quantityOrdered"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Qty"
                :disabled="!formEditable"
                class="col-span-2"
              />
              <UInput
                v-model.number="line.unitPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price (auto)"
                :disabled="!formEditable"
                class="col-span-2"
              />
              <UInput
                v-model.number="line.discountPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Disc %"
                :disabled="!formEditable"
                class="col-span-1"
              />
              <UInput v-model.number="line.taxRate" type="number" min="0" step="0.01" placeholder="Tax % (auto)" :disabled="!formEditable" class="col-span-2" />
              <div class="col-span-1 text-sm text-gray-500 dark:text-gray-400 text-right">
                {{ formatCurrency(lineTotal(line)) }}
              </div>
              <UButton
                v-if="formEditable"
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-x"
                class="col-span-12 justify-self-end"
                @click="form.lines.splice(i, 1)"
              />
              <span v-else-if="viewingLineDelivered[i]" class="col-span-12 text-xs text-gray-400 text-right">{{ viewingLineDelivered[i] }} delivered</span>
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-2">Leave price/tax blank to use the product's own defaults.</p>

          <div class="flex justify-end mt-4">
            <div class="w-full sm:w-72 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-1.5">
              <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal</span><span>{{ formatCurrency(formSubtotal) }}</span>
              </div>
              <div v-if="formDiscountTotal > 0" class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Discount</span><span>-{{ formatCurrency(formDiscountTotal) }}</span>
              </div>
              <div v-if="formTaxTotal > 0" class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Tax</span><span>{{ formatCurrency(formTaxTotal) }}</span>
              </div>
              <div
                class="flex justify-between text-base font-semibold text-gray-900 dark:text-white pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-800"
              >
                <span>Total</span><span>{{ formatCurrency(formTotal) }}</span>
              </div>
              <div v-if="formForeignTotal !== null" class="flex justify-between text-xs text-gray-400">
                <span>≈ {{ form.foreignCurrency }} @ {{ form.exchangeRate }}</span><span>{{ formatCurrency(formForeignTotal, form.foreignCurrency) }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">{{ formEditable ? 'Cancel' : 'Back' }}</UButton>
          <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard changes?"
      description="You have unsaved changes on this sales order. Leaving now will discard them."
      confirm-label="Discard"
      color="error"
      @update:model-value="
        (v: boolean) => {
          if (!v) showLeaveConfirm = false
        }
      "
      @confirm="confirmLeave"
    />
  </div>
</template>

<script setup lang="ts">
import type { SalesOrderPayload, SalesOrderStatus } from '~/composables/useSalesOrders'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = useSalesOrders()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function customerOptionsFor(companyId: number | undefined) {
  return customers.value
    .filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
    .map((c) => ({ label: c.name, value: c.id }))
}
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}

interface LineForm {
  productId: number | undefined
  quantityOrdered: number | undefined
  unitPrice: number | undefined
  discountPercent: number | undefined
  taxRate: number | undefined
}

const editingStatus = ref<SalesOrderStatus | null>(null)
const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const viewingLineDelivered = ref<Record<number, string>>({})

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  warehouseId: number | undefined
  orderDate: string
  expectedDate: string
  notes: string
  foreignCurrency: string
  exchangeRate: number | undefined
  lines: LineForm[]
}>({
  companyId: undefined,
  customerId: undefined,
  warehouseId: undefined,
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: '',
  notes: '',
  foreignCurrency: '',
  exchangeRate: undefined,
  lines: []
})
const foreignCurrencyEnabled = ref(false)

const formEditable = computed(() => isNew || editingStatus.value === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New sales order' : formEditable.value ? 'Edit sales order' : 'View sales order'))

function lineSubtotal(l: LineForm) {
  return (l.quantityOrdered || 0) * (l.unitPrice || 0)
}
function lineDiscount(l: LineForm) {
  return lineSubtotal(l) * ((l.discountPercent || 0) / 100)
}
function lineTax(l: LineForm) {
  return (lineSubtotal(l) - lineDiscount(l)) * ((l.taxRate || 0) / 100)
}
function lineTotal(l: LineForm) {
  return lineSubtotal(l) - lineDiscount(l) + lineTax(l)
}
const formSubtotal = computed(() => form.lines.reduce((sum, l) => sum + lineSubtotal(l), 0))
const formDiscountTotal = computed(() => form.lines.reduce((sum, l) => sum + lineDiscount(l), 0))
const formTaxTotal = computed(() => form.lines.reduce((sum, l) => sum + lineTax(l), 0))
const formTotal = computed(() => form.lines.reduce((sum, l) => sum + lineTotal(l), 0))
const formForeignTotal = computed(() =>
  foreignCurrencyEnabled.value && form.exchangeRate ? formTotal.value / form.exchangeRate : null
)

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  form.lines.push({
    productId: addLineProductId.value,
    quantityOrdered: undefined,
    unitPrice: undefined,
    discountPercent: undefined,
    taxRate: undefined
  })
  addLineProductId.value = undefined
}

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify({ ...form, foreignCurrencyEnabled: foreignCurrencyEnabled.value })
}
const isDirty = computed(
  () => formEditable.value && JSON.stringify({ ...form, foreignCurrencyEnabled: foreignCurrencyEnabled.value }) !== formSnapshot.value
)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/sales-orders')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/sales-orders')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, cu, w, p] = await Promise.all([
      listCompanies({ size: 200 }),
      listCustomers({ size: 200 }),
      listWarehouses({ size: 200 }),
      listProducts({ size: 200 })
    ])
    companies.value = c.data
    customers.value = cu.data
    warehouses.value = w.data
    products.value = p.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      snapshotForm()
      return
    }

    const detail = await get(Number(idParam))
    editingStatus.value = detail.status
    form.companyId = detail.companyId
    form.customerId = detail.customerId
    form.warehouseId = detail.warehouseId
    form.orderDate = detail.orderDate
    form.expectedDate = detail.expectedDate ?? ''
    form.notes = detail.notes ?? ''
    foreignCurrencyEnabled.value = !!detail.foreignCurrency
    form.foreignCurrency = detail.foreignCurrency ?? ''
    form.exchangeRate = detail.exchangeRate ?? undefined
    form.lines = (detail.lines ?? []).map((l) => ({
      productId: l.productId,
      quantityOrdered: l.quantityOrdered,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent || undefined,
      taxRate: l.taxRate || undefined
    }))
    viewingLineDelivered.value = Object.fromEntries((detail.lines ?? []).map((l, i) => [i, `${l.quantityDelivered}/${l.quantityOrdered}`]))
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.customerId || !form.warehouseId || !form.orderDate) {
    formError.value = 'Please fill in company, customer, warehouse, and order date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantityOrdered)) {
    formError.value = 'Every line needs a product and quantity'
    return
  }
  if (foreignCurrencyEnabled.value && (!form.foreignCurrency || !form.exchangeRate)) {
    formError.value = 'Please fill in both the foreign currency and exchange rate'
    return
  }
  const payload: SalesOrderPayload = {
    companyId: form.companyId,
    customerId: form.customerId,
    warehouseId: form.warehouseId,
    orderDate: form.orderDate,
    expectedDate: form.expectedDate || undefined,
    notes: form.notes || undefined,
    foreignCurrency: foreignCurrencyEnabled.value ? form.foreignCurrency.toUpperCase() : undefined,
    exchangeRate: foreignCurrencyEnabled.value ? form.exchangeRate : undefined,
    lines: form.lines.map((l) => ({
      productId: l.productId!,
      quantityOrdered: l.quantityOrdered!,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      taxRate: l.taxRate
    }))
  }
  saving.value = true
  try {
    if (isNew) {
      await create(payload)
      toast.add({ title: 'Sales order created', color: 'success' })
    } else {
      await update(Number(idParam), payload)
      toast.add({ title: 'Sales order updated', color: 'success' })
    }
    router.push('/sales-orders')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

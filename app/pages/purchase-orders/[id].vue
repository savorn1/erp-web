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
            <UFormField label="Supplier" required>
              <USelect v-model="form.supplierId" :items="supplierOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
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
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <div class="min-w-[860px]">
              <div
                class="grid grid-cols-14 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
              >
                <span class="col-span-3">Product</span>
                <span class="col-span-2">Unit</span>
                <span class="col-span-2">Qty</span>
                <span class="col-span-2">Unit cost</span>
                <span class="col-span-1">Disc %</span>
                <span class="col-span-1">Tax %</span>
                <span class="col-span-2 text-right">Line total</span>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-14 gap-2 items-center px-3 py-2">
                  <div class="col-span-3 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
                  <USelect
                    v-model="line.unitOfMeasureId"
                    :items="unitOptionsForProduct(line.productId)"
                    placeholder="Unit"
                    :disabled="!formEditable"
                    class="col-span-2"
                  />
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
                    v-model.number="line.unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit cost"
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
                  <UInput v-model.number="line.taxRate" type="number" min="0" step="0.01" placeholder="Tax %" :disabled="!formEditable" class="col-span-1" />
                  <div class="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-right">
                    {{ formatCurrency(lineTotal(line)) }}
                  </div>
                  <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
                  <span v-else-if="viewingLineReceived[i]" class="col-span-1 text-xs text-gray-400 text-right">{{ viewingLineReceived[i] }} recv'd</span>
                </div>
              </div>
            </div>
          </div>

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
      description="You have unsaved changes on this purchase order. Leaving now will discard them."
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
import type { PurchaseOrderPayload, PurchaseOrderStatus } from '~/composables/usePurchaseOrders'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = usePurchaseOrders()
const { list: listCompanies } = useCompanies()
const { list: listSuppliers } = useSuppliers()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listProductUoms } = useProductUoms()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const suppliers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<
  { id: number; name: string; sku: string; companyId: number; status: string; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]
>([])

const productUomOptions = ref<Record<number, { label: string; value: number }[]>>({})
async function ensureProductUomOptions(productId: number) {
  if (productUomOptions.value[productId]) return
  try {
    const uoms = await listProductUoms(productId)
    productUomOptions.value[productId] = uoms
      .filter((u) => u.active && u.allowPurchase && !u.baseUnit)
      .map((u) => ({ label: u.unitOfMeasureAbbreviation ?? '', value: u.unitOfMeasureId }))
  } catch {
    productUomOptions.value[productId] = []
  }
}
function unitOptionsForProduct(productId: number | undefined) {
  if (!productId) return []
  const product = products.value.find((p) => p.id === productId)
  const base = product ? [{ label: product.unitOfMeasureAbbreviation ?? 'Base unit', value: product.unitOfMeasureId }] : []
  return [...base, ...(productUomOptions.value[productId] ?? [])]
}
function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function supplierOptionsFor(companyId: number | undefined) {
  return suppliers.value
    .filter((s) => s.status === 'ACTIVE' && (companyId === undefined || s.companyId === companyId))
    .map((s) => ({ label: s.name, value: s.id }))
}
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

interface LineForm {
  productId: number | undefined
  unitOfMeasureId: number | undefined
  quantityOrdered: number | undefined
  unitCost: number | undefined
  discountPercent: number | undefined
  taxRate: number | undefined
}

const editingStatus = ref<PurchaseOrderStatus | null>(null)
const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const viewingLineReceived = ref<Record<number, string>>({})

const form = reactive<{
  companyId: number | undefined
  supplierId: number | undefined
  warehouseId: number | undefined
  orderDate: string
  expectedDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  supplierId: undefined,
  warehouseId: undefined,
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: '',
  notes: '',
  lines: []
})

const formEditable = computed(() => isNew || editingStatus.value === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New purchase order' : formEditable.value ? 'Edit purchase order' : 'View purchase order'))

// Company determines which suppliers/warehouses/products are valid — changing
// it after picking those (or adding lines) would leave stale, mismatched
// values sitting in the form, so clear them instead of silently submitting
// a payload that references the wrong company's data.
watch(
  () => form.companyId,
  (_newVal, oldVal) => {
    if (oldVal === undefined) return
    form.supplierId = undefined
    form.warehouseId = undefined
    if (form.lines.length > 0) {
      form.lines = []
      toast.add({ title: 'Company changed', description: 'Line items were cleared — they belonged to the previous company.', color: 'warning' })
    }
  }
)

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => formEditable.value && JSON.stringify(form) !== formSnapshot.value)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/purchase-orders')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/purchase-orders')
}

function lineSubtotal(l: LineForm) {
  return (l.quantityOrdered || 0) * (l.unitCost || 0)
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

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  const product = products.value.find((p) => p.id === addLineProductId.value)
  form.lines.push({
    productId: addLineProductId.value,
    unitOfMeasureId: product?.unitOfMeasureId,
    quantityOrdered: undefined,
    unitCost: undefined,
    discountPercent: undefined,
    taxRate: undefined
  })
  ensureProductUomOptions(addLineProductId.value)
  addLineProductId.value = undefined
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, s, w, p] = await Promise.all([
      listCompanies({ size: 200 }),
      listSuppliers({ size: 200 }),
      listWarehouses({ size: 200 }),
      listProducts({ size: 200 })
    ])
    companies.value = c.data
    suppliers.value = s.data
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
    form.supplierId = detail.supplierId
    form.warehouseId = detail.warehouseId
    form.orderDate = detail.orderDate
    form.expectedDate = detail.expectedDate ?? ''
    form.notes = detail.notes ?? ''
    form.lines = (detail.lines ?? []).map((l) => ({
      productId: l.productId,
      unitOfMeasureId: l.unitOfMeasureId ?? undefined,
      quantityOrdered: l.quantityOrdered,
      unitCost: l.unitCost,
      discountPercent: l.discountPercent || undefined,
      taxRate: l.taxRate || undefined
    }))
    await Promise.all([...new Set((detail.lines ?? []).map((l) => l.productId))].map((id) => ensureProductUomOptions(id)))
    viewingLineReceived.value = Object.fromEntries(
      (detail.lines ?? []).map((l, i) => {
        const factor = l.conversionFactor ?? 1
        const base = factor !== 1 ? ` (= ${l.baseQuantityOrdered} base)` : ''
        return [i, `${l.quantityReceived}/${l.quantityOrdered}${base}`]
      })
    )
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.supplierId || !form.warehouseId || !form.orderDate) {
    formError.value = 'Please fill in company, supplier, warehouse, and order date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantityOrdered || l.unitCost === undefined)) {
    formError.value = 'Every line needs a product, quantity, and unit cost'
    return
  }
  const payload: PurchaseOrderPayload = {
    companyId: form.companyId,
    supplierId: form.supplierId,
    warehouseId: form.warehouseId,
    orderDate: form.orderDate,
    expectedDate: form.expectedDate || undefined,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({
      productId: l.productId!,
      unitOfMeasureId: l.unitOfMeasureId,
      quantityOrdered: l.quantityOrdered!,
      unitCost: l.unitCost!,
      discountPercent: l.discountPercent,
      taxRate: l.taxRate
    }))
  }
  saving.value = true
  try {
    if (isNew) {
      await create(payload)
      toast.add({ title: 'Purchase order created', color: 'success' })
    } else {
      await update(Number(idParam), payload)
      toast.add({ title: 'Purchase order updated', color: 'success' })
    }
    router.push('/purchase-orders')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

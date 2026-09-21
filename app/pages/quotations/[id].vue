<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
    </div>

    <DetailSkeleton v-if="loadingDetail" />
    <template v-else>
      <div class="space-y-6">
        <WorkflowStatusStepper v-if="!isNew && editingStatus" :status="editingStatus" :steps="workflowSteps" :next-hint="workflowHint" />
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Quotation details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect
                v-model="form.companyId"
                :items="activeCompanyOptions"
                :disabled="!formEditable || !isNew"
                class="w-full"
                @update:model-value="onFormCompanyChanged"
              />
            </UFormField>
            <UFormField label="Customer (optional)">
              <USelect v-model="form.customerId" :items="customerOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Quotation date" required>
              <UInput v-model="form.quotationDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Valid until">
              <UInput v-model="form.validUntil" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UCheckbox v-model="foreignCurrencyEnabled" :disabled="!formEditable" label="Foreign currency document" />
            <div v-if="foreignCurrencyEnabled" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
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
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line items</h2>
              </div>
              <UButton v-if="formEditable" size="xs" variant="soft" icon="i-lucide-plus" @click="addLine">Add line</UButton>
            </div>
          </template>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No line items yet
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <div class="min-w-[640px]">
              <div
                class="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
              >
                <span class="col-span-4">Product</span>
                <span class="col-span-2">Unit</span>
                <span class="col-span-2">Qty</span>
                <span class="col-span-2">Unit price</span>
                <span class="col-span-1 text-right">Total</span>
                <span class="col-span-1" />
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center px-3 py-2">
                  <USelect
                    v-model="line.productId"
                    :items="productOptionsFor(form.companyId)"
                    placeholder="Product"
                    :disabled="!formEditable"
                    class="col-span-4"
                    @update:model-value="onLineProductChanged(line)"
                  />
                  <USelect
                    v-model="line.unitOfMeasureId"
                    :items="unitOptionsForProduct(line.productId)"
                    placeholder="Unit"
                    :disabled="!formEditable"
                    class="col-span-2"
                  />
                  <UInput
                    v-model.number="line.quantity"
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
                    placeholder="Unit price"
                    :disabled="!formEditable"
                    class="col-span-2"
                  />
                  <div class="col-span-1 text-sm text-gray-500 dark:text-gray-400 text-right">
                    {{ formatCurrency((line.quantity || 0) * (line.unitPrice || 0)) }}
                  </div>
                  <UButton
                    v-if="formEditable"
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-x"
                    class="col-span-1 justify-self-end"
                    @click="form.lines.splice(i, 1)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end gap-1 mt-4">
            <div class="text-sm font-medium text-gray-900 dark:text-white">Total: {{ formatCurrency(formTotal) }}</div>
            <div v-if="formForeignTotal !== null" class="text-xs text-gray-400">
              ≈ {{ formatCurrency(formForeignTotal, form.foreignCurrency) }} @ {{ form.exchangeRate }} {{ form.foreignCurrency }}
            </div>
          </div>
        </UCard>

        <UCard v-if="!isNew">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-paperclip" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Attachments</h2>
            </div>
          </template>
          <AttachmentList owner-type="QUOTATION" :owner-id="Number(idParam)" />
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton v-if="editingStatus === 'ACCEPTED'" color="success" variant="soft" icon="i-lucide-file-check" @click="showConvert = true">
            Convert to sales order
          </UButton>
          <UButton v-if="!isNew" color="neutral" variant="soft" icon="i-lucide-mail" @click="showEmail = true">Email</UButton>
          <UButton color="neutral" variant="ghost" @click="onLeave">{{ formEditable ? 'Cancel' : 'Back' }}</UButton>
          <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>

    <EmailDocumentModal v-if="!isNew" v-model:open="showEmail" title="Email quotation" :send-fn="(payload) => emailDocument(Number(idParam), payload)" />

    <UModal v-model:open="showConvert" title="Convert to sales order">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Warehouse" required>
            <USelect v-model="convertForm.warehouseId" :items="warehouseOptionsFor(form.companyId)" class="w-full" />
          </UFormField>
          <UFormField label="Order date" required>
            <UInput v-model="convertForm.orderDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Expected date">
            <UInput v-model="convertForm.expectedDate" type="date" class="w-full" />
          </UFormField>
          <UAlert v-if="convertError" color="error" variant="subtle" :title="convertError" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showConvert = false">Cancel</UButton>
          <UButton :loading="converting" :disabled="!convertForm.warehouseId || !convertForm.orderDate" @click="onConvertToSalesOrder"> Convert </UButton>
        </div>
      </template>
    </UModal>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard changes?"
      description="You have unsaved changes on this quotation. Leaving now will discard them."
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
import type { QuotationPayload, QuotationStatus } from '~/composables/useQuotations'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update, emailDocument, convertToSalesOrder } = useQuotations()
const showEmail = ref(false)
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listProducts } = useProducts()
const { list: listWarehouses } = useWarehouses()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const products = ref<
  { id: number; name: string; sku: string; companyId: number; status: string; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]
>([])

// A quote converts straight into a sales order, so it offers the same
// sales-allowed units the order will accept.
const { list: listProductUoms } = useProductUoms()
const productUomOptions = ref<Record<number, { label: string; value: number }[]>>({})
async function ensureProductUomOptions(productId: number) {
  if (productUomOptions.value[productId]) return
  try {
    const uoms = await listProductUoms(productId)
    productUomOptions.value[productId] = uoms
      .filter((u) => u.active && u.allowSales && !u.baseUnit)
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
// The unit list is per product, so a line's unit can't outlive a product change.
function onLineProductChanged(line: LineForm) {
  const product = products.value.find((p) => p.id === line.productId)
  line.unitOfMeasureId = product?.unitOfMeasureId
  if (line.productId) ensureProductUomOptions(line.productId)
}
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function customerOptionsFor(companyId: number | undefined) {
  return [
    { label: 'No customer', value: undefined },
    ...customers.value
      .filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
      .map((c) => ({ label: c.name, value: c.id }))
  ]
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function onFormCompanyChanged() {
  form.customerId = undefined
  form.lines = []
}

interface LineForm {
  productId: number | undefined
  unitOfMeasureId: number | undefined
  quantity: number | undefined
  unitPrice: number | undefined
}

const editingStatus = ref<QuotationStatus | null>(null)
const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  quotationDate: string
  validUntil: string
  notes: string
  foreignCurrency: string
  exchangeRate: number | undefined
  lines: LineForm[]
}>({
  companyId: undefined,
  customerId: undefined,
  quotationDate: new Date().toISOString().slice(0, 10),
  validUntil: '',
  notes: '',
  foreignCurrency: '',
  exchangeRate: undefined,
  lines: []
})
const foreignCurrencyEnabled = ref(false)

const formEditable = computed(() => isNew || editingStatus.value === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New quotation' : formEditable.value ? 'Edit quotation' : 'View quotation'))
const workflowSteps = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' }
]
const workflowHint = computed(() => {
  if (editingStatus.value === 'DRAFT') return 'Next: send to the customer'
  if (editingStatus.value === 'SENT') return 'Next: mark accepted or rejected'
  if (editingStatus.value === 'ACCEPTED') return 'Next: convert to a sales order'
  return ''
})
const formTotal = computed(() => form.lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0))
const formForeignTotal = computed(() => (foreignCurrencyEnabled.value && form.exchangeRate ? formTotal.value / form.exchangeRate : null))

function addLine() {
  form.lines.push({ productId: undefined, unitOfMeasureId: undefined, quantity: undefined, unitPrice: undefined })
}

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify({ ...form, foreignCurrencyEnabled: foreignCurrencyEnabled.value })
}
const isDirty = computed(() => formEditable.value && JSON.stringify({ ...form, foreignCurrencyEnabled: foreignCurrencyEnabled.value }) !== formSnapshot.value)

// Confirms before a sidebar link, browser back, refresh or tab close throws
// this form away — the page's own back button is only one way out.
useUnsavedChangesGuard(isDirty)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/quotations')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/quotations')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, cu, p, w] = await Promise.all([
      listCompanies({ size: 200 }),
      listCustomers({ size: 200 }),
      listProducts({ size: 200 }),
      listWarehouses({ size: 200 })
    ])
    companies.value = c.data
    customers.value = cu.data
    products.value = p.data
    warehouses.value = w.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      addLine()
      snapshotForm()
      return
    }

    const detail = await get(Number(idParam))
    editingStatus.value = detail.status
    form.companyId = detail.companyId
    form.customerId = detail.customerId ?? undefined
    form.quotationDate = detail.quotationDate
    form.validUntil = detail.validUntil ?? ''
    form.notes = detail.notes ?? ''
    foreignCurrencyEnabled.value = !!detail.foreignCurrency
    form.foreignCurrency = detail.foreignCurrency ?? ''
    form.exchangeRate = detail.exchangeRate ?? undefined
    form.lines = (detail.lines ?? []).map((l) => ({
      productId: l.productId,
      unitOfMeasureId: l.unitOfMeasureId ?? undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice
    }))
    await Promise.all([...new Set((detail.lines ?? []).map((l) => l.productId))].map((id) => ensureProductUomOptions(id)))
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.quotationDate) {
    formError.value = 'Please fill in company and quotation date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantity || l.unitPrice === undefined)) {
    formError.value = 'Every line needs a product, quantity, and unit price'
    return
  }
  if (foreignCurrencyEnabled.value && (!form.foreignCurrency || !form.exchangeRate)) {
    formError.value = 'Please fill in both the foreign currency and exchange rate'
    return
  }
  const linesPayload = form.lines.map((l) => ({
    productId: l.productId!,
    unitOfMeasureId: l.unitOfMeasureId,
    quantity: l.quantity!,
    unitPrice: l.unitPrice!
  }))
  const foreignCurrency = foreignCurrencyEnabled.value ? form.foreignCurrency.toUpperCase() : undefined
  const exchangeRate = foreignCurrencyEnabled.value ? form.exchangeRate : undefined
  saving.value = true
  try {
    if (isNew) {
      const payload: QuotationPayload = {
        companyId: form.companyId,
        customerId: form.customerId,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
        foreignCurrency,
        exchangeRate,
        lines: linesPayload
      }
      await create(payload)
      toast.add({ title: 'Quotation created', color: 'success' })
    } else {
      await update(Number(idParam), {
        customerId: form.customerId,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
        foreignCurrency,
        exchangeRate,
        lines: linesPayload
      })
      toast.add({ title: 'Quotation updated', color: 'success' })
    }
    router.push('/quotations')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const showConvert = ref(false)
const converting = ref(false)
const convertError = ref('')
const convertForm = reactive<{ warehouseId: number | undefined; orderDate: string; expectedDate: string }>({
  warehouseId: undefined,
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: ''
})
async function onConvertToSalesOrder() {
  if (!convertForm.warehouseId || !convertForm.orderDate) return
  convertError.value = ''
  converting.value = true
  try {
    const salesOrder = await convertToSalesOrder(Number(idParam), {
      warehouseId: convertForm.warehouseId,
      orderDate: convertForm.orderDate,
      expectedDate: convertForm.expectedDate || undefined
    })
    toast.add({ title: 'Sales order created', color: 'success' })
    showConvert.value = false
    router.push(`/sales-orders/${salesOrder.id}`)
  } catch (err) {
    convertError.value = apiErrorMessage(err)
  } finally {
    converting.value = false
  }
}

onMounted(loadDetail)
</script>

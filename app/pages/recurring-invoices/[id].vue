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
              <UIcon name="i-lucide-repeat" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Schedule</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Customer" required>
              <USelect v-model="form.customerId" :items="customerOptionsFor(form.companyId)" class="w-full" />
            </UFormField>
            <UFormField label="Warehouse" required>
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" class="w-full" />
            </UFormField>
            <UFormField label="Name" required class="sm:col-span-3">
              <UInput v-model="form.name" placeholder="e.g. Monthly hosting fee" class="w-full" />
            </UFormField>
            <UFormField label="Frequency" required>
              <USelect v-model="form.frequency" :items="frequencyOptions" class="w-full" />
            </UFormField>
            <UFormField v-if="isNew" label="Start date" required>
              <UInput v-model="form.startDate" type="date" class="w-full" />
            </UFormField>
            <UFormField v-else label="Next run date" required>
              <UInput v-model="form.nextRunDate" type="date" class="w-full" />
            </UFormField>
            <UFormField label="End date" hint="Leave blank for indefinite">
              <UInput v-model="form.endDate" type="date" class="w-full" />
            </UFormField>
            <UFormField v-if="!isNew" label="Status" :hint="form.active ? 'Active' : 'Paused'">
              <USwitch v-model="form.active" />
            </UFormField>
            <UFormField label="Auto-approve generated invoice">
              <USwitch v-model="form.autoApproveInvoice" />
            </UFormField>
            <UFormField label="Auto-email generated invoice">
              <USwitch v-model="form.autoEmailInvoice" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :rows="2" class="w-full" />
            </UFormField>
          </div>
          <p v-if="!isNew && lastGeneratedDate" class="text-xs text-gray-400 mt-3">Last generated: {{ formatDate(lastGeneratedDate) }}</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line items</h2>
            </div>
          </template>

          <div class="flex flex-wrap items-end gap-2 mb-4">
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
              <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" class="col-span-2" />
              <UInput v-model.number="line.unitPrice" type="number" min="0" step="0.01" placeholder="Price (auto)" class="col-span-2" />
              <UInput v-model.number="line.discountPercent" type="number" min="0" max="100" step="0.01" placeholder="Disc %" class="col-span-1" />
              <UInput v-model.number="line.taxRate" type="number" min="0" step="0.01" placeholder="Tax % (auto)" class="col-span-2" />
              <div class="col-span-1 text-sm text-gray-500 dark:text-gray-400 text-right">
                {{ formatCurrency(lineTotal(line)) }}
              </div>
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-12 justify-self-end" @click="form.lines.splice(i, 1)" />
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-2">Leave price/tax blank to use the product's own defaults at generation time.</p>

          <div class="flex justify-end mt-4">
            <div class="w-full sm:w-72 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-1.5">
              <div class="flex justify-between text-base font-semibold text-gray-900 dark:text-white">
                <span>Estimated total</span><span>{{ formatCurrency(formTotal) }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { RecurringInvoiceFrequency } from '~/composables/useRecurringInvoices'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = useRecurringInvoices()
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

const frequencyOptions = [
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
  { label: 'Yearly', value: 'YEARLY' }
]

interface LineForm {
  productId: number | undefined
  quantity: number | undefined
  unitPrice: number | undefined
  discountPercent: number | undefined
  taxRate: number | undefined
}

const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const lastGeneratedDate = ref<string | null>(null)

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  warehouseId: number | undefined
  name: string
  frequency: RecurringInvoiceFrequency
  startDate: string
  nextRunDate: string
  endDate: string
  active: boolean
  autoApproveInvoice: boolean
  autoEmailInvoice: boolean
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  customerId: undefined,
  warehouseId: undefined,
  name: '',
  frequency: 'MONTHLY',
  startDate: new Date().toISOString().slice(0, 10),
  nextRunDate: '',
  endDate: '',
  active: true,
  autoApproveInvoice: true,
  autoEmailInvoice: false,
  notes: '',
  lines: []
})

const pageTitle = computed(() => (isNew ? 'New recurring invoice' : 'Edit recurring invoice'))

function lineSubtotal(l: LineForm) {
  return (l.quantity || 0) * (l.unitPrice || 0)
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
const formTotal = computed(() => form.lines.reduce((sum, l) => sum + lineTotal(l), 0))

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  form.lines.push({ productId: addLineProductId.value, quantity: undefined, unitPrice: undefined, discountPercent: undefined, taxRate: undefined })
  addLineProductId.value = undefined
}

function onLeave() {
  router.push('/recurring-invoices')
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
      return
    }

    const detail = await get(Number(idParam))
    form.companyId = detail.companyId
    form.customerId = detail.customerId
    form.warehouseId = detail.warehouseId
    form.name = detail.name
    form.frequency = detail.frequency
    form.nextRunDate = detail.nextRunDate
    form.endDate = detail.endDate ?? ''
    form.active = detail.active
    form.autoApproveInvoice = detail.autoApproveInvoice
    form.autoEmailInvoice = detail.autoEmailInvoice
    form.notes = detail.notes ?? ''
    lastGeneratedDate.value = detail.lastGeneratedDate
    form.lines = (detail.lines ?? []).map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice ?? undefined,
      discountPercent: l.discountPercent ?? undefined,
      taxRate: l.taxRate ?? undefined
    }))
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.customerId || !form.warehouseId || !form.name) {
    formError.value = 'Please fill in company, customer, warehouse, and name'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantity)) {
    formError.value = 'Every line needs a product and quantity'
    return
  }
  const linesPayload = form.lines.map((l) => ({
    productId: l.productId!,
    quantity: l.quantity!,
    unitPrice: l.unitPrice,
    discountPercent: l.discountPercent,
    taxRate: l.taxRate
  }))
  saving.value = true
  try {
    if (isNew) {
      await create({
        companyId: form.companyId,
        customerId: form.customerId,
        warehouseId: form.warehouseId,
        name: form.name,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        autoApproveInvoice: form.autoApproveInvoice,
        autoEmailInvoice: form.autoEmailInvoice,
        notes: form.notes || undefined,
        lines: linesPayload
      })
      toast.add({ title: 'Recurring invoice template created', color: 'success' })
    } else {
      await update(Number(idParam), {
        customerId: form.customerId,
        warehouseId: form.warehouseId,
        name: form.name,
        frequency: form.frequency,
        nextRunDate: form.nextRunDate,
        endDate: form.endDate || undefined,
        active: form.active,
        autoApproveInvoice: form.autoApproveInvoice,
        autoEmailInvoice: form.autoEmailInvoice,
        notes: form.notes || undefined,
        lines: linesPayload
      })
      toast.add({ title: 'Recurring invoice template updated', color: 'success' })
    }
    router.push('/recurring-invoices')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

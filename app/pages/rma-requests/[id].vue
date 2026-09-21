<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
      <StatusBadge v-if="rma" :status="rma.status" />
    </div>

    <DetailSkeleton v-if="loadingDetail" :lines="false" />
    <template v-else>
      <div class="space-y-6">
        <WorkflowStatusStepper v-if="!isNew && rma" :status="rma.status" :steps="workflowSteps" :next-hint="workflowHint" />
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-undo-2" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">RMA details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" @update:model-value="onCompanyChanged" />
            </UFormField>
            <UFormField label="Customer" required>
              <USelect
                v-model="form.customerId"
                :items="customerOptionsFor(form.companyId)"
                :disabled="!isNew"
                class="w-full"
                @update:model-value="onCustomerChanged"
              />
            </UFormField>
            <UFormField label="Warehouse" required>
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Original invoice" hint="Optional — required for a refund resolution">
              <USelect
                v-model="form.invoiceId"
                :items="invoiceOptionsFor(form.customerId)"
                :disabled="!isNew"
                placeholder="None"
                class="w-full"
                @update:model-value="onInvoiceChanged"
              />
            </UFormField>
            <UFormField label="Request date" required>
              <UInput v-model="form.requestDate" type="date" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Reason" class="sm:col-span-3">
              <UTextarea v-model="form.reason" :disabled="!isNew" :rows="2" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :disabled="!isNew" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard v-if="isNew && invoiceLines.length > 0">
          <template #header>
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Invoice lines</h2>
          </template>
          <div class="space-y-2">
            <div v-for="line in invoiceLines" :key="line.id" class="grid grid-cols-12 gap-2 items-center">
              <UCheckbox :model-value="isInvoiceLineSelected(line.id)" class="col-span-1" @update:model-value="toggleInvoiceLine(line)" />
              <div class="col-span-5 text-sm text-gray-900 dark:text-white truncate">{{ line.productName }} ({{ line.productSku }})</div>
              <div class="col-span-2 text-sm text-gray-500 dark:text-gray-400">Sold: {{ line.quantity }}</div>
              <UInput
                v-if="isInvoiceLineSelected(line.id)"
                v-model.number="invoiceLineQuantities[line.id]"
                type="number"
                min="0.0001"
                :max="line.quantity"
                step="0.0001"
                placeholder="Return qty"
                class="col-span-2"
                @update:model-value="updateInvoiceLineQuantity(line)"
              />
              <div class="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-right">{{ formatCurrency(line.unitPrice) }}/unit</div>
            </div>
          </div>
        </UCard>

        <UCard v-if="isNew">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Additional line</h2>
              <UButton size="xs" variant="soft" icon="i-lucide-plus" :disabled="!addLineProductId || !addLineQuantity" @click="addFreeFormLine">
                Add line
              </UButton>
            </div>
          </template>
          <div class="flex flex-wrap items-end gap-2">
            <UFormField label="Product" class="flex-1 min-w-[200px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="productOptionsFor(form.companyId)"
                value-key="value"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Qty">
              <UInput v-model.number="addLineQuantity" type="number" min="0.0001" step="0.0001" class="w-28" />
            </UFormField>
            <UFormField label="Unit price">
              <UInput v-model.number="addLineUnitPrice" type="number" min="0" step="0.01" class="w-32" />
            </UFormField>
            <UFormField label="Serial #" hint="Optional">
              <USelect v-model="addLineSerialId" :items="serialOptionsFor(addLineProductId)" placeholder="None" class="w-40" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lines</h2>
          </template>
          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No lines yet
          </div>
          <div v-else class="space-y-2">
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center text-sm">
              <div class="col-span-5 text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
              <div class="col-span-2 text-gray-500 dark:text-gray-400">{{ line.quantity }}</div>
              <div class="col-span-2 text-gray-500 dark:text-gray-400">{{ formatCurrency(line.unitPrice) }}</div>
              <div class="col-span-2 text-right font-medium">{{ formatCurrency((line.quantity || 0) * (line.unitPrice || 0)) }}</div>
              <UButton
                v-if="isNew"
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-x"
                class="col-span-1 justify-self-end"
                @click="form.lines.splice(i, 1)"
              />
            </div>
          </div>
          <div v-if="!isNew" class="flex justify-end mt-4">
            <div class="text-base font-semibold text-gray-900 dark:text-white">Total refundable: {{ formatCurrency(rma?.totalRefundable ?? 0) }}</div>
          </div>
        </UCard>

        <UCard v-if="!isNew && rma?.status === 'APPROVED'">
          <template #header>
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resolve</h2>
          </template>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField label="Resolution">
              <USelect v-model="resolutionType" :items="resolutionOptions" class="w-48" />
            </UFormField>
            <UButton :loading="resolving" @click="onResolve">Resolve</UButton>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            Refund issues a credit note against the original invoice and restocks the returned items. Replacement restocks the return and ships an identical
            replacement. Repair is a status-only record.
          </p>
        </UCard>

        <UCard v-if="!isNew">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-paperclip" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Attachments</h2>
            </div>
          </template>
          <AttachmentList owner-type="RMA_REQUEST" :owner-id="Number(idParam)" />
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton v-if="!isNew && rma?.status === 'REQUESTED'" color="success" variant="soft" :loading="acting" @click="onApprove">Approve</UButton>
          <UButton
            v-if="!isNew && (rma?.status === 'REQUESTED' || rma?.status === 'APPROVED')"
            color="warning"
            variant="soft"
            :loading="acting"
            @click="onReject"
          >
            Reject
          </UButton>
          <UButton
            v-if="!isNew && (rma?.status === 'REQUESTED' || rma?.status === 'APPROVED')"
            color="error"
            variant="soft"
            :loading="acting"
            @click="onCancel"
          >
            Cancel
          </UButton>
          <UButton color="neutral" variant="ghost" @click="onLeave">{{ isNew ? 'Cancel' : 'Back' }}</UButton>
          <UButton v-if="isNew" :loading="saving" @click="onSaveForm">Create</UButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, approve, reject, resolve, cancel } = useRmaRequests()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listInvoices, get: getInvoice } = useInvoices()
const { list: listSerialNumbers } = useSerialNumbers()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])
const invoices = ref<{ id: number; invoiceNumber: string; customerId: number; status: string }[]>([])
const serials = ref<{ id: number; serialNumber: string; productId: number; status: string }[]>([])

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
function invoiceOptionsFor(customerId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...invoices.value
      .filter((i) => i.status === 'APPROVED' && (customerId === undefined || i.customerId === customerId))
      .map((i) => ({ label: i.invoiceNumber, value: i.id }))
  ]
}
function serialOptionsFor(productId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...serials.value
      .filter((s) => s.status === 'ISSUED' && (productId === undefined || s.productId === productId))
      .map((s) => ({ label: s.serialNumber, value: s.id }))
  ]
}

interface LineForm {
  productId: number | undefined
  invoiceLineId: number | undefined
  serialNumberId: number | undefined
  quantity: number | undefined
  unitPrice: number | undefined
}

const loadingDetail = ref(true)
const saving = ref(false)
const acting = ref(false)
const resolving = ref(false)
const formError = ref('')
const rma = ref<Awaited<ReturnType<typeof get>> | null>(null)

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  warehouseId: number | undefined
  invoiceId: number | undefined
  requestDate: string
  reason: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  customerId: undefined,
  warehouseId: undefined,
  invoiceId: undefined,
  requestDate: new Date().toISOString().slice(0, 10),
  reason: '',
  notes: '',
  lines: []
})

const pageTitle = computed(() => (isNew ? 'New RMA' : `RMA ${rma.value?.rmaNumber ?? ''}`))
const workflowSteps = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RESOLVED', label: 'Resolved' }
]
const workflowHint = computed(() => {
  if (rma.value?.status === 'REQUESTED') return 'Next: approve or reject the request'
  if (rma.value?.status === 'APPROVED') return 'Next: resolve with a refund, replacement, or repair'
  return ''
})

function onCompanyChanged() {
  form.customerId = undefined
  form.warehouseId = undefined
  form.invoiceId = undefined
  invoiceLines.value = []
  form.lines = []
}
function onCustomerChanged() {
  form.invoiceId = undefined
  invoiceLines.value = []
  form.lines = []
}

const invoiceLines = ref<{ id: number; productId: number; productName: string | null; productSku: string | null; quantity: number; unitPrice: number }[]>([])
const invoiceLineQuantities = reactive<Record<number, number>>({})

async function onInvoiceChanged() {
  invoiceLines.value = []
  form.lines = form.lines.filter((l) => !l.invoiceLineId)
  if (!form.invoiceId) return
  const detail = await getInvoice(form.invoiceId)
  invoiceLines.value = (detail.lines ?? []).map((l) => ({
    id: l.id,
    productId: l.productId,
    productName: l.productName,
    productSku: l.productSku,
    quantity: l.quantity,
    unitPrice: l.unitPrice
  }))
}

function isInvoiceLineSelected(invoiceLineId: number) {
  return form.lines.some((l) => l.invoiceLineId === invoiceLineId)
}

function toggleInvoiceLine(line: (typeof invoiceLines.value)[number]) {
  const existingIndex = form.lines.findIndex((l) => l.invoiceLineId === line.id)
  if (existingIndex >= 0) {
    form.lines.splice(existingIndex, 1)
  } else {
    invoiceLineQuantities[line.id] = line.quantity
    form.lines.push({
      productId: line.productId,
      invoiceLineId: line.id,
      serialNumberId: undefined,
      quantity: line.quantity,
      unitPrice: line.unitPrice
    })
  }
}

function updateInvoiceLineQuantity(line: (typeof invoiceLines.value)[number]) {
  const existing = form.lines.find((l) => l.invoiceLineId === line.id)
  if (existing) existing.quantity = invoiceLineQuantities[line.id]
}

const addLineProductId = ref<number | undefined>(undefined)
const addLineQuantity = ref<number | undefined>(undefined)
const addLineUnitPrice = ref<number | undefined>(undefined)
const addLineSerialId = ref<number | undefined>(undefined)

function addFreeFormLine() {
  if (!addLineProductId.value || !addLineQuantity.value) return
  form.lines.push({
    productId: addLineProductId.value,
    invoiceLineId: undefined,
    serialNumberId: addLineSerialId.value,
    quantity: addLineQuantity.value,
    unitPrice: addLineUnitPrice.value
  })
  addLineProductId.value = undefined
  addLineQuantity.value = undefined
  addLineUnitPrice.value = undefined
  addLineSerialId.value = undefined
}

function onLeave() {
  router.push('/rma-requests')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, cu, w, p, inv, sn] = await Promise.all([
      listCompanies({ size: 200 }),
      listCustomers({ size: 200 }),
      listWarehouses({ size: 200 }),
      listProducts({ size: 1000 }),
      listInvoices({ size: 500 }),
      listSerialNumbers({ size: 1000 })
    ])
    companies.value = c.data
    customers.value = cu.data
    warehouses.value = w.data
    products.value = p.data
    invoices.value = inv.data
    serials.value = sn.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      return
    }

    rma.value = await get(Number(idParam))
    resolutionType.value = 'REFUND'
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

// Show existing lines read-only once loaded (non-new).
watch(rma, (value) => {
  if (value) {
    form.lines = (value.lines ?? []).map((l) => ({
      productId: l.productId,
      invoiceLineId: l.invoiceLineId ?? undefined,
      serialNumberId: l.serialNumberId ?? undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice
    }))
  }
})

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.customerId || !form.warehouseId || !form.requestDate) {
    formError.value = 'Please fill in company, customer, warehouse, and request date'
    return
  }
  if (form.lines.length === 0) {
    formError.value = 'Add at least one line to return'
    return
  }
  saving.value = true
  try {
    await create({
      companyId: form.companyId,
      customerId: form.customerId,
      invoiceId: form.invoiceId,
      warehouseId: form.warehouseId,
      requestDate: form.requestDate,
      reason: form.reason || undefined,
      notes: form.notes || undefined,
      lines: form.lines.map((l) => ({
        productId: l.productId!,
        invoiceLineId: l.invoiceLineId,
        serialNumberId: l.serialNumberId,
        quantity: l.quantity!,
        unitPrice: l.unitPrice
      }))
    })
    toast.add({ title: 'RMA created', color: 'success' })
    router.push('/rma-requests')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function onApprove() {
  acting.value = true
  try {
    rma.value = await approve(Number(idParam))
    toast.add({ title: 'RMA approved', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not approve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}
async function onReject() {
  acting.value = true
  try {
    rma.value = await reject(Number(idParam))
    toast.add({ title: 'RMA rejected', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not reject', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}
async function onCancel() {
  acting.value = true
  try {
    rma.value = await cancel(Number(idParam))
    toast.add({ title: 'RMA cancelled', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not cancel', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}

const resolutionType = ref<'REFUND' | 'REPLACEMENT' | 'REPAIR'>('REFUND')
const resolutionOptions = [
  { label: 'Refund', value: 'REFUND' },
  { label: 'Replacement', value: 'REPLACEMENT' },
  { label: 'Repair', value: 'REPAIR' }
]
async function onResolve() {
  resolving.value = true
  formError.value = ''
  try {
    rma.value = await resolve(Number(idParam), { resolutionType: resolutionType.value })
    toast.add({ title: 'RMA resolved', color: 'success' })
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    resolving.value = false
  }
}

onMounted(loadDetail)
</script>

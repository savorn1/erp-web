<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
    </div>

    <div v-if="loadingDetail" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <WorkflowStatusStepper v-if="!isNew && editingStatus" :status="editingStatus" :steps="workflowSteps" :next-hint="workflowHint" />
        <UAlert
          v-if="editingStatus === 'REJECTED' && rejectionReasonView"
          color="error"
          variant="subtle"
          title="Rejected"
          :description="rejectionReasonView"
          icon="i-lucide-triangle-alert"
        />

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Request details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable || !isNew" class="w-full" />
            </UFormField>
            <UFormField label="Department" required>
              <USelect v-model="form.departmentId" :items="departmentOptionsFor()" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Request date" required>
              <UInput v-model="form.requestDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Required date">
              <UInput v-model="form.requiredDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Requested products</h2>
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
              <div class="col-span-5 text-sm text-gray-900 dark:text-white truncate">{{ productLabel(line.productId) }}</div>
              <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" placeholder="Qty" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model="line.notes" placeholder="Notes (optional)" :disabled="!formEditable" class="col-span-4" />
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
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
      description="You have unsaved changes on this purchase request. Leaving now will discard them."
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
import type { PurchaseRequestPayload, PurchaseRequestStatus } from '~/composables/usePurchaseRequests'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = usePurchaseRequests()
const { list: listCompanies } = useCompanies()
const { list: listDepartments } = useDepartments()
const { list: listProducts } = useProducts()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const departments = ref<{ id: number; name: string; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function departmentOptionsFor() {
  return departments.value.filter((d) => d.active).map((d) => ({ label: d.name, value: d.id }))
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
  quantity: number | undefined
  notes: string
}

const editingStatus = ref<PurchaseRequestStatus | null>(null)
const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const rejectionReasonView = ref('')

const form = reactive<{
  companyId: number | undefined
  departmentId: number | undefined
  requestDate: string
  requiredDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  departmentId: undefined,
  requestDate: new Date().toISOString().slice(0, 10),
  requiredDate: '',
  notes: '',
  lines: []
})

const formEditable = computed(() => isNew || editingStatus.value === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New purchase request' : formEditable.value ? 'Edit purchase request' : 'View purchase request'))
const workflowSteps = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' }
]
const workflowHint = computed(() => {
  if (editingStatus.value === 'DRAFT') return 'Next: submit for approval'
  if (editingStatus.value === 'SUBMITTED') return 'Next: approve or reject the request'
  return ''
})

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  form.lines.push({ productId: addLineProductId.value, quantity: undefined, notes: '' })
  addLineProductId.value = undefined
}

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
    router.push('/purchase-requests')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/purchase-requests')
}

// Deep-linkable, e.g. a manufacturing order's material availability check
// links here (via /purchase-requests/new) with a shortfall pre-filled as the
// first line — company and quantity are known, but department is still the
// requester's call.
function applyPrefillFromQuery() {
  const productId = Number(route.query.prefillProductId)
  const quantity = Number(route.query.prefillQuantity)
  const companyId = Number(route.query.prefillCompanyId)
  if (!productId || !quantity) return
  if (companyId) form.companyId = companyId
  form.lines = [{ productId, quantity, notes: '' }]
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, d, p] = await Promise.all([listCompanies({ size: 200 }), listDepartments({ size: 200 }), listProducts({ size: 200 })])
    companies.value = c.data
    departments.value = d.data
    products.value = p.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      applyPrefillFromQuery()
      snapshotForm()
      return
    }

    const detail = await get(Number(idParam))
    editingStatus.value = detail.status
    form.companyId = detail.companyId
    form.departmentId = detail.departmentId
    form.requestDate = detail.requestDate
    form.requiredDate = detail.requiredDate ?? ''
    form.notes = detail.notes ?? ''
    form.lines = (detail.lines ?? []).map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes ?? '' }))
    rejectionReasonView.value = detail.rejectionReason ?? ''
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.departmentId || !form.requestDate) {
    formError.value = 'Please fill in company, department, and request date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId || !l.quantity)) {
    formError.value = 'Every line needs a product and quantity'
    return
  }
  saving.value = true
  try {
    if (isNew) {
      const payload: PurchaseRequestPayload = {
        companyId: form.companyId,
        departmentId: form.departmentId,
        requestDate: form.requestDate,
        requiredDate: form.requiredDate || undefined,
        notes: form.notes || undefined,
        lines: form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity!, notes: l.notes || undefined }))
      }
      await create(payload)
      toast.add({ title: 'Purchase request created', color: 'success' })
    } else {
      await update(Number(idParam), {
        departmentId: form.departmentId,
        requestDate: form.requestDate,
        requiredDate: form.requiredDate || undefined,
        notes: form.notes || undefined,
        lines: form.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity!, notes: l.notes || undefined }))
      })
      toast.add({ title: 'Purchase request updated', color: 'success' })
    }
    router.push('/purchase-requests')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

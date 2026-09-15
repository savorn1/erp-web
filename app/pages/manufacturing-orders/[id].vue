<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
      <UBadge v-if="!isNew && detail" class="ml-auto">{{ detail.status }}</UBadge>
      <UBadge v-if="detail?.qualityStatus === 'FAILED'" color="error" variant="soft">QC failed</UBadge>
    </div>

    <div v-if="loadingDetail" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-cog" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Bill of materials" required>
              <USelectMenu
                v-model="form.bomId"
                :items="bomOptionsFor(form.companyId)"
                value-key="value"
                :disabled="!isNew"
                placeholder="Search active BOMs…"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Warehouse" required>
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Production plan">
              <USelect
                v-model="form.productionPlanId"
                :items="planOptionsFor(form.companyId)"
                placeholder="None"
                :disabled="!formEditable"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Planned quantity" required>
              <UInput v-model.number="form.plannedQuantity" type="number" min="0.0001" step="0.0001" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Planned start date">
              <UInput v-model="form.plannedStartDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Planned end date">
              <UInput v-model="form.plannedEndDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :disabled="!formEditable" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard v-if="!isNew && detail">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Material requirements</h2>
            </div>
          </template>
          <DataTable :rows="detail.materials ?? []" :columns="materialColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-list" title="No material lines" />
            </template>
          </DataTable>
        </UCard>

        <UCard v-if="!isNew && detail && (detail.workOrders?.length ?? 0) > 0">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-route" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Work orders</h2>
            </div>
          </template>
          <div class="divide-y divide-gray-200 dark:divide-gray-800">
            <div v-for="wo in detail.workOrders" :key="wo.id" class="flex items-center justify-between py-2 text-sm gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-gray-400">#{{ wo.sequenceNumber }}</span>
                <span class="font-medium truncate">{{ wo.name }}</span>
                <span class="text-gray-400 truncate">{{ wo.workCenterName ?? '—' }}{{ wo.machineName ? ` / ${wo.machineName}` : '' }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <UBadge size="xs">{{ wo.status }}</UBadge>
                <UButton
                  v-if="wo.status === 'PENDING'"
                  size="xs"
                  color="info"
                  variant="soft"
                  icon="i-lucide-play"
                  :loading="workOrderActingId === wo.id"
                  @click="onStartWorkOrder(wo)"
                >
                  Start
                </UButton>
                <UButton
                  v-if="wo.status === 'IN_PROGRESS'"
                  size="xs"
                  color="success"
                  variant="soft"
                  icon="i-lucide-check"
                  :loading="workOrderActingId === wo.id"
                  @click="onCompleteWorkOrder(wo)"
                >
                  Complete
                </UButton>
              </div>
            </div>
          </div>
        </UCard>

        <UCard v-if="detail && detail.status === 'RELEASED'">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Material availability</h2>
            </div>
          </template>
          <div v-if="loadingAvailability" class="text-sm text-gray-400 py-4 text-center">Checking…</div>
          <DataTable v-else :rows="availability" :columns="availabilityColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-list" title="No material lines" />
            </template>
          </DataTable>
          <UAlert
            v-if="!loadingAvailability && shortages.length > 0"
            color="warning"
            variant="subtle"
            class="mt-4"
            title="Some components are short — starting production will fail until stock is replenished."
          />
          <div v-if="!loadingAvailability && shortages.length > 0" class="flex flex-wrap gap-2 mt-3">
            <UButton
              v-for="row in shortages"
              :key="row.componentProductId"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-shopping-cart"
              :to="purchaseRequestLink(row)"
            >
              Request {{ row.componentProductName }} ({{ row.shortfallQuantity }} short)
            </UButton>
          </div>
        </UCard>

        <UCard v-if="detail && detail.status === 'IN_PROGRESS'">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-package-check" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Complete production</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Produced quantity" required>
              <UInput v-model.number="completeForm.producedQuantity" type="number" min="0" step="0.0001" class="w-full" />
            </UFormField>
            <UFormField label="Scrap quantity">
              <UInput v-model.number="completeForm.scrapQuantity" type="number" min="0" step="0.0001" class="w-full" />
            </UFormField>
            <UFormField label="Scrap reason" class="sm:col-span-2">
              <UInput v-model="completeForm.scrapReason" placeholder="Optional" class="w-full" />
            </UFormField>
            <UFormField label="Labor cost">
              <UInput v-model.number="completeForm.laborCost" type="number" min="0" step="0.01" class="w-full" />
            </UFormField>
            <UFormField label="Overhead cost">
              <UInput v-model.number="completeForm.overheadCost" type="number" min="0" step="0.01" class="w-full" />
            </UFormField>
          </div>
          <UAlert v-if="completeError" color="error" variant="subtle" class="mt-4" :title="completeError" />
          <div class="flex justify-end mt-4">
            <UButton :loading="completing" icon="i-lucide-check" @click="onComplete">Complete production</UButton>
          </div>
        </UCard>

        <UCard v-if="detail && detail.status === 'PENDING_QC'">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Quality control</h2>
            </div>
          </template>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {{ detail.producedQuantity }} unit(s) produced, awaiting inspection before they're added to stock.
          </p>
          <UFormField label="Notes">
            <UTextarea v-model="qcForm.notes" placeholder="Optional inspection notes" :rows="2" class="w-full" />
          </UFormField>
          <UAlert v-if="qcError" color="error" variant="subtle" class="mt-4" :title="qcError" />
          <div class="flex justify-end gap-2 mt-4">
            <UButton color="error" variant="soft" icon="i-lucide-x" :loading="qcSubmitting" @click="onQualityCheck('FAILED')">Fail</UButton>
            <UButton color="success" icon="i-lucide-check" :loading="qcSubmitting" @click="onQualityCheck('PASSED')">Pass</UButton>
          </div>
        </UCard>

        <UCard v-if="detail && (detail.status === 'COMPLETED' || detail.status === 'PENDING_QC')">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-receipt" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cost breakdown</h2>
            </div>
          </template>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div><div class="text-gray-400">Material</div><div class="font-medium">{{ formatCurrency(detail.materialCost) }}</div></div>
            <div><div class="text-gray-400">Labor</div><div class="font-medium">{{ formatCurrency(detail.laborCost) }}</div></div>
            <div><div class="text-gray-400">Overhead</div><div class="font-medium">{{ formatCurrency(detail.overheadCost) }}</div></div>
            <div><div class="text-gray-400">Total</div><div class="font-medium">{{ formatCurrency(detail.totalCost) }}</div></div>
            <div><div class="text-gray-400">Unit cost</div><div class="font-medium">{{ formatCurrency(detail.unitCost) }}</div></div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div v-if="formEditable" class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard changes?"
      description="You have unsaved changes on this manufacturing order. Leaving now will discard them."
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
import type { ColumnDef } from '#shared/types'
import type { ManufacturingOrder, ManufacturingOrderMaterial, MaterialAvailabilityRow } from '~/composables/useManufacturingOrders'
import type { WorkOrder } from '~/composables/useWorkOrders'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update, complete, qualityCheck, materialAvailability } = useManufacturingOrders()
const { start: startWorkOrder, complete: completeWorkOrder } = useWorkOrders()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listBoms } = useBillOfMaterials()
const { list: listPlans } = useProductionPlans()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const boms = ref<{ id: number; bomNumber: string; name: string; companyId: number; status: string }[]>([])
const plans = ref<{ id: number; planNumber: string; name: string; companyId: number; status: string }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function bomOptionsFor(companyId: number | undefined) {
  return boms.value
    .filter((b) => b.status === 'ACTIVE' && (companyId === undefined || b.companyId === companyId))
    .map((b) => ({ label: `${b.bomNumber} — ${b.name}`, value: b.id }))
}
function planOptionsFor(companyId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...plans.value
      .filter((p) => p.status !== 'CLOSED' && (companyId === undefined || p.companyId === companyId))
      .map((p) => ({ label: `${p.planNumber} — ${p.name}`, value: p.id }))
  ]
}

const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const detail = ref<ManufacturingOrder | null>(null)

const form = reactive<{
  companyId: number | undefined
  bomId: number | undefined
  warehouseId: number | undefined
  productionPlanId: number | undefined
  plannedQuantity: number | undefined
  plannedStartDate: string
  plannedEndDate: string
  notes: string
}>({
  companyId: undefined,
  bomId: undefined,
  warehouseId: undefined,
  productionPlanId: undefined,
  plannedQuantity: undefined,
  plannedStartDate: '',
  plannedEndDate: '',
  notes: ''
})

const formEditable = computed(() => isNew || detail.value?.status === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New manufacturing order' : formEditable.value ? 'Edit manufacturing order' : 'View manufacturing order'))

const materialColumns: ColumnDef<ManufacturingOrderMaterial>[] = [
  { key: 'componentProductName', label: 'Component', value: (row) => `${row.componentProductName ?? '—'} (${row.componentProductSku ?? '—'})` },
  { key: 'requiredQuantity', label: 'Required', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
  { key: 'consumedQuantity', label: 'Consumed', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' },
  { key: 'lineCost', label: 'Line cost', type: 'currency' }
]

const availabilityColumns: ColumnDef<MaterialAvailabilityRow>[] = [
  { key: 'componentProductName', label: 'Component', value: (row) => `${row.componentProductName ?? '—'} (${row.componentProductSku ?? '—'})` },
  { key: 'requiredQuantity', label: 'Required', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
  { key: 'availableQuantity', label: 'Available', suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}` },
  {
    key: 'shortfallQuantity',
    label: 'Shortfall',
    suffix: (row) => ` ${row.unitOfMeasureAbbreviation ?? ''}`,
    class: (row) => (row.shortfallQuantity > 0 ? 'text-error' : 'text-gray-400')
  }
]

const loadingAvailability = ref(false)
const availability = ref<MaterialAvailabilityRow[]>([])
const shortages = computed(() => availability.value.filter((row) => row.shortfallQuantity > 0))

async function loadAvailability() {
  loadingAvailability.value = true
  try {
    availability.value = await materialAvailability(Number(idParam))
  } catch {
    availability.value = []
  } finally {
    loadingAvailability.value = false
  }
}

function purchaseRequestLink(row: MaterialAvailabilityRow) {
  const query = new URLSearchParams({
    prefillProductId: String(row.componentProductId),
    prefillQuantity: String(row.shortfallQuantity),
    prefillCompanyId: String(form.companyId ?? '')
  })
  return `/purchase-requests/new?${query.toString()}`
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
    router.push('/manufacturing-orders')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/manufacturing-orders')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, w, b, p] = await Promise.all([
      listCompanies({ size: 200 }),
      listWarehouses({ size: 200 }),
      listBoms({ status: 'ACTIVE', size: 200 }),
      listPlans({ size: 200 })
    ])
    companies.value = c.data
    warehouses.value = w.data
    boms.value = b.data
    plans.value = p.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      snapshotForm()
      return
    }

    const d = await get(Number(idParam))
    detail.value = d
    form.companyId = d.companyId
    form.bomId = d.bomId
    form.warehouseId = d.warehouseId
    form.productionPlanId = d.productionPlanId ?? undefined
    form.plannedQuantity = d.plannedQuantity
    form.plannedStartDate = d.plannedStartDate ?? ''
    form.plannedEndDate = d.plannedEndDate ?? ''
    form.notes = d.notes ?? ''
    snapshotForm()

    if (d.status === 'RELEASED') await loadAvailability()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.bomId || !form.warehouseId || !form.plannedQuantity) {
    formError.value = 'Please fill in company, BOM, warehouse, and planned quantity'
    return
  }
  saving.value = true
  try {
    if (isNew) {
      await create({
        companyId: form.companyId,
        bomId: form.bomId,
        warehouseId: form.warehouseId,
        productionPlanId: form.productionPlanId,
        plannedQuantity: form.plannedQuantity,
        plannedStartDate: form.plannedStartDate || undefined,
        plannedEndDate: form.plannedEndDate || undefined,
        notes: form.notes || undefined
      })
      toast.add({ title: 'Manufacturing order created', color: 'success' })
    } else {
      await update(Number(idParam), {
        warehouseId: form.warehouseId,
        productionPlanId: form.productionPlanId,
        plannedQuantity: form.plannedQuantity,
        plannedStartDate: form.plannedStartDate || undefined,
        plannedEndDate: form.plannedEndDate || undefined,
        notes: form.notes || undefined
      })
      toast.add({ title: 'Manufacturing order updated', color: 'success' })
    }
    router.push('/manufacturing-orders')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const completing = ref(false)
const completeError = ref('')
const completeForm = reactive<{
  producedQuantity: number | undefined
  scrapQuantity: number | undefined
  scrapReason: string
  laborCost: number | undefined
  overheadCost: number | undefined
}>({ producedQuantity: undefined, scrapQuantity: undefined, scrapReason: '', laborCost: undefined, overheadCost: undefined })

async function onComplete() {
  completeError.value = ''
  if (completeForm.producedQuantity === undefined) {
    completeError.value = 'Please enter the produced quantity'
    return
  }
  completing.value = true
  try {
    detail.value = await complete(Number(idParam), {
      producedQuantity: completeForm.producedQuantity,
      scrapQuantity: completeForm.scrapQuantity,
      scrapReason: completeForm.scrapReason || undefined,
      laborCost: completeForm.laborCost,
      overheadCost: completeForm.overheadCost
    })
    toast.add({ title: 'Production completed', color: 'success' })
  } catch (err) {
    completeError.value = apiErrorMessage(err)
  } finally {
    completing.value = false
  }
}

const qcSubmitting = ref(false)
const qcError = ref('')
const qcForm = reactive<{ notes: string }>({ notes: '' })

async function onQualityCheck(status: 'PASSED' | 'FAILED') {
  qcError.value = ''
  qcSubmitting.value = true
  try {
    detail.value = await qualityCheck(Number(idParam), { status, notes: qcForm.notes || undefined })
    toast.add({ title: status === 'PASSED' ? 'Quality check passed — stock updated' : 'Quality check failed — units scrapped', color: status === 'PASSED' ? 'success' : 'warning' })
  } catch (err) {
    qcError.value = apiErrorMessage(err)
  } finally {
    qcSubmitting.value = false
  }
}

const workOrderActingId = ref<number | null>(null)
async function onStartWorkOrder(wo: WorkOrder) {
  workOrderActingId.value = wo.id
  try {
    await startWorkOrder(wo.id)
    toast.add({ title: 'Work order started', color: 'success' })
    detail.value = await get(Number(idParam))
  } catch (err) {
    toast.add({ title: 'Could not start work order', description: apiErrorMessage(err), color: 'error' })
  } finally {
    workOrderActingId.value = null
  }
}
async function onCompleteWorkOrder(wo: WorkOrder) {
  workOrderActingId.value = wo.id
  try {
    await completeWorkOrder(wo.id)
    toast.add({ title: 'Work order completed', color: 'success' })
    detail.value = await get(Number(idParam))
  } catch (err) {
    toast.add({ title: 'Could not complete work order', description: apiErrorMessage(err), color: 'error' })
  } finally {
    workOrderActingId.value = null
  }
}

onMounted(loadDetail)
</script>

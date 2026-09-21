<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
      <UBadge v-if="!isNew && detail" class="ml-auto">{{ detail.status }}</UBadge>
    </div>

    <DetailSkeleton v-if="loadingDetail" :lines="false" />
    <template v-else>
      <div class="space-y-6">
        <WorkflowStatusStepper v-if="!isNew && detail" :status="detail.status" :steps="workflowSteps" :next-hint="workflowHint" />
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar-range" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Period start" required>
              <UInput v-model="form.periodStart" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Period end" required>
              <UInput v-model="form.periodEnd" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Name" required class="sm:col-span-3">
              <UInput v-model="form.name" placeholder="e.g. Week 42 production plan" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :disabled="!formEditable" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard v-if="!isNew && detail">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-cog" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Linked manufacturing orders</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <div class="text-gray-500 dark:text-gray-400">Orders</div>
              <div class="font-medium">{{ detail.orderCount }}</div>
            </div>
            <div>
              <div class="text-gray-500 dark:text-gray-400">Planned quantity</div>
              <div class="font-medium">{{ detail.totalPlannedQuantity }}</div>
            </div>
            <div>
              <div class="text-gray-500 dark:text-gray-400">Produced quantity</div>
              <div class="font-medium">{{ detail.totalProducedQuantity }}</div>
            </div>
          </div>
          <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-external-link" :to="`/manufacturing-orders?productionPlanId=${detail.id}`">
            View orders
          </UButton>
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
      description="You have unsaved changes on this production plan. Leaving now will discard them."
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
import type { ProductionPlan, ProductionPlanPayload } from '~/composables/useProductionPlans'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = useProductionPlans()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))

const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const detail = ref<ProductionPlan | null>(null)

const form = reactive<{
  companyId: number | undefined
  name: string
  periodStart: string
  periodEnd: string
  notes: string
}>({ companyId: undefined, name: '', periodStart: '', periodEnd: '', notes: '' })

const formEditable = computed(() => isNew || detail.value?.status === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New production plan' : formEditable.value ? 'Edit production plan' : 'View production plan'))
const workflowSteps = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' }
]
const workflowHint = computed(() => {
  if (detail.value?.status === 'DRAFT') return 'Next: activate to start linking manufacturing orders'
  if (detail.value?.status === 'ACTIVE') return 'Next: close once production for the period is done'
  return ''
})

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => formEditable.value && JSON.stringify(form) !== formSnapshot.value)

// Confirms before a sidebar link, browser back, refresh or tab close throws
// this form away — the page's own back button is only one way out.
useUnsavedChangesGuard(isDirty)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/production-plans')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/production-plans')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const c = await listCompanies({ size: 200 })
    companies.value = c.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      snapshotForm()
      return
    }

    const d = await get(Number(idParam))
    detail.value = d
    form.companyId = d.companyId
    form.name = d.name
    form.periodStart = d.periodStart
    form.periodEnd = d.periodEnd
    form.notes = d.notes ?? ''
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.name || !form.periodStart || !form.periodEnd) {
    formError.value = 'Please fill in company, name, and period'
    return
  }
  saving.value = true
  try {
    if (isNew) {
      await create({ companyId: form.companyId, name: form.name, periodStart: form.periodStart, periodEnd: form.periodEnd, notes: form.notes || undefined })
      toast.add({ title: 'Production plan created', color: 'success' })
    } else {
      await update(Number(idParam), { name: form.name, periodStart: form.periodStart, periodEnd: form.periodEnd, notes: form.notes || undefined })
      toast.add({ title: 'Production plan updated', color: 'success' })
    }
    router.push('/production-plans')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

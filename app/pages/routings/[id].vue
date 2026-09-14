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
              <UIcon name="i-lucide-route" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Routing details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Bill of materials" required class="sm:col-span-2">
              <USelectMenu
                v-model="form.bomId"
                :items="bomOptionsFor(form.companyId)"
                value-key="value"
                :disabled="!isNew"
                placeholder="Search BOMs…"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Name" required class="sm:col-span-3">
              <UInput v-model="form.name" placeholder="e.g. Standard loaf routing" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list-ordered" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Operations</h2>
            </div>
          </template>

          <div v-if="form.operations.length === 0" class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg mb-4">
            No operations yet
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 mb-4">
            <div class="min-w-[760px]">
              <div
                class="grid grid-cols-14 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
              >
                <span class="col-span-1">#</span>
                <span class="col-span-3">Operation</span>
                <span class="col-span-3">Work center</span>
                <span class="col-span-3">Machine</span>
                <span class="col-span-3">Std. time (min)</span>
                <span class="col-span-1"></span>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <div v-for="(op, i) in form.operations" :key="i" class="grid grid-cols-14 gap-2 items-center px-3 py-2">
                  <UInput v-model.number="op.sequenceNumber" type="number" min="1" class="col-span-1" />
                  <UInput v-model="op.name" placeholder="e.g. Mix" class="col-span-3" />
                  <USelect v-model="op.workCenterId" :items="workCenterOptionsFor(form.companyId)" placeholder="Work center" class="col-span-3" />
                  <USelect
                    v-model="op.machineId"
                    :items="machineOptionsFor(op.workCenterId)"
                    placeholder="None"
                    class="col-span-3"
                  />
                  <UInput v-model.number="op.standardTimeMinutes" type="number" min="0" step="0.1" class="col-span-3" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.operations.splice(i, 1)" />
                </div>
              </div>
            </div>
          </div>
          <UButton size="sm" icon="i-lucide-plus" variant="soft" @click="addOperation">Add operation</UButton>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard changes?"
      description="You have unsaved changes on this routing. Leaving now will discard them."
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
import type { RoutingPayload } from '~/composables/useRoutings'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = useRoutings()
const { list: listCompanies } = useCompanies()
const { list: listBoms } = useBillOfMaterials()
const { list: listWorkCenters } = useWorkCenters()
const { list: listMachines } = useMachines()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const boms = ref<{ id: number; bomNumber: string; name: string; companyId: number }[]>([])
const workCenters = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const machines = ref<{ id: number; name: string; workCenterId: number }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function bomOptionsFor(companyId: number | undefined) {
  return boms.value.filter((b) => companyId === undefined || b.companyId === companyId).map((b) => ({ label: `${b.bomNumber} — ${b.name}`, value: b.id }))
}
function workCenterOptionsFor(companyId: number | undefined) {
  return workCenters.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function machineOptionsFor(workCenterId: number | undefined) {
  if (!workCenterId) return []
  return machines.value.filter((m) => m.workCenterId === workCenterId).map((m) => ({ label: m.name, value: m.id }))
}

interface OperationForm {
  sequenceNumber: number
  name: string
  workCenterId: number | undefined
  machineId: number | undefined
  standardTimeMinutes: number | undefined
}

const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')

const form = reactive<{
  companyId: number | undefined
  bomId: number | undefined
  name: string
  notes: string
  operations: OperationForm[]
}>({ companyId: undefined, bomId: undefined, name: '', notes: '', operations: [] })

const pageTitle = computed(() => (isNew ? 'New routing' : 'Edit routing'))

function addOperation() {
  form.operations.push({
    sequenceNumber: form.operations.length + 1,
    name: '',
    workCenterId: undefined,
    machineId: undefined,
    standardTimeMinutes: undefined
  })
}

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => JSON.stringify(form) !== formSnapshot.value)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/routings')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/routings')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, b, w, m] = await Promise.all([
      listCompanies({ size: 200 }),
      listBoms({ size: 200 }),
      listWorkCenters({ size: 200 }),
      listMachines({ size: 200 })
    ])
    companies.value = c.data
    boms.value = b.data
    workCenters.value = w.data
    machines.value = m.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      snapshotForm()
      return
    }

    const detail = await get(Number(idParam))
    form.companyId = detail.companyId
    form.bomId = detail.bomId
    form.name = detail.name
    form.notes = detail.notes ?? ''
    form.operations = (detail.operations ?? []).map((op) => ({
      sequenceNumber: op.sequenceNumber,
      name: op.name,
      workCenterId: op.workCenterId,
      machineId: op.machineId ?? undefined,
      standardTimeMinutes: op.standardTimeMinutes ?? undefined
    }))
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.bomId || !form.name) {
    formError.value = 'Please fill in company, BOM, and name'
    return
  }
  if (form.operations.length === 0 || form.operations.some((op) => !op.name || !op.workCenterId || !op.sequenceNumber)) {
    formError.value = 'Every operation needs a sequence number, name, and work center'
    return
  }
  const payload: RoutingPayload = {
    companyId: form.companyId,
    bomId: form.bomId,
    name: form.name,
    notes: form.notes || undefined,
    operations: form.operations.map((op) => ({
      sequenceNumber: op.sequenceNumber,
      name: op.name,
      workCenterId: op.workCenterId!,
      machineId: op.machineId,
      standardTimeMinutes: op.standardTimeMinutes
    }))
  }
  saving.value = true
  try {
    if (isNew) {
      await create(payload)
      toast.add({ title: 'Routing created', color: 'success' })
    } else {
      await update(Number(idParam), payload)
      toast.add({ title: 'Routing updated', color: 'success' })
    }
    router.push('/routings')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

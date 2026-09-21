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
        <dl v-if="detail" class="grid grid-cols-2 gap-3 text-sm">
          <div v-if="detail.reversalOfJournalNumber">
            <dt class="text-gray-400">Reverses</dt>
            <dd class="text-gray-900 dark:text-white">{{ detail.reversalOfJournalNumber }}</dd>
          </div>
          <div v-if="detail.reversedByJournalNumber">
            <dt class="text-gray-400">Reversed by</dt>
            <dd class="text-gray-900 dark:text-white">{{ detail.reversedByJournalNumber }}</dd>
          </div>
          <div v-if="detail.postedBy">
            <dt class="text-gray-400">Posted by</dt>
            <dd class="text-gray-900 dark:text-white">{{ detail.postedBy }} · {{ formatDate(detail.postedAt!) }}</dd>
          </div>
          <div v-if="detail.sourceType">
            <dt class="text-gray-400">Source</dt>
            <dd class="text-gray-900 dark:text-white">Auto-posted from {{ detail.sourceType }} #{{ detail.sourceId }}</dd>
          </div>
        </dl>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-book-text" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entry details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!formEditable || !isNew" class="w-full" />
            </UFormField>
            <UFormField label="Entry date" required>
              <UInput v-model="form.entryDate" type="date" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Journal">
              <USelect v-model="form.journalId" :items="journalOptionsFor(form.companyId)" placeholder="None" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Description">
              <UTextarea v-model="form.description" :disabled="!formEditable" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lines</h2>
              </div>
              <UButton v-if="formEditable" size="xs" variant="soft" icon="i-lucide-plus" @click="addLine">Add line</UButton>
            </div>
          </template>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No lines yet
          </div>
          <div v-else class="space-y-2">
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-14 gap-2 items-center">
              <USelect v-model="line.accountId" :items="accountOptionsFor(form.companyId)" placeholder="Account" :disabled="!formEditable" class="col-span-4" />
              <UInput v-model.number="line.debit" type="number" min="0" step="0.01" placeholder="Debit" :disabled="!formEditable" class="col-span-2" />
              <UInput v-model.number="line.credit" type="number" min="0" step="0.01" placeholder="Credit" :disabled="!formEditable" class="col-span-2" />
              <USelect
                v-model="line.costCenterId"
                :items="costCenterOptionsFor(form.companyId)"
                placeholder="Cost center"
                :disabled="!formEditable"
                class="col-span-3"
              />
              <UInput v-model="line.description" placeholder="Memo (optional)" :disabled="!formEditable" class="col-span-2" />
              <UButton v-if="formEditable" size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
            </div>
          </div>

          <div class="flex justify-end gap-6 text-sm mt-4">
            <span class="text-gray-600 dark:text-gray-300">Total debit: {{ formatCurrency(formTotalDebit) }}</span>
            <span class="text-gray-600 dark:text-gray-300">Total credit: {{ formatCurrency(formTotalCredit) }}</span>
          </div>
          <div class="flex justify-end mt-1">
            <span v-if="formTotalDebit === formTotalCredit && formTotalDebit > 0" class="text-sm text-success flex items-center gap-1">
              <UIcon name="i-lucide-check-circle" class="w-4 h-4" /> Balanced
            </span>
            <span v-else class="text-sm text-error flex items-center gap-1"> <UIcon name="i-lucide-triangle-alert" class="w-4 h-4" /> Not balanced </span>
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
      description="You have unsaved changes on this journal entry. Leaving now will discard them."
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
import type { JournalEntry, JournalEntryPayload, JournalEntryStatus } from '~/composables/useJournalEntries'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = useJournalEntries()
const { list: listCompanies } = useCompanies()
const { list: listAccounts } = useAccounts()
const { list: listJournals } = useJournals()
const { list: listCostCenters } = useCostCenters()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const accounts = ref<{ id: number; accountCode: string; name: string; companyId: number; active: boolean }[]>([])
const journals = ref<{ id: number; code: string; name: string; companyId: number; active: boolean }[]>([])
const costCenters = ref<{ id: number; code: string; name: string; companyId: number; active: boolean }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function accountOptionsFor(companyId: number | undefined) {
  return accounts.value
    .filter((a) => a.active && (companyId === undefined || a.companyId === companyId))
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
}
function journalOptionsFor(companyId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...journals.value
      .filter((j) => j.active && (companyId === undefined || j.companyId === companyId))
      .map((j) => ({ label: `${j.code} — ${j.name}`, value: j.id }))
  ]
}
function costCenterOptionsFor(companyId: number | undefined) {
  return [
    { label: 'None', value: undefined },
    ...costCenters.value
      .filter((cc) => cc.active && (companyId === undefined || cc.companyId === companyId))
      .map((cc) => ({ label: `${cc.code} — ${cc.name}`, value: cc.id }))
  ]
}

interface LineForm {
  accountId: number | undefined
  debit: number | undefined
  credit: number | undefined
  description: string
  costCenterId: number | undefined
}

const editingStatus = ref<JournalEntryStatus | null>(null)
const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const detail = ref<JournalEntry | null>(null)

const form = reactive<{
  companyId: number | undefined
  entryDate: string
  description: string
  journalId: number | undefined
  lines: LineForm[]
}>({
  companyId: undefined,
  entryDate: new Date().toISOString().slice(0, 10),
  description: '',
  journalId: undefined,
  lines: []
})

const formEditable = computed(() => isNew || editingStatus.value === 'DRAFT')
const pageTitle = computed(() => (isNew ? 'New journal entry' : formEditable.value ? 'Edit journal entry' : 'View journal entry'))
const workflowSteps = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'POSTED', label: 'Posted' }
]
const workflowHint = computed(() => (editingStatus.value === 'DRAFT' ? 'Next: post to update the ledger' : ''))
const formTotalDebit = computed(() => form.lines.reduce((sum, l) => sum + (l.debit || 0), 0))
const formTotalCredit = computed(() => form.lines.reduce((sum, l) => sum + (l.credit || 0), 0))

function addLine() {
  form.lines.push({ accountId: undefined, debit: undefined, credit: undefined, description: '', costCenterId: undefined })
}

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
    router.push('/journal-entries')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/journal-entries')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, a, j, cc] = await Promise.all([
      listCompanies({ size: 200 }),
      listAccounts({ size: 1000 }),
      listJournals({ size: 200 }),
      listCostCenters({ size: 200 })
    ])
    companies.value = c.data
    accounts.value = a.data
    journals.value = j.data
    costCenters.value = cc.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      addLine()
      addLine()
      snapshotForm()
      return
    }

    const full = await get(Number(idParam))
    detail.value = full
    editingStatus.value = full.status
    form.companyId = full.companyId
    form.entryDate = full.entryDate
    form.description = full.description ?? ''
    form.journalId = full.journalId ?? undefined
    form.lines = (full.lines ?? []).map((l) => ({
      accountId: l.accountId,
      debit: l.debit || undefined,
      credit: l.credit || undefined,
      description: l.description ?? '',
      costCenterId: l.costCenterId ?? undefined
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
  if (!form.companyId || !form.entryDate) {
    formError.value = 'Please fill in company and entry date'
    return
  }
  if (form.lines.length < 2 || form.lines.some((l) => !l.accountId || (!l.debit && !l.credit) || (l.debit && l.credit))) {
    formError.value = 'Every line needs an account and exactly one of debit or credit'
    return
  }
  if (formTotalDebit.value !== formTotalCredit.value) {
    formError.value = 'Total debit must equal total credit'
    return
  }
  const payload: JournalEntryPayload = {
    companyId: form.companyId,
    entryDate: form.entryDate,
    description: form.description || undefined,
    journalId: form.journalId || undefined,
    lines: form.lines.map((l) => ({
      accountId: l.accountId!,
      debit: l.debit || 0,
      credit: l.credit || 0,
      description: l.description || undefined,
      costCenterId: l.costCenterId || undefined
    }))
  }
  saving.value = true
  try {
    if (isNew) {
      await create(payload)
      toast.add({ title: 'Journal entry created', color: 'success' })
    } else {
      await update(Number(idParam), payload)
      toast.add({ title: 'Journal entry updated', color: 'success' })
    }
    router.push('/journal-entries')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
      <StatusBadge v-if="ticket" :status="ticket.status" />
      <UBadge v-if="ticket?.overdue" color="error" variant="subtle">Overdue</UBadge>
    </div>

    <DetailSkeleton v-if="loadingDetail" :lines="false" />
    <template v-else>
      <div class="space-y-6">
        <WorkflowStatusStepper v-if="!isNew && ticket" :status="ticket.status" :steps="workflowSteps" :next-hint="workflowHint" />
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-life-buoy" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ticket details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" @update:model-value="onCompanyChanged" />
            </UFormField>
            <UFormField label="Customer" required>
              <USelect v-model="form.customerId" :items="customerOptionsFor(form.companyId)" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Product" hint="Optional">
              <USelect v-model="form.productId" :items="productOptionsFor(form.companyId)" :disabled="!formEditable" placeholder="None" class="w-full" />
            </UFormField>
            <UFormField label="Priority" required>
              <USelect v-model="form.priority" :items="priorityOptions" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Assignee" hint="Optional">
              <USelect v-model="form.assignedToUserId" :items="userOptions" :disabled="!formEditable" placeholder="Unassigned" class="w-full" />
            </UFormField>
            <UFormField v-if="!isNew" label="Days open">
              <div class="text-sm text-gray-900 dark:text-white pt-2">{{ ticket?.daysOpen }}</div>
            </UFormField>
            <UFormField label="Subject" required class="sm:col-span-3">
              <UInput v-model="form.subject" :disabled="!formEditable" class="w-full" />
            </UFormField>
            <UFormField label="Description" required class="sm:col-span-3">
              <UTextarea v-model="form.description" :disabled="!formEditable" :rows="4" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard v-if="!isNew">
          <template #header>
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comments</h2>
          </template>
          <div v-if="!ticket?.comments || ticket.comments.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No comments yet</div>
          <ul v-else class="space-y-2 mb-4">
            <li
              v-for="comment in ticket.comments"
              :key="comment.id"
              class="text-sm rounded-md border px-3 py-2"
              :class="comment.internal ? 'border-warning/40 bg-warning/5' : 'border-gray-200 dark:border-gray-800'"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="font-medium text-gray-900 dark:text-white">{{ comment.authorUsername ?? 'Unknown' }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <UBadge v-if="comment.internal" color="warning" variant="subtle" size="xs">Internal note</UBadge>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(comment.createdAt) }}</span>
                </div>
              </div>
              <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ comment.body }}</p>
            </li>
          </ul>

          <div class="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            <UTextarea v-model="newComment" placeholder="Add a comment…" :rows="2" class="w-full" />
            <div class="flex items-center justify-between">
              <UCheckbox v-model="newCommentInternal" label="Internal note (not customer-visible)" />
              <UButton :loading="addingComment" :disabled="!newComment.trim()" @click="onAddComment">Add comment</UButton>
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
          <AttachmentList owner-type="TICKET" :owner-id="Number(idParam)" />
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton v-if="!isNew && ticket?.status === 'OPEN'" color="info" variant="soft" :loading="acting" @click="onStart">Start progress</UButton>
          <UButton
            v-if="!isNew && (ticket?.status === 'OPEN' || ticket?.status === 'IN_PROGRESS')"
            color="success"
            variant="soft"
            :loading="acting"
            @click="onResolve"
          >
            Resolve
          </UButton>
          <UButton v-if="!isNew && ticket?.status === 'RESOLVED'" color="neutral" variant="soft" :loading="acting" @click="onClose">Close</UButton>
          <UButton
            v-if="!isNew && (ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED')"
            color="warning"
            variant="soft"
            :loading="acting"
            @click="onReopen"
          >
            Reopen
          </UButton>
          <UButton color="neutral" variant="ghost" @click="onLeave">{{ formEditable ? 'Cancel' : 'Back' }}</UButton>
          <UButton v-if="formEditable" :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TicketPriority } from '~/composables/useTickets'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update, addComment, start, resolve, close, reopen } = useTickets()
const { list: listCompanies } = useCompanies()
const { list: listCustomers } = useCustomers()
const { list: listProducts } = useProducts()
const { list: listUsers } = useUsers()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const customers = ref<{ id: number; name: string; companyId: number; status: string }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string }[]>([])
const users = ref<{ id: number; username: string }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function customerOptionsFor(companyId: number | undefined) {
  return customers.value
    .filter((c) => c.status === 'ACTIVE' && (companyId === undefined || c.companyId === companyId))
    .map((c) => ({ label: c.name, value: c.id }))
}
function productOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
const userOptions = computed(() => users.value.map((u) => ({ label: u.username, value: u.id })))
const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' }
]

function onCompanyChanged() {
  form.customerId = undefined
  form.productId = undefined
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

const loadingDetail = ref(true)
const saving = ref(false)
const acting = ref(false)
const formError = ref('')
const ticket = ref<Awaited<ReturnType<typeof get>> | null>(null)

const form = reactive<{
  companyId: number | undefined
  customerId: number | undefined
  productId: number | undefined
  subject: string
  description: string
  priority: TicketPriority
  assignedToUserId: number | undefined
}>({
  companyId: undefined,
  customerId: undefined,
  productId: undefined,
  subject: '',
  description: '',
  priority: 'MEDIUM',
  assignedToUserId: undefined
})

const formEditable = computed(() => isNew || ticket.value?.status === 'OPEN' || ticket.value?.status === 'IN_PROGRESS')
const pageTitle = computed(() => (isNew ? 'New ticket' : `Ticket ${ticket.value?.ticketNumber ?? ''}`))
const workflowSteps = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' }
]
const workflowHint = computed(() => {
  if (ticket.value?.status === 'OPEN') return 'Next: start progress'
  if (ticket.value?.status === 'IN_PROGRESS') return 'Next: resolve the ticket'
  if (ticket.value?.status === 'RESOLVED') return 'Next: close, or reopen if more work is needed'
  if (ticket.value?.status === 'CLOSED') return 'Reopen if the customer needs more help'
  return ''
})

function onLeave() {
  router.push('/tickets')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, cu, p, u] = await Promise.all([
      listCompanies({ size: 200 }),
      listCustomers({ size: 200 }),
      listProducts({ size: 1000 }),
      listUsers({ size: 200 })
    ])
    companies.value = c.data
    customers.value = cu.data
    products.value = p.data
    users.value = u.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      return
    }

    ticket.value = await get(Number(idParam))
    form.companyId = ticket.value.companyId
    form.customerId = ticket.value.customerId
    form.productId = ticket.value.productId ?? undefined
    form.subject = ticket.value.subject
    form.description = ticket.value.description
    form.priority = ticket.value.priority
    form.assignedToUserId = ticket.value.assignedToUserId ?? undefined
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.customerId || !form.subject.trim() || !form.description.trim()) {
    formError.value = 'Please fill in company, customer, subject, and description'
    return
  }
  saving.value = true
  try {
    if (isNew) {
      const created = await create({
        companyId: form.companyId,
        customerId: form.customerId,
        productId: form.productId,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        assignedToUserId: form.assignedToUserId
      })
      toast.add({ title: 'Ticket created', color: 'success' })
      router.push(`/tickets/${created.id}`)
    } else if (ticket.value) {
      ticket.value = await update(ticket.value.id, {
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        productId: form.productId,
        assignedToUserId: form.assignedToUserId
      })
      toast.add({ title: 'Ticket updated', color: 'success' })
    }
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const newComment = ref('')
const newCommentInternal = ref(false)
const addingComment = ref(false)
async function onAddComment() {
  if (!ticket.value || !newComment.value.trim()) return
  addingComment.value = true
  try {
    ticket.value = await addComment(ticket.value.id, { body: newComment.value, internal: newCommentInternal.value })
    newComment.value = ''
    newCommentInternal.value = false
  } catch (err) {
    toast.add({ title: 'Could not add comment', description: apiErrorMessage(err), color: 'error' })
  } finally {
    addingComment.value = false
  }
}

async function onStart() {
  if (!ticket.value) return
  acting.value = true
  try {
    ticket.value = await start(ticket.value.id)
    toast.add({ title: 'Ticket started', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not start', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}
async function onResolve() {
  if (!ticket.value) return
  acting.value = true
  try {
    ticket.value = await resolve(ticket.value.id)
    toast.add({ title: 'Ticket resolved', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not resolve', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}
async function onClose() {
  if (!ticket.value) return
  acting.value = true
  try {
    ticket.value = await close(ticket.value.id)
    toast.add({ title: 'Ticket closed', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not close', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}
async function onReopen() {
  if (!ticket.value) return
  acting.value = true
  try {
    ticket.value = await reopen(ticket.value.id)
    toast.add({ title: 'Ticket reopened', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not reopen', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">New stock count</h1>
    </div>

    <div v-if="loadingLookups" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Count details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" class="w-full" @update:model-value="onFormCompanyChanged" />
            </UFormField>
            <UFormField label="Count date" required>
              <UInput v-model="form.countDate" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Warehouse" required class="sm:col-span-2">
              <USelect v-model="form.warehouseId" :items="warehouseOptionsFor(form.companyId)" class="w-full" @update:model-value="onWarehouseChanged" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Products to count</h2>
            </div>
          </template>

          <p class="text-xs text-gray-400 mb-3">Only untracked products can be counted — batch/serial-tracked stock isn't supported here.</p>

          <div class="flex items-center justify-end mb-3">
            <UButton size="xs" variant="soft" icon="i-lucide-plus" :disabled="!form.warehouseId" @click="addLine">Add product</UButton>
          </div>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No products added yet
          </div>
          <div v-else class="space-y-2">
            <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <USelect v-model="line.productId" :items="untrackedProductOptionsFor(form.companyId)" placeholder="Product" class="col-span-6" />
              <USelect v-model="line.binId" :items="binOptionsForWarehouse" placeholder="No bin" class="col-span-5" />
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">Start count</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard this stock count?"
      description="You have unsaved changes on this stock count. Leaving now will discard them."
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
import type { StockCountPayload } from '~/composables/useStockCounts'

definePageMeta({ middleware: 'admin' })

const router = useRouter()
const { create } = useStockCounts()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()
const { list: listBins } = useWarehouseBins()
const toast = useToast()

const loadingLookups = ref(true)
const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])
const products = ref<{ id: number; name: string; sku: string; companyId: number; status: string; trackingType: string }[]>([])
const bins = ref<{ id: number; name: string; warehouseId: number | null; active: boolean }[]>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function warehouseOptionsFor(companyId: number | undefined) {
  return warehouses.value.filter((w) => w.active && (companyId === undefined || w.companyId === companyId)).map((w) => ({ label: w.name, value: w.id }))
}
function untrackedProductOptionsFor(companyId: number | undefined) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && p.trackingType === 'NONE' && (companyId === undefined || p.companyId === companyId))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}

interface LineForm {
  productId: number | undefined
  binId: number | undefined
}

const saving = ref(false)
const formError = ref('')

const form = reactive<{
  companyId: number | undefined
  warehouseId: number | undefined
  countDate: string
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  warehouseId: undefined,
  countDate: new Date().toISOString().slice(0, 10),
  notes: '',
  lines: []
})

const binOptionsForWarehouse = computed(() => [
  { label: 'No bin', value: undefined },
  ...bins.value.filter((b) => b.active && b.warehouseId === form.warehouseId).map((b) => ({ label: b.name, value: b.id }))
])

function onFormCompanyChanged() {
  form.warehouseId = undefined
  form.lines = []
}
function onWarehouseChanged() {
  form.lines = []
}

function addLine() {
  form.lines.push({ productId: undefined, binId: undefined })
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
    router.push('/stock-counts')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/stock-counts')
}

async function onSaveForm() {
  formError.value = ''
  if (!form.companyId || !form.warehouseId || !form.countDate) {
    formError.value = 'Please fill in company, warehouse, and count date'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.productId)) {
    formError.value = 'Add at least one product to count'
    return
  }
  const payload: StockCountPayload = {
    companyId: form.companyId,
    warehouseId: form.warehouseId,
    countDate: form.countDate,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({ productId: l.productId!, binId: l.binId }))
  }
  saving.value = true
  try {
    await create(payload)
    toast.add({ title: 'Stock count started', color: 'success' })
    router.push('/stock-counts')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loadingLookups.value = true
  try {
    const [c, w, p, b] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 }), listProducts({ size: 200 }), listBins({ size: 200 })])
    companies.value = c.data
    warehouses.value = w.data
    products.value = p.data
    bins.value = b.data
    form.companyId = activeCompanyOptions.value[0]?.value
    snapshotForm()
  } finally {
    loadingLookups.value = false
  }
})
</script>

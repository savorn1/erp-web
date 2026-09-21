<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
      <UBadge v-if="versionInfo" class="ml-auto">v{{ versionInfo.version }}</UBadge>
    </div>
    <UAlert
      v-if="versionInfo?.supersededByBomId"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="This version has been superseded by a newer BOM."
      icon="i-lucide-triangle-alert"
    />

    <DetailSkeleton v-if="loadingDetail" />
    <template v-else>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list-tree" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recipe details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Company" required>
              <USelect v-model="form.companyId" :items="activeCompanyOptions" :disabled="!isNew" class="w-full" />
            </UFormField>
            <UFormField label="Finished good" required>
              <USelectMenu
                v-model="form.productId"
                :items="productOptionsFor(form.companyId)"
                value-key="value"
                :disabled="!isNew"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Output quantity" required :hint="finishedGoodUnitLabel">
              <UInput v-model.number="form.outputQuantity" type="number" min="0.0001" step="0.0001" class="w-full" />
            </UFormField>
            <UFormField label="Name" required class="sm:col-span-3">
              <UInput v-model="form.name" placeholder="e.g. Standard loaf recipe" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-3">
              <UTextarea v-model="form.notes" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Components</h2>
            </div>
          </template>

          <div class="flex flex-wrap items-end gap-2 mb-4">
            <UFormField label="Component product" class="flex-1 min-w-[240px]">
              <USelectMenu
                v-model="addLineProductId"
                :items="productOptionsFor(form.companyId, form.productId)"
                value-key="value"
                placeholder="Search products…"
                class="w-full"
              />
            </UFormField>
            <UButton icon="i-lucide-plus" :disabled="!addLineProductId" @click="addLine">Add component</UButton>
          </div>

          <div
            v-if="form.lines.length === 0"
            class="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            No components yet
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <div class="min-w-[640px]">
              <div
                class="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
              >
                <span class="col-span-5">Component</span>
                <span class="col-span-3">Quantity per batch</span>
                <span class="col-span-3">Scrap %</span>
                <span class="col-span-1"></span>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-12 gap-2 items-center px-3 py-2">
                  <div class="col-span-5 text-sm text-gray-900 dark:text-white truncate">
                    {{ productLabel(line.componentProductId) }}
                    <span class="text-gray-400">({{ unitAbbreviationFor(line.componentProductId) }})</span>
                  </div>
                  <UInput v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" class="col-span-3" />
                  <UInput v-model.number="line.scrapPercent" type="number" min="0" max="100" step="0.01" placeholder="0" class="col-span-3" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" class="col-span-1" @click="form.lines.splice(i, 1)" />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard v-if="!isNew && versionHistory.length > 1">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-git-branch" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Version history</h2>
            </div>
          </template>
          <div class="divide-y divide-gray-200 dark:divide-gray-800">
            <div v-for="v in versionHistory" :key="v.id" class="flex items-center justify-between py-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="font-medium">v{{ v.version }}</span>
                <span class="text-gray-400">{{ v.bomNumber }}</span>
                <UBadge v-if="v.current" size="xs" color="primary">Viewing</UBadge>
              </div>
              <div class="flex items-center gap-3 text-gray-400">
                <span>{{ v.status }}</span>
                <NuxtLink v-if="!v.current" :to="`/bill-of-materials/${v.id}`" class="underline">View</NuxtLink>
                <NuxtLink v-if="!v.current" :to="`/reports/manufacturing/bom-comparison?bomId=${idParam}&compareToBomId=${v.id}`" class="underline">
                  Compare
                </NuxtLink>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">{{ 'Cancel' }}</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard changes?"
      description="You have unsaved changes on this BOM. Leaving now will discard them."
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
import type { BillOfMaterialPayload, BomVersionRow } from '~/composables/useBillOfMaterials'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update, getVersionHistory } = useBillOfMaterials()
const { list: listCompanies } = useCompanies()
const { list: listProducts } = useProducts()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const products = ref<
  { id: number; name: string; sku: string; companyId: number; status: string; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]
>([])

const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
function productOptionsFor(companyId: number | undefined, excludeProductId?: number) {
  return products.value
    .filter((p) => p.status === 'ACTIVE' && (companyId === undefined || p.companyId === companyId) && p.id !== excludeProductId)
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
}
function productLabel(productId: number | undefined) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.name} (${product.sku})` : '—'
}
function unitAbbreviationFor(productId: number | undefined) {
  return products.value.find((p) => p.id === productId)?.unitOfMeasureAbbreviation ?? ''
}
const finishedGoodUnitLabel = computed(() => {
  const abbr = unitAbbreviationFor(form.productId)
  return abbr ? `in ${abbr}` : ''
})

interface LineForm {
  componentProductId: number | undefined
  quantity: number | undefined
  scrapPercent: number | undefined
}

const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')
const versionInfo = ref<{ version: number; supersededByBomId: number | null } | null>(null)
const versionHistory = ref<BomVersionRow[]>([])

const form = reactive<{
  companyId: number | undefined
  productId: number | undefined
  name: string
  outputQuantity: number | undefined
  notes: string
  lines: LineForm[]
}>({
  companyId: undefined,
  productId: undefined,
  name: '',
  outputQuantity: undefined,
  notes: '',
  lines: []
})

const pageTitle = computed(() => (isNew ? 'New bill of materials' : 'Edit bill of materials'))

const addLineProductId = ref<number | undefined>(undefined)
function addLine() {
  if (!addLineProductId.value) return
  form.lines.push({ componentProductId: addLineProductId.value, quantity: undefined, scrapPercent: undefined })
  addLineProductId.value = undefined
}

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => JSON.stringify(form) !== formSnapshot.value)

// Confirms before a sidebar link, browser back, refresh or tab close throws
// this form away — the page's own back button is only one way out.
useUnsavedChangesGuard(isDirty)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/bill-of-materials')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/bill-of-materials')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const [c, p] = await Promise.all([listCompanies({ size: 200 }), listProducts({ size: 200 })])
    companies.value = c.data
    products.value = p.data

    if (isNew) {
      form.companyId = activeCompanyOptions.value[0]?.value
      snapshotForm()
      return
    }

    const detail = await get(Number(idParam))
    versionInfo.value = { version: detail.version, supersededByBomId: detail.supersededByBomId }
    getVersionHistory(Number(idParam))
      .then((v) => (versionHistory.value = v))
      .catch(() => (versionHistory.value = []))
    form.companyId = detail.companyId
    form.productId = detail.productId
    form.name = detail.name
    form.outputQuantity = detail.outputQuantity
    form.notes = detail.notes ?? ''
    form.lines = (detail.lines ?? []).map((l) => ({
      componentProductId: l.componentProductId,
      quantity: l.quantity,
      scrapPercent: l.scrapPercent || undefined
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
  if (!form.companyId || !form.productId || !form.name || !form.outputQuantity) {
    formError.value = 'Please fill in company, finished good, name, and output quantity'
    return
  }
  if (form.lines.length === 0 || form.lines.some((l) => !l.componentProductId || !l.quantity)) {
    formError.value = 'Every component needs a product and a quantity'
    return
  }
  const payload: BillOfMaterialPayload = {
    companyId: form.companyId,
    productId: form.productId,
    name: form.name,
    outputQuantity: form.outputQuantity,
    notes: form.notes || undefined,
    lines: form.lines.map((l) => ({
      componentProductId: l.componentProductId!,
      quantity: l.quantity!,
      scrapPercent: l.scrapPercent
    }))
  }
  saving.value = true
  try {
    if (isNew) {
      await create(payload)
      toast.add({ title: 'Bill of materials created', color: 'success' })
    } else {
      await update(Number(idParam), payload)
      toast.add({ title: 'Bill of materials updated', color: 'success' })
    }
    router.push('/bill-of-materials')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

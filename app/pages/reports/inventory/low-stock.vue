<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Low stock"
      description="Products below their reorder point."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Low stock' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Show quantity in">
          <USelect v-model="mode" :items="displayUnitOptions" class="w-36" />
        </UFormField>
        <UButton
          v-if="lowStock && lowStock.rows.length > 0"
          class="ml-auto"
          color="neutral"
          variant="soft"
          icon="i-lucide-shopping-cart"
          @click="openGenerateModal()"
        >
          Generate purchase requests
        </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="lowStock">
      <UAlert
        color="neutral"
        variant="subtle"
        class="mb-4"
        title="Only products with a reorder point set"
        description="Set a reorder point on a product to have it show up here once available stock falls below it."
      />
      <DataTable :rows="lowStock.rows" :columns="columns" :exportable="false">
        <template #actions-data="{ row }">
          <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-shopping-cart" @click="openGenerateModal(row.productId)"> Create PR </UButton>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="Nothing is low on stock" />
        </template>
      </DataTable>
    </UCard>

    <UModal v-model:open="showGenerateModal" title="Generate purchase request">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{
              generateProductIds
                ? 'Creates a draft purchase request for this product.'
                : `Creates one draft purchase request covering all ${lowStock?.rows.length ?? 0} low-stock row(s) currently shown.`
            }}
          </p>
          <UFormField label="Company" required>
            <USelect v-model="generateForm.companyId" :items="activeCompanyOptions" placeholder="Select a company" class="w-full" />
          </UFormField>
          <UFormField label="Department" required>
            <USelect v-model="generateForm.departmentId" :items="departmentOptions" placeholder="Select a department" class="w-full" />
          </UFormField>
          <UFormField label="Request date" required>
            <UInput v-model="generateForm.requestDate" type="date" class="w-full" />
          </UFormField>
          <UAlert v-if="generateError" color="error" variant="subtle" :title="generateError" />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="showGenerateModal = false">Cancel</UButton>
            <UButton :loading="generating" @click="onGenerate">Generate</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { InventoryOverviewRow } from '~/composables/useInventoryOverview'
import type { LowStock } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { lowStock: fetchLowStock } = useInventoryReports()
const { list: listProducts } = useProducts()
const { list: listDepartments } = useDepartments()
const { generateFromLowStock } = usePurchaseRequests()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const lowStock = ref<LowStock | null>(null)
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])
const departments = ref<{ id: number; name: string }[]>([])
const departmentOptions = computed(() => departments.value.map((d) => ({ label: d.name, value: d.id })))

function formatted(row: InventoryOverviewRow, baseQuantity: number) {
  return formatQuantity(
    products.value.find((p) => p.id === row.productId),
    baseQuantity
  )
}

const columns = computed<ColumnDef<InventoryOverviewRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'availableStock', label: 'Available', value: (row) => formatted(row, row.availableStock), class: 'text-error' },
  { key: 'reorderPoint', label: 'Reorder point', value: (row) => formatted(row, row.reorderPoint) },
  { key: 'actions', label: '' }
])

// ── Generate purchase request(s) ────────────────────────────────────────
const showGenerateModal = ref(false)
const generateProductIds = ref<number[] | undefined>(undefined)
const generateForm = reactive<{ companyId: number | undefined; departmentId: number | undefined; requestDate: string }>({
  companyId: undefined,
  departmentId: undefined,
  requestDate: new Date().toISOString().slice(0, 10)
})
const generating = ref(false)
const generateError = ref('')

function openGenerateModal(productId?: number) {
  generateProductIds.value = productId === undefined ? undefined : [productId]
  generateForm.companyId = companyId.value
  generateError.value = ''
  showGenerateModal.value = true
}

async function onGenerate() {
  if (!generateForm.companyId || !generateForm.departmentId) {
    generateError.value = 'Company and department are required'
    return
  }
  generating.value = true
  generateError.value = ''
  try {
    const pr = await generateFromLowStock({
      companyId: generateForm.companyId,
      departmentId: generateForm.departmentId,
      requestDate: generateForm.requestDate,
      warehouseId: warehouseId.value,
      productIds: generateProductIds.value
    })
    showGenerateModal.value = false
    toast.add({ title: `Purchase request ${pr.requestNumber} created`, description: 'View it under Purchase Requests.', color: 'success' })
    await load()
  } catch (err) {
    generateError.value = apiErrorMessage(err)
  } finally {
    generating.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [result, productsRes] = await Promise.all([
      fetchLowStock({ companyId: companyId.value, warehouseId: warehouseId.value }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    lowStock.value = result
    if (productsRes) products.value = productsRes.data
    await ensurePackUnits(result.rows.map((r) => r.productId))
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  const d = await listDepartments({ size: 200 })
  departments.value = d.data
  await load()
})
watch([companyId, warehouseId], load)
</script>

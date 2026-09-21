<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Inventory settings</h1>

    <UCard class="mb-4">
      <UFormField label="Company">
        <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="Select a company" class="w-64" />
      </UFormField>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Applies to POS checkout/exchange and Sales Order confirmation, delivery, and cancellation — the two customer-facing selling flows. Stock transfers,
        stock adjustments, and manufacturing order consumption are internal movements and always keep their own hard "insufficient stock" block regardless of
        these settings.
      </p>
    </UCard>

    <UAlert v-if="!loadingLookups && activeCompanyOptions.length === 0" color="warning" variant="subtle" class="mb-4" title="No active companies yet" />
    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="companyId">
      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Selling limits</h2></template>
        <div class="divide-y divide-gray-200 dark:divide-gray-800">
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Allow overselling</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Lets a sale/order exceed available stock at all, instead of a hard block.</p>
            </div>
            <USwitch v-model="form.allowOverselling" />
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Allow negative stock</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Lets on-hand quantity itself drop below zero, not just the available figure.</p>
            </div>
            <USwitch v-model="form.allowNegativeStock" />
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Overselling requires approval</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Only takes effect when overselling is allowed above — a USER-role account is blocked from exceeding available stock, an ADMIN account can
                proceed.
              </p>
            </div>
            <USwitch v-model="form.oversellingApprovalRequired" />
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Backorder</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                When an oversold sale/order is permitted, let it complete for the full quantity and record the shortfall as backordered, instead of only ever
                letting through what's on hand.
              </p>
            </div>
            <USwitch v-model="form.backorderEnabled" />
          </div>
        </div>
      </UCard>

      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Reservations & display</h2></template>
        <div class="divide-y divide-gray-200 dark:divide-gray-800">
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Reserve stock</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Confirming a Sales Order claims stock against future delivery, so POS and other Sales Orders correctly see less available — released
                automatically on delivery or cancellation. Off means "available" is always just raw on-hand, as it was before this setting existed.
              </p>
            </div>
            <USwitch v-model="form.reserveStock" />
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Show available stock</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Display-only — shows an available-stock count/badge on POS product cards. Server-side enforcement is unaffected either way.
              </p>
            </div>
            <USwitch v-model="form.showAvailableStock" />
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Stock warning</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Display-only — shows the dashboard's "Low stock items" tile and POS's low-stock badge coloring. The per-product reorder point still decides
                which products would qualify either way.
              </p>
            </div>
            <USwitch v-model="form.stockWarningEnabled" />
          </div>
        </div>
      </UCard>

      <UAlert v-if="saveError" color="error" variant="subtle" class="mb-4" :title="saveError" />
      <div class="flex justify-end">
        <UButton :loading="saving" icon="i-lucide-check" @click="onSave">Save settings</UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { InventorySettings } from '~/composables/useInventorySettings'

definePageMeta({ middleware: 'admin' })

const { getForCompany, upsert } = useInventorySettings()
const { list: listCompanies } = useCompanies()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const loadingLookups = ref(false)
const loading = ref(false)
const error = ref('')

const companyId = ref<number | undefined>(undefined)
const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))

const form = reactive<Omit<InventorySettings, 'companyId'>>({
  allowOverselling: false,
  allowNegativeStock: false,
  showAvailableStock: true,
  reserveStock: true,
  backorderEnabled: false,
  oversellingApprovalRequired: false,
  stockWarningEnabled: true
})

function applySettings(settings: InventorySettings) {
  form.allowOverselling = settings.allowOverselling
  form.allowNegativeStock = settings.allowNegativeStock
  form.showAvailableStock = settings.showAvailableStock
  form.reserveStock = settings.reserveStock
  form.backorderEnabled = settings.backorderEnabled
  form.oversellingApprovalRequired = settings.oversellingApprovalRequired
  form.stockWarningEnabled = settings.stockWarningEnabled
}

async function loadSettings() {
  if (!companyId.value) return
  loading.value = true
  error.value = ''
  try {
    applySettings(await getForCompany(companyId.value))
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const saving = ref(false)
const saveError = ref('')
async function onSave() {
  if (!companyId.value) return
  saving.value = true
  saveError.value = ''
  try {
    applySettings(await upsert({ companyId: companyId.value, ...form }))
    toast.add({ title: 'Inventory settings saved', color: 'success' })
  } catch (err) {
    saveError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loadingLookups.value = true
  try {
    const c = await listCompanies({ size: 200 })
    companies.value = c.data
    companyId.value = activeCompanyOptions.value[0]?.value
  } finally {
    loadingLookups.value = false
  }
})
watch(companyId, loadSettings)
</script>

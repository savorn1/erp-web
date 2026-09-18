<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Posting rules</h1>
      <UButton v-if="companyId" color="neutral" variant="soft" icon="i-lucide-sparkles" :loading="seeding" @click="onSeed">
        Seed from standard chart
      </UButton>
    </div>

    <UCard class="mb-4">
      <UFormField label="Company">
        <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="Select a company" class="w-64" />
      </UFormField>
      <p class="text-xs text-gray-400 mt-3">
        These are the "auto-posting accounts" — approving an invoice, recording a payment, or issuing a credit/debit note will create and post a balanced
        journal entry using the accounts mapped here. Leave any field blank to skip auto-posting for that document type; the underlying action (approving,
        recording, etc.) always succeeds either way. "Seed from standard chart" fills in every still-blank field with one default account per module,
        creating the standard chart of accounts first if the company doesn't have it yet — it never overwrites a field you've already mapped.
      </p>
    </UCard>

    <UAlert v-if="!loadingLookups && activeCompanyOptions.length === 0" color="warning" variant="subtle" class="mb-4" title="No active companies yet" />
    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="companyId">
      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Sales</h2></template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Accounts receivable">
            <USelectMenu v-model="form.accountsReceivableAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Sales revenue">
            <USelectMenu v-model="form.salesRevenueAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Sales returns">
            <USelectMenu v-model="form.salesReturnsAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Tax payable (output tax)">
            <USelectMenu v-model="form.taxPayableAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Purchasing</h2></template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Accounts payable">
            <USelectMenu v-model="form.accountsPayableAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Purchase expense (COGS)">
            <USelectMenu v-model="form.purchaseExpenseAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Purchase returns">
            <USelectMenu v-model="form.purchaseReturnsAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Tax receivable (input tax)">
            <USelectMenu v-model="form.taxReceivableAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Cash & bank</h2></template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Default cash account" hint="Used for CASH-method payments.">
            <USelectMenu v-model="form.defaultCashAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Default bank account" hint="Used for bank transfer / payment gateway payments.">
            <USelectMenu v-model="form.defaultBankAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Petty cash account" hint="Selectable for manual journal entries — nothing auto-posts here yet.">
            <USelectMenu v-model="form.pettyCashAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Cash in transit account" hint="Selectable for manual journal entries — nothing auto-posts here yet.">
            <USelectMenu v-model="form.cashInTransitAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Fixed assets</h2></template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Fixed assets, at cost" hint="Debited on acquisition, credited on disposal.">
            <USelectMenu v-model="form.fixedAssetCostAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Depreciation expense">
            <USelectMenu v-model="form.depreciationExpenseAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Accumulated depreciation">
            <USelectMenu v-model="form.accumulatedDepreciationAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Gain/loss on disposal">
            <USelectMenu v-model="form.assetDisposalGainLossAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Point of sale</h2></template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Inventory (asset)" hint="Credited when a POS sale relieves inventory.">
            <USelectMenu v-model="form.inventoryAssetAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="Cash over/short" hint="Dr/Cr'd when a session's counted cash doesn't match expected at close.">
            <USelectMenu v-model="form.cashVarianceAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
          <UFormField label="POS cash account" hint="Cash tender for checkout/exchange/session variance. Falls back to the default cash account when unset.">
            <USelectMenu v-model="form.posCashAccountId" :items="accountOptions" value-key="value" placeholder="None" class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UAlert v-if="saveError" color="error" variant="subtle" class="mb-4" :title="saveError" />
      <div class="flex justify-end">
        <UButton :loading="saving" icon="i-lucide-check" @click="onSave">Save posting rules</UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PostingRule } from '~/composables/usePostingRules'

definePageMeta({ middleware: 'admin' })

const { getForCompany, upsert, seed } = usePostingRules()
const { list: listCompanies } = useCompanies()
const { list: listAccounts } = useAccounts()
const toast = useToast()

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const accounts = ref<{ id: number; accountCode: string; name: string; companyId: number; active: boolean }[]>([])
const loadingLookups = ref(false)
const loading = ref(false)
const error = ref('')

const companyId = ref<number | undefined>(undefined)
const activeCompanyOptions = computed(() => companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id })))
const accountOptions = computed(() =>
  accounts.value.filter((a) => a.active && a.companyId === companyId.value).map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
)

const form = reactive<{
  accountsReceivableAccountId: number | undefined
  accountsPayableAccountId: number | undefined
  salesRevenueAccountId: number | undefined
  salesReturnsAccountId: number | undefined
  purchaseExpenseAccountId: number | undefined
  purchaseReturnsAccountId: number | undefined
  taxPayableAccountId: number | undefined
  taxReceivableAccountId: number | undefined
  defaultCashAccountId: number | undefined
  defaultBankAccountId: number | undefined
  fixedAssetCostAccountId: number | undefined
  depreciationExpenseAccountId: number | undefined
  accumulatedDepreciationAccountId: number | undefined
  assetDisposalGainLossAccountId: number | undefined
  inventoryAssetAccountId: number | undefined
  cashVarianceAccountId: number | undefined
  posCashAccountId: number | undefined
  pettyCashAccountId: number | undefined
  cashInTransitAccountId: number | undefined
}>({
  accountsReceivableAccountId: undefined,
  accountsPayableAccountId: undefined,
  salesRevenueAccountId: undefined,
  salesReturnsAccountId: undefined,
  purchaseExpenseAccountId: undefined,
  purchaseReturnsAccountId: undefined,
  taxPayableAccountId: undefined,
  taxReceivableAccountId: undefined,
  defaultCashAccountId: undefined,
  defaultBankAccountId: undefined,
  fixedAssetCostAccountId: undefined,
  depreciationExpenseAccountId: undefined,
  accumulatedDepreciationAccountId: undefined,
  assetDisposalGainLossAccountId: undefined,
  inventoryAssetAccountId: undefined,
  cashVarianceAccountId: undefined,
  posCashAccountId: undefined,
  pettyCashAccountId: undefined,
  cashInTransitAccountId: undefined
})

function applyRule(rule: PostingRule) {
  form.accountsReceivableAccountId = rule.accountsReceivableAccountId ?? undefined
  form.accountsPayableAccountId = rule.accountsPayableAccountId ?? undefined
  form.salesRevenueAccountId = rule.salesRevenueAccountId ?? undefined
  form.salesReturnsAccountId = rule.salesReturnsAccountId ?? undefined
  form.purchaseExpenseAccountId = rule.purchaseExpenseAccountId ?? undefined
  form.purchaseReturnsAccountId = rule.purchaseReturnsAccountId ?? undefined
  form.taxPayableAccountId = rule.taxPayableAccountId ?? undefined
  form.taxReceivableAccountId = rule.taxReceivableAccountId ?? undefined
  form.defaultCashAccountId = rule.defaultCashAccountId ?? undefined
  form.defaultBankAccountId = rule.defaultBankAccountId ?? undefined
  form.fixedAssetCostAccountId = rule.fixedAssetCostAccountId ?? undefined
  form.depreciationExpenseAccountId = rule.depreciationExpenseAccountId ?? undefined
  form.accumulatedDepreciationAccountId = rule.accumulatedDepreciationAccountId ?? undefined
  form.assetDisposalGainLossAccountId = rule.assetDisposalGainLossAccountId ?? undefined
  form.inventoryAssetAccountId = rule.inventoryAssetAccountId ?? undefined
  form.cashVarianceAccountId = rule.cashVarianceAccountId ?? undefined
  form.posCashAccountId = rule.posCashAccountId ?? undefined
  form.pettyCashAccountId = rule.pettyCashAccountId ?? undefined
  form.cashInTransitAccountId = rule.cashInTransitAccountId ?? undefined
}

async function loadRule() {
  if (!companyId.value) return
  loading.value = true
  error.value = ''
  try {
    applyRule(await getForCompany(companyId.value))
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const seeding = ref(false)
async function onSeed() {
  if (!companyId.value) return
  seeding.value = true
  try {
    const [rule, a] = await Promise.all([seed(companyId.value), listAccounts({ size: 1000 })])
    accounts.value = a.data
    applyRule(rule)
    toast.add({ title: 'Posting rules seeded from the standard chart of accounts', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not seed posting rules', description: apiErrorMessage(err), color: 'error' })
  } finally {
    seeding.value = false
  }
}

const saving = ref(false)
const saveError = ref('')
async function onSave() {
  if (!companyId.value) return
  saving.value = true
  saveError.value = ''
  try {
    applyRule(await upsert({ companyId: companyId.value, ...form }))
    toast.add({ title: 'Posting rules saved', color: 'success' })
  } catch (err) {
    saveError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loadingLookups.value = true
  try {
    const [c, a] = await Promise.all([listCompanies({ size: 200 }), listAccounts({ size: 1000 })])
    companies.value = c.data
    accounts.value = a.data
    companyId.value = activeCompanyOptions.value[0]?.value
  } finally {
    loadingLookups.value = false
  }
})
watch(companyId, loadRule)
</script>

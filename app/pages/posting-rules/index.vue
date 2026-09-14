<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Posting rules</h1>
    </div>

    <UCard class="mb-4">
      <UFormField label="Company">
        <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="Select a company" class="w-64" />
      </UFormField>
      <p class="text-xs text-gray-400 mt-3">
        These are the "auto-posting accounts" — approving an invoice, recording a payment, or issuing a credit/debit note will create and post a balanced
        journal entry using the accounts mapped here. Leave any field blank to skip auto-posting for that document type; the underlying action (approving,
        recording, etc.) always succeeds either way.
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

const { getForCompany, upsert } = usePostingRules()
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
  defaultBankAccountId: undefined
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

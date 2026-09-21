<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-lg' }">
    <template #body>
      <div v-if="!result" class="space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Upload a CSV file to import in bulk.
          <a v-if="templateUrl" :href="templateUrl" download class="text-primary-500 hover:underline">Download template</a>
        </p>
        <UFormField label="CSV file" required>
          <input ref="fileInput" type="file" accept=".csv" class="text-sm" @change="onFileSelected" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
      </div>

      <div v-else class="space-y-3">
        <p class="text-sm">
          <span class="font-semibold text-success">{{ result.successCount }} imported</span>
          <span v-if="result.failureCount > 0" class="text-error"> · {{ result.failureCount }} failed</span>
          <span class="text-gray-400"> (of {{ result.totalRows }} rows)</span>
        </p>
        <ul v-if="result.errors.length > 0" class="space-y-1 max-h-64 overflow-y-auto">
          <li v-for="err in result.errors" :key="err.rowNumber" class="text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-error">
            Row {{ err.rowNumber }}: {{ err.message }}
          </li>
        </ul>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <UButton v-if="!result" color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton v-if="!result" :loading="importing" :disabled="!selectedFile" @click="onImport">Import</UButton>
        <UButton v-else @click="onDone">Done</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ImportResult } from '#shared/types'

const props = defineProps<{
  title: string
  templateUrl?: string
  companyId: number | undefined
  importFn: (file: File, companyId: number) => Promise<ImportResult>
}>()

const emit = defineEmits<{ imported: [] }>()

const open = defineModel<boolean>('open', { default: false })

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const importing = ref(false)
const error = ref('')
const result = ref<ImportResult | null>(null)

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function onImport() {
  if (!selectedFile.value || !props.companyId) return
  error.value = ''
  importing.value = true
  try {
    result.value = await props.importFn(selectedFile.value, props.companyId)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    importing.value = false
  }
}

function onDone() {
  open.value = false
  emit('imported')
}

watch(open, (isOpen) => {
  if (isOpen) {
    selectedFile.value = null
    error.value = ''
    result.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
})
</script>

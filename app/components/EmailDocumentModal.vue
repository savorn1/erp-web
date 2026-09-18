<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-lg' }">
    <template #body>
      <div class="space-y-4">
        <UFormField label="To" hint="Leave blank to use the email on file.">
          <UInput v-model="form.to" type="email" placeholder="customer@example.com" class="w-full" />
        </UFormField>
        <UFormField label="Subject">
          <UInput v-model="form.subject" placeholder="Default subject" class="w-full" />
        </UFormField>
        <UFormField label="Message">
          <UTextarea v-model="form.message" :rows="3" placeholder="Default message" class="w-full" />
        </UFormField>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" class="mt-4" :title="error" />

      <div class="flex justify-end gap-2 mt-4">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton :loading="sending" @click="onSend">Send</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SendDocumentEmailPayload } from '#shared/types'

const props = defineProps<{
  title: string
  sendFn: (payload: SendDocumentEmailPayload) => Promise<void>
}>()

const open = defineModel<boolean>('open', { default: false })

const form = reactive<SendDocumentEmailPayload>({ to: '', subject: '', message: '' })
const sending = ref(false)
const error = ref('')

async function onSend() {
  error.value = ''
  sending.value = true
  try {
    await props.sendFn({
      to: form.to || undefined,
      subject: form.subject || undefined,
      message: form.message || undefined
    })
    useToast().add({ title: 'Email sent', color: 'success' })
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    sending.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    form.to = ''
    form.subject = ''
    form.message = ''
    error.value = ''
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ attachments.length }} {{ attachments.length === 1 ? 'file' : 'files' }}</p>
      <UButton size="xs" variant="soft" icon="i-lucide-upload" :loading="uploading" @click="triggerPick">Upload</UButton>
      <input ref="fileInput" type="file" class="hidden" @change="onFileSelected" />
    </div>

    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Loading…</div>
    <EmptyState v-else-if="attachments.length === 0" icon="i-lucide-paperclip" title="No attachments yet" />
    <ul v-else class="space-y-1.5">
      <li
        v-for="file in attachments"
        :key="file.id"
        class="flex items-center justify-between gap-3 text-sm rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-file-text" class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <div class="min-w-0">
            <a :href="file.url" target="_blank" rel="noopener" class="text-gray-900 dark:text-white font-medium truncate hover:underline">
              {{ file.fileName }}
            </a>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatFileSize(file.size) }} · {{ file.uploadedBy ?? 'Unknown' }} · {{ formatDate(file.uploadedAt) }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <UButton :to="file.url" target="_blank" size="xs" color="neutral" variant="ghost" icon="i-lucide-download" />
          <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmDelete = file" />
        </div>
      </li>
    </ul>

    <UAlert v-if="error" color="error" variant="subtle" class="mt-3" :title="error" />

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Remove attachment"
      :description="`Remove '${confirmDelete?.fileName ?? ''}'? This cannot be undone.`"
      confirm-label="Remove"
      color="error"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Attachment, AttachmentOwnerType } from '~/composables/useAttachments'

const props = defineProps<{
  ownerType: AttachmentOwnerType
  ownerId: number
}>()

const { list, create, remove } = useAttachments()
const { upload } = useAssetUpload()
const toast = useToast()

const attachments = ref<Attachment[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    attachments.value = await list(props.ownerType, props.ownerId)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
function triggerPick() {
  fileInput.value?.click()
}

const uploading = ref(false)
async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploading.value = true
  error.value = ''
  try {
    const uploaded = await upload(file, `attachments/${props.ownerType.toLowerCase()}`)
    await create({
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      key: uploaded.key,
      url: uploaded.url,
      fileName: uploaded.fileName,
      contentType: uploaded.contentType,
      size: uploaded.size
    })
    toast.add({ title: 'File uploaded', color: 'success' })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    uploading.value = false
  }
}

const confirmDelete = ref<Attachment | null>(null)
const deleting = ref(false)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Attachment removed', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not remove attachment', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(load)
watch(() => props.ownerId, load)
</script>

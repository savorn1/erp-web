<template>
  <div class="mb-4">
    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product image</p>
    <div class="flex items-center gap-3">
      <img v-if="imageUrl" :src="imageUrl" class="w-16 h-16 rounded object-cover border border-gray-200 dark:border-gray-800" alt="Product">
      <span v-else class="flex items-center justify-center w-16 h-16 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
        <UIcon name="i-lucide-image" class="w-6 h-6" />
      </span>
      <div class="flex items-center gap-2">
        <UButton size="xs" variant="soft" :loading="loading" icon="i-lucide-upload" @click="emit('pick')">
          {{ imageUrl ? 'Replace' : 'Upload' }}
        </UButton>
        <UButton v-if="imageUrl" size="xs" variant="ghost" color="error" icon="i-lucide-x" @click="emit('remove')">
          Remove
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ imageUrl?: string; loading?: boolean }>()
const emit = defineEmits<{ pick: []; remove: [] }>()
</script>

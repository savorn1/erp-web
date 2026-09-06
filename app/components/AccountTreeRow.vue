<template>
  <div>
    <div
      class="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded"
      :style="{ paddingLeft: `${depth * 1.5}rem` }"
    >
      <div class="flex items-center gap-2 min-w-0">
        <UIcon :name="node.children.length > 0 ? 'i-lucide-folder' : 'i-lucide-file-text'" class="w-4 h-4 text-gray-400 shrink-0" />
        <span class="text-sm font-mono text-gray-400 shrink-0">{{ node.accountCode }}</span>
        <span class="text-sm text-gray-900 dark:text-white truncate" :class="{ 'font-medium': node.children.length > 0 }">{{ node.name }}</span>
        <UBadge v-if="!node.active" color="neutral" variant="subtle" size="xs">Inactive</UBadge>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <StatusBadge :status="node.accountType" />
        <UButton size="xs" variant="soft" icon="i-lucide-plus" @click="$emit('add-child', node)">Add child</UButton>
        <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" @click="$emit('edit', node)">Edit</UButton>
        <UButton
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          :disabled="node.children.length > 0"
          @click="$emit('delete', node)"
        />
      </div>
    </div>
    <AccountTreeRow
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      @add-child="$emit('add-child', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { Account } from '~/composables/useAccounts'

export interface AccountTreeNode extends Account {
  children: AccountTreeNode[]
}

defineProps<{ node: AccountTreeNode; depth: number }>()
defineEmits<{ 'add-child': [node: AccountTreeNode]; edit: [node: AccountTreeNode]; delete: [node: AccountTreeNode] }>()
</script>

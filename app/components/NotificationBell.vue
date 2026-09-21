<template>
  <UPopover v-model:open="open">
    <div class="relative">
      <UButton icon="i-lucide-bell" color="neutral" variant="ghost" size="sm" />
      <span
        v-if="summary && summary.totalCount > 0"
        class="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-semibold leading-none"
      >
        {{ summary.totalCount }}
      </span>
    </div>

    <template #content>
      <div class="w-80 max-h-96 overflow-y-auto p-2">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1.5">Alerts</p>
        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Loading…</div>
        <EmptyState v-else-if="!summary || summary.items.length === 0" icon="i-lucide-check" title="You're all caught up" />
        <ul v-else class="space-y-1">
          <li v-for="item in summary.items" :key="item.type">
            <NuxtLink
              :to="item.link"
              class="block rounded-md px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="open = false"
            >
              <span class="font-medium text-gray-900 dark:text-white">
                {{ item.amount !== null ? formatCurrency(item.amount) : item.count }}
              </span>
              <span class="text-gray-500 dark:text-gray-400"> {{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import type { NotificationSummary } from '~/composables/useNotifications'

const { summary: fetchSummary } = useNotifications()

const open = ref(false)
const loading = ref(false)
const summary = ref<NotificationSummary | null>(null)

async function load() {
  loading.value = true
  try {
    summary.value = await fetchSummary()
  } catch {
    // Non-critical — the bell just shows nothing on a failed fetch.
  } finally {
    loading.value = false
  }
}

let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  load()
  interval = setInterval(load, 60000)
})
onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

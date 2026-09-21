<template>
  <div v-if="loading" class="text-sm text-gray-400">Loading…</div>
  <EmptyState v-else-if="activities.length === 0" icon="i-lucide-history" :title="emptyTitle" />
  <ul v-else class="max-h-96 overflow-y-auto">
    <li v-for="(a, i) in activities" :key="a.id" class="relative flex gap-3 pb-4 last:pb-0">
      <div class="flex flex-col items-center">
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-400/10 shrink-0">
          <UIcon :name="iconFor(a.type)" class="w-3.5 h-3.5 text-primary-500 dark:text-primary-300" />
        </span>
        <span v-if="i < activities.length - 1" class="w-px flex-1 bg-gray-200 dark:bg-gray-800 mt-1" />
      </div>
      <div class="flex-1 min-w-0 pt-0.5">
        <div class="flex items-start justify-between gap-2">
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ a.description }}</span>
          <span v-if="a.amount != null" :class="Number(a.amount) >= 0 ? 'text-error' : 'text-success'" class="text-sm font-semibold shrink-0">
            {{ Number(a.amount) >= 0 ? '+' : '' }}{{ formatCurrency(a.amount) }}
          </span>
          <span v-else class="text-xs text-gray-400 shrink-0">{{ formatEnum(a.type) }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5" :title="formatDateTime(a.createdAt)">
          {{ formatRelativeTime(a.createdAt) }}<span v-if="a.createdBy"> · {{ a.createdBy }}</span>
        </p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
// Shared, read-only rendering for the append-only activity logs used by
// Leads/Customers (LeadActivity/CustomerActivity) — each still has its own
// fetch + add-note/add-follow-up logic in its own page; this only replaces
// the hand-rolled <ul> markup that was duplicated across both with one
// consistent timeline look.
interface TimelineActivity {
  id: number
  type: string
  description: string
  createdBy: string | null
  createdAt: string
  // Only CustomerActivity (BALANCE_ADJUSTMENT) sets this — shown as a
  // colored amount in place of the type label when present.
  amount?: number | null
}

withDefaults(defineProps<{ activities: TimelineActivity[]; loading?: boolean; emptyTitle?: string }>(), {
  loading: false,
  emptyTitle: 'No activity yet'
})

const TYPE_ICONS: Record<string, string> = {
  CREATED: 'i-lucide-circle-plus',
  STATUS_CHANGE: 'i-lucide-refresh-cw',
  STAGE_CHANGE: 'i-lucide-refresh-cw',
  ASSIGNED: 'i-lucide-user-check',
  FOLLOW_UP: 'i-lucide-phone-call',
  CONVERTED: 'i-lucide-circle-arrow-right',
  QUOTATION_CREATED: 'i-lucide-file-text',
  WON: 'i-lucide-trophy',
  LOST: 'i-lucide-thumbs-down',
  BALANCE_ADJUSTMENT: 'i-lucide-wallet',
  NOTE: 'i-lucide-sticky-note'
}
function iconFor(type: string) {
  return TYPE_ICONS[type] ?? 'i-lucide-circle'
}
</script>

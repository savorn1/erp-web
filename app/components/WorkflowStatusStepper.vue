<template>
  <section class="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Workflow</span>
        <StatusBadge :status="status" />
      </div>
      <span v-if="nextHint" class="text-xs text-gray-500 dark:text-gray-400">{{ nextHint }}</span>
    </div>

    <div v-if="cancelled" class="flex items-center gap-2 text-sm text-error">
      <UIcon name="i-lucide-ban" class="w-4 h-4" /> This document was cancelled; no further workflow actions are available.
    </div>
    <div v-else class="overflow-x-auto">
      <ol class="flex min-w-max items-start">
        <li v-for="(step, index) in steps" :key="step.value" class="flex items-center" :class="index === steps.length - 1 ? '' : 'flex-1'">
          <div class="flex flex-col items-center gap-1.5">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
              :class="index < activeIndex ? 'bg-primary-500 text-white' : index === activeIndex ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 dark:bg-primary-400/15 dark:text-primary-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'"
            >
              <UIcon v-if="index < activeIndex" name="i-lucide-check" class="w-3.5 h-3.5" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span :class="index <= activeIndex ? 'text-gray-900 dark:text-white' : 'text-gray-400'" class="text-xs whitespace-nowrap">{{ step.label }}</span>
          </div>
          <span v-if="index < steps.length - 1" class="mx-2 mb-5 h-px min-w-5 flex-1 bg-gray-200 dark:bg-gray-800" :class="index < activeIndex ? 'bg-primary-400 dark:bg-primary-500' : ''" />
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
export interface WorkflowStep {
  value: string
  label: string
}

const props = withDefaults(defineProps<{ status: string; steps: WorkflowStep[]; nextHint?: string }>(), { nextHint: '' })

const cancelled = computed(() => props.status === 'CANCELLED' || props.status === 'REJECTED' || props.status === 'VOIDED')
const activeIndex = computed(() => {
  const exact = props.steps.findIndex((step) => step.value === props.status)
  if (exact >= 0) return exact
  // A status like PARTIALLY_RECEIVED without its own step entry lines up
  // with the step it's partially at (RECEIVED), not the one before it.
  if (props.status.startsWith('PARTIALLY_')) {
    const target = props.status.slice('PARTIALLY_'.length)
    const targetIndex = props.steps.findIndex((step) => step.value === target)
    return Math.max(0, targetIndex)
  }
  return 0
})
</script>

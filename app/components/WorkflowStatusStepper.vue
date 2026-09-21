<template>
  <section class="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50" :aria-label="`Workflow status: ${status}`">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Workflow</span>
        <StatusBadge :status="status" />
        <span v-if="!stopped && activeIndex >= 0" class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          Step {{ activeIndex + 1 }} of {{ steps.length }}
        </span>
      </div>
      <span v-if="nextHint" class="text-xs text-gray-500 dark:text-gray-400">{{ nextHint }}</span>
    </div>

    <!-- Explicit 700/300 shades: the unsuffixed error alias resolves to the
         500 shade, which is only 3.81:1 on white and fails AA for body text.
         These read 6.42:1 light and 9.24:1 dark. -->
    <div v-if="stopped" class="flex items-start gap-2 rounded-lg bg-error/5 px-3 py-2 text-sm text-error-700 dark:bg-error/10 dark:text-error-300">
      <UIcon name="i-lucide-ban" class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{{ stoppedMessage }}</span>
    </div>

    <div v-else class="overflow-x-auto">
      <ol class="flex min-w-max items-start">
        <li
          v-for="(step, index) in steps"
          :key="step.value"
          class="flex items-start"
          :class="index === steps.length - 1 ? '' : 'flex-1'"
          :aria-current="index === activeIndex ? 'step' : undefined"
        >
          <div class="flex flex-col items-center gap-1.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors" :class="markerClass(index)">
              <UIcon v-if="index < activeIndex" name="i-lucide-check" class="w-4 h-4" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span class="text-xs whitespace-nowrap" :class="labelClass(index)">{{ step.label }}</span>
            <!-- Screen readers get the state in words; sighted users get it
                 from colour and the check icon, neither of which is announced. -->
            <span class="sr-only">{{ stateLabel(index) }}</span>
          </div>
          <!-- mt-3.5 is half the 28px marker, so the rule meets the circle's
               centre. Tied to the marker's height rather than the label's, so
               a longer label can't drag it out of line. -->
          <span v-if="index < steps.length - 1" class="mx-2 mt-3.5 h-0.5 min-w-5 flex-1 rounded-full" :class="connectorClass(index)" />
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
// Position and terminal-state logic lives in #shared/utils/workflowSteps so
// it can be unit-tested without mounting anything.
import { isStoppedStatus, resolveWorkflowStepIndex, stoppedStatusMessage, type WorkflowStep } from '#shared/utils/workflowSteps'

export type { WorkflowStep }

const props = withDefaults(defineProps<{ status: string; steps: WorkflowStep[]; nextHint?: string }>(), { nextHint: '' })

const stopped = computed(() => isStoppedStatus(props.status))
const stoppedMessage = computed(() => stoppedStatusMessage(props.status))
// -1 when the status isn't on the rail; every step then renders as pending.
const activeIndex = computed(() => resolveWorkflowStepIndex(props.status, props.steps))

// Each of these returns exactly one background utility per element. Listing a
// default in the static class and overriding it in a bound one leaves both in
// the markup, and which wins comes down to the order Tailwind happens to emit
// them in — not something to rely on.
function markerClass(index: number) {
  if (index < activeIndex.value) return 'bg-primary-500 text-white'
  if (index === activeIndex.value) return 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 dark:bg-primary-400/15 dark:text-primary-300'
  // gray-500 on gray-100 is 4.39:1; gray-400 was 2.36:1, under the 3:1 floor
  // for a UI element even before you call a step number "text".
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
}

function connectorClass(index: number) {
  return index < activeIndex.value ? 'bg-primary-400 dark:bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'
}

function labelClass(index: number) {
  if (index === activeIndex.value) return 'font-semibold text-gray-900 dark:text-white'
  if (index < activeIndex.value) return 'text-gray-700 dark:text-gray-300'
  // Still the quietest of the three, but legible: 900 > 700 > 500 keeps the
  // hierarchy without dropping a label below AA.
  return 'text-gray-500 dark:text-gray-400'
}

function stateLabel(index: number) {
  if (index < activeIndex.value) return 'Completed'
  if (index === activeIndex.value) return 'Current step'
  return 'Not started'
}
</script>

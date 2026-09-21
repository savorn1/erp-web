<template>
  <section class="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50" :aria-label="`Workflow status: ${status}`">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Workflow</span>
        <StatusBadge :status="status" />
        <span v-if="!stopped && activeIndex >= 0" class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          Step {{ activeIndex + 1 }} of {{ steps.length }}
        </span>
        <span v-else-if="stopped && stoppedLabel" class="text-xs text-error-600 dark:text-error-400"> {{ stoppedVerbLabel }} at {{ stoppedLabel }} </span>
      </div>
      <span v-if="nextHint && !stopped" class="text-xs text-gray-500 dark:text-gray-400">{{ nextHint }}</span>
    </div>

    <!-- The rail stays up for a stopped document: how far it got is the first
         thing anyone asks, and it decides what has to be unwound. An order
         cancelled after Confirmed may hold reserved stock; one cancelled at
         Draft touched nothing. -->
    <div class="overflow-x-auto">
      <ol class="flex min-w-max items-start">
        <li
          v-for="(step, index) in steps"
          :key="step.value"
          class="flex items-start"
          :class="index === steps.length - 1 ? '' : 'flex-1'"
          :aria-current="stepStates[index] === 'current' ? 'step' : undefined"
        >
          <div class="flex flex-col items-center gap-1.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors" :class="markerClass(index)">
              <UIcon v-if="stepStates[index] === 'done'" name="i-lucide-check" class="w-4 h-4" />
              <UIcon v-else-if="stepStates[index] === 'stopped'" name="i-lucide-x" class="w-4 h-4" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span class="text-xs whitespace-nowrap" :class="labelClass(index)">{{ step.label }}</span>
            <!-- Screen readers get the state in words; sighted users get it
                 from colour and the icon, neither of which is announced. -->
            <span class="sr-only">{{ stateLabel(index) }}</span>
          </div>
          <!-- mt-3.5 is half the 28px marker, so the rule meets the circle's
               centre. Tied to the marker's height rather than the label's, so
               a longer label can't drag it out of line. -->
          <span v-if="index < steps.length - 1" class="mx-2 mt-3.5 h-0.5 min-w-5 flex-1 rounded-full" :class="connectorClass(index)" />
        </li>
      </ol>
    </div>

    <!-- Explicit 700/300 shades: the unsuffixed error alias resolves to the
         500 shade, which is only 3.81:1 on white and fails AA for body text.
         These read 6.42:1 light and 9.24:1 dark. -->
    <div v-if="stopped" class="mt-3 flex items-start gap-2 rounded-lg bg-error/5 px-3 py-2 text-sm text-error-700 dark:bg-error/10 dark:text-error-300">
      <UIcon name="i-lucide-ban" class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{{ stoppedMessage }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
// Position and state logic lives in #shared/utils/workflowSteps so it can be
// unit-tested without mounting anything.
import {
  isStoppedStatus,
  resolveWorkflowStepIndex,
  stoppedStatusMessage,
  stoppedVerb,
  workflowStepStates,
  type WorkflowStep
} from '#shared/utils/workflowSteps'

export type { WorkflowStep }

const props = withDefaults(
  defineProps<{
    status: string
    steps: WorkflowStep[]
    nextHint?: string
    /**
     * The status the document held when it was cancelled or rejected, from
     * the document's own `cancelledFromStatus`. Omit it and the rail simply
     * shows no progress rather than guessing — documents cancelled before
     * that field existed have nothing to report.
     */
    stoppedAt?: string | null
  }>(),
  { nextHint: '', stoppedAt: null }
)

const stopped = computed(() => isStoppedStatus(props.status))
const stoppedMessage = computed(() => stoppedStatusMessage(props.status))
const stoppedVerbLabel = computed(() => stoppedVerb(props.status))

// -1 when the status isn't on the rail; every step then renders as pending.
const activeIndex = computed(() => resolveWorkflowStepIndex(props.status, props.steps))
const stoppedAtIndex = computed(() => (props.stoppedAt ? resolveWorkflowStepIndex(props.stoppedAt, props.steps) : -1))
const stoppedLabel = computed(() => props.steps[stoppedAtIndex.value]?.label ?? '')

const stepStates = computed(() =>
  workflowStepStates(props.steps, { activeIndex: activeIndex.value, stopped: stopped.value, stoppedAtIndex: stoppedAtIndex.value })
)

// Each of these returns exactly one background utility per element. Listing a
// default in the static class and overriding it in a bound one leaves both in
// the markup, and which wins comes down to the order Tailwind happens to emit
// them in — not something to rely on.
function markerClass(index: number) {
  switch (stepStates.value[index]) {
    case 'done':
      // Grey rather than primary on a stopped document: the steps did happen,
      // but nothing about the document is live any more.
      return stopped.value ? 'bg-gray-400 text-white dark:bg-gray-600' : 'bg-primary-500 text-white'
    case 'current':
      return 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 dark:bg-primary-400/15 dark:text-primary-300'
    case 'stopped':
      return 'bg-error-600 text-white ring-2 ring-error-200 dark:bg-error-500 dark:ring-error-900'
    default:
      // gray-500 on gray-100 is 4.39:1; gray-400 was 2.36:1, under the 3:1
      // floor for a UI element even before you call a step number "text".
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  }
}

function connectorClass(index: number) {
  const reached = stepStates.value[index] === 'done'
  if (!reached) return 'bg-gray-200 dark:bg-gray-800'
  return stopped.value ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-400 dark:bg-primary-500'
}

function labelClass(index: number) {
  switch (stepStates.value[index]) {
    case 'current':
      return 'font-semibold text-gray-900 dark:text-white'
    case 'stopped':
      return 'font-semibold text-error-700 dark:text-error-300'
    case 'done':
      return 'text-gray-700 dark:text-gray-300'
    default:
      // Still the quietest of the four, but legible: 900 > 700 > 500 keeps the
      // hierarchy without dropping a label below AA.
      return 'text-gray-500 dark:text-gray-400'
  }
}

function stateLabel(index: number) {
  switch (stepStates.value[index]) {
    case 'done':
      return 'Completed'
    case 'current':
      return 'Current step'
    case 'stopped':
      return `${stoppedVerbLabel.value} at this step`
    default:
      return 'Not started'
  }
}
</script>

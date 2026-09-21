// Step-position logic for <WorkflowStatusStepper>. Pure and separate from the
// component so it can be tested directly — the fallbacks below are the part
// most likely to break quietly, since getting them wrong renders a plausible
// but wrong rail rather than throwing.

export interface WorkflowStep {
  value: string
  label: string
}

/**
 * Terminal states that end a workflow without completing it, mapped to what
 * the UI says about them. A document in one of these never reaches the
 * remaining steps, so the rail is replaced by the message rather than showing
 * a path that can no longer be walked.
 */
export const STOPPED_STATUSES: Record<string, string> = {
  CANCELLED: 'This document was cancelled; no further workflow actions are available.',
  REJECTED: 'This document was rejected; no further workflow actions are available.',
  VOIDED: 'This document was voided; no further workflow actions are available.',
  FAILED: 'This document failed; no further workflow actions are available.'
}

export function isStoppedStatus(status: string): boolean {
  // Object.hasOwn, not `in` — `in` walks the prototype chain, so a status of
  // 'constructor' or 'toString' would read as a stopped workflow.
  return Object.hasOwn(STOPPED_STATUSES, status)
}

export function stoppedStatusMessage(status: string): string {
  return isStoppedStatus(status) ? (STOPPED_STATUSES[status] ?? '') : ''
}

/** The verb for a stopped status, for "Cancelled at Confirmed"-style labels. */
export function stoppedVerb(status: string): string {
  switch (status) {
    case 'CANCELLED':
      return 'Cancelled'
    case 'REJECTED':
      return 'Rejected'
    case 'VOIDED':
      return 'Voided'
    case 'FAILED':
      return 'Failed'
    default:
      return 'Stopped'
  }
}

/**
 * How each step should render.
 *
 * <p>`stopped` marks the step a cancelled/rejected document was sitting on
 * when it ended — the one piece of information a bare status can't carry,
 * since overwriting the status destroys it.
 */
export type WorkflowStepState = 'done' | 'current' | 'stopped' | 'pending'

/**
 * Per-step render state for a rail.
 *
 * <p>`stoppedAtIndex` is where a stopped document died: steps before it are
 * `done`, that one is `stopped`, the rest are `pending`. Pass -1 (or omit the
 * source field) when it isn't known — every step is then `pending`, which
 * says "this workflow ended" without inventing progress it can't verify.
 */
export function workflowStepStates(
  steps: WorkflowStep[],
  { activeIndex, stopped, stoppedAtIndex }: { activeIndex: number; stopped: boolean; stoppedAtIndex: number }
): WorkflowStepState[] {
  return steps.map((_, index) => {
    if (stopped) {
      if (stoppedAtIndex < 0) return 'pending'
      if (index < stoppedAtIndex) return 'done'
      return index === stoppedAtIndex ? 'stopped' : 'pending'
    }
    if (index < activeIndex) return 'done'
    return index === activeIndex ? 'current' : 'pending'
  })
}

/**
 * Where `status` sits on `steps`, or -1 when it isn't on the rail at all.
 *
 * <p>-1 rather than 0 for an unmapped status: falling back to the first step
 * makes a document look like it hasn't started when really the caller just
 * didn't list that status. Every step then renders as pending, which is at
 * least honest.
 */
export function resolveWorkflowStepIndex(status: string, steps: WorkflowStep[]): number {
  const exact = steps.findIndex((step) => step.value === status)
  if (exact >= 0) return exact

  // A status like PARTIALLY_RECEIVED without its own step entry lines up with
  // the step it is partially at (RECEIVED), not the one before it — the goods
  // have started arriving, so that stage is underway.
  if (status.startsWith('PARTIALLY_')) {
    return steps.findIndex((step) => step.value === status.slice('PARTIALLY_'.length))
  }

  return -1
}

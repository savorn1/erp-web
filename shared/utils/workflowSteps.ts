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

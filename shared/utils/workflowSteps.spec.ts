import { describe, expect, it } from 'vitest'
import { isStoppedStatus, resolveWorkflowStepIndex, type WorkflowStep } from './workflowSteps'

// Mirrors the sales-order rail, the most involved one in the app: it has an
// explicit PARTIALLY_ step of its own, which the purchase-order rail doesn't.
const SALES_ORDER_STEPS: WorkflowStep[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PARTIALLY_DELIVERED', label: 'Partially delivered' },
  { value: 'DELIVERED', label: 'Delivered' }
]

// No PARTIALLY_RECEIVED entry — receipts against this one fall through to the
// prefix rule.
const PURCHASE_ORDER_STEPS: WorkflowStep[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RECEIVED', label: 'Received' }
]

describe('resolveWorkflowStepIndex', () => {
  it('finds a status listed on the rail', () => {
    expect(resolveWorkflowStepIndex('CONFIRMED', SALES_ORDER_STEPS)).toBe(2)
  })

  it('matches the first and last steps', () => {
    expect(resolveWorkflowStepIndex('DRAFT', SALES_ORDER_STEPS)).toBe(0)
    expect(resolveWorkflowStepIndex('DELIVERED', SALES_ORDER_STEPS)).toBe(4)
  })

  it('prefers an exact PARTIALLY_ step over the prefix fallback', () => {
    // Would be 4 (DELIVERED) if the prefix rule ran first — the rail has its
    // own entry and that has to win.
    expect(resolveWorkflowStepIndex('PARTIALLY_DELIVERED', SALES_ORDER_STEPS)).toBe(3)
  })

  it('lines a partial status up with the stage it is partway through', () => {
    // Partly received means receiving is underway, so it sits on RECEIVED —
    // not on APPROVED, the step before it.
    expect(resolveWorkflowStepIndex('PARTIALLY_RECEIVED', PURCHASE_ORDER_STEPS)).toBe(2)
  })

  it('returns -1 for a status that is not on the rail', () => {
    // The old fallback of 0 lit up "Draft" here, making a paid invoice look
    // like an untouched one.
    expect(resolveWorkflowStepIndex('PAID', SALES_ORDER_STEPS)).toBe(-1)
  })

  it('returns -1 when a partial status has no matching base step', () => {
    expect(resolveWorkflowStepIndex('PARTIALLY_INVOICED', PURCHASE_ORDER_STEPS)).toBe(-1)
  })

  it('returns -1 against an empty rail rather than throwing', () => {
    expect(resolveWorkflowStepIndex('DRAFT', [])).toBe(-1)
  })
})

describe('isStoppedStatus', () => {
  it('recognises the terminal failure states', () => {
    expect(isStoppedStatus('CANCELLED')).toBe(true)
    expect(isStoppedStatus('REJECTED')).toBe(true)
    expect(isStoppedStatus('VOIDED')).toBe(true)
    expect(isStoppedStatus('FAILED')).toBe(true)
  })

  it('does not treat ordinary or successful statuses as stopped', () => {
    expect(isStoppedStatus('DRAFT')).toBe(false)
    expect(isStoppedStatus('DELIVERED')).toBe(false)
    // CLOSED ends a ticket successfully and is a real step on that rail.
    expect(isStoppedStatus('CLOSED')).toBe(false)
  })

  it('is not fooled by inherited Object properties', () => {
    // STOPPED_STATUSES is a plain object, so `'constructor' in it` is true —
    // the lookup has to be on own keys only.
    expect(isStoppedStatus('constructor')).toBe(false)
    expect(isStoppedStatus('toString')).toBe(false)
  })
})

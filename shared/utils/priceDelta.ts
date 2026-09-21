// How a price override compares to the product's own list price. Pure so the
// edge cases — a zero list price, an override that is actually higher — can be
// tested directly rather than discovered on a live price list.

export interface PriceDelta {
  /** Signed percentage difference from list, or null when it can't be computed. */
  percent: number | null
  /** "−12.5%", "+4.0%", "same as list", or "—". */
  label: string
  /**
   * True when the override is *above* list. A price group exists to give a
   * tier a better price, so a premium is nearly always a typo — a missing
   * decimal point, or list and override entered the wrong way round.
   */
  aboveList: boolean
}

const NONE: PriceDelta = Object.freeze({ percent: null, label: '—', aboveList: false })

export function priceDelta(price: number | null | undefined, listPrice: number | null | undefined): PriceDelta {
  if (price == null || listPrice == null) return NONE
  // A zero or negative list price has no meaningful percentage to be a
  // fraction of; dividing would give Infinity and render as "∞%".
  if (listPrice <= 0) return NONE

  const percent = ((price - listPrice) / listPrice) * 100
  // One decimal is enough to tell 12.5% from 12%, without showing the
  // floating-point noise that 1/3 discounts produce.
  const rounded = Math.round(percent * 10) / 10

  if (rounded === 0) return { percent: 0, label: 'same as list', aboveList: false }

  // Minus sign, not hyphen — this sits next to currency in a table.
  const sign = rounded > 0 ? '+' : '−'
  return {
    percent: rounded,
    label: `${sign}${Math.abs(rounded).toFixed(1)}%`,
    aboveList: rounded > 0
  }
}

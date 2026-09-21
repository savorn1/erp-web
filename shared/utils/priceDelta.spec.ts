import { describe, expect, it } from 'vitest'
import { priceDelta } from './priceDelta'

describe('priceDelta', () => {
  it('reports a discount as a negative percentage', () => {
    expect(priceDelta(90, 100)).toMatchObject({ percent: -10, label: '−10.0%', aboveList: false })
  })

  it('flags an override above list', () => {
    // Almost always a typo: a price group exists to give a tier a better
    // price, so this is the case worth colouring in the table.
    expect(priceDelta(110, 100)).toMatchObject({ percent: 10, label: '+10.0%', aboveList: true })
  })

  it('says so when the override matches list', () => {
    // Worth calling out: the row is doing nothing and could be deleted.
    expect(priceDelta(100, 100)).toMatchObject({ percent: 0, label: 'same as list', aboveList: false })
  })

  it('keeps one decimal place', () => {
    expect(priceDelta(87.5, 100).label).toBe('−12.5%')
  })

  it('rounds rather than showing floating-point noise', () => {
    // 1/3 off gives -33.33333…%
    expect(priceDelta(200, 300).label).toBe('−33.3%')
  })

  it('gives up on a zero list price instead of dividing by it', () => {
    // Would be -Infinity, rendering as "∞%" in the table.
    expect(priceDelta(50, 0)).toMatchObject({ percent: null, label: '—' })
  })

  it('gives up on a negative list price', () => {
    expect(priceDelta(50, -10).percent).toBeNull()
  })

  it('handles a missing price or list price', () => {
    expect(priceDelta(null, 100).label).toBe('—')
    expect(priceDelta(50, null).label).toBe('—')
    expect(priceDelta(undefined, undefined).label).toBe('—')
  })

  it('treats a free override as -100%, not as missing', () => {
    // 0 is a real price (a giveaway line), distinct from "no override".
    expect(priceDelta(0, 100)).toMatchObject({ percent: -100, label: '−100.0%' })
  })
})

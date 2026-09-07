import { describe, expect, it } from 'vitest'
import { convertUom, type UomConversionRow } from './uomConversion'

// A product whose base unit is "Each" (factor 1), sold in "Box" (24 Each)
// and "Pallet" (480 Each = 20 Box).
const rows: UomConversionRow[] = [
  { unitOfMeasureId: 1, conversionFactor: 1 }, // Each (base)
  { unitOfMeasureId: 2, conversionFactor: 24 }, // Box
  { unitOfMeasureId: 3, conversionFactor: 480 } // Pallet
]

describe('convertUom', () => {
  it('converts from a packed unit down to the base unit', () => {
    expect(convertUom(rows, 2, 1, 1)).toBe(24)
  })

  it('converts from the base unit up to a packed unit', () => {
    expect(convertUom(rows, 1, 2, 24)).toBe(1)
  })

  it('converts between two non-base units', () => {
    expect(convertUom(rows, 3, 2, 1)).toBe(20)
  })

  it('is a no-op converting a unit to itself', () => {
    expect(convertUom(rows, 2, 2, 5)).toBe(5)
  })

  it('returns null when the source unit is not configured', () => {
    expect(convertUom(rows, 99, 1, 1)).toBeNull()
  })

  it('returns null when the target unit is not configured', () => {
    expect(convertUom(rows, 1, 99, 1)).toBeNull()
  })

  it('returns null for a non-finite quantity', () => {
    expect(convertUom(rows, 1, 2, Number.NaN)).toBeNull()
  })

  it('handles fractional results', () => {
    expect(convertUom(rows, 1, 2, 6)).toBe(0.25)
  })
})

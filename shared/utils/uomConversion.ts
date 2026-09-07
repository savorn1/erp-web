// Pure client-side mirror of ProductUomServiceImpl.convert on the backend —
// every conversion goes through the product's base unit: quantity is scaled
// up to the base unit by the source row's conversionFactor, then scaled down
// to the target unit by dividing by its conversionFactor. Lets the UI show a
// live preview (e.g. "24 Each = 1 Box") without a round trip; the backend
// endpoint stays the authoritative source for anything actually persisted.

export interface UomConversionRow {
  unitOfMeasureId: number
  conversionFactor: number
}

// Returns null when either unit isn't one of the given rows (e.g. not yet
// configured for this product) rather than throwing — callers render that as
// "not convertible" instead of an error.
export function convertUom(rows: UomConversionRow[], fromUnitOfMeasureId: number, toUnitOfMeasureId: number, quantity: number): number | null {
  const fromRow = rows.find((r) => r.unitOfMeasureId === fromUnitOfMeasureId)
  const toRow = rows.find((r) => r.unitOfMeasureId === toUnitOfMeasureId)
  if (!fromRow || !toRow || !Number.isFinite(quantity)) return null
  const baseQuantity = quantity * fromRow.conversionFactor
  return baseQuantity / toRow.conversionFactor
}

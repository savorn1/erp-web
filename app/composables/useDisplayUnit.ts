// Lets an inventory report toggle a quantity column between a product's
// base unit ("small", e.g. Can) and a full cascade of every bigger
// inventory-allowed unit it has configured, largest first (e.g. Pallet ->
// Case -> Can) — converts via each ProductUom row's own conversionFactor.
// Falls back to the base unit whenever a product has no bigger unit
// configured, so the toggle never hides data.

export type DisplayUnitMode = 'base' | 'pack'

export interface DisplayUnitProduct {
  id: number
  unitOfMeasureId: number
  unitOfMeasureAbbreviation: string | null
}

interface PackLevel {
  abbreviation: string
  conversionFactor: number
}

export function useDisplayUnit() {
  const { list: listProductUoms } = useProductUoms()

  const mode = ref<DisplayUnitMode>('base')
  const displayUnitOptions = [
    { label: 'Base unit', value: 'base' },
    { label: 'Pack unit', value: 'pack' }
  ]

  // undefined = not yet checked, null = checked and no pack unit configured.
  // Sorted largest conversionFactor first, so formatQuantity can extract
  // whole units greedily level by level (Pallet, then Case, then whatever's
  // left over shows in the base unit) instead of only ever using the single
  // biggest one and dumping the rest of the remainder in the base unit.
  const packLevelsByProduct = ref<Record<number, PackLevel[] | null | undefined>>({})

  async function ensurePackUnit(productId: number) {
    if (packLevelsByProduct.value[productId] !== undefined) return
    try {
      const uoms = await listProductUoms(productId)
      const levels = uoms
        .filter((u) => u.active && u.allowInventory && !u.baseUnit && u.conversionFactor > 0)
        .map((u) => ({ abbreviation: u.unitOfMeasureAbbreviation ?? '', conversionFactor: u.conversionFactor }))
        .sort((a, b) => b.conversionFactor - a.conversionFactor)
      packLevelsByProduct.value[productId] = levels.length > 0 ? levels : null
    } catch {
      packLevelsByProduct.value[productId] = null
    }
  }

  async function ensurePackUnits(productIds: number[]) {
    await Promise.all([...new Set(productIds)].map(ensurePackUnit))
  }

  // Rounds away the floating-point noise from dividing/subtracting decimal
  // conversion factors (e.g. 2389 / 24) so a whole-number remainder doesn't
  // show up as 12.999999999998.
  function round(n: number) {
    return Math.round(n * 1e6) / 1e6
  }

  // baseQuantity is always in the product's base unit (matches how every
  // inventory report's numbers are stored). In pack mode, cascades through
  // every configured unit from biggest to smallest, extracting whole units
  // at each level, e.g. 2,495,676 cans -> "1999 Pallet 38 Case 12 Can"
  // instead of either a decimal pack count or stopping at the single
  // biggest unit and dumping the rest of the remainder in the base unit
  // ("1999 Pallet 924 Can") — a fractional pallet/case isn't a meaningful
  // real-world quantity the way a fractional currency amount is.
  // `signed` prefixes a "+" on the leading part for positive values (for
  // qty-change columns); every part still carries the sign for negatives.
  function formatQuantity(product: DisplayUnitProduct | undefined, baseQuantity: number, options: { signed?: boolean } = {}): string {
    const baseUnit = product?.unitOfMeasureAbbreviation ?? ''
    const prefixed = (n: number) => (options.signed && n > 0 ? `+${n}` : String(n))
    const plain = () => (baseUnit ? `${prefixed(baseQuantity)} ${baseUnit}` : prefixed(baseQuantity))

    if (!product || mode.value === 'base') return plain()
    const levels = packLevelsByProduct.value[product.id]
    if (!levels || levels.length === 0) return plain()

    const sign = baseQuantity < 0 ? -1 : 1
    let remaining = round(Math.abs(baseQuantity))
    const parts: string[] = []
    for (const level of levels) {
      const count = Math.floor(round(remaining / level.conversionFactor))
      if (count <= 0) continue
      const label = parts.length === 0 ? prefixed(sign * count) : String(sign * count)
      parts.push(`${label} ${level.abbreviation}`)
      remaining = round(remaining - count * level.conversionFactor)
    }

    if (parts.length === 0) return plain()
    if (remaining > 0) {
      const label = parts.length === 0 ? prefixed(sign * remaining) : String(sign * remaining)
      parts.push(baseUnit ? `${label} ${baseUnit}` : label)
    }
    return parts.join(' ')
  }

  return { mode, displayUnitOptions, ensurePackUnits, formatQuantity }
}

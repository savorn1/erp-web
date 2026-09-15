// Lets an inventory report toggle a quantity column between a product's
// base unit ("small", e.g. PCS) and its largest configured inventory-allowed
// alternate unit ("big", e.g. Case/Box) — converts via that ProductUom row's
// own conversionFactor. Falls back to the base unit whenever a product has
// no bigger unit configured, so the toggle never hides data.

export type DisplayUnitMode = 'base' | 'pack'

export interface DisplayUnitProduct {
  id: number
  unitOfMeasureId: number
  unitOfMeasureAbbreviation: string | null
}

interface PackUnit {
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
  const packUnitByProduct = ref<Record<number, PackUnit | null | undefined>>({})

  async function ensurePackUnit(productId: number) {
    if (packUnitByProduct.value[productId] !== undefined) return
    try {
      const uoms = await listProductUoms(productId)
      const candidates = uoms.filter((u) => u.active && u.allowInventory && !u.baseUnit)
      const chosen =
        candidates.find((u) => u.defaultPurchase) ??
        candidates.find((u) => u.defaultSales) ??
        [...candidates].sort((a, b) => b.conversionFactor - a.conversionFactor)[0]
      packUnitByProduct.value[productId] = chosen ? { abbreviation: chosen.unitOfMeasureAbbreviation ?? '', conversionFactor: chosen.conversionFactor } : null
    } catch {
      packUnitByProduct.value[productId] = null
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
  // inventory report's numbers are stored). In pack mode, splits into whole
  // packs plus a leftover in the base unit (e.g. 2,389 cans -> "99 Case 13
  // Can") instead of a decimal pack count — a fractional case isn't a
  // meaningful real-world quantity the way a fractional currency amount is.
  // `signed` prefixes a "+" for positive values (for qty-change columns);
  // negative values keep their native "-" either way.
  function formatQuantity(product: DisplayUnitProduct | undefined, baseQuantity: number, options: { signed?: boolean } = {}): string {
    const baseUnit = product?.unitOfMeasureAbbreviation ?? ''
    const prefixed = (n: number) => (options.signed && n > 0 ? `+${n}` : String(n))
    const plain = () => (baseUnit ? `${prefixed(baseQuantity)} ${baseUnit}` : prefixed(baseQuantity))

    if (!product || mode.value === 'base') return plain()
    const pack = packUnitByProduct.value[product.id]
    if (!pack || pack.conversionFactor <= 0) return plain()

    const sign = baseQuantity < 0 ? -1 : 1
    const absQuantity = Math.abs(baseQuantity)
    let wholePacks = Math.floor(round(absQuantity / pack.conversionFactor))
    let remainder = round(absQuantity - wholePacks * pack.conversionFactor)
    if (remainder >= pack.conversionFactor) {
      wholePacks += 1
      remainder = round(remainder - pack.conversionFactor)
    }

    if (wholePacks === 0) return plain()

    const wholeText = `${prefixed(sign * wholePacks)} ${pack.abbreviation}`
    if (remainder === 0) return wholeText
    return baseUnit ? `${wholeText} ${sign * remainder} ${baseUnit}` : `${wholeText} ${sign * remainder}`
  }

  return { mode, displayUnitOptions, ensurePackUnits, formatQuantity }
}

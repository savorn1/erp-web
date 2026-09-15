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

  // baseQuantity is always in the product's base unit (matches how every
  // inventory report's numbers are stored).
  function displayQuantity(product: DisplayUnitProduct | undefined, baseQuantity: number): { quantity: number; unit: string } {
    const baseUnit = product?.unitOfMeasureAbbreviation ?? ''
    if (!product || mode.value === 'base') return { quantity: baseQuantity, unit: baseUnit }
    const pack = packUnitByProduct.value[product.id]
    if (!pack) return { quantity: baseQuantity, unit: baseUnit }
    return { quantity: baseQuantity / pack.conversionFactor, unit: pack.abbreviation }
  }

  return { mode, displayUnitOptions, ensurePackUnits, displayQuantity }
}

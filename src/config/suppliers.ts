import type { IngredientId } from './ingredients'

export interface SupplierOrderLine {
  ingredientId: IngredientId
  quantity: number
}

export interface Supplier {
  id: string
  name: string
  /** Minutes from order to delivery */
  leadTimeMinutes: number
  /** Flat delivery fee */
  deliveryFee: number
  /** Catalog of what they sell */
  catalog: IngredientId[]
  /** Minimum order value before fee waiver (0 = never) */
  feeWaiverAbove: number
}

export const SUPPLIERS: Supplier[] = [
  {
    id: 'mill-co',
    name: 'Mill & Co',
    leadTimeMinutes: 45,
    deliveryFee: 8,
    catalog: ['flour', 'sugar', 'salt', 'yeast'],
    feeWaiverAbove: 40,
  },
  {
    id: 'dairy-dawn',
    name: 'Dairy Dawn',
    leadTimeMinutes: 30,
    deliveryFee: 6,
    catalog: ['milk', 'butter', 'eggs'],
    feeWaiverAbove: 25,
  },
  {
    id: 'sweet-trade',
    name: 'Sweet Trade',
    leadTimeMinutes: 60,
    deliveryFee: 10,
    catalog: ['chocolate', 'sugar'],
    feeWaiverAbove: 30,
  },
]

/** Default morning auto-order targets (restock toward these levels). */
export const RESTOCK_TARGETS: Partial<Record<IngredientId, number>> = {
  flour: 10,
  sugar: 4,
  eggs: 36,
  butter: 3,
  yeast: 0.6,
  milk: 6,
  salt: 1,
  chocolate: 1.5,
}

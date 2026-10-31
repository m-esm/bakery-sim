export type IngredientId =
  | 'flour'
  | 'sugar'
  | 'eggs'
  | 'butter'
  | 'yeast'
  | 'milk'
  | 'salt'
  | 'chocolate'

export interface IngredientDef {
  id: IngredientId
  name: string
  unit: 'kg' | 'L' | 'pcs'
  /** Days until spoilage after delivery */
  shelfLifeDays: number
  /** Cost per unit */
  unitCost: number
  /** Starting stock on day 1 */
  startingStock: number
  /** Soft max storage capacity in the tiny shop */
  maxStock: number
}

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  flour: {
    id: 'flour',
    name: 'Flour',
    unit: 'kg',
    shelfLifeDays: 30,
    unitCost: 1.2,
    startingStock: 8,
    maxStock: 20,
  },
  sugar: {
    id: 'sugar',
    name: 'Sugar',
    unit: 'kg',
    shelfLifeDays: 60,
    unitCost: 1.5,
    startingStock: 3,
    maxStock: 10,
  },
  eggs: {
    id: 'eggs',
    name: 'Eggs',
    unit: 'pcs',
    shelfLifeDays: 14,
    unitCost: 0.25,
    startingStock: 24,
    maxStock: 60,
  },
  butter: {
    id: 'butter',
    name: 'Butter',
    unit: 'kg',
    shelfLifeDays: 21,
    unitCost: 6,
    startingStock: 2,
    maxStock: 6,
  },
  yeast: {
    id: 'yeast',
    name: 'Yeast',
    unit: 'kg',
    shelfLifeDays: 45,
    unitCost: 8,
    startingStock: 0.4,
    maxStock: 1.5,
  },
  milk: {
    id: 'milk',
    name: 'Milk',
    unit: 'L',
    shelfLifeDays: 7,
    unitCost: 1.1,
    startingStock: 4,
    maxStock: 12,
  },
  salt: {
    id: 'salt',
    name: 'Salt',
    unit: 'kg',
    shelfLifeDays: 365,
    unitCost: 0.8,
    startingStock: 1,
    maxStock: 3,
  },
  chocolate: {
    id: 'chocolate',
    name: 'Chocolate',
    unit: 'kg',
    shelfLifeDays: 90,
    unitCost: 9,
    startingStock: 1,
    maxStock: 4,
  },
}

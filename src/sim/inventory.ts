import { INGREDIENTS, type IngredientId } from '../config/ingredients'
import type { FinishedGood, StockLot } from './types'
import type { ProductId } from '../config/recipes'
import { DISPLAY_CAPACITY } from '../config/economy'

export function createStartingStock(day: number): StockLot[] {
  return (Object.keys(INGREDIENTS) as IngredientId[]).map((id) => {
    const def = INGREDIENTS[id]
    return {
      ingredientId: id,
      quantity: def.startingStock,
      spoilsOnDay: day + def.shelfLifeDays,
    }
  })
}

export function totalOf(stock: StockLot[], id: IngredientId): number {
  return stock
    .filter((l) => l.ingredientId === id)
    .reduce((s, l) => s + l.quantity, 0)
}

export function canConsume(
  stock: StockLot[],
  needs: Partial<Record<IngredientId, number>>,
): boolean {
  for (const [id, qty] of Object.entries(needs) as [IngredientId, number][]) {
    if (qty <= 0) continue
    if (totalOf(stock, id) + 1e-9 < qty) return false
  }
  return true
}

/** FIFO consume by spoilage date. Returns waste value of nothing (cost tracked by caller). */
export function consume(
  stock: StockLot[],
  needs: Partial<Record<IngredientId, number>>,
): StockLot[] {
  const next = stock.map((l) => ({ ...l }))
  for (const [id, qty] of Object.entries(needs) as [IngredientId, number][]) {
    if (qty <= 0) continue
    let left = qty
    const lots = next
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.ingredientId === id && l.quantity > 0)
      .sort((a, b) => a.l.spoilsOnDay - b.l.spoilsOnDay)
    for (const { l } of lots) {
      const take = Math.min(l.quantity, left)
      l.quantity -= take
      left -= take
      if (left <= 1e-9) break
    }
    if (left > 1e-6) {
      throw new Error(`Insufficient ${id}`)
    }
  }
  return next.filter((l) => l.quantity > 1e-9)
}

export function addDelivery(
  stock: StockLot[],
  ingredientId: IngredientId,
  quantity: number,
  day: number,
): StockLot[] {
  const def = INGREDIENTS[ingredientId]
  const current = totalOf(stock, ingredientId)
  const room = Math.max(0, def.maxStock - current)
  const accepted = Math.min(quantity, room)
  if (accepted <= 0) return stock
  return [
    ...stock,
    {
      ingredientId,
      quantity: accepted,
      spoilsOnDay: day + def.shelfLifeDays,
    },
  ]
}

export function spoilDay(stock: StockLot[], day: number): {
  stock: StockLot[]
  wasted: { ingredientId: IngredientId; quantity: number; cost: number }[]
} {
  const wasted: { ingredientId: IngredientId; quantity: number; cost: number }[] = []
  const kept: StockLot[] = []
  for (const lot of stock) {
    if (lot.spoilsOnDay <= day) {
      wasted.push({
        ingredientId: lot.ingredientId,
        quantity: lot.quantity,
        cost: lot.quantity * INGREDIENTS[lot.ingredientId].unitCost,
      })
    } else {
      kept.push(lot)
    }
  }
  return { stock: kept, wasted }
}

export function displayTotal(display: FinishedGood[]): number {
  return display.reduce((s, g) => s + g.quantity, 0)
}

export function displayOf(display: FinishedGood[], id: ProductId): number {
  return display.find((g) => g.productId === id)?.quantity ?? 0
}

export function addToDisplay(
  display: FinishedGood[],
  productId: ProductId,
  quantity: number,
): FinishedGood[] {
  const room = Math.max(0, DISPLAY_CAPACITY - displayTotal(display))
  const add = Math.min(room, quantity)
  if (add <= 0) return display
  const next = display.map((g) => ({ ...g }))
  const existing = next.find((g) => g.productId === productId)
  if (existing) existing.quantity += add
  else next.push({ productId, quantity: add })
  return next
}

export function takeFromDisplay(
  display: FinishedGood[],
  productId: ProductId,
  quantity: number,
): { display: FinishedGood[]; taken: number } {
  const next = display.map((g) => ({ ...g }))
  const item = next.find((g) => g.productId === productId)
  if (!item) return { display, taken: 0 }
  const taken = Math.min(item.quantity, quantity)
  item.quantity -= taken
  return { display: next.filter((g) => g.quantity > 0), taken }
}

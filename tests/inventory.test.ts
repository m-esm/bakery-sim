import { describe, expect, it } from 'vitest'
import {
  addDelivery,
  addToDisplay,
  canConsume,
  consume,
  createStartingStock,
  displayOf,
  spoilDay,
  takeFromDisplay,
  totalOf,
} from '../src/sim/inventory'

describe('inventory', () => {
  it('creates starting stock for all ingredients', () => {
    const stock = createStartingStock(1)
    expect(totalOf(stock, 'flour')).toBeGreaterThan(0)
    expect(totalOf(stock, 'eggs')).toBeGreaterThan(0)
  })

  it('consumes FIFO by spoilage and rejects shortage', () => {
    let stock = createStartingStock(1)
    stock = addDelivery(stock, 'flour', 2, 1)
    expect(canConsume(stock, { flour: 1 })).toBe(true)
    stock = consume(stock, { flour: 1 })
    expect(totalOf(stock, 'flour')).toBeCloseTo(9, 5)
    expect(() => consume(stock, { flour: 999 })).toThrow()
  })

  it('spoils lots on or past their day', () => {
    const stock = [
      { ingredientId: 'milk' as const, quantity: 2, spoilsOnDay: 2 },
      { ingredientId: 'flour' as const, quantity: 5, spoilsOnDay: 30 },
    ]
    const { stock: kept, wasted } = spoilDay(stock, 2)
    expect(wasted).toHaveLength(1)
    expect(wasted[0].ingredientId).toBe('milk')
    expect(totalOf(kept, 'flour')).toBe(5)
    expect(totalOf(kept, 'milk')).toBe(0)
  })

  it('tracks display case stock', () => {
    let display = addToDisplay([], 'cookie', 5)
    expect(displayOf(display, 'cookie')).toBe(5)
    const result = takeFromDisplay(display, 'cookie', 2)
    display = result.display
    expect(result.taken).toBe(2)
    expect(displayOf(display, 'cookie')).toBe(3)
  })
})

import { describe, expect, it } from 'vitest'
import { BakerySim } from '../src/sim/bakery'
import { SHOP_AREA_M2 } from '../src/config/layout'
import { STAFF } from '../src/config/staff'
import { DAY_END_MIN, OPEN_MIN } from '../src/sim/clock'
import { totalOf } from '../src/sim/inventory'

function seededRng(seed = 1): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

describe('bakery simulation', () => {
  it('uses a tiny-shop staff roster (1–2 people)', () => {
    expect(STAFF.length).toBeGreaterThanOrEqual(1)
    expect(STAFF.length).toBeLessThanOrEqual(2)
    expect(SHOP_AREA_M2).toBe(12)
  })

  it('places morning supply orders and receives deliveries', () => {
    const sim = new BakerySim(seededRng(42))
    const flourBefore = totalOf(sim.stock, 'flour')
    // Drain flour so restock triggers
    sim.stock = sim.stock.map((l) =>
      l.ingredientId === 'flour' ? { ...l, quantity: 1 } : l,
    )
    sim.tick(5)
    expect(sim.orders.some((o) => o.status === 'pending')).toBe(true)
    // Fast-forward past longest lead time
    sim.tick(90)
    expect(sim.orders.every((o) => o.status === 'delivered')).toBe(true)
    expect(totalOf(sim.stock, 'flour')).toBeGreaterThan(flourBefore > 2 ? 1 : 0)
  })

  it('runs production batches onto the display case', () => {
    const sim = new BakerySim(seededRng(7))
    sim.tick(3)
    // Advance through morning prep at high resolution
    for (let i = 0; i < 200; i++) sim.tick(1)
    const snap = sim.snapshot()
    const baked = snap.display.reduce((s, g) => s + g.quantity, 0)
    const inProgress = snap.batches.length
    expect(baked + inProgress).toBeGreaterThan(0)
  })

  it('admits a limited number of customers and can complete sales', () => {
    const sim = new BakerySim(seededRng(99))
    // Prep enough to open with stock
    sim.tick(OPEN_MIN - sim.timeMin + 1)
    // Force some display stock
    sim.display = [
      { productId: 'croissant', quantity: 6 },
      { productId: 'cookie', quantity: 6 },
    ]
    sim.tick(60)
    const snap = sim.snapshot()
    const inside = snap.customers.filter(
      (c) => c.state !== 'queuedOutside' && c.state !== 'done',
    )
    expect(inside.length).toBeLessThanOrEqual(2)
    // Keep running through lunch
    sim.tick(180)
    expect(sim.ledger.customersServed + sim.ledger.customersLost + sim.customers.length).toBeGreaterThan(0)
  })

  it('completes a full day from prep through closing', () => {
    const sim = new BakerySim(seededRng(3))
    sim.setSpeed(16)
    const remaining = DAY_END_MIN - sim.timeMin
    sim.tick(remaining)
    expect(sim.isDayComplete).toBe(true)
    expect(sim.timeMin).toBe(DAY_END_MIN)
    expect(sim.ledger.overhead).toBeGreaterThan(0)
    expect(sim.log.some((l) => l.includes('closed'))).toBe(true)
  })

  it('supports pause and next-day rollover', () => {
    const sim = new BakerySim(seededRng(5))
    sim.setSpeed(0)
    const t = sim.timeMin
    sim.tick(10)
    expect(sim.timeMin).toBe(t)
    sim.setSpeed(16)
    sim.tick(DAY_END_MIN - sim.timeMin)
    expect(sim.isDayComplete).toBe(true)
    const day = sim.day
    sim.nextDay()
    expect(sim.day).toBe(day + 1)
    expect(sim.isDayComplete).toBe(false)
    expect(sim.timeMin).toBe(5 * 60)
  })
})

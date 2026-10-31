import { describe, expect, it } from 'vitest'
import { PERSON_HEIGHT_M, QUEUE_SPACING_M, COUNTER_HEIGHT_M } from '../src/config/scale'
import { queueSlotPosition, SHOP_DEPTH, SHOP_WIDTH } from '../src/config/layout'
import { BakerySim } from '../src/sim/bakery'
import { OPEN_MIN } from '../src/sim/clock'
import { displayOf } from '../src/sim/inventory'
import type { ProductId } from '../src/config/recipes'

function seededRng(seed = 1): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

describe('character and queue scale', () => {
  it('uses adult person height and counter height for the 4×3 m shop', () => {
    expect(PERSON_HEIGHT_M).toBe(1.7)
    expect(COUNTER_HEIGHT_M).toBe(0.9)
    expect(PERSON_HEIGHT_M).toBeLessThan(SHOP_DEPTH)
    expect(PERSON_HEIGHT_M).toBeLessThan(SHOP_WIDTH)
  })

  it('spaces the outside queue in single file at 0.6 m', () => {
    expect(QUEUE_SPACING_M).toBe(0.6)
    const a = queueSlotPosition(0)
    const b = queueSlotPosition(1)
    const c = queueSlotPosition(3)
    expect(a.x).toBe(b.x)
    expect(Math.abs(a.z - b.z)).toBeCloseTo(QUEUE_SPACING_M, 5)
    expect(Math.abs(a.z - c.z)).toBeCloseTo(QUEUE_SPACING_M * 3, 5)
  })

  it('keeps queued customers on spaced sidewalk slots', () => {
    const sim = new BakerySim(seededRng(11))
    sim.setSpeed(1)
    // Stay in prep (doors closed) so the line is not admitted while we measure spacing
    sim.tick(30)
    expect(sim.timeMin).toBeLessThan(OPEN_MIN)
    sim.customers = []
    for (let i = 0; i < 4; i++) {
      const slot = queueSlotPosition(i)
      sim.customers.push({
        id: `q-${i}`,
        x: slot.x,
        z: slot.z - 0.55,
        targetX: slot.x,
        targetZ: slot.z,
        path: [],
        state: 'queuedOutside',
        want: 'cookie',
        queueIndex: i,
        patienceMin: 40,
        payAmount: 0,
      })
    }
    sim.tick(3)
    const queued = sim.customers
      .filter((c) => c.state === 'queuedOutside')
      .sort((a, b) => a.queueIndex - b.queueIndex)
    expect(queued.length).toBe(4)
    for (let i = 0; i < 4; i++) {
      const slot = queueSlotPosition(queued[i].queueIndex)
      expect(Math.hypot(queued[i].x - slot.x, queued[i].z - slot.z)).toBeLessThan(0.15)
    }
    for (let i = 1; i < 4; i++) {
      const gap = Math.abs(queued[i].z - queued[i - 1].z)
      expect(gap).toBeGreaterThan(0.5)
      expect(gap).toBeLessThan(0.75)
    }
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        expect(Math.hypot(queued[i].x - queued[j].x, queued[i].z - queued[j].z)).toBeGreaterThan(0.45)
      }
    }
  })
})

describe('morning production mix', () => {
  it('puts every product on the display during the morning', () => {
    const sim = new BakerySim(seededRng(21))
    sim.setSpeed(16)
    const products: ProductId[] = ['croissant', 'baguette', 'muffin', 'cookie']
    // Overnight stock already covers the full menu at open
    for (const id of products) {
      expect(displayOf(sim.display, id)).toBeGreaterThan(0)
    }
    const baked = new Set<ProductId>()
    for (let t = sim.timeMin; t < 10 * 60; ) {
      const next = Math.min(t + 10, 10 * 60)
      sim.tick(next - sim.timeMin)
      t = sim.timeMin
      for (const id of products) {
        if (displayOf(sim.display, id) > 0) baked.add(id)
      }
      for (const line of sim.log) {
        for (const id of products) {
          if (line.toLowerCase().includes(id) && line.includes('ready')) baked.add(id)
        }
      }
    }
    expect(baked.size).toBe(4)
  })
})

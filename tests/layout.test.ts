import { describe, expect, it } from 'vitest'
import {
  SHOP_AREA_M2,
  SHOP_DEPTH,
  SHOP_WIDTH,
  STATIONS,
  isBlockedCell,
  GRID_COLS,
  GRID_ROWS,
} from '../src/config/layout'

describe('shop layout', () => {
  it('is exactly 12 m² as a 4×3 m footprint', () => {
    expect(SHOP_WIDTH).toBe(4)
    expect(SHOP_DEPTH).toBe(3)
    expect(SHOP_AREA_M2).toBe(12)
  })

  it('keeps front stations in the customer zone', () => {
    expect(STATIONS.door.zone).toBe('front')
    expect(STATIONS.register.zone).toBe('front')
    expect(STATIONS.display.zone).toBe('front')
    expect(STATIONS.queueOutside.zone).toBe('outside')
  })

  it('keeps production stations in the back zone', () => {
    expect(STATIONS.prep.zone).toBe('back')
    expect(STATIONS.oven.zone).toBe('back')
    expect(STATIONS.sink.zone).toBe('back')
    expect(STATIONS.storage.zone).toBe('back')
  })

  it('places all indoor stations inside the 4×3 footprint', () => {
    for (const s of Object.values(STATIONS)) {
      if (s.zone === 'outside') continue
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThanOrEqual(SHOP_WIDTH)
      expect(s.z).toBeGreaterThanOrEqual(0)
      expect(s.z).toBeLessThanOrEqual(SHOP_DEPTH)
    }
  })

  it('builds a walkable grid that matches shop size', () => {
    expect(GRID_COLS * 0.25).toBe(SHOP_WIDTH)
    expect(GRID_ROWS * 0.25).toBe(SHOP_DEPTH)
    // Door-adjacent cell should be free
    expect(isBlockedCell(8, 0)).toBe(false)
  })
})

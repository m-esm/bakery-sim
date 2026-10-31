import { describe, expect, it } from 'vitest'
import { advanceAlongPath, findPath } from '../src/sim/pathfinding'
import { STATIONS } from '../src/config/layout'

describe('pathfinding', () => {
  it('finds a path from prep to oven inside the shop', () => {
    const path = findPath(
      { x: STATIONS.prep.x, z: STATIONS.prep.z },
      { x: STATIONS.oven.x, z: STATIONS.oven.z },
    )
    expect(path.length).toBeGreaterThan(0)
    const end = path[path.length - 1]
    // Path ends on nearest walkable cell beside the oven furniture
    expect(Math.hypot(end.x - STATIONS.oven.x, end.z - STATIONS.oven.z)).toBeLessThan(0.8)
  })

  it('routes outside queue toward the door', () => {
    const path = findPath(
      { x: STATIONS.queueOutside.x, z: STATIONS.queueOutside.z },
      { x: STATIONS.counter.x, z: STATIONS.counter.z },
    )
    expect(path.length).toBeGreaterThan(1)
  })

  it('advances along a path over time', () => {
    const path = [
      { x: 1, z: 1 },
      { x: 2, z: 1 },
    ]
    const moved = advanceAlongPath(0, 1, path, 1, 1.5)
    expect(moved.x).toBeGreaterThan(1)
    expect(moved.arrived).toBe(false)
  })
})

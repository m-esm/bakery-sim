/** Shop footprint: 4 m × 3 m = 12 m². 1 unit = 1 meter. */

import { QUEUE_HEAD_Z, QUEUE_SPACING_M } from './scale'

export const SHOP_WIDTH = 4
export const SHOP_DEPTH = 3
export const SHOP_AREA_M2 = SHOP_WIDTH * SHOP_DEPTH

export type StationId =
  | 'door'
  | 'queueOutside'
  | 'counter'
  | 'register'
  | 'display'
  | 'prep'
  | 'oven'
  | 'sink'
  | 'storage'
  | 'idleBack'
  | 'idleFront'

export interface Station {
  id: StationId
  label: string
  x: number
  z: number
  /** Customer-facing vs back-of-house */
  zone: 'front' | 'back' | 'outside'
}

/**
 * Station waypoints sit on walkable floor beside furniture.
 * Front (z ≈ 0–1.15): door, display, counter, register.
 * Back (z ≈ 1.45–2.85): prep, oven, sink, storage.
 */
export const STATIONS: Record<StationId, Station> = {
  door: { id: 'door', label: 'Entrance', x: 2.0, z: 0.2, zone: 'front' },
  queueOutside: { id: 'queueOutside', label: 'Queue', x: 2.0, z: QUEUE_HEAD_Z, zone: 'outside' },
  counter: { id: 'counter', label: 'Counter', x: 1.5, z: 0.5, zone: 'front' },
  register: { id: 'register', label: 'Register', x: 3.05, z: 0.5, zone: 'front' },
  display: { id: 'display', label: 'Display case', x: 1.0, z: 0.5, zone: 'front' },
  prep: { id: 'prep', label: 'Prep table', x: 1.15, z: 1.55, zone: 'back' },
  oven: { id: 'oven', label: 'Oven', x: 2.15, z: 2.15, zone: 'back' },
  sink: { id: 'sink', label: 'Sink', x: 3.25, z: 1.85, zone: 'back' },
  storage: { id: 'storage', label: 'Storage', x: 0.85, z: 2.35, zone: 'back' },
  idleBack: { id: 'idleBack', label: 'Back idle', x: 1.7, z: 1.7, zone: 'back' },
  idleFront: { id: 'idleFront', label: 'Front idle', x: 2.55, z: 0.55, zone: 'front' },
}

/**
 * Furniture footprints for collision / pathfinding (x, z, w, d, h).
 * Keep clear aisle near x≈2.4 through the divider gap.
 */
export const FURNITURE = {
  displayCase: { x: 0.35, z: 0.78, w: 1.1, d: 0.42, h: 1.0 },
  counter: { x: 1.5, z: 0.78, w: 1.0, d: 0.42, h: 0.9 },
  registerDesk: { x: 2.65, z: 0.78, w: 0.95, d: 0.42, h: 0.9 },
  prepTable: { x: 0.45, z: 1.75, w: 1.0, d: 0.55, h: 0.85 },
  oven: { x: 1.7, z: 2.4, w: 0.75, d: 0.55, h: 1.1 },
  sink: { x: 3.15, z: 2.15, w: 0.55, d: 0.5, h: 0.9 },
  fridge: { x: 0.12, z: 2.4, w: 0.55, d: 0.55, h: 1.35 },
  storageShelf: { x: 3.45, z: 1.35, w: 0.45, d: 0.7, h: 1.4 },
  backWallDivider: { x: 0.2, z: 1.28, w: 2.0, d: 0.08, h: 0.9 },
} as const

/** Walkable grid for pathfinding (0.25 m cells). */
export const GRID_CELL = 0.25
export const GRID_COLS = Math.round(SHOP_WIDTH / GRID_CELL)
export const GRID_ROWS = Math.round(SHOP_DEPTH / GRID_CELL)

export { QUEUE_SPACING_M, QUEUE_HEAD_Z }

/** World position for queue slot index (0 = head of line). */
export function queueSlotPosition(index: number): { x: number; z: number } {
  return {
    x: STATIONS.queueOutside.x,
    z: QUEUE_HEAD_Z - index * QUEUE_SPACING_M,
  }
}

/** Cells blocked by furniture (approx). Outside queue is virtual. */
export function isBlockedCell(col: number, row: number): boolean {
  const x = (col + 0.5) * GRID_CELL
  const z = (row + 0.5) * GRID_CELL
  for (const f of Object.values(FURNITURE)) {
    if (f === FURNITURE.backWallDivider) continue
    if (x >= f.x && x <= f.x + f.w && z >= f.z && z <= f.z + f.d) {
      return true
    }
  }
  return false
}

/** Shop footprint: 4 m × 3 m = 12 m². 1 unit = 1 meter. */

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
 * Compact layout for a tiny shop:
 * - Front (z ≈ 0–1.1): door, queue outside, display, register
 * - Back (z ≈ 1.3–2.8): prep, oven, sink, storage
 */
/**
 * Station waypoints are standing positions on walkable floor beside furniture
 * (not inside blocked furniture footprints).
 */
export const STATIONS: Record<StationId, Station> = {
  door: { id: 'door', label: 'Entrance', x: 2.0, z: 0.2, zone: 'front' },
  queueOutside: { id: 'queueOutside', label: 'Queue', x: 2.0, z: -0.6, zone: 'outside' },
  counter: { id: 'counter', label: 'Counter', x: 1.6, z: 0.45, zone: 'front' },
  register: { id: 'register', label: 'Register', x: 3.1, z: 0.45, zone: 'front' },
  display: { id: 'display', label: 'Display case', x: 1.2, z: 0.45, zone: 'front' },
  prep: { id: 'prep', label: 'Prep table', x: 1.0, z: 1.5, zone: 'back' },
  oven: { id: 'oven', label: 'Oven', x: 2.0, z: 2.1, zone: 'back' },
  sink: { id: 'sink', label: 'Sink', x: 3.25, z: 1.7, zone: 'back' },
  storage: { id: 'storage', label: 'Storage', x: 1.05, z: 2.65, zone: 'back' },
  idleBack: { id: 'idleBack', label: 'Back idle', x: 1.5, z: 1.55, zone: 'back' },
  idleFront: { id: 'idleFront', label: 'Front idle', x: 2.55, z: 0.5, zone: 'front' },
}

/** Furniture bounding boxes for collision / visuals (x, z, w, d). */
export const FURNITURE = {
  displayCase: { x: 0.35, z: 0.75, w: 1.8, d: 0.45, h: 1.0 },
  registerDesk: { x: 2.7, z: 0.75, w: 0.9, d: 0.45, h: 0.95 },
  prepTable: { x: 0.25, z: 1.7, w: 1.1, d: 0.7, h: 0.85 },
  oven: { x: 1.55, z: 2.35, w: 0.9, d: 0.7, h: 1.4 },
  sink: { x: 3.0, z: 1.9, w: 0.7, d: 0.55, h: 0.9 },
  storageShelf: { x: 0.1, z: 2.4, w: 0.7, d: 0.55, h: 1.6 },
  backWallDivider: { x: 0.15, z: 1.25, w: 3.7, d: 0.08, h: 1.2 },
} as const

/** Walkable grid for pathfinding (0.25 m cells). */
export const GRID_CELL = 0.25
export const GRID_COLS = Math.round(SHOP_WIDTH / GRID_CELL)
export const GRID_ROWS = Math.round(SHOP_DEPTH / GRID_CELL)

/** Cells blocked by furniture (approx). Outside queue is virtual. */
export function isBlockedCell(col: number, row: number): boolean {
  const x = (col + 0.5) * GRID_CELL
  const z = (row + 0.5) * GRID_CELL
  for (const f of Object.values(FURNITURE)) {
    if (f === FURNITURE.backWallDivider) continue
    if (
      x >= f.x &&
      x <= f.x + f.w &&
      z >= f.z &&
      z <= f.z + f.d
    ) {
      return true
    }
  }
  return false
}

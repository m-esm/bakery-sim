import {
  GRID_CELL,
  GRID_COLS,
  GRID_ROWS,
  SHOP_DEPTH,
  SHOP_WIDTH,
  isBlockedCell,
} from '../config/layout'

export interface Point {
  x: number
  z: number
}

function clampGrid(col: number, row: number): { col: number; row: number } {
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, col)),
    row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
  }
}

export function worldToCell(x: number, z: number): { col: number; row: number } {
  return clampGrid(
    Math.floor(x / GRID_CELL),
    Math.floor(z / GRID_CELL),
  )
}

export function cellToWorld(col: number, row: number): Point {
  return {
    x: (col + 0.5) * GRID_CELL,
    z: (row + 0.5) * GRID_CELL,
  }
}

/** A* on the shop grid. Outside points are clamped to nearest door-adjacent cell. */
export function findPath(from: Point, to: Point): Point[] {
  const startIn =
    from.z < 0
      ? worldToCell(from.x, 0.1)
      : worldToCell(
          Math.max(0.05, Math.min(SHOP_WIDTH - 0.05, from.x)),
          Math.max(0.05, Math.min(SHOP_DEPTH - 0.05, from.z)),
        )
  const goalIn =
    to.z < 0
      ? worldToCell(to.x, 0.1)
      : worldToCell(
          Math.max(0.05, Math.min(SHOP_WIDTH - 0.05, to.x)),
          Math.max(0.05, Math.min(SHOP_DEPTH - 0.05, to.z)),
        )

  // If start or goal blocked, nudge to nearest free cell
  const start = nearestFree(startIn.col, startIn.row)
  const goal = nearestFree(goalIn.col, goalIn.row)

  if (start.col === goal.col && start.row === goal.row) {
    return [cellToWorld(goal.col, goal.row)]
  }

  const key = (c: number, r: number) => `${c},${r}`
  const open: { c: number; r: number; f: number }[] = []
  const came = new Map<string, string>()
  const gScore = new Map<string, number>()
  const startKey = key(start.col, start.row)
  gScore.set(startKey, 0)
  open.push({
    c: start.col,
    r: start.row,
    f: heuristic(start.col, start.row, goal.col, goal.row),
  })

  const closed = new Set<string>()
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!
    const ck = key(current.c, current.r)
    if (closed.has(ck)) continue
    closed.add(ck)

    if (current.c === goal.col && current.r === goal.row) {
      const path: Point[] = []
      let cur: string | undefined = ck
      while (cur) {
        const [c, r] = cur.split(',').map(Number)
        path.push(cellToWorld(c, r))
        cur = came.get(cur)
      }
      path.reverse()
      // Append exact outside target if needed
      if (to.z < 0) path.push({ x: to.x, z: to.z })
      if (from.z < 0) path.unshift({ x: from.x, z: from.z })
      return path
    }

    for (const [dc, dr] of dirs) {
      const nc = current.c + dc
      const nr = current.r + dr
      if (nc < 0 || nr < 0 || nc >= GRID_COLS || nr >= GRID_ROWS) continue
      if (isBlockedCell(nc, nr)) continue
      // Prevent cutting corners through blocked diagonals
      if (dc !== 0 && dr !== 0) {
        if (isBlockedCell(current.c + dc, current.r) || isBlockedCell(current.c, current.r + dr)) {
          continue
        }
      }
      const nk = key(nc, nr)
      if (closed.has(nk)) continue
      const step = dc !== 0 && dr !== 0 ? 1.414 : 1
      const tentative = (gScore.get(ck) ?? Infinity) + step
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, ck)
        gScore.set(nk, tentative)
        open.push({
          c: nc,
          r: nr,
          f: tentative + heuristic(nc, nr, goal.col, goal.row),
        })
      }
    }
  }

  // Fallback: direct line via door if blocked
  return [from, cellToWorld(goal.col, goal.row), to]
}

function heuristic(c: number, r: number, gc: number, gr: number): number {
  return Math.hypot(gc - c, gr - r)
}

function nearestFree(col: number, row: number): { col: number; row: number } {
  if (!isBlockedCell(col, row)) return { col, row }
  for (let rad = 1; rad < 8; rad++) {
    for (let dc = -rad; dc <= rad; dc++) {
      for (let dr = -rad; dr <= rad; dr++) {
        const c = col + dc
        const r = row + dr
        if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) continue
        if (!isBlockedCell(c, r)) return { col: c, row: r }
      }
    }
  }
  return { col: 0, row: 0 }
}

/** Move an agent along a path; returns leftover path and new position. */
export function advanceAlongPath(
  x: number,
  z: number,
  path: Point[],
  speedMPerMin: number,
  dtMin: number,
): { x: number; z: number; path: Point[]; arrived: boolean } {
  let remaining = speedMPerMin * dtMin
  let cx = x
  let cz = z
  const next = [...path]
  while (remaining > 0 && next.length > 0) {
    const target = next[0]
    const dx = target.x - cx
    const dz = target.z - cz
    const dist = Math.hypot(dx, dz)
    if (dist <= remaining || dist < 0.01) {
      cx = target.x
      cz = target.z
      remaining -= dist
      next.shift()
    } else {
      cx += (dx / dist) * remaining
      cz += (dz / dist) * remaining
      remaining = 0
    }
  }
  return { x: cx, z: cz, path: next, arrived: next.length === 0 }
}

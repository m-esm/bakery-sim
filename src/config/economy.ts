import type { ProductId } from './recipes'

/** Opening cash on day 1 */
export const STARTING_CASH = 250

/** Rent / utilities charged at end of day */
export const DAILY_OVERHEAD = 35

/** Equipment wear per oven cycle */
export const OVEN_WEAR_PER_BAKE = 0.02

/** Repair cost when wear hits 1.0 */
export const OVEN_REPAIR_COST = 45

/**
 * Demand multipliers by hour of day (0–23).
 * Higher = more customer arrivals.
 */
export const DEMAND_BY_HOUR: number[] = [
  0, 0, 0, 0, 0, 0.2, 0.6, 1.4, 1.6, 1.1, 0.8, 1.0, 1.3, 1.0, 0.7, 0.9, 1.2, 1.0, 0.4, 0, 0, 0, 0, 0,
]

/** Preferred product mix weights for customers */
export const PRODUCT_DEMAND_WEIGHTS: Record<ProductId, number> = {
  croissant: 1.2,
  baguette: 1.0,
  cookie: 0.9,
  muffin: 0.8,
}

/** Shop hours (minutes from midnight) */
export const OPEN_MIN = 7 * 60
export const CLOSE_MIN = 18 * 60
export const DAY_START_MIN = 5 * 60
export const DAY_END_MIN = 19 * 60

/** Base mean minutes between customer arrivals at demand 1.0 */
export const BASE_ARRIVAL_INTERVAL_MIN = 8

/** Max customers inside the tiny shop at once */
export const MAX_CUSTOMERS_INSIDE = 2

/** Max outside queue length */
export const MAX_QUEUE_OUTSIDE = 4

/** Display case capacity (finished goods slots) */
export const DISPLAY_CAPACITY = 40

/** Dirt thresholds */
export const DIRT_CLEAN_THRESHOLD = 0.15
export const DIRT_DIRTY_THRESHOLD = 0.6

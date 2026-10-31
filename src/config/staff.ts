import type { StationId } from './layout'

export type RoleId = 'baker' | 'cashier'

export interface StaffDef {
  id: string
  name: string
  role: RoleId
  /** Hourly wage */
  wagePerHour: number
  /** Shift start as minutes from midnight */
  shiftStartMin: number
  /** Shift end as minutes from midnight */
  shiftEndMin: number
  homeStation: StationId
  color: number
}

/**
 * Tiny shop: two staff only.
 * Baker covers production + end-of-day cleaning.
 * Cashier covers sales during open hours.
 */
export const STAFF: StaffDef[] = [
  {
    id: 'maya',
    name: 'Maya',
    role: 'baker',
    wagePerHour: 16,
    shiftStartMin: 5 * 60,
    shiftEndMin: 14 * 60,
    homeStation: 'idleBack',
    color: 0xe07a5f,
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'cashier',
    wagePerHour: 14,
    shiftStartMin: 7 * 60,
    shiftEndMin: 18 * 60 + 30,
    homeStation: 'idleFront',
    color: 0x3d405b,
  },
]

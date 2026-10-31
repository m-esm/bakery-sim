import {
  CLOSE_MIN,
  DAY_END_MIN,
  DAY_START_MIN,
  OPEN_MIN,
} from '../config/economy'
import type { TimeSpeed } from './types'

export function formatTime(timeMin: number): string {
  const m = ((Math.floor(timeMin) % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function phaseAt(timeMin: number): 'prep' | 'open' | 'closing' | 'closed' {
  if (timeMin < OPEN_MIN) return 'prep'
  if (timeMin < CLOSE_MIN) return 'open'
  if (timeMin < DAY_END_MIN) return 'closing'
  return 'closed'
}

export function isOpen(timeMin: number): boolean {
  return timeMin >= OPEN_MIN && timeMin < CLOSE_MIN
}

export function onShift(
  timeMin: number,
  shiftStartMin: number,
  shiftEndMin: number,
): boolean {
  return timeMin >= shiftStartMin && timeMin < shiftEndMin
}

/** Real seconds → sim minutes at given speed. 1x = 1 real sec = 1 sim minute. */
export function realDtToSimMin(realDtSec: number, speed: TimeSpeed): number {
  if (speed === 0) return 0
  return realDtSec * speed
}

export { DAY_START_MIN, DAY_END_MIN, OPEN_MIN, CLOSE_MIN }

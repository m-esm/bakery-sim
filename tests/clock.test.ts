import { describe, expect, it } from 'vitest'
import { formatTime, isOpen, phaseAt, realDtToSimMin } from '../src/sim/clock'

describe('clock', () => {
  it('formats minutes from midnight', () => {
    expect(formatTime(5 * 60)).toBe('05:00')
    expect(formatTime(18 * 60 + 5)).toBe('18:05')
  })

  it('maps phases across the bakery day', () => {
    expect(phaseAt(5 * 60)).toBe('prep')
    expect(phaseAt(9 * 60)).toBe('open')
    expect(phaseAt(18 * 60)).toBe('closing')
    expect(phaseAt(19 * 60)).toBe('closed')
    expect(isOpen(10 * 60)).toBe(true)
    expect(isOpen(6 * 60)).toBe(false)
  })

  it('converts real time to sim minutes with speed control', () => {
    expect(realDtToSimMin(1, 0)).toBe(0)
    expect(realDtToSimMin(1, 1)).toBe(1)
    expect(realDtToSimMin(1, 4)).toBe(4)
    expect(realDtToSimMin(0.5, 16)).toBe(8)
  })
})

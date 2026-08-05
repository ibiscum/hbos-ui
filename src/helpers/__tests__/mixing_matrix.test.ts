import { describe, expect, it } from 'vitest'

import { matrixToSettings, settingsToMatrix } from '../mixing_matrix'

describe('mixing_matrix helpers', () => {
  describe('settingsToMatrix', () => {
    it('returns identity matrix for stereo at center balance', () => {
      expect(settingsToMatrix('stereo', 0)).toEqual([
        [1, 0],
        [0, 1],
      ])
    })

    it('applies negative balance by reducing right output gain', () => {
      expect(settingsToMatrix('stereo', -0.25)).toEqual([
        [1, 0],
        [0, 0.75],
      ])
    })

    it('applies positive balance by reducing left output gain', () => {
      expect(settingsToMatrix('stereo', 0.4)).toEqual([
        [0.6, 0],
        [0, 1],
      ])
    })

    it('builds swapped mode matrix', () => {
      expect(settingsToMatrix('swapped', 0)).toEqual([
        [0, 1],
        [1, 0],
      ])
    })

    it('builds mono mode matrix', () => {
      expect(settingsToMatrix('mono', 0)).toEqual([
        [0.5, 0.5],
        [0.5, 0.5],
      ])
    })

    it('builds left-only mode matrix', () => {
      expect(settingsToMatrix('left', 0)).toEqual([
        [1, 1],
        [0, 0],
      ])
    })

    it('builds right-only mode matrix', () => {
      expect(settingsToMatrix('right', 0)).toEqual([
        [0, 0],
        [1, 1],
      ])
    })

    it('falls back to stereo for unknown mode values', () => {
      const matrix = settingsToMatrix('unexpected-mode' as unknown as Parameters<typeof settingsToMatrix>[0], 0)
      expect(matrix).toEqual([
        [1, 0],
        [0, 1],
      ])
    })
  })

  describe('matrixToSettings', () => {
    it('returns null for invalid matrix shapes', () => {
      expect(matrixToSettings([])).toBeNull()
      expect(matrixToSettings([[1, 0], [0]])).toBeNull()
      expect(matrixToSettings([[1, 0]])).toBeNull()
    })

    it('detects stereo mode', () => {
      expect(matrixToSettings([
        [1, 0],
        [0, 1],
      ])).toEqual({ mode: 'stereo', balance: 0 })
    })

    it('detects swapped mode', () => {
      expect(matrixToSettings([
        [0, 1],
        [1, 0],
      ])).toEqual({ mode: 'swapped', balance: 0 })
    })

    it('detects mono mode for equal-all mix matrix', () => {
      expect(matrixToSettings([
        [0.5, 0.5],
        [0.5, 0.5],
      ])).toEqual({ mode: 'mono', balance: 0 })
    })

    it('detects left and right modes', () => {
      expect(matrixToSettings([
        [1, 1],
        [0, 0],
      ])).toEqual({ mode: 'left', balance: -1 })

      expect(matrixToSettings([
        [0, 0],
        [1, 1],
      ])).toEqual({ mode: 'right', balance: 1 })
    })

    it('derives full-left and full-right balance when only one output side has gain', () => {
      expect(matrixToSettings([
        [1, 0],
        [0, 0],
      ])).toEqual({ mode: 'stereo', balance: -1 })

      expect(matrixToSettings([
        [0, 0],
        [0, 1],
      ])).toEqual({ mode: 'stereo', balance: 1 })
    })

    it('preserves balance values when normalized mode detection succeeds', () => {
      const withPositiveBalance = settingsToMatrix('swapped', 0.3)
      const parsedPositive = matrixToSettings(withPositiveBalance)
      expect(parsedPositive?.mode).toBe('swapped')
      expect(parsedPositive?.balance).toBeGreaterThan(0)
      expect(parsedPositive?.balance).toBeLessThanOrEqual(1)

      const withNegativeBalance = settingsToMatrix('mono', -0.2)
      const parsedNegative = matrixToSettings(withNegativeBalance)
      expect(parsedNegative?.mode).toBe('mono')
      expect(parsedNegative?.balance).toBeLessThan(0)
      expect(parsedNegative?.balance).toBeGreaterThanOrEqual(-1)
      expect(parsedNegative?.balance).toBeLessThanOrEqual(1)
    })

    it('handles zero-gain matrix as neutral stereo fallback', () => {
      expect(matrixToSettings([
        [0, 0],
        [0, 0],
      ])).toEqual({ mode: 'stereo', balance: 0 })
    })

    it('returns stereo fallback for unknown patterns while preserving detected balance', () => {
      const result = matrixToSettings([
        [0.2, 0.9],
        [0.1, 0.7],
      ])

      expect(result?.mode).toBe('stereo')
      expect(Math.abs(result?.balance ?? 0)).toBeGreaterThan(0)
      expect(result?.balance).toBeGreaterThanOrEqual(-1)
      expect(result?.balance).toBeLessThanOrEqual(1)
    })
  })
})

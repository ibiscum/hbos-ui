import { describe, expect, it } from 'vitest'
import {
  CHART_CONFIGS,
  frequencyToX,
  generateFrequencyPath,
  generateTargetCurvePath,
  magnitudeToY,
} from '@/composables/useChartPaths'

const buildPath = (points: Array<{ freq: number; mag: number }>, config = CHART_CONFIGS.standard) => (
  points
    .map((point, index) => {
      const x = frequencyToX(point.freq, config)
      const y = magnitudeToY(point.mag, config)
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')
)

describe('useChartPaths', () => {
  it('maps chart frequency bounds to the left and right plot edges', () => {
    const config = CHART_CONFIGS.standard

    expect(frequencyToX(config.minFreq, config)).toBe(config.offsetX)
    expect(frequencyToX(config.maxFreq, config)).toBe(config.offsetX + config.chartWidth)
  })

  it('maps chart magnitude bounds to top and bottom plot edges', () => {
    const config = CHART_CONFIGS.step3

    expect(magnitudeToY(config.maxMag, config)).toBe(config.offsetY)
    expect(magnitudeToY(config.minMag, config)).toBe(config.offsetY + config.chartHeight)
  })

  it('builds a path only from valid in-range paired points', () => {
    const config = CHART_CONFIGS.step3

    const result = generateFrequencyPath(
      [10, 20, 1000, 30000, 500, 100],
      [0, 1, 2, 3, Number.NaN],
      config,
    )

    expect(result).toBe(buildPath([
      { freq: 20, mag: 1 },
      { freq: 1000, mag: 2 },
    ], config))
    expect(result).not.toContain('NaN')
  })

  it('returns empty path for empty frequency or magnitude arrays', () => {
    expect(generateFrequencyPath([], [1, 2], CHART_CONFIGS.standard)).toBe('')
    expect(generateFrequencyPath([20, 30], [], CHART_CONFIGS.standard)).toBe('')
  })

  it('clips target curve segments at chart boundaries with interpolation', () => {
    const config = CHART_CONFIGS.standard

    const result = generateTargetCurvePath([
      { frequency: 10, target_db: 0 },
      { frequency: 100, target_db: 10 },
      { frequency: 50000, target_db: 20 },
    ], config)

    const magAt20 = 0 + ((10 - 0) * (20 - 10)) / (100 - 10)
    const magAt25000 = 10 + ((20 - 10) * (25000 - 100)) / (50000 - 100)

    expect(result).toBe(buildPath([
      { freq: 20, mag: magAt20 },
      { freq: 100, mag: 10 },
      { freq: 25000, mag: magAt25000 },
    ], config))
  })

  it('ignores invalid target points and treats non-finite clip bounds as unset', () => {
    const config = CHART_CONFIGS.standard
    const points = [
      { frequency: 20, target_db: 0 },
      { frequency: Number.NaN, target_db: 7 },
      { frequency: 100, target_db: Number.POSITIVE_INFINITY },
      { frequency: 200, target_db: 8 },
    ]

    const withoutClip = generateTargetCurvePath(points, config)
    const withInvalidClip = generateTargetCurvePath(points, config, Number.NaN, Number.NaN)

    expect(withInvalidClip).toBe(withoutClip)
    expect(withoutClip).toBe(buildPath([
      { freq: 20, mag: 0 },
      { freq: 200, mag: 8 },
    ], config))
  })

  it('returns empty path when clip bounds collapse the visible range', () => {
    const config = CHART_CONFIGS.step3

    const result = generateTargetCurvePath(
      [
        { frequency: 100, target_db: 0 },
        { frequency: 1000, target_db: 3 },
      ],
      config,
      1000,
      1000,
    )

    expect(result).toBe('')
  })
})

import { describe, expect, it } from 'vitest'

import type { Filter } from '../filtercalc'
import {
  DEFAULT_FREQ_RANGE,
  addCoordinatesToPoints,
  frequencyToX,
  gainToY,
  generateCombinedGraphData,
  generateCombinedResponse,
  generateFilterGraphData,
  generateFilterResponse,
  generateFrequencyGridLines,
  generateFrequencyLabels,
  generateGainGridLines,
  pointsToSVGAreaPath,
  pointsToSVGPath,
  xToFrequency,
  yToGain,
} from '../filtergraph'

const dimensions = {
  plotWidth: 800,
  plotHeight: 400,
}

const peakingBoost: Filter = {
  id: 1,
  icon: 'peaking',
  text: '1000',
  frequency: 1000,
  gain: 6,
  Q: 1,
  enabled: true,
}

const peakingCut: Filter = {
  ...peakingBoost,
  id: 2,
  gain: -3,
}

describe('filtergraph - unit and regression tests', () => {
  it('maps min/max frequencies to left/right plot edges', () => {
    expect(frequencyToX(DEFAULT_FREQ_RANGE.min, dimensions.plotWidth)).toBeCloseTo(0, 8)
    expect(frequencyToX(DEFAULT_FREQ_RANGE.max, dimensions.plotWidth)).toBeCloseTo(dimensions.plotWidth, 8)
  })

  it('converts x to frequency and back with stable log mapping', () => {
    const freq = 1234
    const x = frequencyToX(freq, dimensions.plotWidth)
    const roundTrip = xToFrequency(x, dimensions.plotWidth)

    expect(roundTrip).toBeCloseTo(freq, 6)
  })

  it('guards invalid frequency/range inputs and returns finite coordinates', () => {
    const x = frequencyToX(Number.NaN, 0, -1, -2)
    const freq = xToFrequency(Number.NaN, 0, -5, -10)

    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(freq)).toBe(true)
    expect(freq).toBeGreaterThan(0)
  })

  it('maps gain to y and y to gain with finite fallback behavior', () => {
    const y = gainToY(0, dimensions.plotHeight)
    const gain = yToGain(y, dimensions.plotHeight)

    expect(gain).toBeCloseTo(0, 6)

    const yInvalid = gainToY(Number.POSITIVE_INFINITY, 0, 2, 2)
    const gainInvalid = yToGain(Number.NaN, 0, 2, 2)
    expect(Number.isFinite(yInvalid)).toBe(true)
    expect(Number.isFinite(gainInvalid)).toBe(true)
  })

  it('adds visual coordinates to response points', () => {
    const points = addCoordinatesToPoints([
      { frequency: 100, gain: 1 },
      { frequency: 1000, gain: -2 },
    ], dimensions)

    expect(points).toHaveLength(2)
    expect(points[0].x).toBeLessThan(points[1].x)
    expect(Number.isFinite(points[0].y)).toBe(true)
  })

  it('generates deterministic response points count and finite values', () => {
    const points = generateFilterResponse(peakingBoost, dimensions, 0, 20000, 20)

    expect(points).toHaveLength(2)
    expect(points.every((p) => Number.isFinite(p.frequency) && Number.isFinite(p.gain) && Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
  })

  it('combines gains from enabled filters only', () => {
    const disabled = { ...peakingCut, enabled: false }
    const combinedOne = generateCombinedResponse([peakingBoost], dimensions, 8)
    const combinedWithDisabled = generateCombinedResponse([peakingBoost, disabled], dimensions, 8)

    expect(combinedWithDisabled).toHaveLength(combinedOne.length)
    for (let i = 0; i < combinedOne.length; i += 1) {
      expect(combinedWithDisabled[i].gain).toBeCloseTo(combinedOne[i].gain, 6)
    }
  })

  it('creates svg line path and empty path correctly', () => {
    expect(pointsToSVGPath([])).toBe('')

    const points = generateFilterResponse(peakingBoost, dimensions, 4)
    const path = pointsToSVGPath(points)

    expect(path.startsWith('M ')).toBe(true)
    expect(path.includes(' L ')).toBe(true)
  })

  it('creates area path with baseline closure', () => {
    const points = generateFilterResponse(peakingBoost, dimensions, 4)
    const areaPath = pointsToSVGAreaPath(points, dimensions)

    expect(areaPath.startsWith('M ')).toBe(true)
    // closed by explicitly appending start baseline point at end
    const segments = areaPath.replace(/^M /, '').split(' L ')
    expect(segments[0]).toBe(segments[segments.length - 1])
  })

  it('builds graph data wrappers and skips disabled-only combined graphs', () => {
    const single = generateFilterGraphData(peakingBoost, dimensions, 4)
    expect(single).not.toBeNull()
    expect(single?.linePath).toContain('M ')
    expect(single?.areaPath).toContain('M ')

    const disabledSingle = generateFilterGraphData({ ...peakingBoost, enabled: false }, dimensions)
    expect(disabledSingle).toBeNull()

    const disabledCombined = generateCombinedGraphData([{ ...peakingBoost, enabled: false }], dimensions)
    expect(disabledCombined).toBeNull()

    const combined = generateCombinedGraphData([peakingBoost, peakingCut], dimensions, 4)
    expect(combined?.linePath).toContain('M ')
  })

  it('generates sorted frequency/gain grid lines and reduced label set', () => {
    const freqLines = generateFrequencyGridLines(20, 20000)
    const labels = generateFrequencyLabels(20, 20000)
    const gainLines = generateGainGridLines(-10, 10, 5)

    expect(freqLines[0]).toBeGreaterThanOrEqual(20)
    expect(freqLines[freqLines.length - 1]).toBeLessThanOrEqual(20000)
    expect([...freqLines].sort((a, b) => a - b)).toEqual(freqLines)

    // label set is intentionally less dense than grid lines
    expect(labels.length).toBeLessThan(freqLines.length)
    expect(gainLines).toEqual([-10, -5, 0, 5, 10])
  })
})

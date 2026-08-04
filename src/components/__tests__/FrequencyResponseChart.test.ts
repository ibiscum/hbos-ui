import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FrequencyResponseChart from '@/components/FrequencyResponseChart.vue'
import {
  CHART_CONFIGS,
  frequencyToX,
  magnitudeToY,
  type ChartConfig,
} from '@/composables/useChartPaths'

const buildPath = (points: Array<{ freq: number; mag: number }>, config: ChartConfig): string => (
  points
    .map((point, index) => {
      const x = frequencyToX(point.freq, config)
      const y = magnitudeToY(point.mag, config)
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')
)

describe('FrequencyResponseChart.vue', () => {
  it('renders measured and target curve paths from props end-to-end', () => {
    const config = CHART_CONFIGS.standard

    const wrapper = mount(FrequencyResponseChart, {
      props: {
        gridPatternId: 'grid-it',
        chartConfig: config,
        showReferenceLine: false,
        curves: [
          {
            frequencies: [20, 1000, 30000],
            magnitudes: [0, 4, 10],
            color: '#4caf50',
          },
          {
            frequencies: [10, 100, 50000],
            magnitudes: [0, 10, 20],
            color: '#58a6ff',
            dashArray: '5,5',
            isTargetCurve: true,
            clipMinFreq: 30,
            clipMaxFreq: 20000,
          },
        ],
      },
    })

    const renderedCurvePaths = wrapper.findAll('.response-svg > path')
    expect(renderedCurvePaths).toHaveLength(2)

    const measuredPath = renderedCurvePaths[0].attributes('d')
    const targetPath = renderedCurvePaths[1].attributes('d')

    const expectedMeasured = buildPath([
      { freq: 20, mag: 0 },
      { freq: 1000, mag: 4 },
    ], config)

    const magAt30 = 0 + ((10 - 0) * (30 - 10)) / (100 - 10)
    const magAt20000 = 10 + ((20 - 10) * (20000 - 100)) / (50000 - 100)
    const expectedTarget = buildPath([
      { freq: 30, mag: magAt30 },
      { freq: 100, mag: 10 },
      { freq: 20000, mag: magAt20000 },
    ], config)

    expect(measuredPath).toBe(expectedMeasured)
    expect(targetPath).toBe(expectedTarget)
  })
})

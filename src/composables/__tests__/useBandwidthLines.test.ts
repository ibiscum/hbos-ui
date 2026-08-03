import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { Filter } from '@/utils/filtercalc'

const { createBiquadFilterMock, calculateBiquadBandwidthMock } = vi.hoisted(() => ({
  createBiquadFilterMock: vi.fn(),
  calculateBiquadBandwidthMock: vi.fn(),
}))

vi.mock('@/utils/biquad', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/biquad')>()
  return {
    ...actual,
    createBiquadFilter: createBiquadFilterMock,
    calculateBiquadBandwidth: calculateBiquadBandwidthMock,
  }
})

import { FILTER_TYPES } from '@/utils/biquad'
import { useBandwidthLines } from '@/composables/useBandwidthLines'

const makeFilter = (overrides: Partial<Filter> = {}): Filter => ({
  id: 1,
  icon: FILTER_TYPES.PEAKING,
  text: '1000',
  frequency: 1000,
  gain: 3,
  Q: 1,
  enabled: true,
  ...overrides,
})

describe('useBandwidthLines', () => {
  beforeEach(() => {
    createBiquadFilterMock.mockReset()
    calculateBiquadBandwidthMock.mockReset()

    createBiquadFilterMock.mockImplementation((type, frequency, gain, Q, sampleRate) => ({
      type,
      frequency,
      gain,
      Q,
      sampleRate,
    }))

    calculateBiquadBandwidthMock.mockReturnValue({
      lowerFreq: 500,
      upperFreq: 2000,
    })
  })

  it('returns null for generic_normalized filters', () => {
    const filter = ref(makeFilter({ icon: FILTER_TYPES.GENERIC_NORMALIZED }))
    const currentFilter = computed(() => filter.value)

    const { activeFilterBandwidthStart, activeFilterBandwidthEnd } = useBandwidthLines(currentFilter, 48000)

    expect(activeFilterBandwidthStart.value).toBeNull()
    expect(activeFilterBandwidthEnd.value).toBeNull()
    expect(createBiquadFilterMock).not.toHaveBeenCalled()
    expect(calculateBiquadBandwidthMock).not.toHaveBeenCalled()
  })

  it.each([
    { Q: undefined, frequency: 1000 },
    { Q: 0, frequency: 1000 },
    { Q: -1, frequency: 1000 },
    { Q: 1, frequency: 0 },
  ])('returns null when filter parameters are invalid: %o', ({ Q, frequency }) => {
    const filter = ref(makeFilter({ Q, frequency }))
    const currentFilter = computed(() => filter.value)

    const { activeFilterBandwidthStart, activeFilterBandwidthEnd } = useBandwidthLines(currentFilter, 48000)

    expect(activeFilterBandwidthStart.value).toBeNull()
    expect(activeFilterBandwidthEnd.value).toBeNull()
    expect(createBiquadFilterMock).not.toHaveBeenCalled()
    expect(calculateBiquadBandwidthMock).not.toHaveBeenCalled()
  })

  it.each([
    { icon: FILTER_TYPES.PEAKING, expectedType: FILTER_TYPES.PEAKING },
    { icon: FILTER_TYPES.LOWSHELF, expectedType: FILTER_TYPES.LOWSHELF },
    { icon: FILTER_TYPES.HIGHSHELF, expectedType: FILTER_TYPES.HIGHSHELF },
    { icon: FILTER_TYPES.LOWPASS, expectedType: FILTER_TYPES.LOWPASS },
    { icon: FILTER_TYPES.HIGHPASS, expectedType: FILTER_TYPES.HIGHPASS },
  ])('maps $icon to the expected biquad type', ({ icon, expectedType }) => {
    const filter = ref(makeFilter({ icon }))
    const currentFilter = computed(() => filter.value)

    const { activeFilterBandwidthStart, activeFilterBandwidthEnd } = useBandwidthLines(currentFilter, 44100)

    expect(activeFilterBandwidthStart.value).toBe(500)
    expect(activeFilterBandwidthEnd.value).toBe(2000)
    expect(createBiquadFilterMock).toHaveBeenCalledWith(expectedType, 1000, 3, 1, 44100)
    expect(calculateBiquadBandwidthMock).toHaveBeenCalledTimes(1)
  })

  it('computes bandwidth once when both start and end are read for the same filter state', () => {
    const filter = ref(makeFilter())
    const currentFilter = computed(() => filter.value)

    const { activeFilterBandwidthStart, activeFilterBandwidthEnd } = useBandwidthLines(currentFilter, 48000)

    expect(activeFilterBandwidthStart.value).toBe(500)
    expect(activeFilterBandwidthEnd.value).toBe(2000)
    expect(createBiquadFilterMock).toHaveBeenCalledTimes(1)
    expect(calculateBiquadBandwidthMock).toHaveBeenCalledTimes(1)
  })

  it('recomputes when the active filter changes', () => {
    calculateBiquadBandwidthMock
      .mockReturnValueOnce({ lowerFreq: 800, upperFreq: 1200 })
      .mockReturnValueOnce({ lowerFreq: 100, upperFreq: 300 })

    const filter = ref(makeFilter({ frequency: 1000, Q: 1 }))
    const currentFilter = computed(() => filter.value)
    const { activeFilterBandwidthStart, activeFilterBandwidthEnd } = useBandwidthLines(currentFilter, 48000)

    expect(activeFilterBandwidthStart.value).toBe(800)
    expect(activeFilterBandwidthEnd.value).toBe(1200)

    filter.value = makeFilter({ icon: FILTER_TYPES.LOWPASS, frequency: 200, Q: 0.707, gain: -6 })

    expect(activeFilterBandwidthStart.value).toBe(100)
    expect(activeFilterBandwidthEnd.value).toBe(300)
    expect(createBiquadFilterMock).toHaveBeenNthCalledWith(2, FILTER_TYPES.LOWPASS, 200, -6, 0.707, 48000)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEqFilters } from '@/composables/useEqFilters'
import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph'
import { useFilterStore } from '@/stores/filter-connector'
import { useToastStore } from '@/stores/toast'
import {
  addFilterToLinkedChannels,
  copyFiltersToChannels,
  removeFilterFromLinkedChannels,
  toggleFilterEnabledLinked,
  updateFilterPropertyLinked,
  updateGenericCoeffLinked,
} from '@/utils/linked-channel-operations'

vi.mock('@/stores/filter-connector')
vi.mock('@/stores/toast')
vi.mock('@/utils/filter-conversions', () => ({
  convertUIFilterToStore: vi.fn((filter) => ({
    type: filter.icon,
    frequency: filter.frequency,
    gain: filter.gain,
    q: filter.Q,
    enabled: filter.enabled,
  })),
  convertStoreFilterToUI: vi.fn((storeFilter, id) => ({
    id: parseInt(String(id).split('_')[1], 10) || 0,
    icon: 'peaking',
    text: String(storeFilter.frequency ?? 1000),
    frequency: storeFilter.frequency ?? 1000,
    gain: storeFilter.gain ?? 0,
    Q: storeFilter.q ?? 0.71,
    enabled: storeFilter.enabled ?? true,
  })),
}))
vi.mock('@/utils/linked-channel-operations', () => ({
  addFilterToLinkedChannels: vi.fn().mockResolvedValue(undefined),
  removeFilterFromLinkedChannels: vi.fn().mockResolvedValue(undefined),
  toggleFilterEnabledLinked: vi.fn().mockResolvedValue(undefined),
  copyFiltersToChannels: vi.fn().mockResolvedValue(undefined),
  updateFilterPropertyLinked: vi.fn().mockResolvedValue(undefined),
  updateGenericCoeffLinked: vi.fn().mockResolvedValue(undefined),
}))

describe('useEqFilters', () => {
  let mockFilterStore: any
  let mockToastStore: any

  const makeUiFilter = (id: number) => ({
    id,
    icon: 'peaking' as const,
    text: String(id),
    frequency: 1000,
    gain: 0,
    Q: 0.71,
    enabled: true,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockFilterStore = {
      updateFilter: vi.fn().mockResolvedValue(undefined),
      addFilter: vi.fn().mockResolvedValue(undefined),
      removeFilter: vi.fn().mockResolvedValue(undefined),
      clearFiltersFromBank: vi.fn().mockResolvedValue(undefined),
      getBackendCapabilities: vi.fn().mockResolvedValue({
        backendName: 'Test Backend',
        backendDescription: 'desc',
        backendShortDescription: 'short',
        sampleRate: 48000,
        availableFilterBanks: [
          { name: 'left', maxFilters: 16, currentFilterCount: 0, filterBankType: 'speaker-equalizer', bankAddress: 'IIR_L' },
          { name: 'right', maxFilters: 16, currentFilterCount: 1, filterBankType: 'speaker-equalizer', bankAddress: 'IIR_R' },
          { name: 'sub', maxFilters: 8, currentFilterCount: 8, filterBankType: 'speaker-equalizer', bankAddress: 'IIR_S' },
        ],
      }),
      syncFromBackend: vi.fn().mockResolvedValue(undefined),
      initializeBackend: vi.fn().mockResolvedValue(undefined),
      getFilterBanksByType: vi.fn().mockResolvedValue(['left', 'right', 'sub']),
      createMultipleFilterBanks: vi.fn().mockResolvedValue(undefined),
      filterBanks: {
        left: { filters: [{ frequency: 120, gain: -1, q: 0.8, enabled: true }] },
        right: { filters: [{ frequency: 240, gain: 1, q: 1.2, enabled: false }] },
        sub: { filters: [] },
      },
    }

    mockToastStore = {
      showErrorToast: vi.fn(),
    }

    vi.mocked(useFilterStore).mockReturnValue(mockFilterStore)
    vi.mocked(useToastStore).mockReturnValue(mockToastStore)
  })

  it('initializes channels, backend metadata, and filter arrays', async () => {
    const composable = useEqFilters()

    await composable.initialize()

    expect(mockFilterStore.initializeBackend).toHaveBeenCalledTimes(1)
    expect(mockFilterStore.createMultipleFilterBanks).toHaveBeenCalledWith(['left', 'right', 'sub'])

    expect(composable.channelNames.value).toEqual(['left', 'right', 'sub'])
    expect(composable.activeChannel.value).toBe('left')
    expect(composable.backendName.value).toBe('Test Backend')
    expect(composable.bankAddresses.value).toEqual({
      left: 'IIR_L',
      right: 'IIR_R',
      sub: 'IIR_S',
    })
    expect(composable.channelFilters.value.left).toHaveLength(1)
    expect(composable.channelFilters.value.right).toHaveLength(1)
    expect(composable.channelFilters.value.sub).toEqual([])
    expect(composable.filters.value).toEqual(composable.channelFilters.value.left)

    expect(mockFilterStore.syncFromBackend).toHaveBeenCalledTimes(1)
    expect(mockFilterStore.getBackendCapabilities).toHaveBeenCalledTimes(2)
  })

  it('getPairPartner and getPairKey handle valid and invalid channels', () => {
    const composable = useEqFilters()
    composable.channelNames.value = ['left', 'right', 'sub']

    expect(composable.getPairPartner('left')).toBe('right')
    expect(composable.getPairPartner('right')).toBe('left')
    expect(composable.getPairPartner('sub')).toBeNull()
    expect(composable.getPairPartner('missing')).toBeNull()

    expect(composable.getPairKey('left')).toBe('left')
    expect(composable.getPairKey('right')).toBe('left')
    expect(composable.getPairKey('sub')).toBe('sub')
    expect(composable.getPairKey('missing')).toBeNull()
  })

  it('computes add-filter capability and current channel filter info from backend caps', () => {
    const composable = useEqFilters()

    composable.activeChannel.value = 'right'
    composable.backendCapabilities.value = {
      backendName: 'Backend',
      backendDescription: 'desc',
      backendShortDescription: 'short',
      sampleRate: 48000,
      availableFilterBanks: [
        { name: 'right', maxFilters: 2, currentFilterCount: 1, filterBankType: 'speaker-equalizer' },
      ],
    }

    expect(composable.currentChannelFilterInfo.value?.name).toBe('right')
    expect(composable.canAddFilterToCurrentChannel.value).toBe(true)

    composable.backendCapabilities.value.availableFilterBanks[0].currentFilterCount = 2
    expect(composable.canAddFilterToCurrentChannel.value).toBe(false)

    composable.activeChannel.value = 'unknown'
    expect(composable.currentChannelFilterInfo.value).toBeNull()
    expect(composable.canAddFilterToCurrentChannel.value).toBe(false)
  })

  it('setActiveChannel unlinks current pair and updates active filter selection', async () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['left', 'right', 'sub']
    composable.activeChannel.value = 'left'
    composable.channelFilters.value = {
      left: [makeUiFilter(10)],
      right: [makeUiFilter(20)],
      sub: [],
    }

    await composable.toggleChannelMode()
    expect(composable.isCurrentPairLinked.value).toBe(true)

    composable.setActiveChannel('sub')

    expect(composable.isCurrentPairLinked.value).toBe(false)
    expect(composable.activeChannel.value).toBe('sub')
    expect(composable.activeFilterId.value).toBeNull()

    composable.setActiveChannel('right')
    expect(composable.activeFilterId.value).toBe(1)
  })

  it('toggleChannelMode links pair and copies filters to partner, then reloads', async () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['left', 'right']
    composable.activeChannel.value = 'left'
    composable.channelFilters.value = {
      left: [makeUiFilter(1)],
      right: [],
    }

    await composable.toggleChannelMode()

    expect(composable.isCurrentPairLinked.value).toBe(true)
    expect(copyFiltersToChannels).toHaveBeenCalledTimes(1)
    const [configArg, sourceArg, targetArg] = vi.mocked(copyFiltersToChannels).mock.calls[0]
    expect(sourceArg).toBe('left')
    expect(targetArg).toEqual(['right'])
    expect(configArg.channelMode).toBe('both')
    expect(mockFilterStore.syncFromBackend).toHaveBeenCalledTimes(1)
  })

  it('toggleChannelMode does not copy when unlinking and returns when pair key missing', async () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['sub']
    composable.activeChannel.value = 'sub'

    await composable.toggleChannelMode()
    expect(composable.isCurrentPairLinked.value).toBe(true)
    expect(copyFiltersToChannels).not.toHaveBeenCalled()

    await composable.toggleChannelMode()
    expect(composable.isCurrentPairLinked.value).toBe(false)

    composable.channelNames.value = []
    composable.activeChannel.value = ''
    await composable.toggleChannelMode()
    expect(copyFiltersToChannels).not.toHaveBeenCalled()
  })

  it('toggleChannelMode logs copy failures without throwing', async () => {
    const composable = useEqFilters()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(copyFiltersToChannels).mockRejectedValueOnce(new Error('copy failed'))

    composable.channelNames.value = ['left', 'right']
    composable.activeChannel.value = 'left'

    await expect(composable.toggleChannelMode()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(
      'speaker-equalizer: Failed to sync filters to right channel:',
      expect.any(Error),
    )
  })

  it('addFilterOfType creates generic coeffs, sets active id, and refreshes capabilities', async () => {
    const composable = useEqFilters()

    await composable.addFilterOfType('generic_normalized')

    expect(addFilterToLinkedChannels).toHaveBeenCalledTimes(1)
    const [, addedFilter] = vi.mocked(addFilterToLinkedChannels).mock.calls[0]
    expect(addedFilter.genericCoeffs).toEqual({ b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 })
    expect(composable.activeFilterId.value).toBe(addedFilter.id)
    expect(mockFilterStore.getBackendCapabilities).toHaveBeenCalledTimes(1)
  })

  it('addFilterOfType catches failures and shows toast', async () => {
    const composable = useEqFilters()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(addFilterToLinkedChannels).mockRejectedValueOnce(new Error('add failed'))

    await composable.addFilterOfType('peaking')

    expect(errorSpy).toHaveBeenCalledWith('speaker-equalizer: Failed to add filter:', expect.any(Error))
    expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to add filter.')
  })

  it('removeFilter updates active filter when removed item was selected', async () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['left', 'right']
    composable.activeChannel.value = 'left'
    composable.channelFilters.value = {
      left: [makeUiFilter(100), makeUiFilter(101)],
      right: [],
    }
    composable.activeFilterId.value = 100

    await composable.removeFilter(100)

    expect(removeFilterFromLinkedChannels).toHaveBeenCalledTimes(1)
    expect(composable.activeFilterId.value).toBe(100)
    expect(mockFilterStore.getBackendCapabilities).toHaveBeenCalledTimes(1)
  })

  it('toggleFilterEnabled calls linked helper and handles failure with toast', async () => {
    const composable = useEqFilters()
    const filter = makeUiFilter(33)

    await composable.toggleFilterEnabled(filter)
    expect(toggleFilterEnabledLinked).toHaveBeenCalledTimes(1)

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(toggleFilterEnabledLinked).mockRejectedValueOnce(new Error('toggle failed'))
    await composable.toggleFilterEnabled(filter)

    expect(errorSpy).toHaveBeenCalledWith(
      'speaker-equalizer: Failed to toggle filter enabled state:',
      expect.any(Error),
    )
    expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to toggle filter.')
  })

  it('frequency and gain helpers clamp values via update callback', () => {
    const composable = useEqFilters()
    const filter = makeUiFilter(7)

    composable.incrementFilterFrequency(filter)
    let cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const highFreq = { frequency: DEFAULT_FREQ_RANGE.max }
    cb(highFreq)
    expect(highFreq.frequency).toBeLessThanOrEqual(DEFAULT_FREQ_RANGE.max)

    composable.decrementFilterFrequency(filter)
    cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const lowFreq = { frequency: DEFAULT_FREQ_RANGE.min }
    cb(lowFreq)
    expect(lowFreq.frequency).toBeGreaterThanOrEqual(DEFAULT_FREQ_RANGE.min)

    composable.incrementFilterGain(filter)
    cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const gainUp = { gain: DEFAULT_GAIN_RANGE.max }
    cb(gainUp)
    expect(gainUp.gain).toBe(DEFAULT_GAIN_RANGE.max)

    composable.decrementFilterGain(filter)
    cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const gainDown = { gain: DEFAULT_GAIN_RANGE.min }
    cb(gainDown)
    expect(gainDown.gain).toBe(DEFAULT_GAIN_RANGE.min)
  })

  it('band helpers update numeric Q only and enforce bounds', () => {
    const composable = useEqFilters()
    const filter = makeUiFilter(8)

    composable.widenFilterBand(filter)
    let cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const lowQ = { Q: 0.01 }
    cb(lowQ)
    expect(lowQ.Q).toBeGreaterThanOrEqual(0.1)

    const nonNumericQ = { Q: undefined }
    cb(nonNumericQ)
    expect(nonNumericQ.Q).toBeUndefined()

    composable.narrowFilterBand(filter)
    cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const highQ = { Q: 100 }
    cb(highQ)
    expect(highQ.Q).toBeLessThanOrEqual(25)
  })

  it('updateGenericCoeff ignores NaN and forwards parsed values', () => {
    const composable = useEqFilters()
    const filter = makeUiFilter(9)

    composable.updateGenericCoeff(filter, 'b0', { target: { value: 'abc' } } as unknown as Event)
    expect(updateGenericCoeffLinked).not.toHaveBeenCalled()

    composable.updateGenericCoeff(filter, 'b1', { target: { value: '1.25' } } as unknown as Event)
    expect(updateGenericCoeffLinked).toHaveBeenCalledTimes(1)
    const [, idArg, coeffArg, valueArg] = vi.mocked(updateGenericCoeffLinked).mock.calls[0]
    expect(idArg).toBe(9)
    expect(coeffArg).toBe('b1')
    expect(valueArg).toBeCloseTo(1.25, 10)
  })

  it('graph update handlers mutate both channels in linked mode and active channel in individual mode', async () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['left', 'right']
    composable.activeChannel.value = 'left'
    composable.channelFilters.value = {
      left: [{ ...makeUiFilter(10), frequency: 100, gain: 1, Q: 0.9 }],
      right: [{ ...makeUiFilter(10), frequency: 200, gain: 2, Q: 1.1 }],
    }

    // Enter linked mode through the public API.
    await composable.toggleChannelMode()

    composable.onGraphUpdateFreqGain({ id: 1, frequency: 500, gain: -3 })
    composable.onGraphUpdateQ({ id: 1, Q: 2.5 })

    expect(composable.channelFilters.value.left[0].frequency).toBe(500)
    expect(composable.channelFilters.value.right[0].frequency).toBe(500)
    expect(composable.channelFilters.value.left[0].gain).toBe(-3)
    expect(composable.channelFilters.value.right[0].gain).toBe(-3)
    expect(composable.channelFilters.value.left[0].Q).toBe(2.5)
    expect(composable.channelFilters.value.right[0].Q).toBe(2.5)

    await composable.toggleChannelMode()
    composable.channelFilters.value.left[0].Q = undefined as unknown as number
    composable.onGraphUpdateFreqGain({ id: 1, frequency: 350, gain: 4 })
    composable.onGraphUpdateQ({ id: 1, Q: 3.3 })
    composable.onGraphUpdateFreqGain({ id: 999, frequency: 123, gain: 0 })
    composable.onGraphUpdateQ({ id: 999, Q: 1.0 })

    expect(composable.channelFilters.value.left[0].frequency).toBe(350)
    expect(composable.channelFilters.value.left[0].gain).toBe(4)
    expect(composable.channelFilters.value.left[0].Q).toBeUndefined()
    expect(composable.channelFilters.value.right[0].frequency).toBe(500)
  })

  it('covers config callbacks and fallback defaults in createLinkedChannelConfig', async () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['left', 'right']
    composable.activeChannel.value = 'left'
    composable.channelFilters.value = {
      left: [makeUiFilter(1)],
    }
    composable.bankAddresses.value = {}

    const config = composable.createLinkedChannelConfig()
    expect(config.channelMode).toBe('individual')
    expect(config.bankAddresses).toEqual({ left: 'left' })

    const filter = makeUiFilter(77)
    await config.updateStoreCallback('left', 0, filter)
    await config.addStoreCallback('left', 1, filter)
    await config.removeStoreCallback('left', 2)
    await config.clearStoreCallback('left')

    expect(mockFilterStore.updateFilter).toHaveBeenCalledTimes(1)
    expect(mockFilterStore.addFilter).toHaveBeenCalledTimes(1)
    expect(mockFilterStore.removeFilter).toHaveBeenCalledWith('left', 2)
    expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalledWith('left')
  })

  it('computed defaults are safe before backend or channel initialization', () => {
    const composable = useEqFilters()

    expect(composable.filters.value).toEqual([])
    expect(composable.channelMode.value).toBe('individual')
    expect(composable.canAddFilterToCurrentChannel.value).toBe(false)
    expect(composable.currentChannelFilterInfo.value).toBeNull()
  })

  it('initialize handles empty eq bank discovery and missing bank addresses', async () => {
    const composable = useEqFilters()

    mockFilterStore.getBackendCapabilities.mockResolvedValueOnce({
      backendName: 'Test Backend',
      backendDescription: 'desc',
      backendShortDescription: 'short',
      sampleRate: 48000,
      availableFilterBanks: [
        { name: 'left', maxFilters: 16, currentFilterCount: 0, filterBankType: 'speaker-equalizer' },
      ],
    })
    mockFilterStore.getFilterBanksByType.mockResolvedValueOnce([])

    await composable.initialize()

    expect(composable.channelNames.value).toEqual([])
    expect(composable.activeChannel.value).toBe('')
    expect(composable.bankAddresses.value).toEqual({})
    expect(mockFilterStore.createMultipleFilterBanks).toHaveBeenCalledWith([])
  })

  it('drag handlers set dragging flag and persist on drag end', async () => {
    const composable = useEqFilters()

    vi.mocked(updateFilterPropertyLinked).mockImplementationOnce(async (_config, _id, updater) => {
      updater({})
    })

    composable.onGraphDragStart()
    expect(composable.isDragging.value).toBe(true)

    await composable.onGraphDragEnd(42)

    expect(updateFilterPropertyLinked).toHaveBeenCalledTimes(1)
    expect(composable.isDragging.value).toBe(false)
  })

  it('onGraphUpdateQ updates numeric Q in individual mode', () => {
    const composable = useEqFilters()

    composable.channelNames.value = ['left', 'right']
    composable.activeChannel.value = 'left'
    composable.channelFilters.value = {
      left: [{ ...makeUiFilter(91), Q: 0.8 }],
      right: [{ ...makeUiFilter(91), Q: 1.2 }],
    }

    composable.onGraphUpdateQ({ id: 91, Q: 4.2 })

    expect(composable.channelFilters.value.left[0].Q).toBe(4.2)
    expect(composable.channelFilters.value.right[0].Q).toBe(1.2)
  })

  it('loadBackendCapabilities and loadFiltersFromBackend catch backend errors', async () => {
    const composable = useEqFilters()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFilterStore.getBackendCapabilities.mockRejectedValueOnce(new Error('capabilities failed'))
    await expect(composable.loadBackendCapabilities()).resolves.toBeUndefined()

    composable.channelNames.value = ['left']
    mockFilterStore.syncFromBackend.mockRejectedValueOnce(new Error('sync failed'))
    await expect(composable.loadFiltersFromBackend()).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(
      'speaker-equalizer: Failed to load backend capabilities:',
      expect.any(Error),
    )
    expect(errorSpy).toHaveBeenCalledWith(
      'speaker-equalizer: Failed to load filters from backend:',
      expect.any(Error),
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCrossoverFilters } from '@/composables/useCrossoverFilters'
import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph'
import { useFilterStore } from '@/stores/filter-connector'
import { useToastStore } from '@/stores/toast'
import {
  readChannelDelay,
  readChannelLevel,
  readChannelInvert,
  readChannelSelect,
  writeChannelDelay,
  writeChannelLevel,
  writeChannelInvert,
  writeChannelSelect,
} from '@/api/dsptoolkit'
import {
  addFilterToLinkedChannels,
  copyFiltersToChannels,
  removeFilterFromLinkedChannels,
  toggleFilterEnabledLinked,
  updateGenericCoeffLinked,
  updateFilterPropertyLinked,
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
vi.mock('@/api/dsptoolkit', () => ({
  readChannelDelay: vi.fn().mockResolvedValue(0),
  writeChannelDelay: vi.fn().mockResolvedValue(undefined),
  readChannelLevel: vi.fn().mockResolvedValue(1),
  writeChannelLevel: vi.fn().mockResolvedValue(undefined),
  readChannelInvert: vi.fn().mockResolvedValue(false),
  writeChannelInvert: vi.fn().mockResolvedValue(undefined),
  readChannelSelect: vi.fn().mockResolvedValue(0),
  writeChannelSelect: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/utils/linked-channel-operations', () => ({
  addFilterToLinkedChannels: vi.fn().mockResolvedValue(undefined),
  removeFilterFromLinkedChannels: vi.fn().mockResolvedValue(undefined),
  toggleFilterEnabledLinked: vi.fn().mockResolvedValue(undefined),
  copyFiltersToChannels: vi.fn().mockResolvedValue(undefined),
  updateFilterPropertyLinked: vi.fn().mockResolvedValue(undefined),
  updateGenericCoeffLinked: vi.fn().mockResolvedValue(undefined),
}))

describe('useCrossoverFilters', () => {
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
          { name: 'A', maxFilters: 16, currentFilterCount: 0, filterBankType: 'crossover-designer', bankAddress: 'IIR_A' },
          { name: 'B', maxFilters: 16, currentFilterCount: 0, filterBankType: 'crossover-designer', bankAddress: 'IIR_B' },
          { name: 'C', maxFilters: 16, currentFilterCount: 0, filterBankType: 'crossover-designer', bankAddress: 'IIR_C' },
          { name: 'D', maxFilters: 16, currentFilterCount: 0, filterBankType: 'crossover-designer', bankAddress: 'IIR_D' },
        ],
      }),
      syncFromBackend: vi.fn().mockResolvedValue(undefined),
      initializeBackend: vi.fn().mockResolvedValue(undefined),
      getFilterBanksByType: vi.fn().mockResolvedValue(['A', 'B', 'C', 'D']),
      createMultipleFilterBanks: vi.fn().mockResolvedValue(undefined),
      filterBanks: {
        A: { filters: [] },
        B: { filters: [] },
        C: { filters: [] },
        D: { filters: [] },
      },
    }

    mockToastStore = {
      showErrorToast: vi.fn(),
    }

    vi.mocked(useFilterStore).mockReturnValue(mockFilterStore)
    vi.mocked(useToastStore).mockReturnValue(mockToastStore)
  })

  it('copies the selected pair when linking a non-active pair key (regression)', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B', 'C', 'D']
    composable.activeChannel.value = 'A'
    composable.linkedPairs.value = { A: false, C: false }
    composable.channelFilters.value = {
      A: [makeUiFilter(1)],
      B: [],
      C: [makeUiFilter(2)],
      D: [],
    }

    await composable.togglePairLink('C')

    expect(composable.linkedPairs.value.C).toBe(true)
    expect(copyFiltersToChannels).toHaveBeenCalledTimes(1)

    const [configArg, sourceArg, targetArg] = vi.mocked(copyFiltersToChannels).mock.calls[0]
    expect(sourceArg).toBe('C')
    expect(targetArg).toEqual(['D'])
    expect(configArg.activeChannel).toBe('C')
    expect(Object.keys(configArg.channelArrays).sort()).toEqual(['C', 'D'])
  })

  it('normalizes pair input to the pair key before linking (regression)', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B', 'C', 'D']
    composable.activeChannel.value = 'A'
    composable.linkedPairs.value = { A: false, C: false }
    composable.channelFilters.value = {
      A: [makeUiFilter(1)],
      B: [],
      C: [makeUiFilter(2)],
      D: [],
    }

    await composable.togglePairLink('D')

    expect(composable.linkedPairs.value.C).toBe(true)
    const [, sourceArg, targetArg] = vi.mocked(copyFiltersToChannels).mock.calls[0]
    expect(sourceArg).toBe('C')
    expect(targetArg).toEqual(['D'])
  })

  it('applies linked channel level by the provided channel pair, not active channel (regression)', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B', 'C', 'D']
    composable.activeChannel.value = 'A'
    composable.linkedPairs.value = { A: false, C: true }
    composable.channelFeatures.value = {
      C: { hasDelay: false, hasLevel: true, hasInvert: false, hasChannelSelect: false, levelAddress: 100 },
      D: { hasDelay: false, hasLevel: true, hasInvert: false, hasChannelSelect: false, levelAddress: 200 },
    }
    composable.channelSettings.value = {
      C: { delay: 0, level: 1, inverted: false, channelSelect: 0 },
      D: { delay: 0, level: 1, inverted: false, channelSelect: 0 },
    }

    await composable.setChannelLevel('C', -6)

    const linearGain = Math.pow(10, -6 / 20)

    expect(writeChannelLevel).toHaveBeenCalledTimes(2)
    expect(writeChannelLevel).toHaveBeenNthCalledWith(1, 100, linearGain)
    expect(writeChannelLevel).toHaveBeenNthCalledWith(2, 200, linearGain)
    expect(composable.channelSettings.value.C.level).toBeCloseTo(linearGain, 10)
    expect(composable.channelSettings.value.D.level).toBeCloseTo(linearGain, 10)
  })

  it('creates channel settings lazily when applying linked level updates', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['C', 'D']
    composable.linkedPairs.value = { C: true }
    composable.channelFeatures.value = {
      C: { hasDelay: false, hasLevel: true, hasInvert: false, hasChannelSelect: false, levelAddress: 100 },
      D: { hasDelay: false, hasLevel: true, hasInvert: false, hasChannelSelect: false, levelAddress: 200 },
    }
    composable.channelSettings.value = {}

    await composable.setChannelLevel('C', -3)

    const linearGain = Math.pow(10, -3 / 20)
    expect(composable.channelSettings.value.C.level).toBeCloseTo(linearGain, 10)
    expect(composable.channelSettings.value.D.level).toBeCloseTo(linearGain, 10)
    expect(writeChannelLevel).toHaveBeenCalledTimes(2)
  })

  it('resets drag state even when persisting graph changes fails', async () => {
    vi.mocked(updateFilterPropertyLinked).mockRejectedValueOnce(new Error('persist failed'))

    const composable = useCrossoverFilters()
    composable.onGraphDragStart()

    await expect(composable.onGraphDragEnd(42)).rejects.toThrow('persist failed')
    expect(composable.isDragging.value).toBe(false)
  })

  it('shows a toast when removeFilter fails instead of throwing', async () => {
    vi.mocked(removeFilterFromLinkedChannels).mockRejectedValueOnce(new Error('remove failed'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const composable = useCrossoverFilters()
    composable.channelNames.value = ['A', 'B']
    composable.activeChannel.value = 'A'
    composable.channelFilters.value = { A: [makeUiFilter(9)], B: [] }
    composable.activeFilterId.value = 9

    await expect(composable.removeFilter(9)).resolves.toBeUndefined()

    expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to remove filter.')
    expect(consoleErrorSpy).toHaveBeenCalledWith('crossover-design: Failed to remove filter:', expect.any(Error))
    expect(composable.activeFilterId.value).toBe(9)
  })

  it('initializes from backend capabilities and then links a pair with initialized config (integration style)', async () => {
    mockFilterStore.getBackendCapabilities.mockResolvedValue({
      backendName: 'DSP Backend',
      backendDescription: 'Integration test backend',
      backendShortDescription: 'dsp',
      sampleRate: 96000,
      availableFilterBanks: [
        {
          name: 'A',
          maxFilters: 16,
          currentFilterCount: 1,
          filterBankType: 'crossover-designer',
          bankAddress: 'IIR_A',
          levelAddress: 100,
        },
        {
          name: 'B',
          maxFilters: 16,
          currentFilterCount: 0,
          filterBankType: 'crossover-designer',
          bankAddress: 'IIR_B',
          levelAddress: 101,
        },
        {
          name: 'C',
          maxFilters: 16,
          currentFilterCount: 1,
          filterBankType: 'crossover-designer',
          bankAddress: 'IIR_C',
          levelAddress: 102,
        },
        {
          name: 'D',
          maxFilters: 16,
          currentFilterCount: 0,
          filterBankType: 'crossover-designer',
          bankAddress: 'IIR_D',
          levelAddress: 103,
        },
      ],
    })
    mockFilterStore.getFilterBanksByType.mockResolvedValue(['A', 'B', 'C', 'D'])
    mockFilterStore.filterBanks = {
      A: { filters: [{ id: 'a1', type: 'peak', frequency: 120, gain: 0, q: 0.9, enabled: true }] },
      B: { filters: [] },
      C: { filters: [{ id: 'c1', type: 'peak', frequency: 340, gain: 0, q: 1.1, enabled: true }] },
      D: { filters: [] },
    }

    const composable = useCrossoverFilters()

    await composable.initialize()

    expect(mockFilterStore.initializeBackend).toHaveBeenCalledTimes(1)
    expect(mockFilterStore.createMultipleFilterBanks).toHaveBeenCalledWith(['A', 'B', 'C', 'D'])
    expect(composable.channelNames.value).toEqual(['A', 'B', 'C', 'D'])
    expect(composable.activeChannel.value).toBe('A')
    expect(composable.sampleRate.value).toBe(96000)
    expect(composable.channelFeatures.value.C).toMatchObject({
      hasLevel: true,
      levelAddress: 102,
    })
    expect(composable.channelFilters.value.C).toHaveLength(1)
    expect(composable.channelFilters.value.C[0].frequency).toBe(340)

    composable.setActiveChannel('C')
    await composable.togglePairLink()

    expect(composable.linkedPairs.value.C).toBe(true)
    expect(copyFiltersToChannels).toHaveBeenCalledTimes(1)

    const [configArg, sourceArg, targetArg] = vi.mocked(copyFiltersToChannels).mock.calls[0]
    expect(sourceArg).toBe('C')
    expect(targetArg).toEqual(['D'])
    expect(configArg.activeChannel).toBe('C')
    expect(configArg.channelMode).toBe('both')
    expect(configArg.bankAddresses).toEqual({ C: 'IIR_C', D: 'IIR_D' })
    expect(configArg.channelArrays.C[0].frequency).toBe(340)

    // initialize loads once, and toggling link reloads once after copy
    expect(mockFilterStore.syncFromBackend).toHaveBeenCalledTimes(2)
  })

  it('ignores invalid channel when setting active channel (regression)', () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B']
    composable.channelFilters.value = {
      A: [makeUiFilter(1)],
      B: [makeUiFilter(2)],
    }
    composable.activeChannel.value = 'A'
    composable.activeFilterId.value = 1

    composable.setActiveChannel('Z')

    expect(composable.activeChannel.value).toBe('A')
    expect(composable.activeFilterId.value).toBe(1)
  })

  it('ignores invalid pair key when toggling link (regression)', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B', 'C', 'D']
    composable.linkedPairs.value = { A: false, C: false }

    await composable.togglePairLink('Z')

    expect(composable.linkedPairs.value).toEqual({ A: false, C: false })
    expect(copyFiltersToChannels).not.toHaveBeenCalled()
  })

  it('converts delay milliseconds to samples and writes channel delay when supported', async () => {
    const composable = useCrossoverFilters()

    composable.sampleRate.value = 48000
    composable.channelFeatures.value = {
      A: {
        hasDelay: true,
        hasLevel: false,
        hasInvert: false,
        hasChannelSelect: false,
        delayAddress: 123,
      },
    }

    await composable.setChannelDelay('A', 10)

    expect(writeChannelDelay).toHaveBeenCalledWith(123, 480)
    expect(composable.channelSettings.value.A.delay).toBe(480)
    expect(composable.getChannelDelayMs('A')).toBe(10)
  })

  it('skips delay write when channel has no delay capability', async () => {
    const composable = useCrossoverFilters()

    composable.channelFeatures.value = {
      A: {
        hasDelay: false,
        hasLevel: false,
        hasInvert: false,
        hasChannelSelect: false,
      },
    }

    await composable.setChannelDelay('A', 5)

    expect(writeChannelDelay).not.toHaveBeenCalled()
    expect(composable.channelSettings.value.A).toBeUndefined()
  })

  it('writes invert/select settings only when corresponding channel features are available', async () => {
    const composable = useCrossoverFilters()

    composable.channelFeatures.value = {
      A: {
        hasDelay: false,
        hasLevel: false,
        hasInvert: true,
        hasChannelSelect: true,
        invertAddress: 201,
        channelSelectAddress: 202,
      },
      B: {
        hasDelay: false,
        hasLevel: false,
        hasInvert: false,
        hasChannelSelect: false,
      },
    }

    await composable.setChannelInvert('A', true)
    await composable.setChannelSelectMode('A', 2)
    await composable.setChannelInvert('B', true)
    await composable.setChannelSelectMode('B', 2)

    expect(writeChannelInvert).toHaveBeenCalledWith(201, true)
    expect(writeChannelSelect).toHaveBeenCalledWith(202, 2)
    expect(writeChannelInvert).toHaveBeenCalledTimes(1)
    expect(writeChannelSelect).toHaveBeenCalledTimes(1)
    expect(composable.channelSettings.value.A.inverted).toBe(true)
    expect(composable.channelSettings.value.A.channelSelect).toBe(2)
    expect(composable.channelSettings.value.B).toBeUndefined()
  })

  it('returns safe defaults for delay and level helper getters', () => {
    const composable = useCrossoverFilters()

    composable.channelSettings.value = {
      A: { delay: 960, level: 0, inverted: false, channelSelect: 0 },
    }
    composable.sampleRate.value = 48000

    expect(composable.getChannelDelayMs('A')).toBe(20)
    expect(composable.getChannelDelayMs('missing')).toBe(0)
    expect(composable.getChannelLevelDb('A')).toBe(-60)
    expect(composable.getChannelLevelDb('missing')).toBe(-60)
  })

  it('returns positive dB when channel level is above zero', () => {
    const composable = useCrossoverFilters()

    composable.channelSettings.value = {
      A: { delay: 0, level: 2, inverted: false, channelSelect: 0 },
    }

    expect(composable.getChannelLevelDb('A')).toBeCloseTo(20 * Math.log10(2), 10)
  })

  it('handles pair helpers for invalid and odd pairing inputs', () => {
    const composable = useCrossoverFilters()
    composable.channelNames.value = ['A', 'B', 'C']

    expect(composable.getPairPartner('Z')).toBeNull()
    expect(composable.getPairKey('Z')).toBeNull()
    expect(composable.getPairPartner('A')).toBe('B')
    expect(composable.getPairPartner('B')).toBe('A')
    expect(composable.getPairPartner('C')).toBeNull()
    expect(composable.getPairKey('B')).toBe('A')
  })

  it('computes current channel filter info and add-filter capability from backend state', () => {
    const composable = useCrossoverFilters()

    composable.activeChannel.value = 'A'
    composable.backendCapabilities.value = {
      backendName: 'Backend',
      backendDescription: 'desc',
      backendShortDescription: 'short',
      sampleRate: 48000,
      availableFilterBanks: [
        { name: 'A', maxFilters: 2, currentFilterCount: 1, filterBankType: 'crossover-designer' },
      ],
    }

    expect(composable.currentChannelFilterInfo.value?.name).toBe('A')
    expect(composable.canAddFilterToCurrentChannel.value).toBe(true)

    composable.backendCapabilities.value.availableFilterBanks[0].currentFilterCount = 2
    expect(composable.canAddFilterToCurrentChannel.value).toBe(false)
  })

  it('loadBackendCapabilities catches backend failures without throwing', async () => {
    const composable = useCrossoverFilters()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFilterStore.getBackendCapabilities.mockRejectedValueOnce(new Error('capabilities failed'))

    await expect(composable.loadBackendCapabilities()).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'crossover-design: Failed to load backend capabilities:',
      expect.any(Error),
    )
  })

  it('loadFiltersFromBackend catches sync failures without throwing', async () => {
    const composable = useCrossoverFilters()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    composable.channelNames.value = ['A']
    mockFilterStore.syncFromBackend.mockRejectedValueOnce(new Error('sync failed'))

    await expect(composable.loadFiltersFromBackend()).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'crossover-design: Failed to load filters from backend:',
      expect.any(Error),
    )
  })

  it('setActiveChannel picks first filter id or null when channel is empty', () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B']
    composable.channelFilters.value = {
      A: [makeUiFilter(10)],
      B: [],
    }

    composable.setActiveChannel('A')
    expect(composable.activeFilterId.value).toBe(10)

    composable.setActiveChannel('B')
    expect(composable.activeFilterId.value).toBeNull()
  })

  it('togglePairLink does not copy filters when unlinking an already linked pair', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B']
    composable.linkedPairs.value = { A: true }

    await composable.togglePairLink('A')

    expect(composable.linkedPairs.value.A).toBe(false)
    expect(copyFiltersToChannels).not.toHaveBeenCalled()
  })

  it('togglePairLink safely handles unpaired channel without copy', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B', 'C']
    composable.linkedPairs.value = { C: false }

    await composable.togglePairLink('C')

    expect(composable.linkedPairs.value.C).toBe(true)
    expect(copyFiltersToChannels).not.toHaveBeenCalled()
  })

  it('togglePairLink logs copy errors for partner sync failure', async () => {
    const composable = useCrossoverFilters()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(copyFiltersToChannels).mockRejectedValueOnce(new Error('copy failed'))

    composable.channelNames.value = ['A', 'B']
    composable.linkedPairs.value = { A: false }

    await composable.togglePairLink('A')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'crossover-design: Failed to sync filters to B:',
      expect.any(Error),
    )
  })

  it('addFilterOfType creates generic normalized coeffs and sets active filter id', async () => {
    const composable = useCrossoverFilters()

    await composable.addFilterOfType('generic_normalized')

    expect(addFilterToLinkedChannels).toHaveBeenCalledTimes(1)
    const [, addedFilter] = vi.mocked(addFilterToLinkedChannels).mock.calls[0]
    expect(addedFilter.icon).toBe('generic_normalized')
    expect(addedFilter.genericCoeffs).toEqual({ b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 })
    expect(composable.activeFilterId.value).toBe(addedFilter.id)
  })

  it('addFilterOfType surfaces toast error when add fails', async () => {
    const composable = useCrossoverFilters()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(addFilterToLinkedChannels).mockRejectedValueOnce(new Error('add failed'))

    await composable.addFilterOfType('peaking')

    expect(consoleErrorSpy).toHaveBeenCalledWith('crossover-design: Failed to add filter:', expect.any(Error))
    expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to add filter.')
  })

  it('toggleFilterEnabled invokes linked helper and shows toast on failure', async () => {
    const composable = useCrossoverFilters()
    const filter = makeUiFilter(33)

    await composable.toggleFilterEnabled(filter)
    expect(toggleFilterEnabledLinked).toHaveBeenCalledTimes(1)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(toggleFilterEnabledLinked).mockRejectedValueOnce(new Error('toggle failed'))
    await composable.toggleFilterEnabled(filter)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'crossover-design: Failed to toggle filter enabled state:',
      expect.any(Error),
    )
    expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to toggle filter.')
  })

  it('parameter increment/decrement helpers apply clamped values via callback', () => {
    const composable = useCrossoverFilters()
    const filter = makeUiFilter(7)

    composable.incrementFilterFrequency(filter)
    let cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const highFreq = { frequency: 20000 }
    cb(highFreq)
    expect(highFreq.frequency).toBeLessThanOrEqual(DEFAULT_FREQ_RANGE.max)

    composable.decrementFilterFrequency(filter)
    cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const lowFreq = { frequency: 20 }
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

  it('bandwidth helpers update numeric Q and ignore non-numeric Q', () => {
    const composable = useCrossoverFilters()
    const filter = makeUiFilter(8)

    composable.widenFilterBand(filter)
    let cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const numericQ = { Q: 0.01 }
    cb(numericQ)
    expect(numericQ.Q).toBeGreaterThanOrEqual(0.1)

    const nonNumericQ = { Q: undefined }
    cb(nonNumericQ)
    expect(nonNumericQ.Q).toBeUndefined()

    composable.narrowFilterBand(filter)
    cb = vi.mocked(updateFilterPropertyLinked).mock.calls.at(-1)?.[2] as (f: any) => void
    const highQ = { Q: 100 }
    cb(highQ)
    expect(highQ.Q).toBeLessThanOrEqual(25)
  })

  it('updateGenericCoeff ignores NaN and forwards valid parsed values', () => {
    const composable = useCrossoverFilters()
    const filter = makeUiFilter(9)

    const badEvent = { target: { value: 'abc' } } as unknown as Event
    composable.updateGenericCoeff(filter, 'b0', badEvent)
    expect(updateGenericCoeffLinked).not.toHaveBeenCalled()

    const goodEvent = { target: { value: '1.234' } } as unknown as Event
    composable.updateGenericCoeff(filter, 'b1', goodEvent)
    expect(updateGenericCoeffLinked).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateGenericCoeffLinked).mock.calls[0][2]).toBe('b1')
    expect(vi.mocked(updateGenericCoeffLinked).mock.calls[0][3]).toBeCloseTo(1.234, 10)
  })

  it('graph update handlers mutate active and partner filters for linked pairs', () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B']
    composable.activeChannel.value = 'A'
    composable.linkedPairs.value = { A: true }
    composable.channelFilters.value = {
      A: [{ ...makeUiFilter(10), frequency: 100, gain: 1, Q: 0.9 }],
      B: [{ ...makeUiFilter(10), frequency: 200, gain: 2, Q: 1.1 }],
    }

    composable.onGraphUpdateFreqGain({ id: 10, frequency: 500, gain: -3 })
    composable.onGraphUpdateQ({ id: 10, Q: 2.5 })

    expect(composable.channelFilters.value.A[0].frequency).toBe(500)
    expect(composable.channelFilters.value.B[0].frequency).toBe(500)
    expect(composable.channelFilters.value.A[0].gain).toBe(-3)
    expect(composable.channelFilters.value.B[0].gain).toBe(-3)
    expect(composable.channelFilters.value.A[0].Q).toBe(2.5)
    expect(composable.channelFilters.value.B[0].Q).toBe(2.5)
  })

  it('graph update handlers skip missing/non-numeric targets and unlinked mode updates active only', () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B']
    composable.activeChannel.value = 'A'
    composable.linkedPairs.value = { A: false }
    composable.channelFilters.value = {
      A: [{ ...makeUiFilter(11), frequency: 100, gain: 1, Q: undefined as unknown as number }],
      B: [{ ...makeUiFilter(11), frequency: 200, gain: 2, Q: 1.2 }],
    }

    composable.onGraphUpdateFreqGain({ id: 11, frequency: 350, gain: 4 })
    composable.onGraphUpdateQ({ id: 11, Q: 3.3 })
    composable.onGraphUpdateFreqGain({ id: 999, frequency: 123, gain: 0 })
    composable.onGraphUpdateQ({ id: 999, Q: 1.0 })

    expect(composable.channelFilters.value.A[0].frequency).toBe(350)
    expect(composable.channelFilters.value.A[0].gain).toBe(4)
    expect(composable.channelFilters.value.A[0].Q).toBeUndefined()
    expect(composable.channelFilters.value.B[0].frequency).toBe(200)
  })

  it('setChannelLevel returns early when no level capability is present', async () => {
    const composable = useCrossoverFilters()
    composable.channelFeatures.value = {
      A: { hasDelay: false, hasLevel: false, hasInvert: false, hasChannelSelect: false },
    }

    await composable.setChannelLevel('A', -3)

    expect(writeChannelLevel).not.toHaveBeenCalled()
    expect(composable.channelSettings.value.A).toBeUndefined()
  })

  it('createLinkedChannelConfig proxies store callbacks and conversion for linked channel mode', async () => {
    const composable = useCrossoverFilters()

    composable.channelNames.value = ['A', 'B']
    composable.activeChannel.value = 'A'
    composable.linkedPairs.value = { A: true }
    composable.channelFilters.value = {
      A: [makeUiFilter(1)],
      B: [makeUiFilter(2)],
    }
    composable.createLinkedChannelConfig('A')

    const config = composable.createLinkedChannelConfig('A')
    expect(config.channelMode).toBe('both')
    expect(config.activeChannel).toBe('A')
    expect(config.bankAddresses).toEqual({ A: 'A', B: 'B' })

    const filter = makeUiFilter(99)
    await config.updateStoreCallback('A', 0, filter)
    await config.addStoreCallback('B', 1, filter)
    await config.removeStoreCallback('A', 2)
    await config.clearStoreCallback('B')

    expect(mockFilterStore.updateFilter).toHaveBeenCalledWith(
      'A',
      0,
      expect.objectContaining({
        type: 'peaking',
        frequency: filter.frequency,
        gain: filter.gain,
        q: filter.Q,
        enabled: filter.enabled,
      }),
    )
    expect(mockFilterStore.addFilter).toHaveBeenCalledWith(
      'B',
      1,
      expect.objectContaining({
        type: 'peaking',
      }),
    )
    expect(mockFilterStore.removeFilter).toHaveBeenCalledWith('A', 2)
    expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalledWith('B')
  })

  it('initialize reads all available per-channel settings when feature addresses exist', async () => {
    const composable = useCrossoverFilters()

    mockFilterStore.getBackendCapabilities.mockResolvedValue({
      backendName: 'DSP Backend',
      backendDescription: 'desc',
      backendShortDescription: 'short',
      sampleRate: 48000,
      availableFilterBanks: [
        {
          name: 'A',
          maxFilters: 16,
          currentFilterCount: 0,
          filterBankType: 'crossover-designer',
          delayAddress: 10,
          levelAddress: 11,
          invertAddress: 12,
          channelSelectAddress: 13,
        },
        {
          name: 'B',
          maxFilters: 16,
          currentFilterCount: 0,
          filterBankType: 'crossover-designer',
        },
      ],
    })
    mockFilterStore.getFilterBanksByType.mockResolvedValue(['A', 'B'])

    vi.mocked(readChannelDelay).mockResolvedValueOnce(96)
    vi.mocked(readChannelLevel).mockResolvedValueOnce(0.5)
    vi.mocked(readChannelInvert).mockResolvedValueOnce(true)
    vi.mocked(readChannelSelect).mockResolvedValueOnce(2)

    await composable.initialize()

    expect(readChannelDelay).toHaveBeenCalledWith(10)
    expect(readChannelLevel).toHaveBeenCalledWith(11)
    expect(readChannelInvert).toHaveBeenCalledWith(12)
    expect(readChannelSelect).toHaveBeenCalledWith(13)

    expect(composable.channelSettings.value.A).toEqual({
      delay: 96,
      level: 0.5,
      inverted: true,
      channelSelect: 2,
    })
    expect(composable.channelSettings.value.B).toEqual({
      delay: 0,
      level: 1,
      inverted: false,
      channelSelect: 0,
    })
  })

  it('initialize keeps defaults and logs warning when a channel settings read fails', async () => {
    const composable = useCrossoverFilters()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockFilterStore.getBackendCapabilities.mockResolvedValue({
      backendName: 'DSP Backend',
      backendDescription: 'desc',
      backendShortDescription: 'short',
      sampleRate: 48000,
      availableFilterBanks: [
        {
          name: 'A',
          maxFilters: 16,
          currentFilterCount: 0,
          filterBankType: 'crossover-designer',
          delayAddress: 10,
          levelAddress: 11,
          invertAddress: 12,
          channelSelectAddress: 13,
        },
      ],
    })
    mockFilterStore.getFilterBanksByType.mockResolvedValue(['A'])
    vi.mocked(readChannelDelay).mockRejectedValueOnce(new Error('delay read failed'))

    await composable.initialize()

    expect(warnSpy).toHaveBeenCalledWith(
      'crossover-design: Failed to read settings for channel A:',
      expect.any(Error),
    )
    expect(composable.channelSettings.value.A).toEqual({
      delay: 0,
      level: 1,
      inverted: false,
      channelSelect: 0,
    })
  })

  it('onGraphDragEnd executes persistence callback and always resets drag state', async () => {
    const composable = useCrossoverFilters()
    composable.onGraphDragStart()

    vi.mocked(updateFilterPropertyLinked).mockImplementationOnce(async (_config, _id, cb) => {
      cb(makeUiFilter(42))
    })

    await composable.onGraphDragEnd(42)

    expect(updateFilterPropertyLinked).toHaveBeenCalledTimes(1)
    expect(composable.isDragging.value).toBe(false)
  })
})

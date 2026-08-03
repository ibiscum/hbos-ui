import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCrossoverFilters } from '@/composables/useCrossoverFilters'
import { useFilterStore } from '@/stores/filter-connector'
import { useToastStore } from '@/stores/toast'
import { writeChannelLevel } from '@/api/dsptoolkit'
import {
  copyFiltersToChannels,
  removeFilterFromLinkedChannels,
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
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Filter, FilterBanks } from '@/stores/filter-backend-interface'

const {
  mockGetMetadata,
  mockGetCacheStatus,
  mockSetBiquadFilter,
  mockGetStoredFilters,
  mockStoreFilters,
  mockGetDSPProgramChecksum,
  mockCanUseDSP,
  dspState,
} = vi.hoisted(() => {
  const state = { status: 'yes' as 'yes' | 'no' | 'backend_error' }
  return {
    mockGetMetadata: vi.fn(),
    mockGetCacheStatus: vi.fn(),
    mockSetBiquadFilter: vi.fn(),
    mockGetStoredFilters: vi.fn(),
    mockStoreFilters: vi.fn(),
    mockGetDSPProgramChecksum: vi.fn(),
    mockCanUseDSP: vi.fn(),
    dspState: state,
  }
})

vi.mock('@/api/dsptoolkit', () => ({
  getMetadata: mockGetMetadata,
  getCacheStatus: mockGetCacheStatus,
  setBiquadFilter: mockSetBiquadFilter,
  getStoredFilters: mockGetStoredFilters,
  storeFilters: mockStoreFilters,
  getDSPProgramChecksum: mockGetDSPProgramChecksum,
}))

vi.mock('@/stores/dsp-toolkit', () => ({
  useDSPToolkitStore: () => ({
    get status() {
      return dspState.status
    },
    canUseDSP: mockCanUseDSP,
  }),
}))

import { DSPToolkitFilterBackend } from '@/stores/dsp-toolkit-filter-backend'

const filter = (overrides: Partial<Omit<Filter, 'id'>> = {}): Omit<Filter, 'id'> => ({
  type: 'highpass' as const,
  frequency: 80,
  q: 0.7,
  enabled: true,
  ...overrides,
})

describe('dsp toolkit filter backend - unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    dspState.status = 'yes'
    mockCanUseDSP.mockResolvedValue(true)

    mockGetMetadata.mockResolvedValue({
      _system: { sampleRate: 48000 },
      customFilterRegisterBankLeft: '100/20',
      customFilterRegisterBankRight: '200/20',
      IIR_B: '400/10',
      IIR_A: '300/15',
      delayARegister: '800',
      levelsARegister: '801',
      invertARegister: '802',
      channelSelectARegister: '803',
    })
    mockGetCacheStatus.mockResolvedValue({
      profile: { name: 'test profile' },
    })
    mockGetStoredFilters.mockResolvedValue({
      checksum: 'chk',
      filters: {},
    })
    mockSetBiquadFilter.mockResolvedValue(undefined)
    mockStoreFilters.mockResolvedValue(undefined)
    mockGetDSPProgramChecksum.mockResolvedValue({ checksum: 'chk' })
  })

  it('builds capabilities from metadata and sorts banks left/right before IIR banks', async () => {
    const backend = new DSPToolkitFilterBackend()

    const capabilities = await backend.getBackendCapabilities()
    const names = capabilities.availableFilterBanks.map((bank) => bank.name)

    expect(names).toEqual(['left', 'right', 'iir_a', 'iir_b'])
    expect(capabilities.sampleRate).toBe(48000)

    const iirA = capabilities.availableFilterBanks.find((bank) => bank.name === 'iir_a')
    expect(iirA).toMatchObject({
      maxFilters: 3,
      bankAddress: 'IIR_A',
      delayAddress: 800,
      levelAddress: 801,
      invertAddress: 802,
      channelSelectAddress: 803,
      filterBankType: 'crossover-designer',
    })
  })

  it('uses metadata.sampleRate fallback when _system sample rate is missing', async () => {
    const backend = new DSPToolkitFilterBackend()
    mockGetMetadata.mockResolvedValueOnce({
      sampleRate: '96000',
      customFilterRegisterBankLeft: '100/10',
      customFilterRegisterBankRight: '200/10',
    })

    const capabilities = await backend.getBackendCapabilities()

    expect(capabilities.sampleRate).toBe(96000)
  })

  it('fails initialization with a clear message when DSP is unavailable', async () => {
    const backend = new DSPToolkitFilterBackend()
    dspState.status = 'no'
    mockCanUseDSP.mockResolvedValueOnce(false)

    await expect(backend.getBackendCapabilities()).rejects.toThrow('No DSP hardware detected')
  })

  it('addFilter clamps insertion position and enforces max capacity', async () => {
    const backend = new DSPToolkitFilterBackend()

    await backend.addFilter('left', 99, filter({ frequency: 100 }))
    await backend.addFilter('left', -5, filter({ frequency: 200 }))

    let config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(2)
    expect(config.left.filters[0].frequency).toBe(200)
    expect(config.left.filters[1].frequency).toBe(100)

    await backend.addFilter('left', 2, filter({ frequency: 300 }))
    await backend.addFilter('left', 3, filter({ frequency: 400 }))

    await expect(backend.addFilter('left', 4, filter({ frequency: 500 }))).rejects.toThrow(
      'Cannot add filter: left bank is at maximum capacity (4)',
    )

    config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(4)
  })

  it('updateFilter merges fields but preserves original id', async () => {
    const backend = new DSPToolkitFilterBackend()
    const id = await backend.addFilter('left', 0, filter({ frequency: 120 }))

    const updatesWithId = {
      id: 'attempted-overwrite',
      frequency: 640,
      gain: 4,
    } as unknown as Partial<Omit<Filter, 'id'>>

    const updated = await backend.updateFilter('left', 0, updatesWithId)

    expect(updated).toBe(true)
    const config = await backend.getCurrentConfig()
    expect(config.left.filters[0].id).toBe(id)
    expect(config.left.filters[0].frequency).toBe(640)
    expect(config.left.filters[0].gain).toBe(4)
  })

  it('removeFilter returns false for out-of-range positions and true for valid positions', async () => {
    const backend = new DSPToolkitFilterBackend()
    await backend.addFilter('left', 0, filter())

    await expect(backend.removeFilter('left', -1)).resolves.toBe(false)
    await expect(backend.removeFilter('left', 3)).resolves.toBe(false)
    await expect(backend.removeFilter('left', 0)).resolves.toBe(true)

    const config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(0)
  })

  it('loads stored filters by offset order and skips direct coefficient entries', async () => {
    const backend = new DSPToolkitFilterBackend()
    mockGetStoredFilters.mockResolvedValueOnce({
      checksum: 'chk',
      filters: {
        b: {
          address: 'customFilterRegisterBankLeft',
          offset: 2,
          filter: { type: 'HighPass', f: 200, db: 0, q: 0.7 },
          timestamp: 2,
        },
        a: {
          address: 'customFilterRegisterBankLeft',
          offset: 0,
          filter: { type: 'PeakingEq', f: 100, db: 3, q: 1.1 },
          timestamp: 1,
        },
        coeff: {
          address: 'customFilterRegisterBankLeft',
          offset: 1,
          filter: { a0: 1, a1: 0, a2: 0, b0: 1, b1: 0, b2: 0 },
          timestamp: 3,
        },
      },
    })

    const config = await backend.getCurrentConfig()

    expect(config.left.filters.map((f) => f.id)).toEqual(['a', 'b'])
    expect(config.left.filters.map((f) => f.type)).toEqual(['peak', 'highpass'])
  })

  it('converts unsupported filter types to transparent volume filters for DSP writes', async () => {
    const backend = new DSPToolkitFilterBackend()
    await backend.addFilter('left', 0, filter({ type: 'bandpass' }))

    const writtenBandpass = mockSetBiquadFilter.mock.calls
      .map((call) => call[0])
      .find((request) => request.address === 'customFilterRegisterBankLeft' && request.offset === 0)

    expect(writtenBandpass?.filter).toMatchObject({ type: 'Volume', db: 0 })
  })

  it('clears omitted existing banks on import instead of leaving stale filters', async () => {
    const backend = new DSPToolkitFilterBackend()

    const initialConfig: FilterBanks = {
      left: { name: 'left', filters: [{ id: 'l1', ...filter({ frequency: 100 }) }] },
      right: { name: 'right', filters: [{ id: 'r1', ...filter({ frequency: 200 }) }] },
    }

    await backend.importFilterConfig(initialConfig)

    let config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(1)
    expect(config.right.filters).toHaveLength(1)

    await backend.importFilterConfig({
      left: { name: 'left', filters: [{ id: 'l2', ...filter({ frequency: 300 }) }] },
    })

    config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(1)
    expect(config.left.filters[0].frequency).toBe(300)
    expect(config.right.filters).toHaveLength(0)
  })
})

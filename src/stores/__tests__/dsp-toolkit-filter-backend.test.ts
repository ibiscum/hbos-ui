import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { DSPToolkitFilterBackend } from '@/stores/dsp_toolkit_filter_backend'

const filter = (id: string) => ({
  id,
  type: 'highpass' as const,
  frequency: 80,
  q: 0.7,
  enabled: true,
})

describe('dsp toolkit filter backend - regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    dspState.status = 'yes'
    mockCanUseDSP.mockResolvedValue(true)

    mockGetMetadata.mockResolvedValue({
      _system: { sampleRate: 48000 },
      customFilterRegisterBankLeft: '100/10',
      customFilterRegisterBankRight: '200/10',
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

  it('clears omitted existing banks on import instead of leaving stale filters', async () => {
    const backend = new DSPToolkitFilterBackend()

    await backend.importFilterConfig({
      left: { name: 'left', filters: [filter('l1')] },
      right: { name: 'right', filters: [filter('r1')] },
    })

    let config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(1)
    expect(config.right.filters).toHaveLength(1)

    await backend.importFilterConfig({
      left: { name: 'left', filters: [filter('l2')] },
    })

    config = await backend.getCurrentConfig()
    expect(config.left.filters).toHaveLength(1)
    expect(config.right.filters).toHaveLength(0)
  })
})

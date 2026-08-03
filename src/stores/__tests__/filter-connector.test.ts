import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { NewFilter } from '@/stores/filter-backend-interface'

const { mockGetConfigValue, mockSetConfigValue, mockCanUseDSP, dspState } = vi.hoisted(() => {
  const state = { status: 'no' as 'no' | 'backend_error' | 'unknown' }
  return {
    mockGetConfigValue: vi.fn(),
    mockSetConfigValue: vi.fn(),
    mockCanUseDSP: vi.fn(),
    dspState: state,
  }
})

vi.mock('@/api/config', () => ({
  getConfigValue: mockGetConfigValue,
  setConfigValue: mockSetConfigValue,
}))

vi.mock('@/stores/dsp-toolkit', () => ({
  useDSPToolkitStore: () => ({
    get status() {
      return dspState.status
    },
    canUseDSP: mockCanUseDSP,
  }),
}))

import { useFilterStore } from '@/stores/filter-connector'

const makeFilter = (overrides: Partial<NewFilter> = {}): NewFilter => ({
  type: 'highpass',
  frequency: 80,
  q: 0.7,
  enabled: true,
  ...overrides,
})

describe('filter connector store - unit and regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    dspState.status = 'no'
    mockCanUseDSP.mockResolvedValue(false)
    mockGetConfigValue.mockResolvedValue({ data: { value: null } })
    mockSetConfigValue.mockResolvedValue(undefined)
  })

  it('initializes to stored backend preference when available', async () => {
    const store = useFilterStore()
    mockGetConfigValue.mockResolvedValueOnce({ data: { value: 'dspToolkit' } })

    await store.initializeBackend()

    expect(store.currentBackendType).toBe('dspToolkit')
    expect(mockCanUseDSP).not.toHaveBeenCalled()
  })

  it('auto-selects and persists dspToolkit when no preference exists and DSP is available', async () => {
    const store = useFilterStore()
    mockGetConfigValue.mockResolvedValueOnce({ data: { value: null } })
    mockCanUseDSP.mockResolvedValueOnce(true)

    await store.initializeBackend()

    expect(store.currentBackendType).toBe('dspToolkit')
    expect(mockSetConfigValue).toHaveBeenCalledWith('dsp.filter.backend', 'dspToolkit')
  })

  it('keeps previous backend when switching to unavailable DSP backend fails', async () => {
    const store = useFilterStore()

    expect(store.currentBackendType).toBe('console')

    await expect(store.switchBackend('dspToolkit')).rejects.toThrow('DSP initialization failed')

    expect(store.currentBackendType).toBe('console')
  })

  it('does not persist backend selection when backend switch sync fails', async () => {
    const store = useFilterStore()

    await expect(store.switchBackend('dspToolkit')).rejects.toThrow('DSP initialization failed')

    expect(mockSetConfigValue).not.toHaveBeenCalled()
  })

  it('canAddFilterToBank allows backend-defined dynamic bank creation', async () => {
    const store = useFilterStore()

    await expect(store.canAddFilterToBank('C1')).resolves.toBe(true)
  })

  it('addFilter allows creating dynamic custom banks without pre-creation', async () => {
    const store = useFilterStore()

    const id = await store.addFilter('C1', 0, makeFilter({ frequency: 120 }))

    expect(id).toMatch(/^filter_/)
    expect(store.bankExists('C1')).toBe(true)
    expect(store.getFilterCount('C1')).toBe(1)

    const capabilities = await store.getBackendCapabilities()
    const c1 = capabilities.availableFilterBanks.find((bank) => bank.name === 'C1')
    expect(c1).toBeDefined()
  })

  it('enforces max capacity for known banks before delegating to backend', async () => {
    const store = useFilterStore()

    for (let i = 0; i < 16; i += 1) {
      await store.addFilter('left', i, makeFilter({ frequency: 100 + i }))
    }

    await expect(store.addFilter('left', 16, makeFilter())).rejects.toThrow(
      'Cannot add filter: Bank "left" has reached its maximum capacity of 16 filters (currently has 16)',
    )
  })

  it('copyFilter creates a new id and moveFilter reorders within the same bank', async () => {
    const store = useFilterStore()

    const idA = await store.addFilter('left', 0, makeFilter({ frequency: 100 }))
    const idB = await store.addFilter('left', 1, makeFilter({ frequency: 200 }))
    const copiedId = await store.copyFilter('left', 0, 'left', 2)

    expect(copiedId).not.toBeNull()
    expect(copiedId).not.toBe(idA)
    expect(copiedId).not.toBe(idB)
    expect(store.getFilterCount('left')).toBe(3)

    const moved = await store.moveFilter('left', 0, 2)
    expect(moved).toBe(true)
    expect(store.getFilterCount('left')).toBe(3)
  })
})

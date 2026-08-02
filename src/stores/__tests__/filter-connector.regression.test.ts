import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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

import { useFilterStore } from '@/stores/filter_connector'

describe('filter_connector store - regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    dspState.status = 'no'
    mockCanUseDSP.mockResolvedValue(false)
    mockGetConfigValue.mockResolvedValue({ data: { value: null } })
    mockSetConfigValue.mockResolvedValue(undefined)
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
})

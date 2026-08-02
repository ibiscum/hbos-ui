import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ============================================================================
// MOCK SETUP
// ============================================================================

vi.mock('@/api/http')
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getConfigApiBaseUrl: () => 'http://api.test',
  }),
}))
vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: vi.fn(),
  }),
}))
vi.mock('@/components/BluetoothSettings/BluetoothSettingsModal.vue', () => ({
  default: { template: '<div/>' },
}))
vi.mock('@/components/Icon.vue', () => ({ default: { template: '<i/>' } }))
vi.mock('@/components/ToggleSwitch.vue', () => ({
  default: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}))

import { apiFetch } from '@/api/http'
import BluetoothSettings from '@/components/BluetoothSettings.vue'

const mockFetch = vi.mocked(apiFetch)

// ============================================================================
// TEST SUITE - FOCUSED ON REAL BEHAVIOR
// ============================================================================

describe('BluetoothSettings - Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should mount and fetch initial settings', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: { capability: 'KeyboardOnly', discoverable: false },
      }),
    } as Response)

    mount(BluetoothSettings)
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledWith('http://api.test/bluetooth/settings')
  })

  it('should handle HTTP errors gracefully on mount', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response)

    const wrapper = mount(BluetoothSettings)
    await flushPromises()

    // Should not throw - error is handled
    expect(wrapper.exists()).toBe(true)
  })

  it('should render toggle switches', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: { capability: 'KeyboardOnly', discoverable: false },
      }),
    } as Response)

    const wrapper = mount(BluetoothSettings)
    await flushPromises()

    const toggles = wrapper.findAll('input[type="checkbox"]')
    expect(toggles.length).toBeGreaterThan(0)
  })

  it('should call API when toggles are clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: { capability: 'KeyboardOnly', discoverable: false },
      }),
    } as Response)

    const wrapper = mount(BluetoothSettings)
    await flushPromises()

    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)

    const toggles = wrapper.findAll('input[type="checkbox"]')
    if (toggles.length > 0) {
      await toggles[0].trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://api.test/bluetooth/settings'),
        expect.any(Object)
      )
    }
  })
})

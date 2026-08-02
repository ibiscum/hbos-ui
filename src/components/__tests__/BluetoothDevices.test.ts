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
vi.mock('@/components/BluetoothDeviceEntry.vue', () => ({
  default: {
    template: '<div data-test="device">{{ name }}</div>',
    props: ['name', 'address', 'connected', 'trusted', 'onUpdate'],
  },
}))
vi.mock('@/components/ContentBox.vue', () => ({
  default: { template: '<div><slot/></div>' },
}))

import { apiFetch } from '@/api/http'
import BluetoothDevices from '@/components/BluetoothDevices.vue'

const mockFetch = vi.mocked(apiFetch)

// ============================================================================
// TEST SUITE - FOCUSED ON REAL BEHAVIOR
// ============================================================================

describe('BluetoothDevices - Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should fetch devices on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response)

    mount(BluetoothDevices)
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledWith('http://api.test/bluetooth/paired-devices')
  })

  it('should display loading message initially', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve({ data: [] }) } as Response),
            100
          )
        })
    )

    const wrapper = mount(BluetoothDevices)

    expect(wrapper.text()).toContain('Loading devices...')

    await flushPromises()
  })

  it('should display devices when fetch succeeds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { address: '00:11:22:33:44:55', name: 'Device 1', connected: true, trusted: true },
            { address: '00:11:22:33:44:66', name: 'Device 2', connected: false, trusted: false },
          ],
        }),
    } as Response)

    const wrapper = mount(BluetoothDevices)
    await flushPromises()

    expect(wrapper.text()).toContain('Device 1')
    expect(wrapper.text()).toContain('Device 2')
  })

  it('should display empty state when no devices', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response)

    const wrapper = mount(BluetoothDevices)
    await flushPromises()

    expect(wrapper.text()).toContain('No paired devices found.')
  })

  it('should display error message on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const wrapper = mount(BluetoothDevices)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const wrapper = mount(BluetoothDevices)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
  })

  it('should validate device data structure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            // Valid device
            { address: '00:11:22:33:44:55', name: 'Device 1', connected: true, trusted: true },
            // Invalid device (missing fields)
            { address: '00:11:22:33:44:66', name: 'Device 2' },
          ],
        }),
    } as Response)

    const wrapper = mount(BluetoothDevices)
    await flushPromises()

    // Should only render valid device
    const devices = wrapper.findAll('[data-test="device"]')
    expect(devices.length).toBe(1)
  })

  it('should retry on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    mount(BluetoothDevices)
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Advance time for first retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response)

    vi.advanceTimersByTime(1000)
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

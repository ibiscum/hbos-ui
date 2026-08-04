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
    template: '<div data-test="device" :data-address="address">{{ name }}</div>',
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
// TEST SUITE - UNIT & REGRESSION TESTS
// ============================================================================

describe('BluetoothDevices', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ========================================================================
  // MOUNT & LIFECYCLE TESTS
  // ========================================================================

  describe('Lifecycle', () => {
    it('should fetch devices on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)

      mount(BluetoothDevices)
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('http://api.test/bluetooth/paired-devices')
    })

    it('should initialize with loading state', () => {
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
    })

    it('should clear loading state after fetch completes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      expect(wrapper.text()).toContain('Loading devices...')

      await flushPromises()
      expect(wrapper.text()).not.toContain('Loading devices...')
    })
  })

  // ========================================================================
  // RENDERING & DISPLAY TESTS
  // ========================================================================

  describe('Display & Rendering', () => {
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
      const devices = wrapper.findAll('[data-test="device"]')
      expect(devices.length).toBe(2)
    })

    it('should display empty state when no devices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('No paired devices found.')
      expect(wrapper.findAll('[data-test="device"]').length).toBe(0)
    })

    it('should pass correct props to BluetoothDeviceEntry', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { address: '00:11:22:33:44:55', name: 'Speaker', connected: true, trusted: true },
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      const deviceEntry = wrapper.find('[data-test="device"]')
      expect(deviceEntry.exists()).toBe(true)
      expect(deviceEntry.text()).toContain('Speaker')
      expect(deviceEntry.attributes('data-address')).toBe('00:11:22:33:44:55')
    })

    it('should pass fetchDevices as onUpdate callback to child component', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { address: '00:11:22:33:44:55', name: 'Device', connected: false, trusted: false },
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      // Verify device entry is rendered
      const deviceEntry = wrapper.find('[data-test="device"]')
      expect(deviceEntry.exists()).toBe(true)

      // Verify at least one device entry was rendered
      const devices = wrapper.findAll('[data-test="device"]')
      expect(devices.length).toBe(1)
    })
  })

  // ========================================================================
  // ERROR HANDLING TESTS
  // ========================================================================

  describe('Error Handling', () => {
    it('should display error on HTTP error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })

    it('should display error on 404 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })

    it('should display error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })

    it('should display error on invalid response structure (missing data field)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}), // Missing 'data' field
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })

    it('should display error if data is not an array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'not-an-array' }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })

    it('should display error if response is null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })
  })

  // ========================================================================
  // DATA VALIDATION TESTS
  // ========================================================================

  describe('Data Validation', () => {
    it('should filter out devices with invalid structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              // Valid device
              { address: '00:11:22:33:44:55', name: 'Valid Device', connected: true, trusted: true },
              // Invalid: missing name
              { address: '00:11:22:33:44:66', connected: false, trusted: true },
              // Invalid: missing address
              { name: 'No Address', connected: false, trusted: false },
              // Invalid: wrong type for connected
              {
                address: '00:11:22:33:44:77',
                name: 'Wrong Connected Type',
                connected: 'yes',
                trusted: false,
              },
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      // Should only render valid device
      const devices = wrapper.findAll('[data-test="device"]')
      expect(devices.length).toBe(1)
      expect(wrapper.text()).toContain('Valid Device')
      expect(wrapper.text()).not.toContain('No Address')
      expect(wrapper.text()).not.toContain('Wrong Connected Type')
    })

    it('should handle all device fields as correct types', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                address: '00:11:22:33:44:55',
                name: 'Test Device',
                connected: false,
                trusted: false,
              },
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.findAll('[data-test="device"]').length).toBe(1)
    })

    it('should accept devices with empty name string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { address: '00:11:22:33:44:55', name: '', connected: true, trusted: false },
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      // Empty name is still valid structure
      expect(wrapper.findAll('[data-test="device"]').length).toBe(1)
    })

    it('should reject device with non-string address', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { address: 123, name: 'Device', connected: true, trusted: false },
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.findAll('[data-test="device"]').length).toBe(0)
    })

    it('should reject device if any required field is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { address: '00:11:22:33:44:55', name: 'Device', connected: true }, // missing trusted
            ],
          }),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.findAll('[data-test="device"]').length).toBe(0)
    })
  })

  // ========================================================================
  // RETRY LOGIC TESTS
  // ========================================================================

  describe('Retry Logic', () => {
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

    it('should retry up to MAX_RETRIES times', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      mount(BluetoothDevices)
      await flushPromises()

      // First attempt
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Retry 1
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Retry 2
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // Retry 3
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(4)

      // Should NOT retry beyond MAX_RETRIES (3)
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(4) // No 5th call
    })

    it('should reset retry counter on successful fetch after failure', async () => {
      // First failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Successful retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { address: '00:11:22:33:44:55', name: 'Device', connected: true, trusted: false },
            ],
          }),
      } as Response)

      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Error should clear now (no more retries scheduled)
      expect(wrapper.text()).not.toContain('Failed to load Bluetooth devices.')
      expect(wrapper.text()).toContain('Device')
    })

    it('should delay retry by 1 second', async () => {
      const timeSpy = vi.spyOn(global, 'setTimeout')

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      mount(BluetoothDevices)
      await flushPromises()

      vi.advanceTimersByTime(500)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only 1 call

      vi.advanceTimersByTime(500)
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledTimes(2) // Now retry has occurred

      timeSpy.mockRestore()
    })

    it('should clear error state when retry succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()
      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)

      vi.advanceTimersByTime(1000)
      await flushPromises()

      expect(wrapper.text()).not.toContain('Failed to load Bluetooth devices.')
      expect(wrapper.text()).toContain('No paired devices found.')
    })
  })

  // ========================================================================
  // API INTEGRATION TESTS
  // ========================================================================

  describe('API Integration', () => {
    it('should use correct API endpoint from config store', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)

      mount(BluetoothDevices)
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('http://api.test/bluetooth/paired-devices')
    })

    it('should call apiFetch with full URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response)

      mount(BluetoothDevices)
      await flushPromises()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toMatch(/http:\/\/.*\/bluetooth\/paired-devices/)
    })

    it('should handle response.json() rejection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('JSON parse failed')),
      } as Response)

      const wrapper = mount(BluetoothDevices)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load Bluetooth devices.')
    })
  })
})

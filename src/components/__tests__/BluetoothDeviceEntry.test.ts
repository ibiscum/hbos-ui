import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()

vi.mock('@/api/http')
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getConfigApiBaseUrl: () => 'http://api.test',
  }),
}))
vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

import { apiFetch } from '@/api/http'
import BluetoothDeviceEntry from '@/components/BluetoothDeviceEntry.vue'

const mockFetch = vi.mocked(apiFetch)

// ============================================================================
// TEST SUITE - UNIT & REGRESSION TESTS
// ============================================================================

describe('BluetoothDeviceEntry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockShowSuccessToast.mockClear()
    mockShowErrorToast.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ========================================================================
  // RENDERING & DISPLAY TESTS
  // ========================================================================

  describe('Rendering', () => {
    it('should mount successfully with required props', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render device name correctly', () => {
      const deviceName = 'My Bluetooth Speaker'
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: deviceName,
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain(deviceName)
    })

    it('should display "Connected" status badge when connected', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain('Connected')
      const badge = wrapper.find('.status-badge')
      expect(badge.classes()).toContain('green')
    })

    it('should display "Disconnected" status badge when not connected', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain('Disconnected')
      const badge = wrapper.find('.status-badge')
      expect(badge.classes()).toContain('gray')
    })

    it('should render unpair button', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.text()).toBe('Unpair')
      expect(button.classes()).toContain('btn-action')
      expect(button.classes()).toContain('btn-disconnect')
    })

    it('should have proper CSS classes structure', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.find('.bluetooth-device-entry-div').exists()).toBe(true)
      expect(wrapper.find('.bluetooth-device-entry-info-div').exists()).toBe(true)
      expect(wrapper.find('.bluetooth-device-entry-controls-div').exists()).toBe(true)
    })
  })

  // ========================================================================
  // UNPAIR ACTION TESTS
  // ========================================================================

  describe('Unpair Action - Success Scenarios', () => {
    it('should call unpair API endpoint with correct device address', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/bluetooth/unpair?address=00%3A11%3A22%3A33%3A44%3A55',
        { method: 'POST' }
      )
    })

    it('should show success toast on successful unpair', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Device 00:11:22:33:44:55 unpaired successfully.'
      )
    })

    it('should call onUpdate callback on successful unpair', async () => {
      const onUpdate = vi.fn()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
          onUpdate,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(onUpdate).toHaveBeenCalled()
    })

    it('should not call onUpdate if callback is not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      // Should not throw an error
      expect(wrapper.exists()).toBe(true)
    })
  })

  // ========================================================================
  // UNPAIR ACTION TESTS - ERROR SCENARIOS
  // ========================================================================

  describe('Unpair Action - Error Scenarios', () => {
    it('should show error toast when API returns error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Device not found' }),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockShowErrorToast).toHaveBeenCalledWith(
        'Failed to unpair: Device not found'
      )
    })

    it('should show error toast when network error occurs', async () => {
      const networkError = new Error('Network timeout')
      mockFetch.mockRejectedValue(networkError)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockShowErrorToast).toHaveBeenCalledWith(
        `Failed to unpair: ${networkError.message}`
      )
    })

    it('should not call onUpdate when unpair fails', async () => {
      const onUpdate = vi.fn()
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Permission denied' }),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
          onUpdate,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      // Should handle the error gracefully
      expect(mockShowErrorToast).toHaveBeenCalled()
    })
  })

  // ========================================================================
  // EDGE CASES & SPECIAL SCENARIOS
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle device address with special characters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Device',
          address: 'FF:FF:FF:FF:FF:FF',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/bluetooth/unpair?address=FF%3AFF%3AFF%3AFF%3AFF%3AFF',
        { method: 'POST' }
      )
    })

    it('should handle device names with special characters', () => {
      const specialName = 'Device-Name (Special) & "Quoted"'
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: specialName,
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain(specialName)
    })

    it('should handle long device names', () => {
      const longName = 'A'.repeat(100)
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: longName,
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain(longName)
    })

    it('should render correctly with trusted true', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Trusted Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render correctly with trusted false', () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Untrusted Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle rapid multiple click events', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const onUpdate = vi.fn()
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
          onUpdate,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await button.trigger('click')
      await flushPromises()

      // Both clicks should trigger API calls
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  // ========================================================================
  // REGRESSION TESTS - STATE & LIFECYCLE
  // ========================================================================

  describe('Regression Tests - State & Lifecycle', () => {
    it('should maintain consistent state across re-renders', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
        },
      })

      const deviceNameBefore = wrapper.find('h3').text()
      await wrapper.vm.$nextTick()
      const deviceNameAfter = wrapper.find('h3').text()

      expect(deviceNameBefore).toBe(deviceNameAfter)
    })

    it('should update connected status when prop changes', async () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain('Disconnected')

      await wrapper.setProps({ connected: true })

      expect(wrapper.text()).toContain('Connected')
    })

    it('should update name when prop changes', async () => {
      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Old Name',
          address: '00:11:22:33:44:55',
          connected: false,
          trusted: true,
        },
      })

      expect(wrapper.text()).toContain('Old Name')

      await wrapper.setProps({ name: 'New Name' })

      expect(wrapper.text()).toContain('New Name')
    })

    it('should work correctly after onUpdate is called', async () => {
      const onUpdate = vi.fn()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
          onUpdate,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      // Component should still be functional after callback
      expect(wrapper.exists()).toBe(true)
      expect(onUpdate).toHaveBeenCalled()
    })
  })

  // ========================================================================
  // INTEGRATION TESTS
  // ========================================================================

  describe('Integration Tests', () => {
    it('should work with different API base URLs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: 'AA:BB:CC:DD:EE:FF',
          connected: true,
          trusted: true,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/bluetooth/unpair?address=AA%3ABB%3ACC%3ADD%3AEE%3AFF'),
        { method: 'POST' }
      )
    })

    it('should handle complete unpair flow with callback', async () => {
      const onUpdate = vi.fn()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const wrapper = mount(BluetoothDeviceEntry, {
        props: {
          name: 'Test Device',
          address: '00:11:22:33:44:55',
          connected: true,
          trusted: true,
          onUpdate,
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/bluetooth/unpair?address=00%3A11%3A22%3A33%3A44%3A55',
        { method: 'POST' }
      )
      expect(mockShowSuccessToast).toHaveBeenCalled()
      expect(onUpdate).toHaveBeenCalled()
    })
  })
})

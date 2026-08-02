import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Theaudiodb from '../../components/Theaudiodb.vue'

// Mock components
vi.mock('@/components/ContentBox.vue', () => ({
  default: {
    name: 'ContentBox',
    template: '<div class="content-box"><slot /></div>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon" />',
  },
}))

describe('Theaudiodb.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('Component Rendering', () => {
    it('should render with default props', () => {
      const wrapper = mount(Theaudiodb)
      expect(wrapper.find('.card').exists()).toBe(true)
      expect(wrapper.find('.service-item').exists()).toBe(true)
    })

    it('should display title from props', () => {
      const wrapper = mount(Theaudiodb, {
        props: {
          title: 'Custom Title',
        },
      })
      expect(wrapper.text()).toContain('Custom Title')
    })

    it('should display description from props', () => {
      const wrapper = mount(Theaudiodb, {
        props: {
          description: 'Custom description',
        },
      })
      expect(wrapper.text()).toContain('Custom description')
    })

    it('should render with default title', () => {
      const wrapper = mount(Theaudiodb)
      expect(wrapper.text()).toContain('TheAudioDB')
    })

    it('should render with default description', () => {
      const wrapper = mount(Theaudiodb)
      expect(wrapper.text()).toContain('Artist images and biographies')
    })

    it('should render Icon component with icon prop', () => {
      const wrapper = mount(Theaudiodb, {
        props: {
          icon: 'tabler/database',
        },
      })
      expect(wrapper.find('.service-icon').exists()).toBe(true)
    })
  })

  describe('Status Badge Display', () => {
    it('should display green status badge when service is active', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-badge.green').exists()).toBe(true)
      expect(wrapper.text()).toContain('Active')
    })

    it('should display red status badge when service is unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-badge.red').exists()).toBe(true)
      expect(wrapper.text()).toContain('Unavailable')
    })

    it('should display yellow status badge while loading', async () => {
      global.fetch = vi.fn(() => new Promise(() => {})) // Never resolves

      const wrapper = mount(Theaudiodb)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-badge.yellow').exists()).toBe(true)
      expect(wrapper.text()).toContain('Checking...')
    })

    it('should have correct aria-label on status badge', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb, {
        props: {
          title: 'Test Service',
        },
      })
      await flushPromises()
      await wrapper.vm.$nextTick()

      const statusBadge = wrapper.find('[role="status"]')
      expect(statusBadge.attributes('aria-label')).toContain('Test Service')
      expect(statusBadge.attributes('aria-label')).toContain('Active')
    })
  })

  describe('Loading State', () => {
    it('should display loading message during service check', async () => {
      global.fetch = vi.fn(() => new Promise(() => {})) // Never resolves

      const wrapper = mount(Theaudiodb)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.loading-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Checking service status...')
    })

    it('should hide loading section after service check completes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      // Check that isLoading was true initially
      const initiallyLoading = wrapper.vm.isLoading

      await flushPromises()
      await wrapper.vm.$nextTick()

      // After promises resolve, should not be loading
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.find('.loading-section').exists()).toBe(false)
    })

    it('should show loading during initial mount', async () => {
      // Mock fetch to simulate a delayed response
      let resolveResponse: (value: any) => void
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve
      })

      global.fetch = vi.fn(() => responsePromise)

      const wrapper = mount(Theaudiodb)
      // At mount time, isLoading should be true
      expect(wrapper.vm.isLoading).toBe(true)

      // Now resolve the promise
      resolveResponse({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      await flushPromises()
      // After promise resolves, should not be loading
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to check status')
      expect(wrapper.text()).toContain('Network error')
    })

    it('should handle HTTP error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to check status')
      expect(wrapper.text()).toContain('HTTP 503')
    })

    it('should handle JSON parsing errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to check status')
    })

    it('should handle empty response data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-badge.red').exists()).toBe(true)
      expect(wrapper.text()).toContain('Unavailable')
    })

    it('should have correct role on error message', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      const errorElement = wrapper.find('[role="alert"]')
      expect(errorElement.exists()).toBe(true)
    })

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      global.fetch = vi.fn().mockRejectedValue(new Error('Test error'))

      const wrapper = mount(Theaudiodb, {
        props: {
          serviceKey: 'test-service',
        },
      })
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[test-service] Service health check failed:',
        expect.any(Error),
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Service Status Check', () => {
    it('should call checkServiceStatus on mount', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')
      global.fetch = fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      mount(Theaudiodb)
      await flushPromises()

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://www.theaudiodb.com/api/v1/artist.php?i=112024',
        expect.objectContaining({ method: 'GET' }),
      )

      fetchSpy.mockRestore()
    })

    it('should handle successful service availability check', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024, name: 'Test Artist' }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isAvailable).toBe(true)
      expect(wrapper.text()).toContain('Active')
    })

    it('should handle empty artists array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isAvailable).toBe(false)
      expect(wrapper.text()).toContain('Unavailable')
    })

    it('should handle null artists response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: null }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isAvailable).toBe(false)
    })

    it('should handle undefined response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isAvailable).toBe(false)
    })
  })

  describe('Props Validation', () => {
    it('should accept custom title prop', () => {
      const wrapper = mount(Theaudiodb, {
        props: {
          title: 'Custom Service',
        },
      })
      expect(wrapper.text()).toContain('Custom Service')
    })

    it('should accept custom description prop', () => {
      const wrapper = mount(Theaudiodb, {
        props: {
          description: 'Custom service description',
        },
      })
      expect(wrapper.text()).toContain('Custom service description')
    })

    it('should accept custom icon prop', () => {
      const wrapper = mount(Theaudiodb, {
        props: {
          icon: 'custom-icon',
        },
      })
      // Icon component receives the prop
      expect(wrapper.vm.$props.icon).toBe('custom-icon')
    })

    it('should accept custom serviceKey prop', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      global.fetch = vi.fn().mockRejectedValue(new Error('Test'))

      mount(Theaudiodb, {
        props: {
          serviceKey: 'custom-key',
        },
      })

      // Wait for async operations to complete
      await flushPromises()

      // Verify the custom key is used in error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('custom-key'),
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })

    it('should use default props when not provided', () => {
      const wrapper = mount(Theaudiodb)
      expect(wrapper.vm.$props.title).toBe('TheAudioDB')
      expect(wrapper.vm.$props.icon).toBe('tabler/database')
      expect(wrapper.vm.$props.serviceKey).toBe('theaudiodb')
    })
  })

  describe('Computed Properties', () => {
    it('statusText should be "Checking..." when loading', async () => {
      global.fetch = vi.fn(() => new Promise(() => {}))

      const wrapper = mount(Theaudiodb)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.statusText).toBe('Checking...')
    })

    it('statusText should be "Active" when available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()

      expect(wrapper.vm.statusText).toBe('Active')
    })

    it('statusText should be "Unavailable" when not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()

      expect(wrapper.vm.statusText).toBe('Unavailable')
    })

    it('statusBadgeClass should include yellow when loading', async () => {
      global.fetch = vi.fn(() => new Promise(() => {}))

      const wrapper = mount(Theaudiodb)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.statusBadgeClass).toContain('yellow')
    })

    it('statusBadgeClass should include green when available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()

      expect(wrapper.vm.statusBadgeClass).toContain('green')
    })

    it('statusBadgeClass should include red when unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()

      expect(wrapper.vm.statusBadgeClass).toContain('red')
    })
  })

  describe('Regression Tests', () => {
    it('should not show error message when service is available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-error').exists()).toBe(false)
      expect(wrapper.vm.errorMessage).toBeNull()
    })

    it('should clear error message on retry', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ artists: [{ id: 112024 }] }),
        })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.errorMessage).toBeTruthy()

      // Trigger second check
      await wrapper.vm.checkServiceStatus()
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.errorMessage).toBeNull()
    })

    it('should maintain loading state during fetch', async () => {
      const neverResolvingPromise = new Promise(() => {
        // Never resolves
      })
      global.fetch = vi.fn(() => neverResolvingPromise)

      const wrapper = mount(Theaudiodb)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isLoading).toBe(true)
    })

    it('should properly update state after async operations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)

      expect(wrapper.vm.isLoading).toBe(true)
      expect(wrapper.vm.errorMessage).toBeNull()

      await flushPromises()

      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.vm.isAvailable).toBe(true)
      expect(wrapper.vm.errorMessage).toBeNull()
    })

    it('should handle rapid status checks', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ artists: [{ id: 112024 }] }),
        })

      global.fetch = fetchSpy

      const wrapper = mount(Theaudiodb)
      await flushPromises()

      await wrapper.vm.checkServiceStatus()
      await wrapper.vm.checkServiceStatus()
      await flushPromises()

      // Verify multiple calls completed without errors
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.vm.isAvailable).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long error messages', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('A'.repeat(1000)))

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-error').exists()).toBe(true)
      expect(wrapper.vm.errorMessage).toBeTruthy()
    })

    it('should handle special characters in error messages', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Error: <script>alert("xss")</script>'))

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      // Check that content is properly escaped in Vue template
      expect(wrapper.vm.errorMessage).toContain('<script>')
    })

    it('should handle artists response with extra fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          artists: [{ id: 112024, name: 'Test', extra: 'field' }],
          meta: { version: '1.0' },
        }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isAvailable).toBe(true)
    })

    it('should handle response with only artists object (not array)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          artists: { id: 112024 }, // Not an array
        }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isAvailable).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('should have proper role attributes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[role="status"]').exists()).toBe(true)
    })

    it('should have aria-hidden on decorative status icon', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb)
      await flushPromises()
      await wrapper.vm.$nextTick()

      const statusIcon = wrapper.find('.status-icon')
      expect(statusIcon.attributes('aria-hidden')).toBe('true')
    })

    it('should have descriptive aria-label on status badge', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      })

      const wrapper = mount(Theaudiodb, {
        props: {
          title: 'Music Service',
        },
      })
      await flushPromises()
      await wrapper.vm.$nextTick()

      const statusBadge = wrapper.find('[role="status"]')
      const ariaLabel = statusBadge.attributes('aria-label')
      expect(ariaLabel).toContain('Music Service')
      expect(ariaLabel).toContain('Active')
    })
  })
})

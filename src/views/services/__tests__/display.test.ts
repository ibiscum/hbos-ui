import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ============================================================================
// MOCK SETUP
// ============================================================================

vi.mock('@/components/BackRouter.vue', () => ({
  default: { template: '<div><slot /></div>', name: 'BackRouter' }
}))

vi.mock('@/components/Icon.vue', () => ({
  default: { template: '<div class="icon" />', name: 'Icon' }
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: { template: '<div class="page-content"><slot /></div>', name: 'PageContent' }
}))

vi.mock('@/components/ToggleSwitch.vue', () => ({
  default: {
    template: `
      <div class="toggle-switch">
        <input
          type="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          :aria-label="$attrs['aria-label']"
          @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        >
      </div>
    `,
    props: ['modelValue', 'disabled', 'loading'],
    name: 'ToggleSwitch'
  }
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    loaded: true,
    isPi5OrHigher: true,
    getVuMeterEnabled: true,
    updateVuMeterEnabled: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    showInfoToast: vi.fn()
  })
}))

vi.mock('@vueuse/core', () => ({
  useDark: vi.fn(() => ({
    value: false
  }))
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyType = any

// Import after all mocks are defined
import Display from '../display.vue'

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Display View', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the display settings page with header and content', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(wrapper.text()).toContain('Display Settings')
      expect(wrapper.text()).toContain('Display Configuration')
      expect(wrapper.text()).toContain('Configure display settings for your system.')
    })

    it('should render dark mode toggle with proper labels', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(wrapper.text()).toContain('Dark mode')
      expect(wrapper.text()).toContain('System appearance preference')
    })

    it('should render VU meter toggle when Pi5OrHigher is true', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(wrapper.text()).toContain('VU meter')
      expect(wrapper.text()).toContain('Audio level visualization (Pi 5+)')
    })

    it('should not render VU meter toggle when Pi5OrHigher is false', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: false,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: vi.fn()
      } as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      await flushPromises()
      expect(wrapper.text()).not.toContain('VU meter')
    })

    it('should handle null and undefined isPi5OrHigher safely', async () => {
      const { useSettingsStore } = await import('@/stores/settings')

      // Test with null
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: null,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: vi.fn()
       } as AnyType)

      const wrapper1 = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(wrapper1.find('.info-card').exists()).toBe(true)

      // Test with undefined
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: undefined,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: vi.fn()
       } as AnyType)

      const wrapper2 = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(wrapper2.find('.info-card').exists()).toBe(true)
    })
  })

  describe('Dark Mode Toggle', () => {
    it('should render dark mode toggle with accessibility attributes', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      const darkModeToggle = wrapper.findAll('input[type="checkbox"]')[0]
      expect(darkModeToggle.attributes('aria-label')).toBe('Toggle dark mode')
      expect(darkModeToggle.attributes('aria-describedby')).toBe('dark-mode-description')
    })
  })

  describe('VU Meter Toggle', () => {
    it('should render VU meter toggle with correct state from store', async () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      await flushPromises()
      const toggles = wrapper.findAll('input[type="checkbox"]')
      expect(toggles.length).toBe(2)
    })

    it('should have proper accessibility attributes on VU meter toggle', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      expect(vuMeterToggle.attributes('aria-label')).toBe('Toggle VU meter')
      expect(vuMeterToggle.attributes('aria-describedby')).toBe('vu-meter-description')
    })

    it('should call updateVuMeterEnabled when toggle is changed', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const mockUpdate = vi.fn().mockResolvedValue(undefined)

      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: mockUpdate
       } as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      await flushPromises()
      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      await vuMeterToggle.trigger('change')
      await flushPromises()

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should show success toast on VU meter update success', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const { useToastStore } = await import('@/stores/toast')
      const mockUpdate = vi.fn().mockResolvedValue(undefined)

      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: mockUpdate
       } as AnyType)

      const mockToastStore = {
        showSuccessToast: vi.fn(),
        showErrorToast: vi.fn(),
        showInfoToast: vi.fn()
      }
      vi.mocked(useToastStore).mockReturnValueOnce(mockToastStore as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      await flushPromises()
      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      await vuMeterToggle.trigger('change')
      await flushPromises()

      expect(mockToastStore.showSuccessToast).toHaveBeenCalled()
    })

    it('should show error toast on VU meter update failure', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const { useToastStore } = await import('@/stores/toast')
      const mockError = new Error('Failed to update VU meter')
      const mockUpdate = vi.fn().mockRejectedValue(mockError)

      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: mockUpdate
       } as AnyType)

      const mockToastStore = {
        showSuccessToast: vi.fn(),
        showErrorToast: vi.fn(),
        showInfoToast: vi.fn()
      }
      vi.mocked(useToastStore).mockReturnValueOnce(mockToastStore as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      await flushPromises()
      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      await vuMeterToggle.trigger('change')
      await flushPromises()

      expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to update VU meter')
    })

    it('should disable VU meter toggle when store not loaded', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useSettingsStore } = require('@/stores/settings')
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: false,
        isPi5OrHigher: true,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: vi.fn()
       } as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      expect(vuMeterToggle.attributes('disabled')).toBeDefined()
    })

    it('should handle null and undefined getVuMeterEnabled gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useSettingsStore } = require('@/stores/settings')

      // Test with null
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: null,
        updateVuMeterEnabled: vi.fn()
       } as AnyType)

      const wrapper1 = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      expect(wrapper1.find('.info-card').exists()).toBe(true)

      // Test with undefined
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: undefined,
        updateVuMeterEnabled: vi.fn()
       } as AnyType)

      const wrapper2 = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      expect(wrapper2.find('.info-card').exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle generic errors with fallback message', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const { useToastStore } = await import('@/stores/toast')
      const mockUpdate = vi.fn().mockRejectedValue('Unknown error')

      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: mockUpdate
       } as AnyType)

      const mockToastStore = {
        showSuccessToast: vi.fn(),
        showErrorToast: vi.fn(),
        showInfoToast: vi.fn()
      }
      vi.mocked(useToastStore).mockReturnValueOnce(mockToastStore as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      await flushPromises()
      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      await vuMeterToggle.trigger('change')
      await flushPromises()

      expect(mockToastStore.showErrorToast).toHaveBeenCalledWith('Failed to update VU meter')
    })

    it('should log errors to console', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const mockError = new Error('Service error')
      const mockUpdate = vi.fn().mockRejectedValue(mockError)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      vi.mocked(useSettingsStore).mockReturnValueOnce({
        loaded: true,
        isPi5OrHigher: true,
        getVuMeterEnabled: true,
        updateVuMeterEnabled: mockUpdate
       } as AnyType)

      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      await flushPromises()
      const vuMeterToggle = wrapper.findAll('input[type="checkbox"]')[1]
      await vuMeterToggle.trigger('change')
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith('[display.vue] VU meter toggle error:', mockError)
      consoleSpy.mockRestore()
    })
  })

  describe('Initialization', () => {
    it('should initialize dark mode on mount', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

      mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[display.vue] Dark mode initialized:',
        expect.any(Boolean)
      )
      consoleSpy.mockRestore()
    })

    it('should warn when dark mode initialization fails', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useDark } = require('@vueuse/core')
      vi.mocked(useDark).mockReturnValueOnce({ value: 'invalid' })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[display.vue] Dark mode initialization may have issues'
      )
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-labels on all toggles', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      const toggles = wrapper.findAll('input[type="checkbox"]')
      toggles.forEach((toggle) => {
        expect(toggle.attributes('aria-label')).toBeTruthy()
      })
    })

    it('should have aria-describedby on all toggles', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: false,
            Transition: false
          }
        }
      })

      const toggles = wrapper.findAll('input[type="checkbox"]')
      toggles.forEach((toggle) => {
        expect(toggle.attributes('aria-describedby')).toBeTruthy()
      })
    })
  })

  describe('Layout and Styling', () => {
    it('should render toggle rows with flex layout', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      const toggleRows = wrapper.findAll('.toggle-row')
      expect(toggleRows.length).toBeGreaterThan(0)
      toggleRows.forEach((row) => {
        expect(row.classes()).toContain('toggle-row')
      })
    })
  })

  describe('Transitions', () => {
    it('should use slide-fade transition for VU meter card', () => {
      const wrapper = mount(Display, {
        global: {
          plugins: [pinia],
          stubs: {
            BackRouter: true,
            Icon: true,
            PageContent: true,
            ToggleSwitch: true,
            Transition: false
          }
        }
      })

      const transition = wrapper.findComponent({ name: 'Transition' })
      expect(transition.exists()).toBe(true)
      expect(transition.props('name')).toBe('slide-fade')
    })
  })
})

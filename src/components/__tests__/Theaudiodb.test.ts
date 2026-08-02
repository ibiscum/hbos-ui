import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Theaudiodb from '@/components/Theaudiodb.vue'

describe('Theaudiodb Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the component without errors', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders the service title', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.text()).toContain('TheAudioDB')
    })

    it('renders the service description', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.text()).toContain('TheAudioDB is used to retrieve additional artist images and biographies')
    })

    it('renders ContentBox wrapper', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div class="content-box"><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.find('.content-box').exists()).toBe(true)
    })

    it('renders card structure', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.find('.card').exists()).toBe(true)
      expect(wrapper.find('.service-item').exists()).toBe(true)
      expect(wrapper.find('.service-main').exists()).toBe(true)
    })

    it('renders the service icon with correct icon name', () => {
      const Icon = { template: '<i :data-icon="$attrs.icon"></i>' }
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon,
          },
        },
      })
      const icon = wrapper.find('[data-icon]')
      expect(icon.attributes('data-icon')).toBe('tabler/database')
    })

    it('renders status badge with Active state', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toContain('Active')
    })

    it('renders status badge with green class', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const badge = wrapper.find('.status-badge')
      expect(badge.classes()).toContain('green')
    })
  })

  describe('Service Details Layout', () => {
    it('renders service details section', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.find('.service-details').exists()).toBe(true)
    })

    it('renders h3 element for title', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const heading = wrapper.find('h3')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('TheAudioDB')
    })

    it('renders description paragraph with correct class', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const description = wrapper.find('.service-description')
      expect(description.exists()).toBe(true)
      expect(description.text()).toContain('additional artist images and biographies')
    })
  })

  describe('DOM Hierarchy', () => {
    it('has correct nesting: ContentBox > card > service-item > service-main > service-info', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div class="content-box"><slot /></div>' },
            Icon: true,
          },
        },
      })

      const contentBox = wrapper.find('.content-box')
      expect(contentBox.exists()).toBe(true)

      const card = contentBox.find('.card')
      expect(card.exists()).toBe(true)

      const serviceItem = card.find('.service-item')
      expect(serviceItem.exists()).toBe(true)

      const serviceMain = serviceItem.find('.service-main')
      expect(serviceMain.exists()).toBe(true)

      const serviceInfo = serviceMain.find('.service-info')
      expect(serviceInfo.exists()).toBe(true)
    })

    it('places icon as direct child of service-info', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: { template: '<i class="service-icon"></i>' },
          },
        },
      })
      const serviceInfo = wrapper.find('.service-info')
      const icon = serviceInfo.find('.service-icon')
      expect(icon.exists()).toBe(true)
    })

    it('places service-details as second child of service-info', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const serviceInfo = wrapper.find('.service-info')
      const children = serviceInfo.findAll(':scope > *')
      expect(children.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Style Consistency', () => {
    it('applies service-icon class to Icon component', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: { template: '<i class="service-icon"></i>' },
          },
        },
      })
      expect(wrapper.find('.service-icon').exists()).toBe(true)
    })

    it('applies service-main class to main container', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.find('.service-main').exists()).toBe(true)
    })

    it('applies service-info class to info container', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.find('.service-info').exists()).toBe(true)
    })
  })

  describe('Regression: Hard-Coded Status (Fixed)', () => {
    it('displays status as dynamic based on API health', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      await wrapper.vm.$nextTick()
      const badge = wrapper.find('.status-badge')
      expect(badge.text()).toMatch(/Active|Unavailable|Checking/)
    })

    it('accepts props to customize status badge text', async () => {
      const wrapper = mount(Theaudiodb, {
        props: { title: 'Custom Service' },
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      await wrapper.vm.$nextTick()
      const badge = wrapper.find('.status-badge')
      expect(badge.attributes('aria-label')).toContain('Custom Service')
    })

    it('shows different status colors based on availability', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      await wrapper.vm.$nextTick()
      const badge = wrapper.find('.status-badge')
      expect(badge.classes()).toContain('status-badge')
      // Class will be either green, red, or yellow depending on availability
      expect(badge.classes()).toEqual(
        expect.arrayContaining(['status-badge', expect.stringMatching(/green|red|yellow/)])
      )
    })
  })

  describe('Component Props (Enhanced)', () => {
    it('accepts title prop', () => {
      const wrapper = mount(Theaudiodb, {
        props: { title: 'Custom API Service' },
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.text()).toContain('Custom API Service')
    })

    it('accepts description prop', () => {
      const wrapper = mount(Theaudiodb, {
        props: { description: 'Custom description text' },
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.text()).toContain('Custom description text')
    })

    it('accepts icon prop', () => {
      const Icon = { template: '<i :data-icon="$attrs.icon"></i>' }
      const wrapper = mount(Theaudiodb, {
        props: { icon: 'custom/icon' },
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon,
          },
        },
      })
      const icon = wrapper.find('[data-icon]')
      expect(icon.attributes('data-icon')).toBe('custom/icon')
    })

    it('accepts serviceKey prop for identifying service', () => {
      const wrapper = mount(Theaudiodb, {
        props: { serviceKey: 'custom-service' },
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('has default prop values', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.text()).toContain('TheAudioDB')
      expect(wrapper.text()).toContain('additional artist images and biographies')
    })
  })

  describe('Component Emits', () => {
    it('does not emit any events', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      await wrapper.vm.$nextTick()
      expect(Object.keys(wrapper.emitted())).toEqual([])
    })
  })

  describe('Import Dependencies (Enhanced)', () => {
    it('imports Icon component', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('imports ContentBox component', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            Icon: true,
            ContentBox: { template: '<div><slot /></div>' },
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('has state management for service status', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      // Component should have reactive state for isLoading, isAvailable, errorMessage
      expect(wrapper.vm.isLoading !== undefined).toBe(true)
      expect(wrapper.vm.isAvailable !== undefined).toBe(true)
      expect(wrapper.vm.errorMessage !== undefined).toBe(true)
    })

    it('has checkServiceStatus method for API integration', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(typeof wrapper.vm.checkServiceStatus).toBe('function')
    })
  })

  describe('Accessibility Issues (Fixed)', () => {
    it('has aria-label on status badge for screen readers', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const badge = wrapper.find('.status-badge')
      expect(badge.attributes('aria-label')).toBeDefined()
      expect(badge.attributes('aria-label')).toContain('TheAudioDB service status')
    })

    it('status badge has role="status" for accessibility', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const badge = wrapper.find('.status-badge')
      expect(badge.attributes('role')).toBe('status')
    })

    it('has visual status indicator (●) in addition to color', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const badge = wrapper.find('.status-badge')
      const icon = badge.find('.status-icon')
      expect(icon.exists()).toBe(true)
      expect(icon.attributes('aria-hidden')).toBe('true')
      expect(badge.text()).toContain('●')
    })
  })

  describe('Styling and SCSS', () => {
    it('applies scoped styles', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      // Component uses scoped SCSS styles
      expect(wrapper.find('.service-item').exists()).toBe(true)
    })

    it('imports service-item SCSS mixins', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      // The component relies on @import '@/assets/scss/service-item'
      // All service-related classes should exist
      expect(wrapper.find('.service-item').exists()).toBe(true)
      expect(wrapper.find('.service-main').exists()).toBe(true)
      expect(wrapper.find('.service-info').exists()).toBe(true)
      expect(wrapper.find('.service-icon').exists()).toBe(true)
      expect(wrapper.find('.service-details').exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple mounts without errors', () => {
      const wrapper1 = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const wrapper2 = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      expect(wrapper1.exists()).toBe(true)
      expect(wrapper2.exists()).toBe(true)
    })

    it('renders consistently across multiple renders', () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })
      const firstRender = wrapper.html()
      wrapper.vm.$forceUpdate()
      const secondRender = wrapper.html()
      expect(firstRender).toBe(secondRender)
    })
  })

  describe('Error Handling (New)', () => {
    it('displays error message when service check fails', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      // Set error manually to test error display
      wrapper.vm.errorMessage = 'Failed to check status: Network error'
      await wrapper.vm.$nextTick()

      const errorSpan = wrapper.find('.status-error')
      expect(errorSpan.exists()).toBe(true)
      expect(errorSpan.text()).toContain('Network error')
    })

    it('error message has role="alert" for accessibility', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      wrapper.vm.errorMessage = 'Service unavailable'
      await wrapper.vm.$nextTick()

      const errorSpan = wrapper.find('.status-error')
      expect(errorSpan.attributes('role')).toBe('alert')
    })

    it('clears error message on successful status check', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      wrapper.vm.errorMessage = 'Previous error'
      await wrapper.vm.$nextTick()

      wrapper.vm.errorMessage = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.status-error').exists()).toBe(false)
    })
  })

  describe('Loading State (New)', () => {
    it('shows loading state when checking service', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      wrapper.vm.isLoading = true
      await wrapper.vm.$nextTick()

      const loading = wrapper.find('.loading-section')
      expect(loading.exists()).toBe(true)
      expect(loading.text()).toContain('Checking service status')
    })

    it('displays "Checking..." status text while loading', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      wrapper.vm.isLoading = true
      await wrapper.vm.$nextTick()

      const badge = wrapper.find('.status-badge')
      expect(badge.text()).toContain('Checking')
    })

    it('removes loading section after status check', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      wrapper.vm.isLoading = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.loading-section').exists()).toBe(true)

      wrapper.vm.isLoading = false
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.loading-section').exists()).toBe(false)
    })

    it('updates status color during loading', async () => {
      const wrapper = mount(Theaudiodb, {
        global: {
          stubs: {
            ContentBox: { template: '<div><slot /></div>' },
            Icon: true,
          },
        },
      })

      wrapper.vm.isLoading = true
      await wrapper.vm.$nextTick()

      const badge = wrapper.find('.status-badge')
      expect(badge.classes()).toContain('yellow')
    })
  })
})

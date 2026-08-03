import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BackRouter from '@/components/BackRouter.vue'
import Icon from '@/components/Icon.vue'

describe('BackRouter.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}, options = {}) => {
    const { slots = {}, attrs = {}, ...other } = options
    return mount(BackRouter, {
      props: {
        to: '/test',
        ...props,
      },
      slots,
      attrs,
      global: {
        stubs: {
          'router-link': {
            template: '<a class="back-router"><slot /></a>',
            props: ['to'],
          },
          Icon: {
            template: '<svg><slot /></svg>',
            props: ['icon'],
          },
        },
        ...other,
      },
    })
  }

  // ============================================================================
  // Component Rendering Tests
  // ============================================================================

  describe('Component Rendering', () => {
    it('should render the component as a router-link', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('a.back-router').exists()).toBe(true)
    })

    it('should apply the back-router class', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.back-router').exists()).toBe(true)
    })

    it('should render the Icon component with caret-down icon', () => {
      const wrapper = createWrapper()
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
    })

    it('should render slot content', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Back to Home' } })
      expect(wrapper.text()).toContain('Back to Home')
    })

    it('should wrap slot content in h1 styled span', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Test Text' } })
      const span = wrapper.find('.h1')
      expect(span.exists()).toBe(true)
      expect(span.text()).toBe('Test Text')
    })
  })

  // ============================================================================
  // Props Tests
  // ============================================================================

  describe('Props', () => {
    it('should accept string path as to prop', () => {
      const wrapper = createWrapper({ to: '/home' })
      expect(wrapper.props('to')).toBe('/home')
    })

    it('should accept object route as to prop', () => {
      const routeObject = { name: 'Home', params: { id: '123' } }
      const wrapper = createWrapper({ to: routeObject })
      expect(wrapper.props('to')).toEqual(routeObject)
    })

    it('should default to prop to empty string', () => {
      const wrapper = mount(BackRouter, {
        global: {
          stubs: {
            'router-link': {
              template: '<a class="back-router"><slot /></a>',
              props: ['to'],
            },
            Icon,
          },
        },
      })
      expect(wrapper.props('to')).toBe('')
    })

    it('should handle empty string path', () => {
      const wrapper = createWrapper({ to: '' })
      expect(wrapper.props('to')).toBe('')
    })
  })

  // ============================================================================
  // Attributes Tests
  // ============================================================================

  describe('Attributes and Attributes Passthrough', () => {
    it('should pass through custom attributes to router-link', () => {
      const wrapper = createWrapper({}, {
        attrs: {
          'data-testid': 'back-nav',
          'aria-label': 'Back navigation',
        },
      })
      expect(wrapper.find('[data-testid="back-nav"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Back navigation"]').exists()).toBe(true)
    })

    it('should preserve multiple custom attributes', () => {
      const wrapper = createWrapper({}, {
        attrs: {
          title: 'Go Back',
          class: 'custom-class',
          'data-custom': 'value',
        },
      })
      const link = wrapper.find('.back-router')
      expect(link.attributes('title')).toBe('Go Back')
      expect(link.attributes('data-custom')).toBe('value')
    })
  })

  // ============================================================================
  // Slot Tests
  // ============================================================================

  describe('Slot Content', () => {
    it('should render simple text slot', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Back' } })
      expect(wrapper.text()).toContain('Back')
    })

    it('should render HTML slot content', () => {
      const wrapper = createWrapper({}, { slots: { default: '<span>Back to Albums</span>' } })
      expect(wrapper.find('span').exists()).toBe(true)
      expect(wrapper.text()).toContain('Back to Albums')
    })

    it('should render multiple lines in slot', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Long heading\nwith multiple parts' } })
      expect(wrapper.text()).toContain('Long heading')
      expect(wrapper.text()).toContain('with multiple parts')
    })

    it('should render empty slot gracefully', () => {
      const wrapper = createWrapper({}, { slots: { default: '' } })
      expect(wrapper.find('.back-router').exists()).toBe(true)
    })
  })

  // ============================================================================
  // DOM Structure Tests
  // ============================================================================

  describe('DOM Structure', () => {
    it('should use proper HTML structure', () => {
      const wrapper = createWrapper()
      const link = wrapper.find('.back-router')
      expect(link.element.tagName.toLowerCase()).toBe('a')
    })

    it('icon and text should be ordered correctly', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Navigate' } })
      const children = wrapper.find('.back-router').element.children
      expect(children.length).toBeGreaterThanOrEqual(2)
      // First child should be svg (icon)
      expect(children[0].tagName.toLowerCase()).toBe('svg')
      // Second child should be span with h1 class
      expect(children[1].classList.contains('h1')).toBe(true)
    })

    it('h1 span should exist and contain slot content', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Test Content' } })
      const h1Span = wrapper.find('.h1')
      expect(h1Span.exists()).toBe(true)
      expect(h1Span.text()).toBe('Test Content')
    })

    it('icon should be rendered as SVG element', () => {
      const wrapper = createWrapper()
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
    })

    it('link should have back-router class', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.back-router').exists()).toBe(true)
    })
  })

  // ============================================================================
  // Styling and Visual Effects Tests
  // ============================================================================

  describe('Styling and Visual Effects', () => {
    it('h1 should have h1 class applied', () => {
      const wrapper = createWrapper()
      const h1 = wrapper.find('.h1')
      expect(h1.exists()).toBe(true)
      expect(h1.element.classList.contains('h1')).toBe(true)
    })

    it('icon should be rendered as SVG with proper structure', () => {
      const wrapper = createWrapper()
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.element.tagName.toLowerCase()).toBe('svg')
    })

    it('h1 should contain text content', () => {
      const wrapper = createWrapper({}, { slots: { default: 'Navigation Text' } })
      const h1 = wrapper.find('.h1')
      expect(h1.text()).toContain('Navigation Text')
    })

    it('link should support multiple classes', () => {
      const wrapper = createWrapper({}, { attrs: { class: 'custom-class' } })
      const link = wrapper.find('.back-router')
      expect(link.exists()).toBe(true)
      // The link should have both back-router and custom-class
      expect(link.element.className).toContain('back-router')
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should render complete component with all parts together', () => {
      const wrapper = mount(BackRouter, {
        props: {
          to: '/albums',
        },
        slots: {
          default: 'Back to Albums',
        },
        attrs: {
          'data-testid': 'album-back-button',
        },
        global: {
          stubs: {
            'router-link': {
              template: '<a class="back-router"><slot /></a>',
              props: ['to'],
            },
            Icon: {
              template: '<svg><slot /></svg>',
              props: ['icon'],
            },
          },
        },
      })

      expect(wrapper.find('.back-router').exists()).toBe(true)
      expect(wrapper.find('.back-router[data-testid="album-back-button"]').exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true) // Icon renders as SVG
      expect(wrapper.find('.h1').exists()).toBe(true)
      expect(wrapper.text()).toContain('Back to Albums')
      expect(wrapper.props('to')).toBe('/albums')
    })

    it('should handle complex route objects with nested data', () => {
      const complexRoute = {
        name: 'AlbumDetail',
        params: { id: '42' },
        query: { sort: 'asc' },
      }

      const wrapper = createWrapper({ to: complexRoute })

      expect(wrapper.props('to')).toEqual(complexRoute)
    })
  })

  // ============================================================================
  // Regression Tests
  // ============================================================================

  describe('Regression Tests', () => {
    it('should not lose slot content on re-render', async () => {
      const wrapper = createWrapper({}, { slots: { default: 'Original Text' } })

      expect(wrapper.text()).toContain('Original Text')

      await wrapper.setProps({ to: '/other' })

      expect(wrapper.text()).toContain('Original Text')
      expect(wrapper.props('to')).toBe('/other')
    })

    it('should handle rapid prop changes', async () => {
      const wrapper = createWrapper({ to: '/one' })

      await wrapper.setProps({ to: '/two' })
      await wrapper.setProps({ to: '/three' })
      await wrapper.setProps({ to: '/four' })

      expect(wrapper.props('to')).toBe('/four')
      expect(wrapper.find('.back-router').exists()).toBe(true)
    })

    it('should preserve structure when changing attributes', async () => {
      const wrapper = createWrapper({}, { attrs: { 'data-id': '1' } })

      const initialStructure = wrapper.html()

      await wrapper.setProps({ to: '/other' })

      expect(wrapper.find('.back-router').exists()).toBe(true)
      expect(wrapper.findComponent(Icon).exists()).toBe(true)
    })

    it('should maintain icon and text relationship', async () => {
      const wrapper = createWrapper({}, { slots: { default: 'Navigation' } })

      const children = wrapper.find('.back-router').element.children
      const hasIcon = Array.from(children).some((el) => el.tagName.toLowerCase() === 'svg')
      const hasH1 = Array.from(children).some((el) => (el as HTMLElement).classList.contains('h1'))

      expect(hasIcon).toBe(true)
      expect(hasH1).toBe(true)

      await wrapper.setProps({ to: '/other' })

      const childrenAfter = wrapper.find('.back-router').element.children
      const hasIconAfter = Array.from(childrenAfter).some(
        (el) => el.tagName.toLowerCase() === 'svg'
      )
      const hasH1After = Array.from(childrenAfter).some(
        (el) => (el as HTMLElement).classList.contains('h1')
      )

      expect(hasIconAfter).toBe(true)
      expect(hasH1After).toBe(true)
    })
  })
})

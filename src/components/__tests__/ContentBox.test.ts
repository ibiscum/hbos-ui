import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentBox from '@/components/ContentBox.vue'

describe('ContentBox', () => {
  it('renders successfully', () => {
    const wrapper = mount(ContentBox)

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.element.tagName).toBe('DIV')
  })

  it('renders slot content', () => {
    const wrapper = mount(ContentBox, {
      slots: {
        default: '<p class="slot-text">Hello ContentBox</p>',
      },
    })

    expect(wrapper.find('.slot-text').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hello ContentBox')
  })

  it('renders multiple slot nodes without modification', () => {
    const wrapper = mount(ContentBox, {
      slots: {
        default: '<span class="first">First</span><span class="second">Second</span>',
      },
    })

    expect(wrapper.find('.first').exists()).toBe(true)
    expect(wrapper.find('.second').exists()).toBe(true)
    expect(wrapper.text()).toContain('First')
    expect(wrapper.text()).toContain('Second')
  })

  it('applies semantic and legacy compatibility classes', () => {
    const wrapper = mount(ContentBox)

    expect(wrapper.classes()).toContain('content-box')
    expect(wrapper.classes()).toContain('contentBox')
  })

  it('forwards non-prop attributes to the root element', () => {
    const wrapper = mount(ContentBox, {
      attrs: {
        id: 'main-content-box',
        'data-test': 'content-box',
        'aria-label': 'Main section',
      },
    })

    expect(wrapper.attributes('id')).toBe('main-content-box')
    expect(wrapper.attributes('data-test')).toBe('content-box')
    expect(wrapper.attributes('aria-label')).toBe('Main section')
  })

  it('merges parent-provided class with base classes', () => {
    const wrapper = mount(ContentBox, {
      attrs: {
        class: 'card-content',
      },
    })

    expect(wrapper.classes()).toContain('card-content')
    expect(wrapper.classes()).toContain('content-box')
    expect(wrapper.classes()).toContain('contentBox')
  })

  it('regression: keeps legacy class for existing selectors', () => {
    const wrapper = mount(ContentBox)

    expect(wrapper.classes('contentBox')).toBe(true)
  })
})

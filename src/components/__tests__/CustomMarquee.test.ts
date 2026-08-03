import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomMarquee from '@/components/CustomMarquee.vue'

describe('CustomMarquee.vue', () => {
  it('renders slot content', () => {
    const wrapper = mount(CustomMarquee, {
      slots: {
        default: 'Now Playing: Example Song'
      }
    })

    expect(wrapper.text()).toContain('Now Playing: Example Song')
    expect(wrapper.find('.marquee-text').classes()).not.toContain('animate')
  })

  it('adds animate class on mouseenter when text overflows container', async () => {
    const wrapper = mount(CustomMarquee, {
      slots: {
        default: 'A very long track title'
      }
    })

    const container = wrapper.find('.marquee-container').element as HTMLElement
    const text = wrapper.find('.marquee-text').element as HTMLElement

    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      get: () => 100
    })

    Object.defineProperty(text, 'scrollWidth', {
      configurable: true,
      get: () => 260
    })

    await wrapper.find('.marquee-container').trigger('mouseenter')

    expect(wrapper.find('.marquee-text').classes()).toContain('animate')
  })

  it('does not add animate class when text fits in container', async () => {
    const wrapper = mount(CustomMarquee, {
      slots: {
        default: 'Short title'
      }
    })

    const container = wrapper.find('.marquee-container').element as HTMLElement
    const text = wrapper.find('.marquee-text').element as HTMLElement

    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      get: () => 220
    })

    Object.defineProperty(text, 'scrollWidth', {
      configurable: true,
      get: () => 180
    })

    await wrapper.find('.marquee-container').trigger('mouseenter')

    expect(wrapper.find('.marquee-text').classes()).not.toContain('animate')
  })

  it('removes animate class on mouseleave after animation was enabled', async () => {
    const wrapper = mount(CustomMarquee, {
      slots: {
        default: 'Another long track title'
      }
    })

    const container = wrapper.find('.marquee-container').element as HTMLElement
    const text = wrapper.find('.marquee-text').element as HTMLElement

    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      get: () => 90
    })

    Object.defineProperty(text, 'scrollWidth', {
      configurable: true,
      get: () => 240
    })

    const containerWrapper = wrapper.find('.marquee-container')
    await containerWrapper.trigger('mouseenter')
    expect(wrapper.find('.marquee-text').classes()).toContain('animate')

    await containerWrapper.trigger('mouseleave')
    expect(wrapper.find('.marquee-text').classes()).not.toContain('animate')
  })

  it('re-evaluates overflow state across multiple hovers (regression)', async () => {
    const wrapper = mount(CustomMarquee, {
      slots: {
        default: 'Dynamic title'
      }
    })

    const container = wrapper.find('.marquee-container').element as HTMLElement
    const text = wrapper.find('.marquee-text').element as HTMLElement

    let containerWidth = 100
    let textWidth = 250

    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      get: () => containerWidth
    })

    Object.defineProperty(text, 'scrollWidth', {
      configurable: true,
      get: () => textWidth
    })

    const containerWrapper = wrapper.find('.marquee-container')

    await containerWrapper.trigger('mouseenter')
    expect(wrapper.find('.marquee-text').classes()).toContain('animate')

    await containerWrapper.trigger('mouseleave')
    expect(wrapper.find('.marquee-text').classes()).not.toContain('animate')

    containerWidth = 260
    textWidth = 180

    await containerWrapper.trigger('mouseenter')
    expect(wrapper.find('.marquee-text').classes()).not.toContain('animate')
  })
})

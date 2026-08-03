import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProgressSlider from '@/components/ProgressSlider.vue'

function setSliderRect(element: Element, left = 10, width = 200) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      width,
      top: 0,
      right: left + width,
      bottom: 10,
      height: 10,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }),
  })
}

function createTouchEvent(type: string, clientX: number, touchListKey: 'touches' | 'changedTouches') {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent
  Object.defineProperty(event, touchListKey, {
    configurable: true,
    value: [{ clientX }],
  })
  Object.defineProperty(event, touchListKey === 'touches' ? 'changedTouches' : 'touches', {
    configurable: true,
    value: [],
  })

  return event
}

describe('ProgressSlider.vue', () => {
  it('renders base classes and default thumb', () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 25,
      },
    })

    expect(wrapper.classes()).toContain('app-progress-slider')
    expect(wrapper.find('.app-progress-slider__thumb').exists()).toBe(true)
  })

  it('hides thumb when isOnHeader is true', () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 25,
        isOnHeader: true,
      },
    })

    expect(wrapper.classes()).toContain('is-on-header')
    expect(wrapper.find('.app-progress-slider__thumb').exists()).toBe(false)
  })

  it('renders center mark only when centerMark is provided', async () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 50,
        min: 0,
        max: 100,
      },
    })

    expect(wrapper.find('.app-progress-slider__center-mark').exists()).toBe(false)

    await wrapper.setProps({ centerMark: 25 })
    const centerMark = wrapper.find('.app-progress-slider__center-mark')

    expect(centerMark.exists()).toBe(true)
    expect(centerMark.attributes('style')).toContain('left: 25%')
  })

  it('emits click:progress using slider geometry and step rounding', async () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 0,
        min: 0,
        max: 100,
        step: 10,
      },
    })

    setSliderRect(wrapper.element, 10, 200)

    await wrapper.trigger('click', { clientX: 73 })

    const events = wrapper.emitted('click:progress')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([30])
  })

  it('clamps click:progress values at min and max', async () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 50,
        min: 10,
        max: 90,
        step: 1,
      },
    })

    setSliderRect(wrapper.element, 10, 200)

    await wrapper.trigger('click', { clientX: -100 })
    await wrapper.trigger('click', { clientX: 500 })

    const events = wrapper.emitted('click:progress')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([10])
    expect(events?.[1]).toEqual([90])
  })

  it('does not emit click:progress while disabled', async () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 30,
        disabled: true,
      },
    })

    await wrapper.trigger('click', { clientX: 80 })

    expect(wrapper.classes()).toContain('disabled')
    expect(wrapper.emitted('click:progress')).toBeUndefined()
  })

  it('emits one final value after mouse drag (regression: no duplicate click emit)', async () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 10,
        min: 0,
        max: 100,
        step: 1,
        isDraggable: true,
      },
    })

    setSliderRect(wrapper.element, 10, 200)

    await wrapper.trigger('mousedown', { clientX: 20 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await wrapper.trigger('click', { clientX: 150 })

    const events = wrapper.emitted('click:progress')
    expect(events).toBeTruthy()
    expect(events).toHaveLength(1)
    expect(events?.[0]).toEqual([70])
  })

  it('updates progress width while dragging before parent prop update (regression)', async () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 10,
        min: 0,
        max: 100,
        step: 1,
        isDraggable: true,
      },
    })

    setSliderRect(wrapper.element, 10, 200)

    expect(wrapper.find('.app-progress-slider__progress').attributes('style')).toContain('width: 10%')

    await wrapper.trigger('mousedown', { clientX: 30 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, bubbles: true }))
    await nextTick()

    expect(wrapper.find('.app-progress-slider__progress').attributes('style')).toContain('width: 70%')

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })

  it('emits touch tap value when not draggable', () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        isDraggable: false,
      },
    })

    setSliderRect(wrapper.element, 10, 200)

    wrapper.element.dispatchEvent(createTouchEvent('touchstart', 100, 'touches'))
    document.dispatchEvent(createTouchEvent('touchend', 110, 'changedTouches'))

    const events = wrapper.emitted('click:progress')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([50])
  })

  it('emits dragged touch value on touchend when draggable', () => {
    const wrapper = mount(ProgressSlider, {
      props: {
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        isDraggable: true,
      },
    })

    setSliderRect(wrapper.element, 10, 200)

    wrapper.element.dispatchEvent(createTouchEvent('touchstart', 40, 'touches'))
    document.dispatchEvent(createTouchEvent('touchmove', 170, 'touches'))
    document.dispatchEvent(createTouchEvent('touchend', 170, 'changedTouches'))

    const events = wrapper.emitted('click:progress')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([80])
    expect(events).toHaveLength(1)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

import VolumeControl from '@/components/VolumeControl.vue'

const mockSetVolume = vi.fn()
const currentVolumeRef = ref(50)

vi.mock('@/stores/player', async () => {
  const { defineStore } = await import('pinia')

  return {
    usePlayerStore: defineStore('player', () => ({
      currentVolume: currentVolumeRef,
      setVolume: mockSetVolume,
    })),
  }
})

const mountVolumeControl = (size?: 'compact' | 'normal' | 'wide' | 'large') => {
  return mount(VolumeControl, {
    props: size ? { size } : {},
    global: {
      stubs: {
        ProgressSlider: {
          name: 'ProgressSlider',
          props: ['value', 'min', 'max', 'step', 'disabled', 'hasThumb', 'isDraggable', 'isOnHeader'],
          emits: ['click:progress'],
          template: '<button class="progress-slider-stub" @click="$emit(\'click:progress\', 67)"></button>',
        },
      },
    },
  })
}

const mountVolumeControlWithRealSlider = (size?: 'compact' | 'normal' | 'wide' | 'large') => {
  return mount(VolumeControl, {
    props: size ? { size } : {},
  })
}

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

describe('VolumeControl.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    currentVolumeRef.value = 50
  })

  it('renders compact size by default with mute and speaker icons', () => {
    const wrapper = mountVolumeControl()

    expect(wrapper.find('.volume-control').exists()).toBe(true)
    expect(wrapper.classes()).toContain('volume-control--compact')
    expect(wrapper.find('.volume-icon--mute').exists()).toBe(true)
    expect(wrapper.find('.volume-icon--speaker').exists()).toBe(true)
  })

  it('forwards slider props and current volume in compact mode', () => {
    currentVolumeRef.value = 35

    const wrapper = mountVolumeControl()
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(slider.props('value')).toBe(35)
    expect(slider.props('min')).toBe(0)
    expect(slider.props('max')).toBe(100)
    expect(slider.props('step')).toBe(1)
    expect(slider.props('hasThumb')).toBe(true)
    expect(slider.props('isDraggable')).toBe(true)
    expect(slider.props('disabled')).toBe(false)
    expect(slider.props('isOnHeader')).toBe(true)
  })

  it('regression: uses non-header slider mode for non-compact sizes', () => {
    const wrapper = mountVolumeControl('normal')
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(wrapper.classes()).toContain('volume-control--normal')
    expect(slider.props('isOnHeader')).toBe(false)
  })

  it('calls playerStore.setVolume when slider emits click:progress', async () => {
    const wrapper = mountVolumeControl()

    await wrapper.get('.progress-slider-stub').trigger('click')

    expect(mockSetVolume).toHaveBeenCalledTimes(1)
    expect(mockSetVolume).toHaveBeenCalledWith(67)
  })

  it('regression: clamps outgoing volume before calling setVolume', async () => {
    const wrapper = mountVolumeControl()
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    await slider.vm.$emit('click:progress', 120.4)

    expect(mockSetVolume).toHaveBeenCalledWith(100)
  })

  it('regression: clamps displayed volume to valid 0-100 range', async () => {
    currentVolumeRef.value = -20
    const wrapper = mountVolumeControl()
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(slider.props('value')).toBe(0)

    currentVolumeRef.value = 200
    await wrapper.vm.$nextTick()

    expect(slider.props('value')).toBe(100)
  })

  it('integration: real ProgressSlider click wires to playerStore.setVolume', async () => {
    const wrapper = mountVolumeControlWithRealSlider()
    const slider = wrapper.get('.app-progress-slider')

    setSliderRect(slider.element, 10, 200)

    await slider.trigger('click', { clientX: 90 })

    expect(mockSetVolume).toHaveBeenCalledTimes(1)
    expect(mockSetVolume).toHaveBeenCalledWith(40)
  })
})

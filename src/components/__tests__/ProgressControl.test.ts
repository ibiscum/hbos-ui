import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import ProgressControl from '@/components/ProgressControl.vue'

vi.mock('@/stores/player', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')

  return {
    usePlayerStore: defineStore('player', () => {
      const isSendingCommand = ref(false)
      const playerCapabilities = ref({
        canSeek: true,
      })

      return {
        isSendingCommand,
        playerCapabilities,
      }
    }),
  }
})

vi.mock('@/stores/audio-controls', async () => {
  const { reactive } = await import('vue')

  const state = reactive({
    seekPosition: 42,
    seekPositionTime: '01:23',
    songDurationTime: '04:56',
    seekToPosition: vi.fn(),
  })

  return {
    useAudioControls: () => state,
  }
})

const mountProgressControl = (props: Record<string, unknown> = {}) => {
  return mount(ProgressControl, {
    props,
    global: {
      stubs: {
        ProgressTime: {
          name: 'ProgressTime',
          props: ['seekPositionTime', 'songDurationTime'],
          template: '<div class="progress-time-stub" />',
        },
        ProgressSlider: {
          name: 'ProgressSlider',
          props: ['value', 'disabled', 'min', 'max', 'step', 'hasThumb', 'isDraggable', 'isOnHeader'],
          emits: ['click:progress'],
          template: '<button class="progress-slider-stub" @click="$emit(\'click:progress\', 55)" />',
        },
      },
    },
  })
}

describe('ProgressControl.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders progress time and slider by default', () => {
    const wrapper = mountProgressControl()

    expect(wrapper.find('.app-progress-control').exists()).toBe(true)
    expect(wrapper.find('.progress-time-stub').exists()).toBe(true)
    expect(wrapper.find('.progress-slider-stub').exists()).toBe(true)
  })

  it('hides ProgressTime in header mode', () => {
    const wrapper = mountProgressControl({ isOnHeader: true })

    expect(wrapper.find('.progress-time-stub').exists()).toBe(false)
  })

  it('forwards time values to ProgressTime', () => {
    const wrapper = mountProgressControl()
    const progressTime = wrapper.getComponent({ name: 'ProgressTime' })

    expect(progressTime.props('seekPositionTime')).toBe('01:23')
    expect(progressTime.props('songDurationTime')).toBe('04:56')
  })

  it('forwards default slider props', () => {
    const wrapper = mountProgressControl()
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(slider.props('value')).toBe(42)
    expect(slider.props('min')).toBe(0)
    expect(slider.props('max')).toBe(100)
    expect(slider.props('step')).toBe(1)
    expect(slider.props('hasThumb')).toBe(true)
    expect(slider.props('isDraggable')).toBe(false)
    expect(slider.props('isOnHeader')).toBe(false)
    expect(slider.props('disabled')).toBe(false)
  })

  it('forwards explicit slider prop overrides', () => {
    const wrapper = mountProgressControl({
      min: 10,
      max: 90,
      step: 5,
      hasThumb: false,
      isDraggable: true,
      isOnHeader: true,
    })
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(slider.props('min')).toBe(10)
    expect(slider.props('max')).toBe(90)
    expect(slider.props('step')).toBe(5)
    expect(slider.props('hasThumb')).toBe(false)
    expect(slider.props('isDraggable')).toBe(true)
    expect(slider.props('isOnHeader')).toBe(true)
  })

  it('disables slider while command is being sent', async () => {
    const { usePlayerStore } = await import('@/stores/player')
    const playerStore = usePlayerStore()
    playerStore.isSendingCommand = true

    const wrapper = mountProgressControl()
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(slider.props('disabled')).toBe(true)
  })

  it('disables slider when seek capability is unavailable', async () => {
    const { usePlayerStore } = await import('@/stores/player')
    const playerStore = usePlayerStore()
    playerStore.playerCapabilities.canSeek = false

    const wrapper = mountProgressControl()
    const slider = wrapper.getComponent({ name: 'ProgressSlider' })

    expect(slider.props('disabled')).toBe(true)
  })

  it('forwards click:progress to audioControls.seekToPosition when enabled', async () => {
    const { useAudioControls } = await import('@/stores/audio-controls')
    const audioControls = useAudioControls()

    const wrapper = mountProgressControl()
    await wrapper.get('.progress-slider-stub').trigger('click')

    expect(audioControls.seekToPosition).toHaveBeenCalledTimes(1)
    expect(audioControls.seekToPosition).toHaveBeenCalledWith(55)
  })

  it('regression: ignores click:progress while disabled', async () => {
    const { usePlayerStore } = await import('@/stores/player')
    const { useAudioControls } = await import('@/stores/audio-controls')

    const playerStore = usePlayerStore()
    const audioControls = useAudioControls()

    playerStore.playerCapabilities.canSeek = false

    const wrapper = mountProgressControl()
    await wrapper.get('.progress-slider-stub').trigger('click')

    expect(audioControls.seekToPosition).not.toHaveBeenCalled()
  })
})

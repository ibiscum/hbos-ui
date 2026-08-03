import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import type { Ref } from 'vue'

import NowPlaying from '../now-playing.vue'
import { usePlayerStore } from '@/stores/player'

type Song = {
  title: string
  artist: string
}

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    template: `
      <section
        class="page-content-stub"
        :data-title="title"
        :data-hint-link="hintLink"
        :data-hint-string="hintString"
      >
        <slot />
      </section>
    `,
    props: ['title', 'hintLink', 'hintString'],
  },
}))

vi.mock('@/components/CoverArt.vue', () => ({
  default: {
    template: `
      <div class="cover-art-stub">
        <button
          class="emit-loaded"
          @click="$emit('loaded', { success: true, urls: ['/cover.jpg'], source: 'test' })"
        >
          loaded
        </button>
        <button class="emit-error" @click="$emit('error', 'cover-art-failed')">error</button>
      </div>
    `,
    emits: ['loaded', 'error'],
  },
}))

vi.mock('@/components/MetadataTooltip.vue', () => ({
  default: {
    template: '<div class="metadata-tooltip-stub" v-bind="$attrs" />',
    props: ['song'],
  },
}))

vi.mock('@/components/ProgressControl.vue', () => ({
  default: {
    template: '<div class="progress-control-stub" :data-draggable="String(isDraggable)" />',
    props: ['isDraggable'],
  },
}))

vi.mock('@/components/AudioControls.vue', () => ({
  default: {
    template: '<div class="audio-controls-stub" />',
  },
}))

vi.mock('@/components/VolumeControl.vue', () => ({
  default: {
    template: '<div class="volume-control-stub" :data-size="size" />',
    props: ['size'],
  },
}))

vi.mock('@/stores/player', async () => {
  const { ref } = await import('vue')

  const currentSong = ref<Song | null>({
    title: 'Test Song',
    artist: 'Test Artist',
  })

  return {
    usePlayerStore: () => ({
      currentSong,
    }),
  }
})

const getCurrentSong = () => usePlayerStore().currentSong as Ref<Song | null>

const mountView = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(NowPlaying, {
    global: {
      plugins: [pinia],
    },
  })

  await flushPromises()

  return { wrapper }
}

describe('now-playing view', () => {
  beforeEach(() => {
    getCurrentSong().value = {
      title: 'Test Song',
      artist: 'Test Artist',
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders page shell and control components with expected wiring', async () => {
    const { wrapper } = await mountView()

    const pageContent = wrapper.get('.page-content-stub')
    expect(pageContent.attributes('data-title')).toBe('Now Playing')
    expect(pageContent.attributes('data-hint-link')).toBe('/now-playing-minimal')
    expect(pageContent.attributes('data-hint-string')).toBe('Switch to minimal view')

    expect(wrapper.find('.now-playing__player').exists()).toBe(true)
    expect(wrapper.find('.cover-art-stub').exists()).toBe(true)
    expect(wrapper.find('.audio-controls-stub').exists()).toBe(true)
    expect(wrapper.find('.progress-control-stub').attributes('data-draggable')).toBe('')
    expect(wrapper.find('.volume-control-stub').attributes('data-size')).toBe('wide')
  })

  it('renders song metadata when current song exists', async () => {
    getCurrentSong().value = {
      title: 'Regression Song',
      artist: 'Regression Artist',
    }

    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Regression Song')
    expect(wrapper.text()).toContain('Regression Artist')
  })

  it('hides metadata and tooltip when there is no current song', async () => {
    getCurrentSong().value = null

    const { wrapper } = await mountView()

    expect(wrapper.find('.now-playing__info h2').exists()).toBe(false)
    expect(wrapper.find('.now-playing__info p').exists()).toBe(false)

    await wrapper.get('.now-playing__cover-container').trigger('mouseenter')
    expect(wrapper.find('.metadata-tooltip-stub').exists()).toBe(false)
  })

  it('shows tooltip on hover and keeps it within viewport boundaries', async () => {
    const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight')

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 })

    const { wrapper } = await mountView()
    const coverContainer = wrapper.get('.now-playing__cover-container')

    await coverContainer.trigger('mousemove', { clientX: 390, clientY: 290 })
    await coverContainer.trigger('mouseenter')

    const tooltip = wrapper.get('.metadata-tooltip-stub')
    const style = tooltip.attributes('style')

    expect(style).toContain('position: fixed')
    expect(style).toContain('left: 30px')
    expect(style).toContain('top: 80px')

    await coverContainer.trigger('mouseleave')
    expect(wrapper.find('.metadata-tooltip-stub').exists()).toBe(false)

    if (widthDescriptor) {
      Object.defineProperty(window, 'innerWidth', widthDescriptor)
    }
    if (heightDescriptor) {
      Object.defineProperty(window, 'innerHeight', heightDescriptor)
    }
  })

  it('clamps tooltip position near top-left viewport edges', async () => {
    const { wrapper } = await mountView()
    const coverContainer = wrapper.get('.now-playing__cover-container')

    await coverContainer.trigger('mousemove', { clientX: 0, clientY: 0 })
    await coverContainer.trigger('mouseenter')

    const style = wrapper.get('.metadata-tooltip-stub').attributes('style')
    expect(style).toContain('left: 10px')
    expect(style).toContain('top: 10px')
  })

  it('handles cover-art loaded and error events', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { wrapper } = await mountView()

    await wrapper.get('.emit-loaded').trigger('click')
    await wrapper.get('.emit-error').trigger('click')

    expect(logSpy).toHaveBeenCalledWith('Cover art loaded for now-playing:', {
      success: true,
      urls: ['/cover.jpg'],
      source: 'test',
    })
    expect(warnSpy).toHaveBeenCalledWith('Cover art error in now-playing:', 'cover-art-failed')
  })
})

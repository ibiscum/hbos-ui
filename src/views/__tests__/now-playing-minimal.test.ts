import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Ref } from 'vue'

import NowPlayingMinimal from '../now-playing-minimal.vue'
import { usePlayerStore } from '@/stores/player'

type Song = {
  title: string
  artist: string
}

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
    template: '<div class="progress-control-stub" />',
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
    template: '<div class="volume-control-stub" />',
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

const getCurrentSong = () => usePlayerStore().currentSong as unknown as Ref<Song | null>

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/now-playing-minimal',
        name: 'now-playing-minimal',
        component: NowPlayingMinimal,
      },
    ],
  })

const mountView = async (query: Record<string, string> = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = makeRouter()
  await router.push({ name: 'now-playing-minimal', query })
  await router.isReady()

  const wrapper = mount(NowPlayingMinimal, {
    global: {
      plugins: [pinia, router],
    },
  })

  await flushPromises()

  return { wrapper, router }
}

describe('now-playing-minimal view', () => {
  let originalBodyOverflow: string

  beforeEach(() => {
    originalBodyOverflow = document.body.style.overflow
    getCurrentSong().value = {
      title: 'Test Song',
      artist: 'Test Artist',
    }
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.body.style.overflow = originalBodyOverflow
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('renders major sections and audio-related child components', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.get('.now-playing.now-playing--minimal').attributes('role')).toBe('dialog')
    expect(wrapper.get('.now-playing.now-playing--minimal').attributes('aria-modal')).toBe('true')
    expect(wrapper.find('.now-playing__player').exists()).toBe(true)
    expect(wrapper.find('.cover-art-stub').exists()).toBe(true)
    expect(wrapper.find('.audio-controls-stub').exists()).toBe(true)
    expect(wrapper.find('.progress-control-stub').exists()).toBe(true)
    expect(wrapper.find('.volume-control-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('Use browser back button to return to normal view')
  })

  it('locks body scrolling while mounted and restores previous state on unmount', async () => {
    document.body.style.overflow = 'auto'

    const { wrapper } = await mountView()

    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
    await flushPromises()

    expect(document.body.style.overflow).toBe('auto')
  })

  it('applies dark mode when query contains dark and cleans it up on unmount', async () => {
    const { wrapper } = await mountView({ dark: '' })

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    wrapper.unmount()
    await flushPromises()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('does not remove a pre-existing dark class when no dark query is provided', async () => {
    document.documentElement.classList.add('dark')

    const { wrapper } = await mountView()

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    wrapper.unmount()
    await flushPromises()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reacts to dark query changes while mounted', async () => {
    const { wrapper, router } = await mountView()

    expect(document.documentElement.classList.contains('dark')).toBe(false)

    await router.push({ name: 'now-playing-minimal', query: { dark: '' } })
    await flushPromises()
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await router.push({ name: 'now-playing-minimal', query: {} })
    await flushPromises()
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    wrapper.unmount()
  })

  it('renders song metadata when a current song exists', async () => {
    getCurrentSong().value = {
      title: 'Regression Song',
      artist: 'Regression Artist',
    }

    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Regression Song')
    expect(wrapper.text()).toContain('Regression Artist')
  })

  it('hides metadata block and tooltip when there is no current song', async () => {
    getCurrentSong().value = null

    const { wrapper } = await mountView()

    expect(wrapper.find('.now-playing__info h2').exists()).toBe(false)
    expect(wrapper.find('.now-playing__info p').exists()).toBe(false)

    await wrapper.get('.now-playing__cover-container').trigger('mouseenter')
    expect(wrapper.find('.metadata-tooltip-stub').exists()).toBe(false)
  })

  it('shows tooltip on hover and positions it inside viewport boundaries', async () => {
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

  it('handles cover-art loaded and error events', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { wrapper } = await mountView()

    await wrapper.get('.emit-loaded').trigger('click')
    await wrapper.get('.emit-error').trigger('click')

    expect(logSpy).toHaveBeenCalledWith('Cover art loaded for now-playing-minimal:', {
      success: true,
      urls: ['/cover.jpg'],
      source: 'test',
    })
    expect(warnSpy).toHaveBeenCalledWith(
      'Cover art error in now-playing-minimal:',
      'cover-art-failed',
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import SongControlInfo from '@/components/SongControlInfo.vue'
import type { Song } from '@/types/player'

const mockState = vi.hoisted(() => ({
  currentSongRef: null as { value: Song | null } | null,
  routerPush: vi.fn(),
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const { ref } = await import('vue')

  if (!mockState.currentSongRef) {
    mockState.currentSongRef = ref<Song | null>(null)
  }

  return {
    ...actual,
    storeToRefs: () => ({
      currentSong: mockState.currentSongRef,
    }),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockState.routerPush,
  }),
}))

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({}),
}))

vi.mock('@/components/CoverArt.vue', () => ({
  default: {
    name: 'CoverArt',
    props: ['song', 'size', 'adaptToContainer'],
    template: '<div class="cover-art-stub" />',
  },
}))

vi.mock('@/components/MetadataTooltip.vue', () => ({
  default: {
    name: 'MetadataTooltip',
    props: ['song'],
    template: '<div class="metadata-tooltip-stub" />',
  },
}))

vi.mock('@/components/CustomMarquee.vue', () => ({
  default: {
    name: 'CustomMarquee',
    template: '<span class="custom-marquee-stub"><slot /></span>',
  },
}))

vi.mock('@/components/AudioControlsHeader.vue', () => ({
  default: {
    name: 'AudioControlsHeader',
    template: '<div class="audio-controls-header-stub" />',
  },
}))

vi.mock('@/components/AudioControls.vue', () => ({
  default: {
    name: 'AudioControls',
    props: ['isSeparate', 'isOnSticky'],
    template: '<div class="audio-controls-stub" :data-separate="String(isSeparate)" :data-sticky="String(isOnSticky)" />',
  },
}))

vi.mock('@/components/ProgressControl.vue', () => ({
  default: {
    name: 'ProgressControl',
    props: ['isOnHeader', 'isDraggable'],
    template: '<div class="progress-control-stub" :data-header="String(isOnHeader)" :data-draggable="String(isDraggable)" />',
  },
}))

function buildSong(overrides: Partial<Song> = {}): Song {
  return {
    title: 'Test Title',
    artist: 'Test Artist',
    duration: 180,
    ...overrides,
  }
}

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(SongControlInfo, {
    props,
  })
}

describe('SongControlInfo.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.currentSongRef!.value = buildSong()
  })

  it('renders current song details in two lines when title and artist are available', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.song-control-info').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test Title')
    expect(wrapper.text()).toContain('Test Artist')
    expect(wrapper.find('.h3.single-line').exists()).toBe(false)
  })

  it('renders a single-line fallback with artist/title/Unknown when metadata is missing', async () => {
    const wrapper = mountComponent()

    mockState.currentSongRef!.value = buildSong({ title: '', artist: 'Only Artist' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.h3.single-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('Only Artist')

    mockState.currentSongRef!.value = buildSong({ title: 'Only Title', artist: '' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Only Title')

    mockState.currentSongRef!.value = buildSong({ title: '', artist: '' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Unknown')
  })

  it('hides song info box when there is no current song', () => {
    mockState.currentSongRef!.value = null

    const wrapper = mountComponent()

    expect(wrapper.find('.song-control-info__box').exists()).toBe(false)
  })

  it('navigates to now-playing when song info is clicked', async () => {
    const wrapper = mountComponent()

    await wrapper.get('.song-control-info__box').trigger('click')

    expect(mockState.routerPush).toHaveBeenCalledTimes(1)
    expect(mockState.routerPush).toHaveBeenCalledWith({ name: 'now-playing' })
  })

  it('shows and hides metadata tooltip on cover hover', async () => {
    const wrapper = mountComponent()
    const cover = wrapper.get('.song-control-info__cover')

    expect(wrapper.find('.metadata-tooltip-stub').exists()).toBe(false)

    await cover.trigger('mouseenter')
    expect(wrapper.find('.metadata-tooltip-stub').exists()).toBe(true)

    await cover.trigger('mouseleave')
    expect(wrapper.find('.metadata-tooltip-stub').exists()).toBe(false)
  })

  it('positions tooltip within viewport bounds', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 })

    const wrapper = mountComponent()
    const cover = wrapper.get('.song-control-info__cover')

    await cover.trigger('mouseenter')
    await cover.trigger('mousemove', { clientX: 490, clientY: 390 })

    const tooltipStyle = wrapper.get('.metadata-tooltip-stub').attributes('style')
    expect(tooltipStyle).toContain('left: 130px')
    expect(tooltipStyle).toContain('top: 180px')
    expect(tooltipStyle).toContain('position: fixed')

    await cover.trigger('mousemove', { clientX: 0, clientY: 0 })

    const topLeftStyle = wrapper.get('.metadata-tooltip-stub').attributes('style')
    expect(topLeftStyle).toContain('left: 10px')
    expect(topLeftStyle).toContain('top: 10px')
  })

  it('renders header controls when isOnHeader is true', () => {
    const wrapper = mountComponent({ isOnHeader: true })

    expect(wrapper.find('.audio-controls-header-stub').exists()).toBe(true)
    expect(wrapper.find('.audio-controls-stub').exists()).toBe(false)

    const progress = wrapper.get('.progress-control-stub')
    expect(progress.attributes('data-header')).toBe('true')
    expect(progress.attributes('data-draggable')).toBe('')
  })

  it('renders sticky layout classes and hides progress in sticky mode', () => {
    const wrapper = mountComponent({ isOnSticky: true })

    expect(wrapper.find('.song-control-info.card').exists()).toBe(true)
    expect(wrapper.find('.progress-control-stub').exists()).toBe(false)

    const audioControls = wrapper.get('.audio-controls-stub')
    expect(audioControls.attributes('data-separate')).toBe('')
    expect(audioControls.attributes('data-sticky')).toBe('true')
  })

  it('regression: forwards isOnHeader prop to ProgressControl instead of forcing header mode', () => {
    const wrapper = mountComponent({ isOnHeader: false, isOnSticky: false })

    const progress = wrapper.get('.progress-control-stub')
    expect(progress.attributes('data-header')).toBe('false')
  })
})

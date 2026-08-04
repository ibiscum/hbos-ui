import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import CoverArt from '@/components/CoverArt.vue'
import type { Song } from '@/types/player'

const mockState = vi.hoisted(() => ({
  loadingRef: null as { value: boolean } | null,
  coverUrlRef: null as { value: string | null } | null,
  sourceRef: null as { value: 'song' | 'album' | 'artist' | 'none' } | null,
  loadCoverArtMock: vi.fn(),
  loadCoverArtFromAPIMock: vi.fn(),
  clearCoverArtMock: vi.fn(),
  clearCacheMock: vi.fn(),
}))

vi.mock('@/composables/useCoverArt', async () => {
  const { ref, computed } = await import('vue')

  if (!mockState.loadingRef) mockState.loadingRef = ref(false)
  if (!mockState.coverUrlRef) mockState.coverUrlRef = ref<string | null>(null)
  if (!mockState.sourceRef) mockState.sourceRef = ref<'song' | 'album' | 'artist' | 'none'>('none')

  return {
    useCoverArt: () => ({
      loading: mockState.loadingRef,
      hasCoverArt: computed(() => Boolean(mockState.coverUrlRef?.value)),
      bestCoverArt: computed(() => mockState.coverUrlRef?.value ?? null),
      coverArtSource: mockState.sourceRef,
      loadCoverArt: mockState.loadCoverArtMock,
      loadCoverArtFromAPI: mockState.loadCoverArtFromAPIMock,
      clearCoverArt: mockState.clearCoverArtMock,
      clearCache: mockState.clearCacheMock,
    }),
  }
})

const baseSong: Song = {
  title: 'November',
  artist: 'Limujii',
  album: 'Freetouse',
  duration: 167,
}

function makeResult(overrides: Partial<{ success: boolean; urls: string[]; source: string }> = {}) {
  return {
    success: true,
    urls: ['https://img.example/cover.jpg'],
    source: 'song',
    ...overrides,
  }
}

describe('CoverArt.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.loadingRef!.value = false
    mockState.coverUrlRef!.value = null
    mockState.sourceRef!.value = 'none'
    mockState.loadCoverArtMock.mockResolvedValue(makeResult())
    mockState.loadCoverArtFromAPIMock.mockResolvedValue(makeResult({
      urls: ['https://img.example/fallback.jpg'],
      source: 'artist',
    }))
  })

  it('renders placeholder when no cover art is available', () => {
    const wrapper = mount(CoverArt, {
      props: {
        autoLoad: false,
      },
    })

    expect(wrapper.find('.cover-placeholder.no-cover').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders loading state while cover art is loading', () => {
    mockState.loadingRef!.value = true

    const wrapper = mount(CoverArt, {
      props: {
        autoLoad: false,
      },
    })

    expect(wrapper.find('.cover-placeholder.loading-state').exists()).toBe(true)
    expect(wrapper.find('.cover-art').classes()).toContain('loading')
  })

  it('regression: auto-loads only once on initial mount', async () => {
    mount(CoverArt, {
      props: {
        song: baseSong,
      },
    })

    await flushPromises()

    expect(mockState.loadCoverArtMock).toHaveBeenCalledTimes(1)
    expect(mockState.loadCoverArtMock).toHaveBeenCalledWith(baseSong)
  })

  it('does not auto-load when autoLoad is false', async () => {
    mount(CoverArt, {
      props: {
        song: baseSong,
        autoLoad: false,
      },
    })

    await flushPromises()

    expect(mockState.loadCoverArtMock).not.toHaveBeenCalled()
  })

  it('renders image with composed alt text', () => {
    mockState.coverUrlRef!.value = 'https://img.example/current.jpg'
    mockState.sourceRef!.value = 'song'

    const wrapper = mount(CoverArt, {
      props: {
        song: baseSong,
        autoLoad: false,
      },
    })

    const image = wrapper.find('img')
    expect(image.exists()).toBe(true)
    expect(image.attributes('alt')).toBe('Cover art for November by Limujii from Freetouse')
  })

  it('shows source label when showSource is enabled and art is present', () => {
    mockState.coverUrlRef!.value = 'https://img.example/current.jpg'
    mockState.sourceRef!.value = 'artist'

    const wrapper = mount(CoverArt, {
      props: {
        song: baseSong,
        autoLoad: false,
        showSource: true,
      },
    })

    const badge = wrapper.find('.cover-source-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('artist')
  })

  it('falls back to API on image error for song source and emits loaded', async () => {
    mockState.coverUrlRef!.value = 'https://img.example/current.jpg'
    mockState.sourceRef!.value = 'song'

    const wrapper = mount(CoverArt, {
      props: {
        song: baseSong,
        autoLoad: false,
      },
    })

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(mockState.loadCoverArtFromAPIMock).toHaveBeenCalledTimes(1)
    expect(mockState.loadCoverArtFromAPIMock).toHaveBeenCalledWith(baseSong)
    expect(wrapper.emitted('loaded')).toBeTruthy()
  })

  it('uses metadata logo_url fallback when API fallback has no result', async () => {
    mockState.coverUrlRef!.value = 'https://img.example/current.jpg'
    mockState.sourceRef!.value = 'song'
    mockState.loadCoverArtFromAPIMock.mockResolvedValue(makeResult({ success: false, urls: [], source: 'none' }))
    mockState.loadCoverArtMock.mockResolvedValue(makeResult({ success: false, urls: [], source: 'none' }))

    const songWithMetadata = {
      ...baseSong,
      metadata: {
        logo_url: 'https://img.example/from-metadata.jpg',
      },
    } as Song

    const wrapper = mount(CoverArt, {
      props: {
        song: songWithMetadata,
        autoLoad: false,
      },
    })

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(mockState.loadCoverArtMock).toHaveBeenCalledWith(expect.objectContaining({
      cover_art_url: 'https://img.example/from-metadata.jpg',
      artwork_url: undefined,
    }))

    const loadedEvents = wrapper.emitted('loaded')
    expect(loadedEvents).toBeTruthy()
    const latestLoadedPayload = loadedEvents?.[loadedEvents.length - 1]?.[0] as { urls: string[] }
    expect(latestLoadedPayload.urls[0]).toBe('https://img.example/from-metadata.jpg')
  })

  it('emits error when all fallback paths are exhausted', async () => {
    mockState.coverUrlRef!.value = 'https://img.example/current.jpg'
    mockState.sourceRef!.value = 'artist'

    const wrapper = mount(CoverArt, {
      props: {
        song: baseSong,
        autoLoad: false,
      },
    })

    await wrapper.find('img').trigger('error')

    const errorEvents = wrapper.emitted('error')
    expect(errorEvents).toBeTruthy()
    expect(errorEvents?.[0]?.[0]).toContain('Failed to load image:')
  })
})

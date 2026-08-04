import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import LyricsOverlay from '@/components/LyricsOverlay.vue'
import type { Song } from '@/types/player'

const mockState = vi.hoisted(() => ({
  positionRef: null as { value: number } | null,
  rewriteUrlMock: vi.fn((url: string) => `/rewritten${url}`),
}))

vi.mock('@/composables/usePlayerPosition', async () => {
  const { ref } = await import('vue')

  if (!mockState.positionRef) {
    mockState.positionRef = ref(0)
  }

  return {
    usePlayerPosition: () => ({
      position: mockState.positionRef,
    }),
  }
})

vi.mock('@/api/utils', () => ({
  rewriteAudiocontrolApiUrl: mockState.rewriteUrlMock,
}))

function makeSong(lyricsUrl = '/api/lyrics/test-song'): Song {
  return {
    title: 'Test Song',
    artist: 'Test Artist',
    duration: 180,
    metadata: {
      lyrics_available: true,
      lyrics_url: lyricsUrl,
    },
  }
}

function mountComponent(props: Partial<{ isVisible: boolean; song: Song | null }> = {}) {
  return mount(LyricsOverlay, {
    props: {
      isVisible: true,
      song: makeSong(),
      ...props,
    },
  })
}

describe('LyricsOverlay.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.positionRef!.value = 0

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          found: true,
          lyrics: {
            type: 'synced',
            lyrics: [
              { timestamp: 0, text: 'Intro' },
              { timestamp: 10, text: 'Verse' },
              { timestamp: 20, text: 'Chorus' },
            ],
          },
        }),
      }),
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not render when hidden', () => {
    const wrapper = mountComponent({ isVisible: false })

    expect(wrapper.find('.lyrics-overlay').exists()).toBe(false)
  })

  it('renders overlay and fetches lyrics once on initial visible mount (regression)', async () => {
    const wrapper = mountComponent({ isVisible: true, song: makeSong('/api/lyrics/track-1') })
    await flushPromises()

    expect(wrapper.find('.lyrics-overlay').exists()).toBe(true)
    expect(mockState.rewriteUrlMock).toHaveBeenCalledTimes(1)
    expect(mockState.rewriteUrlMock).toHaveBeenCalledWith('/api/lyrics/track-1')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/rewritten/api/lyrics/track-1')
  })

  it('does not fetch while hidden and fetches after becoming visible', async () => {
    const wrapper = mountComponent({ isVisible: false, song: makeSong('/api/lyrics/track-2') })
    await flushPromises()

    expect(global.fetch).not.toHaveBeenCalled()

    await wrapper.setProps({ isVisible: true })
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/rewritten/api/lyrics/track-2')
  })

  it('shows loading state while lyrics request is in flight', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve
    })

    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingFetch))

    const wrapper = mountComponent({ isVisible: true })
    await nextTick()

    expect(wrapper.find('.lyrics-overlay__loading').exists()).toBe(true)

    if (resolveFetch) {
      resolveFetch({
        json: async () => ({ found: true, lyrics: { type: 'synced', lyrics: [] } }),
      })
    }
    await flushPromises()

    expect(wrapper.find('.lyrics-overlay__loading').exists()).toBe(false)
  })

  it('renders lyrics lines from a successful response', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const lines = wrapper.findAll('.lyrics-line')
    expect(lines).toHaveLength(3)
    expect(lines[0].text()).toBe('Intro')
    expect(lines[1].text()).toBe('Verse')
    expect(lines[2].text()).toBe('Chorus')
  })

  it('shows no-lyrics-found error when backend reports not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ found: false }),
      }),
    )

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.lyrics-overlay__error').exists()).toBe(true)
    expect(wrapper.text()).toContain('No lyrics found for this song')
  })

  it('shows generic error when request fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failed')))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.lyrics-overlay__error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load lyrics')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching lyrics:', expect.any(Error))
  })

  it('highlights current line for timed lyrics as position changes', async () => {
    mockState.positionRef!.value = 12

    const wrapper = mountComponent()
    await flushPromises()

    let lines = wrapper.findAll('.lyrics-line')
    expect(lines[1].classes()).toContain('lyrics-line--current')

    mockState.positionRef!.value = 22
    await nextTick()

    lines = wrapper.findAll('.lyrics-line')
    expect(lines[1].classes()).not.toContain('lyrics-line--current')
    expect(lines[2].classes()).toContain('lyrics-line--current')
  })

  it('does not highlight lines when lyrics are untimed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          found: true,
          lyrics: {
            type: 'plain',
            lyrics: [
              { timestamp: 0, text: 'Line 1' },
              { timestamp: 0, text: 'Line 2' },
            ],
          },
        }),
      }),
    )

    mockState.positionRef!.value = 50

    const wrapper = mountComponent()
    await flushPromises()

    const lines = wrapper.findAll('.lyrics-line')
    expect(lines[0].classes()).not.toContain('lyrics-line--current')
    expect(lines[1].classes()).not.toContain('lyrics-line--current')
  })

  it('emits close when clicking overlay background or close button', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.lyrics-overlay').trigger('click')
    await wrapper.find('.lyrics-overlay__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('does not emit close when clicking content panel', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.lyrics-overlay__content').trigger('click')

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('closes on Escape only when visible', async () => {
    const visibleWrapper = mountComponent({ isVisible: true })
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(visibleWrapper.emitted('close')).toHaveLength(1)

    const hiddenWrapper = mountComponent({ isVisible: false })
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(hiddenWrapper.emitted('close')).toBeFalsy()
  })
})

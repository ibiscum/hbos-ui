import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Song, StreamDetails } from '@/types/player'

import MetadataTooltip from '@/components/MetadataTooltip.vue'

const mockState = vi.hoisted(() => ({
  currentStreamDetailsRef: null as { value: StreamDetails | null } | null,
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const { ref } = await import('vue')

  if (!mockState.currentStreamDetailsRef) {
    mockState.currentStreamDetailsRef = ref<StreamDetails | null>(null)
  }

  return {
    ...actual,
    storeToRefs: () => ({
      currentStreamDetails: mockState.currentStreamDetailsRef,
    }),
  }
})

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({}),
}))

vi.mock('@/helpers/formatTime', () => ({
  formatTime: (seconds: number) => `formatted:${seconds}`,
}))

function buildSong(overrides: Partial<Song> = {}): Song {
  return {
    title: 'Test Title',
    artist: 'Test Artist',
    duration: 245,
    ...overrides,
  }
}

function mountComponent(song: Song | null) {
  return mount(MetadataTooltip, {
    props: { song },
  })
}

describe('MetadataTooltip.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.currentStreamDetailsRef!.value = null
  })

  it('renders a header and basic song metadata fields', () => {
    const wrapper = mountComponent(
      buildSong({
        album: 'Test Album',
        album_artist: 'Various Artists',
        track_number: 3,
      }),
    )

    expect(wrapper.text()).toContain('Track Metadata')
    expect(wrapper.text()).toContain('Title:')
    expect(wrapper.text()).toContain('Test Title')
    expect(wrapper.text()).toContain('Artist:')
    expect(wrapper.text()).toContain('Test Artist')
    expect(wrapper.text()).toContain('Album:')
    expect(wrapper.text()).toContain('Test Album')
    expect(wrapper.text()).toContain('Album Artist:')
    expect(wrapper.text()).toContain('Various Artists')
    expect(wrapper.text()).toContain('Track #:')
    expect(wrapper.text()).toContain('3')
  })

  it('renders formatted duration through formatTime helper', () => {
    const wrapper = mountComponent(buildSong({ duration: 321 }))

    expect(wrapper.text()).toContain('Duration:')
    expect(wrapper.text()).toContain('formatted:321')
  })

  it('does not render track number when it is zero or negative', async () => {
    const wrapper = mountComponent(buildSong({ track_number: 0 }))
    expect(wrapper.text()).not.toContain('Track #:')

    await wrapper.setProps({
      song: buildSong({ track_number: -1 }),
    })

    expect(wrapper.text()).not.toContain('Track #:')
  })

  it('renders stream details including sample rate formatting and bit depth', () => {
    mockState.currentStreamDetailsRef!.value = {
      codec: 'FLAC',
      sample_rate: 44100,
      bits_per_sample: 24,
      channels: 2,
    }

    const wrapper = mountComponent(buildSong())

    expect(wrapper.text()).toContain('Codec:')
    expect(wrapper.text()).toContain('FLAC')
    expect(wrapper.text()).toContain('Sample Rate:')
    expect(wrapper.text()).toContain('44.1 kHz')
    expect(wrapper.text()).toContain('Bit Depth:')
    expect(wrapper.text()).toContain('24-bit')
    expect(wrapper.text()).toContain('Channels:')
    expect(wrapper.text()).toContain('2')
  })

  it('renders sub-kHz sample rate values as Hz', () => {
    mockState.currentStreamDetailsRef!.value = { sample_rate: 960 }

    const wrapper = mountComponent(buildSong())

    expect(wrapper.text()).toContain('Sample Rate:')
    expect(wrapper.text()).toContain('960 Hz')
  })

  it('renders lyrics and URL metadata with status classes', async () => {
    const wrapper = mountComponent(
      buildSong({
        metadata: {
          lyrics_available: true,
          lyrics_url: 'https://lyrics.example/song',
        },
      }),
    )

    expect(wrapper.text()).toContain('Lyrics:')
    expect(wrapper.text()).toContain('Available')
    expect(wrapper.find('.metadata-value.status-available').exists()).toBe(true)
    expect(wrapper.text()).toContain('Lyrics URL:')
    expect(wrapper.text()).toContain('https://lyrics.example/song')

    await wrapper.setProps({
      song: buildSong({
        metadata: {
          lyrics_available: false,
        },
      }),
    })

    expect(wrapper.text()).toContain('Not Available')
    expect(wrapper.find('.metadata-value.status-unavailable').exists()).toBe(true)
  })

  it('renders source with capitalize helper class', () => {
    const wrapper = mountComponent(buildSong({ source: 'mpd' }))

    const sourceValue = wrapper.find('.metadata-value.capitalize')
    expect(wrapper.text()).toContain('Source:')
    expect(sourceValue.exists()).toBe(true)
    expect(sourceValue.text()).toBe('mpd')
  })

  it('shows empty-state message when no song and no stream metadata are available', () => {
    const wrapper = mountComponent(null)

    expect(wrapper.text()).toContain('No metadata available for this track')
  })

  it('regression: does not show empty-state when only stream metadata exists', () => {
    mockState.currentStreamDetailsRef!.value = {
      bits_per_sample: 16,
      channels: 2,
    }

    const wrapper = mountComponent(null)

    expect(wrapper.text()).toContain('Bit Depth:')
    expect(wrapper.text()).toContain('16-bit')
    expect(wrapper.text()).toContain('Channels:')
    expect(wrapper.text()).not.toContain('No metadata available for this track')
  })

  it('regression: does not show empty-state when only lyrics URL metadata exists', () => {
    const wrapper = mountComponent(
      buildSong({
        title: '',
        artist: '',
        duration: 0,
        metadata: {
          lyrics_url: 'https://lyrics.example/only-url',
        },
      }),
    )

    expect(wrapper.text()).toContain('Lyrics URL:')
    expect(wrapper.text()).toContain('https://lyrics.example/only-url')
    expect(wrapper.text()).not.toContain('No metadata available for this track')
  })
})

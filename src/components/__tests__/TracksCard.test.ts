import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import TracksCard from '@/components/TracksCard.vue'
import type { AlbumDetails, Track } from '@/types/library'

const playerMock = vi.hoisted(() => ({
  currentSong: null as ReturnType<typeof ref<{ title: string; artist?: string } | null>> | null,
  sendCommand: vi.fn(),
  clearQueueCommand: vi.fn(),
  sendLibraryCommand: vi.fn(),
  addTrackToQueue: vi.fn(),
}))

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T): T => store,
  }
})

vi.mock('@/stores/player', async () => {
  const vue = await import('vue')
  if (!playerMock.currentSong) {
    playerMock.currentSong = vue.ref<{ title: string; artist?: string } | null>(null)
  }
  return {
    usePlayerStore: () => ({
      currentSong: playerMock.currentSong,
      sendCommand: playerMock.sendCommand,
      sendLibraryCommand: playerMock.sendLibraryCommand,
      addTrackToQueue: playerMock.addTrackToQueue,
    }),
  }
})

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: '1',
    artist: 'Artist A',
    disc_number: '1',
    name: 'Track 1',
    track_number: 1,
    uri: 'track://1',
    ...overrides,
  }
}

function makeAlbum(artists: string[] = ['Artist A']): AlbumDetails {
  return {
    id: 'album-1',
    name: 'Album Name',
    release_date: '2020-01-01',
    tracks_count: 1,
    cover_art: 'cover.jpg',
    artists,
    tracks: [makeTrack()],
  }
}

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(TracksCard, {
    props: {
      tracks: [makeTrack()],
      loading: false,
      ...props,
    },
    global: {
      stubs: {
        AppSkeleton: {
          template: '<div class="app-skeleton-stub" />',
        },
        CustomMarquee: {
          template: '<span class="marquee-stub"><slot /></span>',
        },
      },
    },
  })
}

describe('TracksCard.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (playerMock.currentSong) playerMock.currentSong.value = null
    playerMock.sendCommand.mockReset()
    playerMock.sendLibraryCommand.mockReset()
    playerMock.addTrackToQueue.mockReset()

    playerMock.sendCommand.mockResolvedValue(true)
    playerMock.sendLibraryCommand.mockResolvedValue(true)
    playerMock.addTrackToQueue.mockResolvedValue(true)
  })

  it('renders five loading skeleton rows when loading is true', () => {
    const wrapper = mountComponent({ tracks: [], loading: true })

    expect(wrapper.findAll('.skeleton-item')).toHaveLength(5)
    expect(wrapper.findAll('.track-item:not(.skeleton-item)')).toHaveLength(0)
  })

  it('renders tracks with 1-based numbering and marquee content', () => {
    const wrapper = mountComponent({
      tracks: [
        makeTrack({ id: '1', name: 'First Song', track_number: 1 }),
        makeTrack({ id: '2', name: 'Second Song', artist: 'Artist B', track_number: 2 }),
      ],
    })

    const rows = wrapper.findAll('.track-item')
    expect(rows).toHaveLength(2)
    expect(wrapper.findAll('.track-item__num')[0].text()).toBe('1')
    expect(wrapper.findAll('.track-item__num')[1].text()).toBe('2')
    expect(wrapper.text()).toContain('First Song')
    expect(wrapper.text()).toContain('Second Song')
  })

  it('highlights only the currently playing track when title and artist both match', () => {
    if (playerMock.currentSong) {
      playerMock.currentSong.value = { title: 'Second Song', artist: 'Artist B' }
    }

    const wrapper = mountComponent({
      tracks: [
        makeTrack({ id: '1', name: 'First Song', artist: 'Artist A' }),
        makeTrack({ id: '2', name: 'Second Song', artist: 'Artist B' }),
      ],
    })

    const rows = wrapper.findAll('.track-item')
    expect(rows[0].classes()).not.toContain('track-item--current')
    expect(rows[1].classes()).toContain('track-item--current')
  })

  it('does not highlight when only title matches but artist differs', () => {
    if (playerMock.currentSong) {
      playerMock.currentSong.value = { title: 'Track 1', artist: 'Other Artist' }
    }

    const wrapper = mountComponent({ tracks: [makeTrack({ name: 'Track 1', artist: 'Artist A' })] })

    expect(wrapper.find('.track-item').classes()).not.toContain('track-item--current')
  })

  it('shows track artist when album is null', () => {
    const wrapper = mountComponent({
      tracks: [makeTrack({ artist: 'Featured Artist' })],
      album: null,
    })

    expect(wrapper.find('.track-item__desc-artist').exists()).toBe(true)
    expect(wrapper.text()).toContain('Featured Artist')
  })

  it('shows track artist when album has no artists', () => {
    const wrapper = mountComponent({
      tracks: [makeTrack({ artist: 'Featured Artist' })],
      album: makeAlbum([]),
    })

    expect(wrapper.find('.track-item__desc-artist').exists()).toBe(true)
    expect(wrapper.text()).toContain('Featured Artist')
  })

  it('hides track artist when track artist equals primary album artist', () => {
    const wrapper = mountComponent({
      tracks: [makeTrack({ artist: 'Main Artist' })],
      album: makeAlbum(['Main Artist', 'Guest Artist']),
    })

    expect(wrapper.find('.track-item__desc-artist').exists()).toBe(false)
  })

  it('hides track artist when track artist is empty', () => {
    const wrapper = mountComponent({
      tracks: [makeTrack({ artist: '' })],
      album: makeAlbum(['Main Artist']),
    })

    expect(wrapper.find('.track-item__desc-artist').exists()).toBe(false)
  })

  it('defaults loading to false and album to null when omitted', () => {
    const wrapper = mountComponent({
      tracks: [makeTrack({ name: 'Default Props Song', artist: 'Artist A' })],
      loading: undefined,
      album: undefined,
    })

    expect(wrapper.findAll('.skeleton-item')).toHaveLength(0)
    expect(wrapper.findAll('.track-item')).toHaveLength(1)
    expect(wrapper.find('.track-item__desc-artist').exists()).toBe(true)
  })

  it('executes queue flow in order on track click: pause -> clear_queue -> add -> play', async () => {
    const sequence: string[] = []
    playerMock.sendCommand.mockImplementation(async (command: string) => {
      sequence.push(`sendCommand:${command}`)
      return true
    })
    playerMock.addTrackToQueue.mockImplementation(async (track: Track) => {
      sequence.push(`addTrackToQueue:${track.id}`)
      return true
    })
    playerMock.sendLibraryCommand.mockImplementation(async (command: string) => {
      sequence.push(`sendLibraryCommand:${command}`)
      return true
    })

    const track = makeTrack({ id: 'track-42', name: 'Queue Me' })
    const wrapper = mountComponent({ tracks: [track] })

    await wrapper.find('.track-item').trigger('click')
    await flushPromises()

    expect(playerMock.sendCommand).toHaveBeenCalledWith('pause')
    expect(playerMock.sendCommand).toHaveBeenCalledWith('clear_queue')
    expect(playerMock.addTrackToQueue).toHaveBeenCalledWith(track)
    expect(playerMock.sendLibraryCommand).toHaveBeenCalledWith('play')

    expect(sequence).toEqual([
      'sendCommand:pause',
      'sendCommand:clear_queue',
      'addTrackToQueue:track-42',
      'sendLibraryCommand:play',
    ])
  })

  it('allows repeated rapid clicks to enqueue repeatedly (regression contract)', async () => {
    const wrapper = mountComponent({ tracks: [makeTrack()] })

    await wrapper.find('.track-item').trigger('click')
    await wrapper.find('.track-item').trigger('click')
    await wrapper.find('.track-item').trigger('click')
    await flushPromises()

    expect(playerMock.sendCommand).toHaveBeenCalledTimes(6)
    expect(playerMock.addTrackToQueue).toHaveBeenCalledTimes(3)
    expect(playerMock.sendLibraryCommand).toHaveBeenCalledTimes(3)
  })

  it('renders an empty list without crashing when tracks is empty', () => {
    const wrapper = mountComponent({ tracks: [], loading: false })

    expect(wrapper.findAll('.track-item')).toHaveLength(0)
    expect(wrapper.text()).toContain('Songs')
  })
})

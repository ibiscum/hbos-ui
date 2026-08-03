import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import type { Ref } from 'vue'

import PlaylistView from '../playlist.vue'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import type { Track } from '@/types/library'

type CurrentSong = {
  title: string
  artist: string
  uri?: string
}

type MockPlayerStore = {
  playerCapabilities: Ref<{ hasQueue: boolean }>
  currentSong: Ref<CurrentSong | null>
  sendCommand: ReturnType<typeof vi.fn>
}

type MockPlaylistStore = {
  loading: Ref<boolean>
  queue: Ref<Track[]>
  fetchQueue: ReturnType<typeof vi.fn>
}

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    template: '<section class="page-content-stub" :data-title="title"><slot /></section>',
    props: ['title', 'backrouterLink'],
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    template: '<span class="icon-stub" :data-icon="icon" />',
    props: ['icon'],
  },
}))

vi.mock('@/components/skeletons/AppSkeleton.vue', () => ({
  default: {
    template: '<span class="app-skeleton-stub" />',
  },
}))

vi.mock('@/stores/player', async () => {
  const { ref } = await import('vue')

  const playerCapabilities = ref({ hasQueue: true })
  const currentSong = ref<CurrentSong | null>(null)
  const sendCommand = vi.fn().mockResolvedValue(undefined)

  return {
    usePlayerStore: () => ({
      playerCapabilities,
      currentSong,
      sendCommand,
    }),
  }
})

vi.mock('@/stores/playlist', async () => {
  const { ref } = await import('vue')

  const loading = ref(false)
  const queue = ref<Track[]>([])
  const fetchQueue = vi.fn().mockResolvedValue(undefined)

  return {
    usePlaylistStore: () => ({
      loading,
      queue,
      fetchQueue,
    }),
  }
})

const getPlayerStore = () => usePlayerStore() as unknown as MockPlayerStore
const getPlaylistStore = () => usePlaylistStore() as unknown as MockPlaylistStore

const makeTrack = (overrides: Partial<Track> = {}): Track => ({
  disc_number: '1',
  name: 'Test Title',
  track_number: 1,
  uri: 'track://test',
  artist: 'Test Artist',
  ...overrides,
})

const mountView = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(PlaylistView, {
    global: {
      plugins: [pinia],
    },
  })

  await flushPromises()
  return wrapper
}

describe('playlist view', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const playerStore = getPlayerStore()
    playerStore.playerCapabilities.value = { hasQueue: true }
    playerStore.currentSong.value = null
    playerStore.sendCommand.mockResolvedValue(undefined)

    const playlistStore = getPlaylistStore()
    playlistStore.loading.value = false
    playlistStore.queue.value = []
    playlistStore.fetchQueue.mockResolvedValue(undefined)
  })

  it('fetches queue on mount when queue support is enabled', async () => {
    const wrapper = await mountView()

    expect(getPlaylistStore().fetchQueue).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.page-content-stub').attributes('data-title')).toBe('Queue')
  })

  it('does not fetch queue and renders no-support state when queue support is disabled', async () => {
    const playerStore = getPlayerStore()
    playerStore.playerCapabilities.value = { hasQueue: false }

    const wrapper = await mountView()

    expect(getPlaylistStore().fetchQueue).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('No queue support')
  })

  it('renders loading skeletons while queue is loading', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.loading.value = true

    const wrapper = await mountView()

    expect(wrapper.findAll('.skeleton-item')).toHaveLength(5)
  })

  it('renders empty-state text when queue is empty', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Your queue is empty')
  })

  it('renders queued tracks and fallback metadata labels', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.queue.value = [
      makeTrack({ name: 'Known Song', artist: 'Known Artist', uri: 'track://known' }),
      makeTrack({ name: '', artist: '', uri: 'track://unknown' }),
    ]

    const wrapper = await mountView()

    const items = wrapper.findAll('.track-item')
    expect(items).toHaveLength(2)
    expect(wrapper.text()).toContain('Known Song')
    expect(wrapper.text()).toContain('Known Artist')
    expect(wrapper.text()).toContain('Unknown Title')
    expect(wrapper.text()).toContain('Unknown Artist')
  })

  it('highlights the current track by URI match', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.queue.value = [
      makeTrack({ uri: 'track://one' }),
      makeTrack({ uri: 'track://two' }),
    ]

    const playerStore = getPlayerStore()
    playerStore.currentSong.value = {
      title: 'Different Title',
      artist: 'Different Artist',
      uri: 'track://two',
    }

    const wrapper = await mountView()
    const items = wrapper.findAll('.track-item')

    expect(items[0].classes('track-item--current')).toBe(false)
    expect(items[1].classes('track-item--current')).toBe(true)
  })

  it('falls back to title and artist matching when URI is not available', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.queue.value = [
      makeTrack({ name: 'Other Song', artist: 'Other Artist', uri: '' }),
      makeTrack({ name: 'Match Song', artist: 'Match Artist', uri: '' }),
    ]

    const playerStore = getPlayerStore()
    playerStore.currentSong.value = {
      title: 'Match Song',
      artist: 'Match Artist',
    }

    const wrapper = await mountView()
    const items = wrapper.findAll('.track-item')

    expect(items[0].classes('track-item--current')).toBe(false)
    expect(items[1].classes('track-item--current')).toBe(true)
  })

  it('plays selected queue item with pause, seek, and play commands in order', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.queue.value = [makeTrack({ uri: 'track://one' })]

    const wrapper = await mountView()
    await wrapper.get('.track-item').trigger('click')
    await flushPromises()

    const sendCommand = getPlayerStore().sendCommand
    expect(sendCommand).toHaveBeenNthCalledWith(1, 'pause')
    expect(sendCommand).toHaveBeenNthCalledWith(2, 'play_queue_index:0')
    expect(sendCommand).toHaveBeenNthCalledWith(3, 'play')
  })

  it('removes queue item without triggering parent playback click', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.queue.value = [makeTrack({ uri: 'track://one' })]

    const wrapper = await mountView()
    await wrapper.get('.track-item__remove').trigger('click')
    await flushPromises()

    const sendCommand = getPlayerStore().sendCommand
    expect(sendCommand).toHaveBeenCalledWith('remove_track:0')
    expect(sendCommand).not.toHaveBeenCalledWith('pause')
    expect(getPlaylistStore().fetchQueue).toHaveBeenCalledTimes(2)
  })

  it('clears queue and refreshes it when clicking clear button', async () => {
    const playlistStore = getPlaylistStore()
    playlistStore.queue.value = [makeTrack({ uri: 'track://one' })]

    const wrapper = await mountView()
    await wrapper.get('.clear-queue-btn').trigger('click')
    await flushPromises()

    const sendCommand = getPlayerStore().sendCommand
    expect(sendCommand).toHaveBeenCalledWith('clear_queue')
    expect(getPlaylistStore().fetchQueue).toHaveBeenCalledTimes(2)
  })
})

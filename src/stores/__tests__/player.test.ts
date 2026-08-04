import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  mockGetVolumeInfo,
  mockGetVolumeState,
  mockSetVolumeLevel,
  mockIncreaseVolume,
  mockDecreaseVolume,
  mockToggleMute,
  mockSetupWebSocket,
  mockSubscribeToPlayerEvents,
  mockApiFetch,
  mockExtractPlayerCapabilities,
  mockPlayerChanged,
  mockAddTrackToPlayer,
  mockGetFavouriteDetails,
  mockToggleFavourite,
  mockShowErrorToast,
  mockShowSuccessToast,
  mockLibraryFetch,
  mockGetAvailableLibrary,
  libraryStoreState,
  favouritesErrorState,
} = vi.hoisted(() => ({
  mockGetVolumeInfo: vi.fn(),
  mockGetVolumeState: vi.fn(),
  mockSetVolumeLevel: vi.fn(),
  mockIncreaseVolume: vi.fn(),
  mockDecreaseVolume: vi.fn(),
  mockToggleMute: vi.fn(),
  mockSetupWebSocket: vi.fn(),
  mockSubscribeToPlayerEvents: vi.fn(),
  mockApiFetch: vi.fn(),
  mockExtractPlayerCapabilities: vi.fn(),
  mockPlayerChanged: vi.fn(),
  mockAddTrackToPlayer: vi.fn(),
  mockGetFavouriteDetails: vi.fn(),
  mockToggleFavourite: vi.fn(),
  mockShowErrorToast: vi.fn(),
  mockShowSuccessToast: vi.fn(),
  mockLibraryFetch: vi.fn(),
  mockGetAvailableLibrary: vi.fn(),
  libraryStoreState: {
    activeLibrary: 'mpd' as string | null,
    isAvailableLibrary: true,
  },
  favouritesErrorState: { value: null as string | null },
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => '/api',
  }),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mockShowErrorToast,
    showSuccessToast: mockShowSuccessToast,
  }),
}))

vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    get activeLibrary() {
      return libraryStoreState.activeLibrary
    },
    get isAvailableLibrary() {
      return libraryStoreState.isAvailableLibrary
    },
    getAvailableLibrary: mockGetAvailableLibrary,
  }),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => mockLibraryFetch,
}))

vi.mock('@/stores/player-web-socket', () => ({
  usePlayerWebSocket: () => ({
    setupWebSocket: mockSetupWebSocket,
    subscribeToPlayerEvents: mockSubscribeToPlayerEvents,
  }),
}))

vi.mock('@/stores/player-changes', () => ({
  usePlayerChangesStore: () => ({
    player_changed: mockPlayerChanged,
  }),
}))

vi.mock('@/api/player', () => ({
  addTrackToPlayer: mockAddTrackToPlayer,
}))

vi.mock('@/composables/useFavourites', () => ({
  useFavourites: () => ({
    getFavouriteDetails: mockGetFavouriteDetails,
    toggleFavourite: mockToggleFavourite,
    error: favouritesErrorState,
  }),
}))

vi.mock('@/api/volume', () => ({
  getVolumeInfo: mockGetVolumeInfo,
  getVolumeState: mockGetVolumeState,
  setVolumeLevel: mockSetVolumeLevel,
  increaseVolume: mockIncreaseVolume,
  decreaseVolume: mockDecreaseVolume,
  toggleMute: mockToggleMute,
}))

vi.mock('@/api/http', () => ({
  apiFetch: mockApiFetch,
}))

vi.mock('@/helpers/extractPlayerCapabilities', () => ({
  DEFAULT_CAPABILITIES: {},
  extractPlayerCapabilities: mockExtractPlayerCapabilities,
}))

import { usePlayerStore } from '@/stores/player'
import { PLAYER_CONFIG } from '@/stores/player'

describe('player store - unit and regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockGetVolumeInfo.mockResolvedValue({ available: false, current_state: null })
    mockGetVolumeState.mockResolvedValue(null)
    mockSetVolumeLevel.mockResolvedValue({ success: true, new_state: { percentage: 50, muted: false } })
    mockIncreaseVolume.mockResolvedValue({ success: true, new_state: { percentage: 55, muted: false } })
    mockDecreaseVolume.mockResolvedValue({ success: true, new_state: { percentage: 45, muted: false } })
    mockToggleMute.mockResolvedValue({ success: true, new_state: { percentage: 45, muted: true } })
    mockExtractPlayerCapabilities.mockReturnValue({})
    mockShowErrorToast.mockReset()
    mockShowSuccessToast.mockReset()
    mockAddTrackToPlayer.mockReset()
    mockGetFavouriteDetails.mockReset()
    mockToggleFavourite.mockReset()
    favouritesErrorState.value = null
    libraryStoreState.activeLibrary = 'mpd'
    libraryStoreState.isAvailableLibrary = true
    mockGetAvailableLibrary.mockReset()
    mockLibraryFetch.mockReset()
    mockLibraryFetch.mockReturnValue({
      post: vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({ error: { value: null } }),
      }),
    })

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        player: { name: 'mpd' },
        song: null,
        stream_details: null,
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initPlayer resets isSendingCommand after successful initialization', async () => {
    const store = usePlayerStore()

    await store.initPlayer()

    expect(store.isSendingCommand).toBe(false)
    expect(mockSetupWebSocket).toHaveBeenCalledTimes(1)
    expect(store.updateIntervalID).toBeDefined()

    store.clearPollingInterval()
  })

  it('initPlayer resets isSendingCommand when websocket setup throws', async () => {
    const store = usePlayerStore()
    mockSetupWebSocket.mockImplementationOnce(() => {
      throw new Error('ws unavailable')
    })

    await expect(store.initPlayer()).rejects.toThrow('ws unavailable')

    expect(store.isSendingCommand).toBe(false)
    expect(store.updateIntervalID).toBeUndefined()
  })

  it('sendCommand returns false when command endpoint responds with non-OK status', async () => {
    const store = usePlayerStore()
    mockApiFetch.mockReset()

    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn(),
    })

    const resultPromise = store.sendCommand('play')
    await vi.runAllTimersAsync()

    await expect(resultPromise).resolves.toBe(false)
    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    expect(mockApiFetch).toHaveBeenCalledWith('/api/player/active/command/play', { method: 'POST' })
    expect(store.isSendingCommand).toBe(false)
  })

  it('sendCommand encodes player name and command path segments', async () => {
    const store = usePlayerStore()
    store.currentData = { player: { name: 'A/B Name' } } as any
    mockApiFetch.mockReset()

    mockApiFetch
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ player: { name: 'A/B Name' }, song: null, stream_details: null }),
      })

    const promise = store.sendCommand('next/track')
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe(true)
    expect(mockApiFetch).toHaveBeenNthCalledWith(
      1,
      '/api/player/A%2FB%20Name/command/next%2Ftrack',
      { method: 'POST' },
    )
  })

  it('initPlayer clears an existing interval before creating a new one', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const store = usePlayerStore()

    await store.initPlayer()
    await store.initPlayer()

    expect(clearIntervalSpy).toHaveBeenCalled()
    store.clearPollingInterval()
    clearIntervalSpy.mockRestore()
  })

  it('addTrackToQueue supports string identifiers and sends them to active library', async () => {
    const store = usePlayerStore()
    mockAddTrackToPlayer.mockResolvedValue(true)

    await store.addTrackToQueue('spotify:track:123')

    expect(mockAddTrackToPlayer).toHaveBeenCalledWith('mpd', 'spotify:track:123')
    expect(store.loading).toBe(false)
    expect(mockShowErrorToast).not.toHaveBeenCalled()
  })

  it('addTrackToQueue resolves active library when missing', async () => {
    const store = usePlayerStore()
    libraryStoreState.activeLibrary = null
    mockGetAvailableLibrary.mockImplementation(async () => {
      libraryStoreState.activeLibrary = 'library-player'
    })
    mockAddTrackToPlayer.mockResolvedValue(true)

    await store.addTrackToQueue({
      name: 'Track 1',
      uri: '/music/track1.flac',
      track_number: 1,
      disc_number: '1',
    })

    expect(mockGetAvailableLibrary).toHaveBeenCalledTimes(1)
    expect(mockAddTrackToPlayer).toHaveBeenCalledWith('library-player', '/music/track1.flac')
  })

  it('addTrackToQueue reports invalid identifiers and always resets loading', async () => {
    const store = usePlayerStore()

    await store.addTrackToQueue({
      name: 'Invalid',
      uri: '',
      track_number: 1,
      disc_number: '1',
      id: '',
    })

    expect(mockAddTrackToPlayer).not.toHaveBeenCalled()
    expect(mockShowErrorToast).toHaveBeenCalledWith('No valid track identifier available')
    expect(store.loading).toBe(false)
  })

  it('fetchCurrentPlayer notifies and resubscribes when active player changes', async () => {
    const store = usePlayerStore()
    store.currentData = { player: { name: 'mpd' } } as any
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        player: { name: 'spotify' },
        song: null,
        stream_details: null,
      }),
    })

    const data = await store.fetchCurrentPlayer()

    expect(data?.player?.name).toBe('spotify')
    expect(mockPlayerChanged).toHaveBeenCalledWith('mpd', 'spotify')
    expect(mockSubscribeToPlayerEvents).toHaveBeenCalledTimes(1)
  })

  it('fetchPlayers returns empty array for invalid payload shape', async () => {
    const store = usePlayerStore()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ players: null }),
    })

    await expect(store.fetchPlayers()).resolves.toEqual([])
  })

  it('toggleCurrentSongFavourite toggles state and emits success toast', async () => {
    const store = usePlayerStore()
    store.currentData = {
      player: { name: 'mpd' },
      song: {
        artist: 'Artist',
        title: 'Song',
        duration: 120,
      },
    } as any
    mockGetFavouriteDetails.mockResolvedValue({ is_favourite: false, providers: [] })
    mockToggleFavourite.mockResolvedValue(true)

    await store.checkCurrentSongFavouriteStatus()

    const result = await store.toggleCurrentSongFavourite()

    expect(result).toBe(true)
    expect(store.currentSongIsFavourite).toBe(true)
    expect(mockShowSuccessToast).toHaveBeenCalledWith('"Song" added to favourites')
  })

  it('checkCurrentSongFavouriteStatus clears favourite state when no current song metadata exists', async () => {
    const store = usePlayerStore()
    store.currentData = { player: { name: 'mpd' }, song: null } as any

    await store.checkCurrentSongFavouriteStatus()

    expect(store.currentSongIsFavourite).toBe(false)
    expect(store.currentSongFavouriteProviders).toEqual([])
    expect(store.checkingFavourite).toBe(false)
  })

  it('polling executes exactly once per interval after repeated init', async () => {
    const store = usePlayerStore()
    mockApiFetch.mockReset()

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        player: { name: 'mpd' },
        song: null,
        stream_details: null,
      }),
    })

    await store.initPlayer()
    await store.initPlayer()

    mockApiFetch.mockClear()
    await vi.advanceTimersByTimeAsync(PLAYER_CONFIG.pollingInterval)

    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    expect(mockApiFetch).toHaveBeenCalledWith('/api/now-playing')
    store.clearPollingInterval()
  })
})

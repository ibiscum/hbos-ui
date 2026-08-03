import { beforeEach, describe, expect, it, vi } from 'vitest'
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
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => '/api',
  }),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  }),
}))

vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    activeLibrary: 'mpd',
    getAvailableLibrary: vi.fn(),
  }),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => vi.fn(),
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
  addTrackToPlayer: vi.fn(),
}))

vi.mock('@/composables/useFavourites', () => ({
  useFavourites: () => ({
    getFavouriteDetails: vi.fn(),
    toggleFavourite: vi.fn(),
    error: { value: null },
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

describe('player store - regression tests', () => {
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
    mockApiFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        player: { name: 'mpd' },
        song: null,
        stream_details: null,
      }),
    })
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
})

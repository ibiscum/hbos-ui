import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRadioStore, type RadioStation } from '../radio'

const mockPlayerSendCommand = vi.fn()
const mockApiFetch = vi.fn()
const mockSendPlayerCommand = vi.fn()
const mockAddTrackToPlayer = vi.fn()
const mockGetConfigValue = vi.fn()
const mockSetConfigValue = vi.fn()
const mockConfigGetConfig = vi.fn()

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({
    sendCommand: mockPlayerSendCommand,
  }),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    radioPlayer: 'mpd',
    getApiBaseUrl: () => 'http://device.local/api/audiocontrol',
    getConfig: mockConfigGetConfig,
  }),
}))

vi.mock('@/api/http', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

vi.mock('@/api/player', () => ({
  sendPlayerCommand: (...args: unknown[]) => mockSendPlayerCommand(...args),
  addTrackToPlayer: (...args: unknown[]) => mockAddTrackToPlayer(...args),
}))

vi.mock('@/api/config', () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
  setConfigValue: (...args: unknown[]) => mockSetConfigValue(...args),
}))

const station: RadioStation = {
  id: 'station-1',
  name: 'Radio One',
  url: 'https://example.com/stream',
  image: 'https://img/logo.png',
  tags: 'rock',
  country: 'DE',
  language: 'de',
  bitrate: 128,
  codec: 'mp3',
}

describe('Radio Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('initializes with empty collections and unloaded state', () => {
    const store = useRadioStore()
    expect(store.favorites).toEqual({})
    expect(store.searchResults).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.loaded).toBe(false)
  })

  it('add/remove/toggle favorite updates state and persists', async () => {
    const store = useRadioStore()
    mockSetConfigValue.mockResolvedValue({ status: 'success' })
    store.searchResults = [{ ...station }]

    store.addToFavorites(station)
    await Promise.resolve()
    expect(store.favorites[station.id]).toBeDefined()
    expect(store.searchResults[0].isFavorite).toBe(true)
    expect(mockSetConfigValue).toHaveBeenCalled()

    store.toggleFavorite(station)
    await Promise.resolve()
    expect(store.favorites[station.id]).toBeUndefined()
    expect(store.searchResults[0].isFavorite).toBe(false)
  })

  it('search maps api data and marks existing favorites', async () => {
    const store = useRadioStore()
    mockSetConfigValue.mockResolvedValue({ status: 'success' })
    store.addToFavorites(station)
    await Promise.resolve()

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          stationuuid: 'station-1',
          name: 'Radio One',
          url: 'https://example.com/stream',
          favicon: 'https://img/logo.png',
          tags: 'rock',
          country: 'DE',
          language: 'de',
          bitrate: 128,
          codec: 'mp3',
        },
      ]),
    } as Response)

    await store.search('radio one')

    expect(store.loaded).toBe(true)
    expect(store.searchResults).toHaveLength(1)
    expect(store.searchResults[0].isFavorite).toBe(true)
  })

  it('search failure clears results and resets loaded=false', async () => {
    const store = useRadioStore()
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ stationuuid: 'x', name: 'X', url: 'u' }]),
    } as Response)
    await store.search('ok')
    expect(store.loaded).toBe(true)

    fetchMock.mockRejectedValueOnce(new Error('network'))
    await store.search('fail')

    expect(store.searchResults).toEqual([])
    expect(store.loaded).toBe(false)
  })

  it('playStation uses configured radio player and queues playback', async () => {
    const store = useRadioStore()
    mockPlayerSendCommand.mockResolvedValue(undefined)
    mockSendPlayerCommand.mockResolvedValue(undefined)
    mockAddTrackToPlayer.mockResolvedValue(undefined)

    await store.playStation(station)

    expect(mockPlayerSendCommand).toHaveBeenCalledWith('pause')
    expect(mockSendPlayerCommand).toHaveBeenCalledWith('mpd', 'clear_queue')
    expect(mockAddTrackToPlayer).toHaveBeenCalledWith(
      'mpd',
      station.url,
      expect.objectContaining({ title: station.name, album: 'Radio' }),
    )
    expect(mockSendPlayerCommand).toHaveBeenCalledWith('mpd', 'play')
  })
})

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
    mockGetConfigValue.mockResolvedValue({ status: 'success', data: { value: '{}' } })
    mockSetConfigValue.mockResolvedValue({ status: 'success' })
    mockConfigGetConfig.mockResolvedValue(undefined)
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

  it('search with blank query clears previous results', async () => {
    const store = useRadioStore()
    store.searchResults = [{ ...station }]
    store.loaded = true

    await store.search('   ')

    expect(store.searchResults).toEqual([])
    expect(store.loaded).toBe(false)
    expect(store.loading).toBe(false)
  })

  it('parseM3U resolves first stream entry from backend parser', async () => {
    const store = useRadioStore()
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        playlist: {
          entries: [{ url: 'https://stream.example.com/live' }],
        },
      }),
    })

    const parsed = await store.parseM3U('https://example.com/listen.m3u')

    expect(parsed).toBe('https://stream.example.com/live')
    expect(mockApiFetch).toHaveBeenCalledWith(
      'http://device.local/api/audiocontrol/m3u/parse',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('parseM3U falls back to original URL when backend parser fails', async () => {
    const store = useRadioStore()
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    const original = 'https://example.com/listen.m3u'
    const parsed = await store.parseM3U(original)

    expect(parsed).toBe(original)
  })

  it('loadFavoritesFromConfig migrates legacy favorite fields to metadata', async () => {
    const store = useRadioStore()
    mockGetConfigValue.mockResolvedValueOnce({
      status: 'success',
      data: {
        value: JSON.stringify({
          old1: {
            id: 'old1',
            title: 'Old Station',
            url: 'https://old.example.com',
            img: 'https://old.example.com/logo.png',
            country: 'DE',
            tags: 'retro',
          },
        }),
      },
    })

    await store.loadFavoritesFromConfig()

    expect(store.favorites.old1).toBeDefined()
    expect(store.favorites.old1.metadata?.coverart_url).toBe('https://old.example.com/logo.png')
    expect(store.favorites.old1.metadata?.country).toBe('DE')
    expect(store.favorites.old1.metadata?.tags).toBe('retro')
  })

  it('loadFavoritesFromConfig resets favorites when payload is malformed', async () => {
    const store = useRadioStore()
    store.favorites = {
      stale: {
        id: 'stale',
        title: 'Stale',
        url: 'https://stale.example.com',
      },
    }
    mockGetConfigValue.mockResolvedValueOnce({
      status: 'success',
      data: {
        value: JSON.stringify(['not-an-object']),
      },
    })

    await store.loadFavoritesFromConfig()

    expect(store.favorites).toEqual({})
  })

  it('setRadioBrowserBaseUrl falls back to de2 when server list is empty', async () => {
    const store = useRadioStore()
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    } as Response)

    await store.initialize()

    expect(store.radioBrowserBaseUrl).toBe('https://de2.api.radio-browser.info')
  })

  it('initialize uses stored reachable radio-browser URL', async () => {
    const store = useRadioStore()
    const fetchMock = vi.mocked(fetch)

    localStorage.setItem('radioBrowserBaseUrl', 'https://cached.radio-browser.info')
    fetchMock.mockResolvedValueOnce({ ok: true } as Response)

    await store.initialize()

    expect(store.radioBrowserBaseUrl).toBe('https://cached.radio-browser.info')
    expect(mockConfigGetConfig).toHaveBeenCalledTimes(1)
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

  it('playStation parses m3u URL before queueing playback', async () => {
    const store = useRadioStore()
    mockPlayerSendCommand.mockResolvedValue(undefined)
    mockSendPlayerCommand.mockResolvedValue(undefined)
    mockAddTrackToPlayer.mockResolvedValue(undefined)
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        playlist: {
          entries: [{ url: 'https://resolved.example.com/stream.mp3' }],
        },
      }),
    })

    await store.playStation({
      ...station,
      url: 'https://example.com/playlist.m3u',
    })

    expect(mockAddTrackToPlayer).toHaveBeenCalledWith(
      'mpd',
      'https://resolved.example.com/stream.mp3',
      expect.objectContaining({ title: station.name, album: 'Radio' }),
    )
  })
})

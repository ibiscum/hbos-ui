import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockPlayerState = vi.hoisted(() => ({
  currentPlayerName: null as string | null,
}))

const {
  mockFetchCurrentPlayer,
  mockFetchVolumeState,
  mockRetrieveActivePlayer,
  mockFetchPlayers,
  mockGetWsBaseUrl,
} = vi.hoisted(() => ({
  mockFetchCurrentPlayer: vi.fn(),
  mockFetchVolumeState: vi.fn(),
  mockRetrieveActivePlayer: vi.fn(),
  mockFetchPlayers: vi.fn(),
  mockGetWsBaseUrl: vi.fn(),
}))

vi.mock('@/stores/player', () => ({
  PLAYER_CONFIG: {
    fastUpdateAfterCommand: 50,
    wsReconnectInterval: 100,
  },
  usePlayerStore: () => ({
    get currentPlayerName() {
      return mockPlayerState.currentPlayerName
    },
    fetchCurrentPlayer: mockFetchCurrentPlayer,
    fetchVolumeState: mockFetchVolumeState,
    retrieveActivePlayer: mockRetrieveActivePlayer,
    fetchPlayers: mockFetchPlayers,
  }),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getWsBaseUrl: mockGetWsBaseUrl,
    config: {
      audiocontrol_api: {
        devicePort: 80,
      },
    },
  }),
}))

vi.mock('@vueuse/core', () => ({
  useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
}))

import { usePlayerWebSocket } from '@/stores/player-web-socket'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(payload: string) {
    this.sent.push(payload)
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.({} as Event)
  }

  triggerMessage(data: unknown) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data)
    this.onmessage?.({ data: payload } as MessageEvent)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: 1000, reason: 'manual-close' } as CloseEvent)
  }

  triggerUnexpectedClose() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: 1006, reason: 'network-drop' } as CloseEvent)
  }
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('player-web-socket store - consolidated regression and unit tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockPlayerState.currentPlayerName = null
    MockWebSocket.instances = []
    mockGetWsBaseUrl.mockReturnValue('ws://localhost:3000/api')
    mockRetrieveActivePlayer.mockResolvedValue('mpd')
    mockFetchPlayers.mockResolvedValue([{ name: 'mpd' }])

    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  it('creates websocket using parsed ws URL components', () => {
    const store = usePlayerWebSocket()

    store.setupWebSocket()

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000/api/events')
  })

  it('uses configured device port when URL has no explicit port', () => {
    const store = usePlayerWebSocket()
    mockGetWsBaseUrl.mockReturnValue('ws://localhost/api/audiocontrol')

    store.setupWebSocket()

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:80/api/audiocontrol/events')
  })

  it('creates secure websocket URL when app config returns wss protocol', () => {
    const store = usePlayerWebSocket()
    mockGetWsBaseUrl.mockReturnValue('wss://secure.local:9443/api')

    store.setupWebSocket()

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('wss://secure.local:9443/api/events')
  })

  it('does not create controller when websocket URL is invalid', () => {
    const store = usePlayerWebSocket()
    mockGetWsBaseUrl.mockReturnValue('not-a-valid-url')

    store.setupWebSocket()

    expect(MockWebSocket.instances).toHaveLength(0)
    expect(store.wsController).toBeNull()
  })

  it('disconnects previous controller before creating a new one', () => {
    const store = usePlayerWebSocket()

    store.setupWebSocket()
    const firstController = store.wsController
    const disconnectSpy = vi.spyOn(firstController!, 'disconnect')

    store.setupWebSocket()

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('does not reconnect after manual disconnect', () => {
    const store = usePlayerWebSocket()

    store.setupWebSocket()
    expect(MockWebSocket.instances).toHaveLength(1)

    store.wsController?.disconnect()
    vi.advanceTimersByTime(110)

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('reconnects after unexpected socket close', () => {
    const store = usePlayerWebSocket()

    store.setupWebSocket()
    expect(MockWebSocket.instances).toHaveLength(1)

    MockWebSocket.instances[0].triggerUnexpectedClose()
    vi.advanceTimersByTime(110)

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('subscribes to selected player and volume events when socket opens', async () => {
    const store = usePlayerWebSocket()
    mockPlayerState.currentPlayerName = 'roon'

    store.setupWebSocket()
    MockWebSocket.instances[0].triggerOpen()
    await flushPromises()

    expect(mockRetrieveActivePlayer).not.toHaveBeenCalled()
    expect(MockWebSocket.instances[0].sent).toHaveLength(2)

    expect(JSON.parse(MockWebSocket.instances[0].sent[0])).toEqual({
      players: ['roon'],
      event_types: [
        'state_changed',
        'song_changed',
        'position_changed',
        'loop_mode_changed',
        'shuffle_changed',
        'capabilities_changed',
        'metadata_changed',
        'song_information_update',
      ],
    })
    expect(JSON.parse(MockWebSocket.instances[0].sent[1])).toEqual({
      players: ['*'],
      event_types: ['volume_changed'],
    })
  })

  it('falls back to retrieved active player when none is selected', async () => {
    const store = usePlayerWebSocket()

    store.setupWebSocket()
    MockWebSocket.instances[0].triggerOpen()
    await flushPromises()

    expect(mockRetrieveActivePlayer).toHaveBeenCalledTimes(1)
    expect(JSON.parse(MockWebSocket.instances[0].sent[0])).toMatchObject({
      players: ['mpd'],
    })
  })

  it('falls back to first available player when active player lookup returns null', async () => {
    const store = usePlayerWebSocket()
    mockRetrieveActivePlayer.mockResolvedValue(null)
    mockFetchPlayers.mockResolvedValue([{ name: 'alsa' }])

    store.setupWebSocket()
    MockWebSocket.instances[0].triggerOpen()
    await flushPromises()

    expect(mockFetchPlayers).toHaveBeenCalledTimes(1)
    expect(JSON.parse(MockWebSocket.instances[0].sent[0])).toMatchObject({
      players: ['alsa'],
    })
  })

  it('does not subscribe when no player is available', async () => {
    const store = usePlayerWebSocket()
    mockRetrieveActivePlayer.mockResolvedValue(null)
    mockFetchPlayers.mockResolvedValue([])

    store.setupWebSocket()
    MockWebSocket.instances[0].triggerOpen()
    await flushPromises()

    expect(MockWebSocket.instances[0].sent).toHaveLength(0)
  })

  it('handles volume events by refreshing volume state only', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({
      player_name: 'mpd',
      type: 'volume_changed',
    })

    expect(mockFetchVolumeState).toHaveBeenCalledTimes(1)
    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
  })

  it('refreshes current player for matching selected player events', () => {
    const store = usePlayerWebSocket()
    mockPlayerState.currentPlayerName = 'mpd'

    store.handlePlayerEvent({
      player_name: 'mpd',
      type: 'state_changed',
      is_active_player: false,
    })

    expect(mockFetchCurrentPlayer).toHaveBeenCalledTimes(1)
  })

  it('ignores non-matching selected player events', () => {
    const store = usePlayerWebSocket()
    mockPlayerState.currentPlayerName = 'mpd'

    store.handlePlayerEvent({
      player_name: 'other',
      type: 'state_changed',
      is_active_player: false,
    })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
  })

  it('assumes active player for default selection when active flags are missing', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({
      player_name: 'other',
      type: 'song_changed',
    })

    expect(mockFetchCurrentPlayer).toHaveBeenCalledTimes(1)
  })

  it('does not assume active player when explicitly marked inactive', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({
      player_name: 'other',
      type: 'song_changed',
      is_active_player: false,
    })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
  })

  it('supports event_type format and source.is_active in websocket payload', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({
      player_name: 'unused-in-event_type-format',
      event_type: 'state_changed',
      source: {
        player_id: 'mpd:6600',
        player_name: 'mpd',
        is_active: true,
      },
    })

    expect(mockFetchCurrentPlayer).toHaveBeenCalledTimes(1)
  })

  it('ignores unknown event payload formats', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({ player_name: 'mpd' })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
    expect(mockFetchVolumeState).not.toHaveBeenCalled()
  })
})

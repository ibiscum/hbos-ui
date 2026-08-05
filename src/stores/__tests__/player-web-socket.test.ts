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

  it('clears pending reconnect timer on disconnect', () => {
    const store = usePlayerWebSocket()

    store.setupWebSocket()
    expect(MockWebSocket.instances).toHaveLength(1)

    MockWebSocket.instances[0].triggerUnexpectedClose()
    store.wsController?.disconnect()
    vi.advanceTimersByTime(110)

    expect(MockWebSocket.instances).toHaveLength(1)
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

  it('handles event_type format using source.is_active_player', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({
      player_name: 'ignored',
      event_type: 'song_changed',
      source: {
        player_name: 'mpd',
        is_active_player: true,
      },
    })

    expect(mockFetchCurrentPlayer).toHaveBeenCalledTimes(1)
  })

  it('ignores event_type payload when selected player does not match source player', () => {
    const store = usePlayerWebSocket()
    mockPlayerState.currentPlayerName = 'mpd'

    store.handlePlayerEvent({
      player_name: 'ignored',
      event_type: 'state_changed',
      source: {
        player_name: 'other',
      },
    })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
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

  it('subscribeToPlayerEvents warns when controller is missing', async () => {
    const store = usePlayerWebSocket()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await store.subscribeToPlayerEvents()

    expect(warnSpy).toHaveBeenCalledWith(
      'Cannot subscribe to player events: No wsController - will retry when connected',
    )

    warnSpy.mockRestore()
  })

  it('subscribeToPlayerEvents warns when socket is not open', async () => {
    const store = usePlayerWebSocket()
    store.setupWebSocket()

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await store.subscribeToPlayerEvents()

    expect(warnSpy).toHaveBeenCalledWith(
      'Cannot subscribe to player events: WebSocket not open - will retry when connected',
    )

    warnSpy.mockRestore()
  })

  it('subscribeToPlayerEvents logs and exits when active-player lookup throws', async () => {
    const store = usePlayerWebSocket()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRetrieveActivePlayer.mockRejectedValueOnce(new Error('lookup failed'))

    store.setupWebSocket()
    MockWebSocket.instances[0].triggerOpen()
    await flushPromises()

    expect(errorSpy).toHaveBeenCalledWith('Error getting active player name:', expect.any(Error))
    expect(MockWebSocket.instances[0].sent).toHaveLength(0)

    errorSpy.mockRestore()
  })

  it('subscribeToPlayerEvents exits when fallback player name is empty', async () => {
    const store = usePlayerWebSocket()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockRetrieveActivePlayer.mockResolvedValueOnce(null)
    mockFetchPlayers.mockResolvedValueOnce([{ name: '' }])

    store.setupWebSocket()
    MockWebSocket.instances[0].triggerOpen()
    await flushPromises()

    expect(warnSpy).toHaveBeenCalledWith('Failed to get active player name, using first available player')
    expect(errorSpy).toHaveBeenCalledWith('No player name available for subscription')
    expect(MockWebSocket.instances[0].sent).toHaveLength(0)

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('subscribeToVolumeEvents warns when controller is missing or socket is closed', async () => {
    const store = usePlayerWebSocket()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await store.subscribeToVolumeEvents()
    expect(warnSpy).toHaveBeenCalledWith('Cannot subscribe to volume events: No wsController')

    store.setupWebSocket()
    await store.subscribeToVolumeEvents()
    expect(warnSpy).toHaveBeenCalledWith('Cannot subscribe to volume events: WebSocket not open')

    warnSpy.mockRestore()
  })

  it('createPlayerWebSocket updateSubscription and subscribe return false when socket is not open', () => {
    const store = usePlayerWebSocket()
    const controller = store.createPlayerWebSocket({
      protocol: 'ws:',
      hostname: 'localhost',
      port: 3000,
      apiPrefix: '/api',
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
    })

    expect(controller.updateSubscription({ players: ['mpd'], event_types: ['state_changed'] })).toBe(false)
    expect(controller.subscribe('mpd', ['state_changed'])).toBe(false)
  })

  it('createPlayerWebSocket updateSubscription and subscribe send payload when socket is open', () => {
    const store = usePlayerWebSocket()
    const controller = store.createPlayerWebSocket({
      protocol: 'ws:',
      hostname: 'localhost',
      port: 3000,
      apiPrefix: '/api',
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
    })

    controller.connect()
    const socket = MockWebSocket.instances.at(-1)
    socket?.triggerOpen()

    expect(controller.updateSubscription({ players: ['mpd'], event_types: ['state_changed'] })).toBe(true)
    expect(controller.subscribe('', [])).toBe(true)
    expect(socket?.sent).toContain(JSON.stringify({ players: ['mpd'], event_types: ['state_changed'] }))
    expect(socket?.sent).toContain(JSON.stringify({ players: null, event_types: null }))
  })

  it('connect is idempotent while socket exists', () => {
    const store = usePlayerWebSocket()
    const controller = store.createPlayerWebSocket({
      protocol: 'ws:',
      hostname: 'localhost',
      port: 3000,
      apiPrefix: '/api',
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
    })

    controller.connect()
    controller.connect()

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('handles welcome and subscription_updated messages without forwarding to onMessage', () => {
    const store = usePlayerWebSocket()
    store.setupWebSocket()

    MockWebSocket.instances[0].triggerMessage({ type: 'welcome', message: 'hello' })
    MockWebSocket.instances[0].triggerMessage({ type: 'subscription_updated', message: 'ok' })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
    expect(mockFetchVolumeState).not.toHaveBeenCalled()
  })

  it('logs parse errors for invalid websocket message payloads', () => {
    const store = usePlayerWebSocket()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    store.setupWebSocket()

    MockWebSocket.instances[0].triggerMessage('{not-json')

    expect(errorSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error))

    errorSpy.mockRestore()
  })

  it('routes socket onerror events through configured error callback', () => {
    const store = usePlayerWebSocket()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    store.setupWebSocket()
    MockWebSocket.instances[0].onerror?.({ type: 'error' } as Event)

    expect(errorSpy).toHaveBeenCalledWith('WebSocket error:', expect.anything())

    errorSpy.mockRestore()
  })

  it('calls onError handler and schedules reconnect when websocket construction throws', () => {
    const OriginalWebSocket = globalThis.WebSocket
    const failingConstructor = vi.fn(() => {
      throw new Error('constructor failed')
    }) as unknown as typeof WebSocket
    vi.stubGlobal('WebSocket', failingConstructor)

    const store = usePlayerWebSocket()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    store.setupWebSocket()
    vi.advanceTimersByTime(110)

    expect(errorSpy).toHaveBeenCalledWith('Failed to connect WebSocket:', expect.any(Error))

    vi.stubGlobal('WebSocket', OriginalWebSocket)
    errorSpy.mockRestore()
  })

  it('invokes debounced player event handler path', () => {
    const store = usePlayerWebSocket()

    store.debounceHandlePlayerEvent({
      player_name: 'mpd',
      type: 'song_changed',
    })

    expect(mockFetchCurrentPlayer).toHaveBeenCalledTimes(1)
  })

  it('createPlayerWebSocket supports missing optional callbacks without throwing', () => {
    const store = usePlayerWebSocket()
    const controller = store.createPlayerWebSocket({
      protocol: 'ws:',
      hostname: 'localhost',
      port: 3000,
      apiPrefix: '/api',
      onConnect: undefined as unknown as () => void,
      onDisconnect: undefined as unknown as (event: Event) => void,
      onMessage: undefined as unknown as (data: unknown) => void,
      onError: undefined as unknown as (error: Event) => void,
    })

    controller.connect()
    const socket = MockWebSocket.instances.at(-1)
    socket?.triggerOpen()
    socket?.triggerUnexpectedClose()

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1)
  })

  it('getSocket reflects socket lifecycle across connect and disconnect', () => {
    const store = usePlayerWebSocket()
    const controller = store.createPlayerWebSocket({
      protocol: 'ws:',
      hostname: 'localhost',
      port: 3000,
      apiPrefix: '/api',
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
    })

    expect(controller.getSocket()).toBeNull()

    controller.connect()
    expect(controller.getSocket()).not.toBeNull()

    controller.disconnect()
    expect(controller.getSocket()).toBeNull()
  })

  it('event_type payload with no source player and selected player is ignored', () => {
    const store = usePlayerWebSocket()
    mockPlayerState.currentPlayerName = 'mpd'

    store.handlePlayerEvent({
      player_name: 'ignored',
      event_type: 'metadata_changed',
      source: {},
    })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
  })

  it('ignores unknown event payload formats', () => {
    const store = usePlayerWebSocket()

    store.handlePlayerEvent({ player_name: 'mpd' })

    expect(mockFetchCurrentPlayer).not.toHaveBeenCalled()
    expect(mockFetchVolumeState).not.toHaveBeenCalled()
  })
})

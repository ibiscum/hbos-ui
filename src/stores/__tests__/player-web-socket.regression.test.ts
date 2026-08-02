import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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
    currentPlayerName: null,
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
  static OPEN = 1
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.OPEN
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

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: 1000, reason: 'manual-close' } as CloseEvent)
  }

  triggerUnexpectedClose() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: 1006, reason: 'network-drop' } as CloseEvent)
  }
}

describe('player-web-socket store - regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()

    MockWebSocket.instances = []
    mockGetWsBaseUrl.mockReturnValue('ws://localhost:3000/api')
    mockRetrieveActivePlayer.mockResolvedValue('mpd')
    mockFetchPlayers.mockResolvedValue([{ name: 'mpd' }])

    vi.stubGlobal('WebSocket', MockWebSocket)
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
})

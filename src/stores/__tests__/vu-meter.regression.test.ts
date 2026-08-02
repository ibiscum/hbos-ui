import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVuMeterStore } from '../vu-meter'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  url: string
  binaryType = ''
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.onclose?.()
  }

  emitOpen() {
    this.onopen?.()
  }

  emitMessage(data: ArrayBuffer) {
    this.onmessage?.({ data } as MessageEvent)
  }

  emitClose() {
    this.onclose?.()
  }
}

describe('Vu Meter Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('connect creates socket and sets connected on open', () => {
    const store = useVuMeterStore()
    store.connect()

    expect(FakeWebSocket.instances).toHaveLength(1)
    FakeWebSocket.instances[0].emitOpen()
    expect(store.connected).toBe(true)
  })

  it('parses valid 5-byte frames from websocket messages', () => {
    const store = useVuMeterStore()
    store.connect()
    const socket = FakeWebSocket.instances[0]

    const frame = new Uint8Array([10, 20, 30, 40, 0x03]).buffer
    socket.emitMessage(frame)

    expect(store.leftRms).toBe(10)
    expect(store.leftPeak).toBe(20)
    expect(store.rightRms).toBe(30)
    expect(store.rightPeak).toBe(40)
    expect(store.leftClipping).toBe(true)
    expect(store.rightClipping).toBe(true)
  })

  it('schedules reconnect after unexpected close', () => {
    const store = useVuMeterStore()
    store.connect()
    const socket = FakeWebSocket.instances[0]

    socket.emitClose()
    vi.advanceTimersByTime(2000)

    expect(FakeWebSocket.instances.length).toBeGreaterThan(1)
  })

  it('disconnect does not schedule reconnect', () => {
    const store = useVuMeterStore()
    store.connect()

    store.disconnect()
    vi.advanceTimersByTime(2000)

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(store.connected).toBe(false)
  })
})

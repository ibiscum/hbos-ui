import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'

interface MockPlayerData {
  state?: string
  position?: number
  song?: {
    metadata?: {
      lyrics_metadata?: {
        duration?: string | number
      }
    }
  }
}

const mockState = vi.hoisted(() => ({
  currentDataRef: null as unknown as Ref<MockPlayerData | null>,
}))

vi.mock('@/stores/player', async () => {
  const { ref } = await import('vue')
  mockState.currentDataRef = ref<MockPlayerData | null>(null)

  return {
    usePlayerStore: () => ({
      get currentData() {
        return mockState.currentDataRef.value
      },
    }),
  }
})

import { usePlayerPosition } from '@/composables/usePlayerPosition'

describe('usePlayerPosition', () => {
  let nowMs = 0

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockState.currentDataRef.value = null
    nowMs = 0
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('defaults to zero values when player data is not available', () => {
    const { position, duration, isPlaying, isPaused, isStopped } = usePlayerPosition()

    expect(position.value).toBe(0)
    expect(duration.value).toBe(0)
    expect(isPlaying.value).toBe(false)
    expect(isPaused.value).toBe(false)
    expect(isStopped.value).toBe(false)
  })

  it('advances position by elapsed time while playing and re-syncs on large backend jumps', async () => {
    mockState.currentDataRef.value = { state: 'playing', position: 12 }
    nowMs = 1000

    const { position, updatePosition } = usePlayerPosition()

    expect(position.value).toBe(12)

    nowMs = 2500
    expect(updatePosition()).toBeCloseTo(13.5, 6)

    mockState.currentDataRef.value = { state: 'playing', position: 12.2 }
    await nextTick()

    expect(position.value).toBeCloseTo(13.5, 6)

    nowMs = 3000
    mockState.currentDataRef.value = { state: 'playing', position: 30 }
    await nextTick()

    expect(position.value).toBe(30)
  })

  it('parses numeric string duration from song metadata', () => {
    mockState.currentDataRef.value = {
      state: 'paused',
      song: {
        metadata: {
          lyrics_metadata: {
            duration: '245.75',
          },
        },
      },
    }

    const { duration } = usePlayerPosition()

    expect(duration.value).toBeCloseTo(245.75, 6)
  })

  it('returns 0 for invalid or negative duration values (regression)', async () => {
    mockState.currentDataRef.value = {
      state: 'paused',
      song: {
        metadata: {
          lyrics_metadata: {
            duration: 'not-a-number',
          },
        },
      },
    }

    const { duration } = usePlayerPosition()
    expect(duration.value).toBe(0)

    mockState.currentDataRef.value = {
      state: 'paused',
      song: {
        metadata: {
          lyrics_metadata: {
            duration: -42,
          },
        },
      },
    }
    await nextTick()

    expect(duration.value).toBe(0)
  })

  it('clears timer id 0 when auto-update is stopped (regression)', () => {
    mockState.currentDataRef.value = { state: 'paused', position: 0 }

    vi.spyOn(window, 'setInterval').mockReturnValue(0 as unknown as ReturnType<typeof setInterval>)
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

    const { startAutoUpdate, stopAutoUpdate } = usePlayerPosition()

    startAutoUpdate()
    stopAutoUpdate()

    expect(clearIntervalSpy).toHaveBeenCalledWith(0)
  })

  it('cleans up running interval on unmount', () => {
    mockState.currentDataRef.value = { state: 'paused', position: 0 }

    vi.spyOn(window, 'setInterval').mockReturnValue(0 as unknown as ReturnType<typeof setInterval>)
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

    let api: ReturnType<typeof usePlayerPosition> | null = null

    const Harness = defineComponent({
      setup() {
        api = usePlayerPosition()
        return () => null
      },
    })

    const wrapper = mount(Harness)

    ;(api as any)?.startAutoUpdate()
    wrapper.unmount()

    expect(clearIntervalSpy).toHaveBeenCalledWith(0)
  })
})

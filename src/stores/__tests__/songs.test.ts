import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSongsStore } from '../songs'

describe('Songs Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('initializes with empty songs and null current song', () => {
    const store = useSongsStore()
    expect(store.loading).toBe(false)
    expect(store.songs).toEqual([])
    expect(store.song).toBe(null)
  })

  it('getSongs sets loading immediately and resolves with songs', async () => {
    const store = useSongsStore()

    const pending = store.getSongs()
    expect(store.loading).toBe(true)

    await vi.advanceTimersByTimeAsync(2400)
    await pending

    expect(store.loading).toBe(false)
    expect(store.songs.length).toBeGreaterThan(0)
  })

  it('getSongs returns an independent array copy', async () => {
    const store = useSongsStore()

    const pending = store.getSongs()
    await vi.advanceTimersByTimeAsync(2400)
    await pending

    const firstLength = store.songs.length
    store.songs.push({ ...store.songs[0], id: 'new-id' })

    const secondPending = store.getSongs()
    await vi.advanceTimersByTimeAsync(2400)
    await secondPending

    expect(store.songs.length).toBe(firstLength)
  })

  it('getSongById sets loading and returns matching song by id', async () => {
    const store = useSongsStore()

    const pending = store.getSongById('song-2')
    expect(store.loading).toBe(true)

    await vi.advanceTimersByTimeAsync(2400)
    await pending

    expect(store.loading).toBe(false)
    expect(store.song?.id).toBe('song-2')
  })

  it('getSongById clears current song when id does not exist', async () => {
    const store = useSongsStore()

    const pending = store.getSongById('unknown-id')
    await vi.advanceTimersByTimeAsync(2400)
    await pending

    expect(store.song).toBe(null)
    expect(store.loading).toBe(false)
  })
})

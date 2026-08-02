import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlaylistStore } from '../playlist'
import type { Track } from '@/types/library'

const mockLibraryFetch = vi.fn()
const mockShowErrorToast = vi.fn()

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => mockLibraryFetch,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mockShowErrorToast,
  }),
}))

const queueResponse = (payload: { error?: unknown; queue?: unknown }) => {
  mockLibraryFetch.mockReturnValueOnce({
    get: vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        error: { value: payload.error ?? null },
        data: { value: { queue: payload.queue } },
      }),
    }),
  })
}

const track = (id: string): Track => ({
  id,
  title: `Track ${id}`,
  album: 'Album',
  artists: ['Artist'],
  duration: 120,
  track_number: 1,
  disc_number: 1,
  release_date: '2025-01-01',
  file: `/music/${id}.flac`,
}) as Track

describe('Playlist Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('State initialization', () => {
    it('initializes with loading=false and empty queue', () => {
      const store = usePlaylistStore()
      expect(store.loading).toBe(false)
      expect(store.queue).toEqual([])
    })
  })

  describe('fetchQueue', () => {
    it('loads queue on successful response', async () => {
      const store = usePlaylistStore()
      queueResponse({ queue: [track('1'), track('2')] })

      await store.fetchQueue()

      expect(store.queue).toHaveLength(2)
      expect(store.queue[0].id).toBe('1')
      expect(store.loading).toBe(false)
      expect(mockShowErrorToast).not.toHaveBeenCalled()
    })

    it('clears queue when API reports an error', async () => {
      const store = usePlaylistStore()
      store.queue = [track('seed')]
      queueResponse({ error: 'bad request', queue: [track('1')] })

      await store.fetchQueue()

      expect(store.queue).toEqual([])
      expect(mockShowErrorToast).toHaveBeenCalledWith('Queue fetch error: bad request')
      expect(store.loading).toBe(false)
    })

    it('clears queue when queue field is missing', async () => {
      const store = usePlaylistStore()
      store.queue = [track('seed')]
      queueResponse({ queue: undefined })

      await store.fetchQueue()

      expect(store.queue).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('guards against malformed queue payloads', async () => {
      const store = usePlaylistStore()
      queueResponse({ queue: 'invalid' })

      await store.fetchQueue()

      expect(store.queue).toEqual([])
      expect(mockShowErrorToast).toHaveBeenCalledWith('Queue fetch error: Invalid queue response')
      expect(store.loading).toBe(false)
    })

    it('handles thrown request errors', async () => {
      const store = usePlaylistStore()
      mockLibraryFetch.mockReturnValueOnce({
        get: vi.fn().mockReturnValue({
          json: vi.fn().mockRejectedValue(new Error('network down')),
        }),
      })

      await store.fetchQueue()

      expect(store.queue).toEqual([])
      expect(mockShowErrorToast).toHaveBeenCalledWith('Failed to fetch playlist')
      expect(store.loading).toBe(false)
    })

    it('requests the active-library queue endpoint', async () => {
      const store = usePlaylistStore()
      queueResponse({ queue: [] })

      await store.fetchQueue()

      expect(mockLibraryFetch).toHaveBeenCalledWith('/player/:activeLibrary/queue')
    })
  })
})

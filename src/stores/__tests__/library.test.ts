import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLibraryStore } from '../library'
import type { LibraryPlayer } from '@/types/library'

const mockUseFetch = vi.fn()
const mockShowErrorToast = vi.fn()
const mockGetAllLibraryStats = vi.fn()
const mockGetApiBaseUrl = vi.fn(() => 'http://device.local')

vi.mock('@vueuse/core', () => ({
  useFetch: (url: string) => mockUseFetch(url),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mockShowErrorToast,
  }),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: mockGetApiBaseUrl,
  }),
}))

vi.mock('@/api/audiocontrol-library', () => ({
  getAllLibraryStats: () => mockGetAllLibraryStats(),
}))

const queueLibraryFetch = (payload: { error?: unknown; players?: LibraryPlayer[] }) => {
  mockUseFetch.mockReturnValueOnce({
    json: vi.fn().mockResolvedValue({
      error: { value: payload.error ?? null },
      data: { value: { players: payload.players ?? [] } },
    }),
  })
}

describe('Library Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetApiBaseUrl.mockReturnValue('http://device.local')
  })

  describe('State initialization', () => {
    it('initializes with expected defaults', () => {
      const store = useLibraryStore()
      expect(store.loading).toBe(false)
      expect(store.activeLibrary).toBe(null)
      expect(store.isLibraryLoaded).toBe(false)
      expect(store.supportsDelete).toBe(false)
      expect(store.libraryStats).toEqual([])
      expect(store.libraryStatsLoading).toBe(false)
      expect(store.libraryStatsError).toBe('')
      expect(store.isAvailableLibrary).toBe(false)
      expect(store.isLibraryUpdating).toBe(false)
    })
  })

  describe('getAvailableLibrary', () => {
    it('prefers a loaded library player', async () => {
      const store = useLibraryStore()
      queueLibraryFetch({
        players: [
          { player_id: '1', player_name: 'mpd', has_library: true, is_loaded: false },
          { player_id: '2', player_name: 'lms', has_library: true, is_loaded: true, supports_delete: true },
        ],
      })

      const result = await store.getAvailableLibrary()

      expect(result).toBe('lms')
      expect(store.activeLibrary).toBe('lms')
      expect(store.isLibraryLoaded).toBe(true)
      expect(store.supportsDelete).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('falls back to any library player if none is loaded', async () => {
      const store = useLibraryStore()
      queueLibraryFetch({
        players: [
          { player_id: '1', player_name: 'mpd', has_library: true, is_loaded: false },
          { player_id: '2', player_name: 'spot', has_library: false, is_loaded: false },
        ],
      })

      const result = await store.getAvailableLibrary()

      expect(result).toBe('mpd')
      expect(store.activeLibrary).toBe('mpd')
      expect(store.isLibraryLoaded).toBe(false)
      expect(store.supportsDelete).toBe(false)
    })

    it('clears active state when no suitable players exist', async () => {
      const store = useLibraryStore()
      queueLibraryFetch({
        players: [{ player_id: '2', player_name: 'spot', has_library: false, is_loaded: false }],
      })

      const result = await store.getAvailableLibrary()

      expect(result).toBe(null)
      expect(store.activeLibrary).toBe(null)
      expect(store.isLibraryLoaded).toBe(false)
      expect(store.supportsDelete).toBe(false)
    })

    it('shows toast, resets loading, and rejects when API reports an error', async () => {
      const store = useLibraryStore()
      queueLibraryFetch({ error: 'fail', players: [] })

      await expect(store.getAvailableLibrary()).rejects.toBe('fail')
      expect(mockShowErrorToast).toHaveBeenCalledWith('Could not fetch library.')
      expect(store.loading).toBe(false)
    })

    it('resets loading and rejects when request throws', async () => {
      const store = useLibraryStore()
      mockUseFetch.mockReturnValueOnce({
        json: vi.fn().mockRejectedValue(new Error('network down')),
      })

      await expect(store.getAvailableLibrary()).rejects.toThrow('network down')
      expect(store.loading).toBe(false)
    })
  })

  describe('refreshLibraryStatus', () => {
    it('returns early when no active library is set', async () => {
      const store = useLibraryStore()

      await store.refreshLibraryStatus()

      expect(mockUseFetch).not.toHaveBeenCalled()
    })

    it('updates loaded state for active library', async () => {
      const store = useLibraryStore()
      store.activeLibrary = 'mpd'
      queueLibraryFetch({
        players: [
          { player_id: '1', player_name: 'mpd', has_library: true, is_loaded: true },
          { player_id: '2', player_name: 'lms', has_library: true, is_loaded: false },
        ],
      })

      await store.refreshLibraryStatus()

      expect(store.isLibraryLoaded).toBe(true)
    })
  })

  describe('fetchLibraryStats', () => {
    it('stores stats and clears loading on success', async () => {
      const store = useLibraryStore()
      mockGetAllLibraryStats.mockResolvedValueOnce([
        { player_name: 'mpd', stats: { albums: 5 } },
      ])

      await store.fetchLibraryStats()

      expect(store.libraryStatsLoading).toBe(false)
      expect(store.libraryStatsError).toBe('')
      expect(store.libraryStats).toHaveLength(1)
    })

    it('stores error message and clears loading on failure', async () => {
      const store = useLibraryStore()
      mockGetAllLibraryStats.mockRejectedValueOnce(new Error('stats fail'))

      await store.fetchLibraryStats()

      expect(store.libraryStatsLoading).toBe(false)
      expect(store.libraryStatsError).toBe('stats fail')
    })
  })

  describe('getAlbumCover', () => {
    it('builds a cover URL when active library is set', () => {
      const store = useLibraryStore()
      store.activeLibrary = 'mpd'

      const url = store.getAlbumCover('album-1')

      expect(url).toBe('http://device.local/library/mpd/image/album:album-1')
    })

    it('returns empty string when no active library is set', () => {
      const store = useLibraryStore()

      const url = store.getAlbumCover('album-1')

      expect(url).toBe('')
    })
  })
})

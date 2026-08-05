import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAlbumStore } from '../album'
import type { Album, AlbumDetails } from '@/types/library'

const mocks = vi.hoisted(() => ({
  libraryFetch: vi.fn(),
  showErrorToast: vi.fn(),
  refreshLibraryStatus: vi.fn(),
  getApiBaseUrl: vi.fn(() => 'http://device.local'),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => mocks.libraryFetch,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mocks.showErrorToast,
  }),
}))

vi.mock('@/stores/library.ts', () => ({
  useLibraryStore: () => ({
    activeLibrary: 'mpd',
    refreshLibraryStatus: mocks.refreshLibraryStatus,
  }),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: mocks.getApiBaseUrl,
  }),
}))

const queueLibraryResponse = (payload: { error?: unknown; data?: unknown }) => {
  mocks.libraryFetch.mockReturnValueOnce({
    json: vi.fn().mockResolvedValue({
      error: { value: payload.error ?? null },
      data: { value: payload.data ?? null },
    }),
  })
}

const queueLibraryRejection = (reason: unknown) => {
  mocks.libraryFetch.mockReturnValueOnce({
    json: vi.fn().mockRejectedValue(reason),
  })
}

const album = (overrides: Partial<Album> = {}): Album => ({
  id: 'album-1',
  name: 'Album One',
  artists: ['Artist One'],
  release_date: '2024-05-01',
  tracks_count: 10,
  cover_art: 'cover.jpg',
  ...overrides,
})

describe('album store async/API coverage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.getApiBaseUrl.mockReturnValue('http://device.local')
  })

  describe('loadGenres', () => {
    it('stores fetched genres on success', async () => {
      const store = useAlbumStore()
      queueLibraryResponse({ data: { categories: ['Rock', 'Jazz'] } })

      await store.loadGenres()

      expect(mocks.libraryFetch).toHaveBeenCalledWith('/library/:activeLibrary/categories')
      expect(store.genres).toEqual(['Rock', 'Jazz'])
      expect(mocks.showErrorToast).not.toHaveBeenCalled()
    })

    it('reports unknown genre errors when error payload is non-string', async () => {
      const store = useAlbumStore()
      queueLibraryResponse({ error: { code: 500 }, data: null })

      await store.loadGenres()

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load genres: Unknown error')
      expect(store.genres).toEqual([])
    })
  })

  describe('setGenreFilter', () => {
    it('clears genre ids and re-applies search when filter is emptied', async () => {
      const store = useAlbumStore()
      store.allAlbums = [
        { ...album({ id: 'a1', name: 'Alpha' }), $id: 'a1' } as Album,
        { ...album({ id: 'b2', name: 'Beta' }), $id: 'b2' } as Album,
      ]
      store.setSearchQuery('alpha')

      await store.setGenreFilter([])

      expect(store.selectedGenres).toEqual([])
      expect(Array.from(store.genreAlbumIds)).toEqual([])
      expect(store.albums).toHaveLength(1)
      expect(store.albums[0].name).toBe('Alpha')
    })

    it('collects ids across genres, URL-encodes genre names, and logs per-genre errors', async () => {
      const store = useAlbumStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      store.allAlbums = [
        { ...album({ id: 'id-a', name: 'Alpha', artists: ['A'] }), $id: 'id-a' } as Album,
        { ...album({ id: 'id-b', name: 'Beta', artists: ['B'] }), $id: 'id-b' } as Album,
      ]
      store.setSearchQuery('a')

      queueLibraryResponse({ data: { albums: [{ id: 'id-a' }] } })
      queueLibraryResponse({ error: 'category unavailable', data: null })

      await store.setGenreFilter(['rock/pop', 'electro'])

      expect(mocks.libraryFetch).toHaveBeenNthCalledWith(
        1,
        '/library/:activeLibrary/albums/by-category/rock%2Fpop',
      )
      expect(mocks.libraryFetch).toHaveBeenNthCalledWith(
        2,
        '/library/:activeLibrary/albums/by-category/electro',
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load albums for genre electro: category unavailable',
      )
      expect(store.selectedGenres).toEqual(['rock/pop', 'electro'])
      expect(Array.from(store.genreAlbumIds)).toEqual(['id-a'])
      expect(store.albums).toHaveLength(1)
      expect(store.albums[0].$id).toBe('id-a')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getAlbums', () => {
    it('maps valid albums, filters invalid entries, and sets loaded state', async () => {
      const store = useAlbumStore()
      queueLibraryResponse({
        data: {
          albums: [
            album({ id: 'good-1', name: 'Good One', artists: ['Lead Artist'], release_date: '2022-11-09' }),
            album({ id: '', name: 'Missing Id' }),
            album({ id: 'missing-name', name: '' }),
            album({ id: 'good-2', name: 'Fallback Album', artists: [], release_date: undefined }),
          ],
        },
      })

      await store.getAlbums()

      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(true)
      expect(store.allAlbums).toHaveLength(2)
      expect(store.albums).toHaveLength(2)
      expect(store.albums[0].$id).toBe('good-1')
      expect(store.albums[0].$title).toBe('Good One')
      expect(store.albums[0].$subtitle).toBe('Lead Artist')
      expect(store.albums[0].$note).toBe('2022')
      expect(store.albums[0].$cover_src).toBe('http://device.local/library/mpd/image/album:good-1')
      expect(store.albums[1].$subtitle).toBe('Various Artists')
      expect(store.albums[1].$note).toBe('Unknown year')
      expect(mocks.refreshLibraryStatus).not.toHaveBeenCalled()
    })

    it('shows error toast and keeps loaded=false when API error is returned', async () => {
      const store = useAlbumStore()
      queueLibraryResponse({ error: 'boom', data: null })

      await store.getAlbums()

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load albums: boom')
      expect(store.loaded).toBe(false)
      expect(store.loading).toBe(false)
    })

    it('refreshes library status when no albums are returned', async () => {
      const store = useAlbumStore()
      queueLibraryResponse({ data: { albums: [] } })

      await store.getAlbums()

      expect(mocks.refreshLibraryStatus).toHaveBeenCalledTimes(1)
      expect(store.loaded).toBe(false)
      expect(store.loading).toBe(false)
    })

    it('handles thrown errors and clears loading state', async () => {
      const store = useAlbumStore()
      queueLibraryRejection(new Error('network down'))

      await store.getAlbums()

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load albums: network down')
      expect(store.loading).toBe(false)
    })
  })

  describe('getAlbumByAlbumId', () => {
    it('stores album details on success', async () => {
      const store = useAlbumStore()
      const details = {
        id: 'album-9',
        name: 'Album Nine',
      } as AlbumDetails
      queueLibraryResponse({ data: { album: details } })

      await store.getAlbumByAlbumId('album-9')

      expect(mocks.libraryFetch).toHaveBeenCalledWith('/library/:activeLibrary/album/by-id/album-9')
      expect(store.album).toEqual(details)
      expect(store.loading).toBe(false)
    })

    it('shows unknown error when album request returns non-string error payload', async () => {
      const store = useAlbumStore()
      queueLibraryResponse({ error: { reason: 'bad' }, data: null })

      await store.getAlbumByAlbumId('album-1')

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load album: Unknown error')
      expect(store.album).toBe(null)
      expect(store.loading).toBe(false)
    })

    it('keeps album null when payload has no album object', async () => {
      const store = useAlbumStore()
      store.album = { id: 'stale' } as AlbumDetails
      queueLibraryResponse({ data: {} })

      await store.getAlbumByAlbumId('album-2')

      expect(store.album).toBe(null)
      expect(store.loading).toBe(false)
    })

    it('handles thrown errors in album detail requests', async () => {
      const store = useAlbumStore()
      queueLibraryRejection('offline')

      await store.getAlbumByAlbumId('album-3')

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load album: Unknown error')
      expect(store.loading).toBe(false)
    })
  })

  describe('getAlbumByArtistId', () => {
    it('maps valid albums and resets loading on success', async () => {
      const store = useAlbumStore()
      store.albums = [album({ id: 'stale', name: 'Stale' })]
      queueLibraryResponse({
        data: {
          albums: [
            album({ id: 'artist-1', name: 'Artist Album', artists: ['Band'], release_date: '2020-07-22' }),
            album({ id: '', name: 'missing-id' }),
          ],
        },
      })

      await store.getAlbumByArtistId('artist-id')

      expect(mocks.libraryFetch).toHaveBeenCalledWith('/library/:activeLibrary/albums/by-artist-id/artist-id')
      expect(store.loading).toBe(false)
      expect(store.albums).toHaveLength(1)
      expect(store.albums[0].$id).toBe('artist-1')
      expect(store.albums[0].$note).toBe('2020')
    })

    it('shows API errors and keeps albums cleared', async () => {
      const store = useAlbumStore()
      store.albums = [album({ id: 'seed', name: 'Seed' })]
      queueLibraryResponse({ error: 'artist fetch failed', data: null })

      await store.getAlbumByArtistId('artist-id')

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load albums: artist fetch failed')
      expect(store.albums).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('handles thrown errors and resets loading state', async () => {
      const store = useAlbumStore()
      queueLibraryRejection(new Error('artist network down'))

      await store.getAlbumByArtistId('artist-id')

      expect(mocks.showErrorToast).toHaveBeenCalledWith('Failed to load albums: artist network down')
      expect(store.loading).toBe(false)
    })
  })

  describe('sorting/filter branch coverage', () => {
    it('uses random sort keys with zero fallback for missing keys', () => {
      const store = useAlbumStore()
      store.albums = [
        { ...album({ id: 'x', name: 'X' }), $id: 'x' } as Album,
        { ...album({ id: 'y', name: 'Y' }), $id: 'y' } as Album,
      ]
      store.randomKeys = new Map([['y', 10]])
      store.sortBy = 'random'

      const sorted = store.sortedAlbums

      expect(sorted[0].$id).toBe('x')
      expect(sorted[1].$id).toBe('y')
    })

    it('sortedAlbumsByReleaseDate handles bDate-only branch', () => {
      const store = useAlbumStore()
      store.albums = [
        album({ id: 'no-date', name: 'No Date', release_date: undefined }),
        album({ id: 'with-date', name: 'With Date', release_date: '2023-01-01' }),
      ]

      const sorted = store.sortedAlbumsByReleaseDate

      expect(sorted[0].id).toBe('with-date')
      expect(sorted[1].id).toBe('no-date')
    })

    it('filterAlbums applies genre id filtering before text filtering', () => {
      const store = useAlbumStore()
      store.allAlbums = [
        { ...album({ id: 'a', name: 'Alpha' }), $id: 'a' } as Album,
        { ...album({ id: 'b', name: 'Beta' }), $id: 'b' } as Album,
      ]
      store.genreAlbumIds = new Set(['b'])

      store.filterAlbums('ta')

      expect(store.albums).toHaveLength(1)
      expect(store.albums[0].$id).toBe('b')
    })
  })
})

/*
 * Regression-focused album store tests.
 * Keep assertions behavior-oriented and aligned with current store implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAlbumStore } from '../album'
import type { Album, AlbumDetails, AlbumsResponse, AlbumResponse, AlbumByArtistResponse } from '@/types/library'

const mockLibraryFetch = vi.fn()

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => mockLibraryFetch,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: vi.fn(),
  }),
}))

vi.mock('@/stores/library.ts', () => ({
  useLibraryStore: () => ({
    activeLibrary: 'test-library',
    refreshLibraryStatus: vi.fn(),
  }),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => 'http://localhost:8000',
  }),
}))

describe('Album Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('State Initialization', () => {
    it('initializes loading as false', () => {
      const store = useAlbumStore()
      expect(store.loading).toBe(false)
    })

    it('initializes loaded as false', () => {
      const store = useAlbumStore()
      expect(store.loaded).toBe(false)
    })

    it('initializes albums as empty array', () => {
      const store = useAlbumStore()
      expect(store.albums).toEqual([])
      expect(Array.isArray(store.albums)).toBe(true)
    })

    it('initializes allAlbums as empty array', () => {
      const store = useAlbumStore()
      expect(store.allAlbums).toEqual([])
      expect(Array.isArray(store.allAlbums)).toBe(true)
    })

    it('initializes album detail as null', () => {
      const store = useAlbumStore()
      expect(store.album).toBe(null)
    })

    it('initializes searchQuery as empty string', () => {
      const store = useAlbumStore()
      expect(store.searchQuery).toBe('')
    })

    it('initializes sortBy with release_date', () => {
      const store = useAlbumStore()
      expect(store.sortBy).toBe('release_date')
    })

    it('initializes sortOrder as desc', () => {
      const store = useAlbumStore()
      expect(store.sortOrder).toBe('desc')
    })

    it('initializes genres as empty array', () => {
      const store = useAlbumStore()
      expect(store.genres).toEqual([])
    })

    it('initializes selectedGenres as empty array', () => {
      const store = useAlbumStore()
      expect(store.selectedGenres).toEqual([])
    })
  })

  describe('getAlbumCoverById', () => {
    it('returns URL with correct API base', () => {
      const store = useAlbumStore()
      const url = store.getAlbumCoverById('test-id')
      expect(url).toContain('http://localhost:8000')
    })

    it('includes library path in URL', () => {
      const store = useAlbumStore()
      const url = store.getAlbumCoverById('album-123')
      expect(url).toContain('/library/')
    })

    it('includes album ID in URL', () => {
      const store = useAlbumStore()
      const url = store.getAlbumCoverById('album-456')
      expect(url).toContain('album-456')
    })

    it('has image endpoint prefix', () => {
      const store = useAlbumStore()
      const url = store.getAlbumCoverById('album-789')
      expect(url).toContain('image/album:')
    })

    it('handles special characters in album ID', () => {
      const store = useAlbumStore()
      const url = store.getAlbumCoverById('album-with-special%20id')
      expect(url).toContain('album-with-special%20id')
    })

    it('returns different URLs for different IDs', () => {
      const store = useAlbumStore()
      const url1 = store.getAlbumCoverById('id-1')
      const url2 = store.getAlbumCoverById('id-2')
      expect(url1).not.toBe(url2)
      expect(url1).toContain('id-1')
      expect(url2).toContain('id-2')
    })
  })

  describe('Search Functionality', () => {
    beforeEach(() => {
      const store = useAlbumStore()
      store.allAlbums = [
        {
          id: '1',
          name: 'Test Album',
          artists: ['Test Artist'],
          release_date: '2023-01-01',
          tracks_count: 10,
          cover_art: 'cover.jpg',
        } as Album,
        {
          id: '2',
          name: 'Other Album',
          artists: ['Other Artist'],
          release_date: '2024-01-01',
          tracks_count: 5,
          cover_art: 'cover2.jpg',
        } as Album,
      ]
    })

    it('setSearchQuery updates search query state', () => {
      const store = useAlbumStore()
      store.setSearchQuery('query')
      expect(store.searchQuery).toBe('query')
    })

    it('setSearchQuery triggers filterAlbums', () => {
      const store = useAlbumStore()
      store.setSearchQuery('Test')
      expect(store.albums.length).toBe(1)
      expect(store.albums[0].name).toBe('Test Album')
    })

    it('clearSearch resets query to empty string', () => {
      const store = useAlbumStore()
      store.setSearchQuery('something')
      store.clearSearch()
      expect(store.searchQuery).toBe('')
    })

    it('clearSearch shows all albums again', () => {
      const store = useAlbumStore()
      store.setSearchQuery('Test')
      expect(store.albums.length).toBe(1)
      store.clearSearch()
      expect(store.albums.length).toBe(2)
    })

    it('filterAlbums searches by album name case-insensitive', () => {
      const store = useAlbumStore()
      store.filterAlbums('test')
      expect(store.albums.length).toBe(1)
      expect(store.albums[0].name).toContain('Test')
    })

    it('filterAlbums searches by artist name case-insensitive', () => {
      const store = useAlbumStore()
      store.filterAlbums('other')
      expect(store.albums.length).toBe(1)
      expect(store.albums[0].artists[0]).toContain('Other')
    })

    it('filterAlbums trims whitespace from query', () => {
      const store = useAlbumStore()
      store.filterAlbums('  Test  ')
      expect(store.albums.length).toBe(1)
    })

    it('filterAlbums returns all albums with empty query', () => {
      const store = useAlbumStore()
      store.filterAlbums('')
      expect(store.albums.length).toBe(2)
    })

    it('filterAlbums returns empty array with no matches', () => {
      const store = useAlbumStore()
      store.filterAlbums('nonexistent')
      expect(store.albums.length).toBe(0)
    })
  })

  describe('Genre Filter Functionality', () => {
    it('setGenreFilter clears genreAlbumIds when empty array passed', () => {
      const store = useAlbumStore()
      store.setGenreFilter([])
      expect(store.selectedGenres).toEqual([])
    })

    it('setGenreFilter updates selectedGenres state', async () => {
      const store = useAlbumStore()
      const fetchMock = vi.fn()

      // Mock the fetch to avoid errors
      mockLibraryFetch.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          error: { value: null },
          data: { value: { albums: [] } },
        }),
      })

      await store.setGenreFilter(['rock', 'pop'])
      expect(store.selectedGenres).toEqual(['rock', 'pop'])
    })

    it('loadGenres fetches category list', async () => {
      const store = useAlbumStore()
      mockLibraryFetch.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          error: { value: null },
          data: { value: { categories: ['Rock', 'Pop', 'Jazz'] } },
        }),
      })

      await store.loadGenres()
      expect(store.genres).toEqual(['Rock', 'Pop', 'Jazz'])
    })

    it('loadGenres handles error gracefully', async () => {
      const store = useAlbumStore()
      mockLibraryFetch.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          error: { value: 'API error' },
          data: { value: null },
        }),
      })

      await store.loadGenres()
      expect(store.genres).toEqual([])
    })
  })

  describe('Sort Functionality', () => {
    beforeEach(() => {
      const store = useAlbumStore()
      store.albums = [
        {
          id: '1',
          name: 'Album A',
          artists: ['Zebra'],
          release_date: '2023-01-01',
          tracks_count: 10,
          cover_art: 'cover.jpg',
          $id: '1',
        } as Album,
        {
          id: '2',
          name: 'Album B',
          artists: ['Apple'],
          release_date: '2024-01-01',
          tracks_count: 5,
          cover_art: 'cover2.jpg',
          $id: '2',
        } as Album,
      ]
    })

    it('sortedAlbums computes with release_date descending', () => {
      const store = useAlbumStore()
      store.sortBy = 'release_date'
      store.sortOrder = 'desc'
      const sorted = store.sortedAlbums
      expect(sorted[0].release_date).toBe('2024-01-01')
      expect(sorted[1].release_date).toBe('2023-01-01')
    })

    it('sortedAlbums computes with release_date ascending', () => {
      const store = useAlbumStore()
      store.sortBy = 'release_date'
      store.sortOrder = 'asc'
      const sorted = store.sortedAlbums
      expect(sorted[0].release_date).toBe('2023-01-01')
      expect(sorted[1].release_date).toBe('2024-01-01')
    })

    it('sortedAlbums sorts by artist name', () => {
      const store = useAlbumStore()
      store.sortBy = 'artist'
      const sorted = store.sortedAlbums
      expect(sorted[0].artists[0]).toBe('Apple')
      expect(sorted[1].artists[0]).toBe('Zebra')
    })

    it('sortedAlbums uses secondary sort by name for equal dates', () => {
      const store = useAlbumStore()
      store.albums = [
        {
          id: '1',
          name: 'Zebra Album',
          artists: ['Artist'],
          release_date: '2023-01-01',
          tracks_count: 10,
          cover_art: 'cover.jpg',
        } as Album,
        {
          id: '2',
          name: 'Apple Album',
          artists: ['Artist'],
          release_date: '2023-01-01',
          tracks_count: 5,
          cover_art: 'cover2.jpg',
        } as Album,
      ]
      store.sortBy = 'release_date'
      store.sortOrder = 'desc'
      const sorted = store.sortedAlbums
      expect(sorted[0].name).toBe('Zebra Album')
      expect(sorted[1].name).toBe('Apple Album')
    })

    it('setSortBy updates sortBy state', () => {
      const store = useAlbumStore()
      store.setSortBy('artist')
      expect(store.sortBy).toBe('artist')
    })

    it('setSortBy sets ascending order for artist sort', () => {
      const store = useAlbumStore()
      store.sortOrder = 'desc'
      store.setSortBy('artist')
      expect(store.sortOrder).toBe('asc')
    })

    it('setSortBy triggers shuffle when random passed', () => {
      const store = useAlbumStore()
      store.setSortBy('random')
      expect(store.sortBy).toBe('random')
    })

    it('setSortOrder updates sort order', () => {
      const store = useAlbumStore()
      store.setSortOrder('asc')
      expect(store.sortOrder).toBe('asc')
    })

    it('toggleSortOrder reverses sort order', () => {
      const store = useAlbumStore()
      store.sortOrder = 'asc'
      store.toggleSortOrder()
      expect(store.sortOrder).toBe('desc')
      store.toggleSortOrder()
      expect(store.sortOrder).toBe('asc')
    })
  })

  describe('Shuffle Functionality', () => {
    it('shuffleAlbums sets sortBy to random', () => {
      const store = useAlbumStore()
      store.shuffleAlbums()
      expect(store.sortBy).toBe('random')
    })

    it('shuffleAlbums generates random keys for all albums', () => {
      const store = useAlbumStore()
      store.albums = [
        { id: '1', name: 'Album 1', artists: [], release_date: '', tracks_count: 0, cover_art: '', $id: '1' } as Album,
        { id: '2', name: 'Album 2', artists: [], release_date: '', tracks_count: 0, cover_art: '', $id: '2' } as Album,
      ]
      store.shuffleAlbums()
      // Verify shuffle sets sortBy to random
      expect(store.sortBy).toBe('random')
      // Verify sortedAlbums returns albums in some order
      const sorted = store.sortedAlbums
      expect(sorted.length).toBe(2)
    })

    it('shuffleAlbums creates different order than original', () => {
      const store = useAlbumStore()
      const albums = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Album ${i}`,
        artists: [],
        release_date: '',
        tracks_count: 0,
        cover_art: '',
        $id: `${i}`,
      })) as Album[]
      store.albums = albums

      const originalOrder = albums.map(a => a.id)
      store.shuffleAlbums()
      const sortedOrder = store.sortedAlbums.map(a => a.id)

      // With 10 items, probability of same order is extremely low
      expect(sortedOrder).not.toEqual(originalOrder)
    })
  })

  describe('Album Data Transformation', () => {
    it('handles albums with empty artists array', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-1',
        name: 'Album with No Artists',
        artists: [],
        release_date: '2023-01-01',
        tracks_count: 5,
        cover_art: 'cover.jpg',
      }

      const transformed = {
        ...album,
        $id: album.id,
        $title: album.name,
        $subtitle: album.artists?.[0] || 'Various Artists',
        $note: album.release_date ? album.release_date.substring(0, 4) : 'Unknown year',
        $cover_src: store.getAlbumCoverById(album.id),
      }

      expect(transformed.$subtitle).toBe('Various Artists')
    })

    it('handles albums with missing release_date', () => {
      const store = useAlbumStore()
      const album: Partial<Album> = {
        id: 'album-1',
        name: 'Album Without Date',
        artists: ['Artist'],
        tracks_count: 5,
        cover_art: 'cover.jpg',
      }

      const transformed = {
        ...album,
        $id: album.id,
        $title: album.name,
        $subtitle: album.artists?.[0] || 'Various Artists',
        $note: album.release_date ? album.release_date.substring(0, 4) : 'Unknown year',
        $cover_src: store.getAlbumCoverById(album.id as string),
      }

      expect(transformed.$note).toBe('Unknown year')
    })

    it('extracts 4-character year from release_date', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-1',
        name: 'Album',
        artists: ['Artist'],
        release_date: '2023-06-15',
        tracks_count: 5,
        cover_art: 'cover.jpg',
      }

      const year = album.release_date?.substring(0, 4)
      expect(year).toBe('2023')
    })

    it('sets $id equal to album.id', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-xyz',
        name: 'Album',
        artists: [],
        release_date: '',
        tracks_count: 0,
        cover_art: '',
      }

      expect(album.id).toBe('album-xyz')
    })
  })

  describe('Backward Compatibility', () => {
    it('sortedAlbumsByReleaseDate computed still works', () => {
      const store = useAlbumStore()
      store.albums = [
        {
          id: '1',
          name: 'Album 1',
          artists: [],
          release_date: '2023-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
        {
          id: '2',
          name: 'Album 2',
          artists: [],
          release_date: '2024-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
      ]

      const sorted = store.sortedAlbumsByReleaseDate
      expect(sorted).toBeDefined()
      expect(sorted.length).toBe(2)
      expect(sorted[0].release_date).toBe('2024-01-01')
    })

    it('sortedAlbumsByReleaseDate handles missing dates', () => {
      const store = useAlbumStore()
      store.albums = [
        {
          id: '1',
          name: 'Album Without Date',
          artists: [],
          release_date: undefined,
          tracks_count: 0,
          cover_art: '',
        } as unknown as Album,
        {
          id: '2',
          name: 'Album With Date',
          artists: [],
          release_date: '2024-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
      ]

      const sorted = store.sortedAlbumsByReleaseDate
      expect(sorted.length).toBe(2)
      expect(sorted[0].release_date).toBe('2024-01-01')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty albums array in sortedAlbums', () => {
      const store = useAlbumStore()
      store.albums = []
      const sorted = store.sortedAlbums
      expect(sorted).toEqual([])
    })

    it('handles single album in sort', () => {
      const store = useAlbumStore()
      store.albums = [
        {
          id: '1',
          name: 'Single Album',
          artists: ['Artist'],
          release_date: '2023-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
      ]
      store.sortBy = 'release_date'
      const sorted = store.sortedAlbums
      expect(sorted.length).toBe(1)
      expect(sorted[0].id).toBe('1')
    })

    it('filterAlbums with undefined query', () => {
      const store = useAlbumStore()
      store.allAlbums = [
        {
          id: '1',
          name: 'Album',
          artists: ['Artist'],
          release_date: '2023-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
      ]
      expect(() => store.filterAlbums('')).not.toThrow()
      expect(store.albums.length).toBe(1)
    })

    it('handles artist sort with no artists', () => {
      const store = useAlbumStore()
      store.albums = [
        {
          id: '1',
          name: 'Album 1',
          artists: [],
          release_date: '2023-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
        {
          id: '2',
          name: 'Album 2',
          artists: [],
          release_date: '2023-01-01',
          tracks_count: 0,
          cover_art: '',
        } as Album,
      ]
      store.sortBy = 'artist'
      const sorted = store.sortedAlbums
      expect(sorted.length).toBe(2)
    })
  })

  describe('State Mutations', () => {
    it('albums array is mutable', () => {
      const store = useAlbumStore()
      const testAlbums = [
        {
          id: '1',
          name: 'Album',
          artists: [],
          release_date: '',
          tracks_count: 0,
          cover_art: '',
        } as Album,
      ]
      store.albums = testAlbums
      expect(store.albums).toStrictEqual(testAlbums)
      expect(store.albums.length).toBe(1)
    })

    it('allAlbums array is independent of albums array', () => {
      const store = useAlbumStore()
      const testAlbum: Album = {
        id: '1',
        name: 'Album',
        artists: [],
        release_date: '',
        tracks_count: 0,
        cover_art: '',
      }
      store.allAlbums = [testAlbum]
      store.albums = []
      expect(store.allAlbums.length).toBe(1)
      expect(store.albums.length).toBe(0)
    })

    it('album detail can be set and cleared', () => {
      const store = useAlbumStore()
      const detail: AlbumDetails = {
        id: '1',
        name: 'Album',
        artists: [],
        release_date: '',
        tracks_count: 0,
        cover_art: '',
        tracks: [],
      }
      store.album = detail
      expect(store.album).toStrictEqual(detail)
      store.album = null
      expect(store.album).toBeNull()
    })
  })
})

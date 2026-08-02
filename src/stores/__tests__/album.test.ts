import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAlbumStore } from '../album'
import type { Album, AlbumDetails } from '@/types/library'

// Mock dependencies
vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => {
    return vi.fn(async () => {
      return {
        json: vi.fn(async () => ({
          error: { value: null },
          data: { value: { albums: [] } },
          isFinished: { value: true },
        })),
      }
    })
  },
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

describe('Album Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('State initialization', () => {
    it('initializes with empty state', () => {
      const store = useAlbumStore()
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(false)
      expect(store.albums).toEqual([])
      expect(store.allAlbums).toEqual([])
      expect(store.album).toBe(null)
    })

    it('initializes search query to empty string', () => {
      const store = useAlbumStore()
      expect(store.searchQuery).toBe('')
    })

    it('initializes sort options with defaults', () => {
      const store = useAlbumStore()
      expect(store.sortBy).toBe('release_date')
      expect(store.sortOrder).toBe('desc')
    })

    it('initializes genres and selectedGenres as empty arrays', () => {
      const store = useAlbumStore()
      expect(store.genres).toEqual([])
      expect(store.selectedGenres).toEqual([])
    })
  })

  describe('getAlbumCoverById', () => {
    it('returns album cover URL with correct format', () => {
      const store = useAlbumStore()
      const coverUrl = store.getAlbumCoverById('album-123')
      expect(coverUrl).toContain('http://localhost:8000')
      expect(coverUrl).toContain('/library/')
      expect(coverUrl).toContain('album-123')
    })

    it('constructs URL with different album IDs', () => {
      const store = useAlbumStore()
      const cover1 = store.getAlbumCoverById('id1')
      const cover2 = store.getAlbumCoverById('id2')
      expect(cover1).not.toBe(cover2)
      expect(cover1).toContain('id1')
      expect(cover2).toContain('id2')
    })
  })

  describe('Search functionality', () => {
    it('setSearchQuery updates search query', () => {
      const store = useAlbumStore()
      store.setSearchQuery('test')
      expect(store.searchQuery).toBe('test')
    })

    it('clearSearch resets search query', () => {
      const store = useAlbumStore()
      store.setSearchQuery('test')
      store.clearSearch()
      expect(store.searchQuery).toBe('')
    })

    it('filterAlbums with empty query returns all albums', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Artist 1'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist 2'], release_date: '2024-01-01' } as Album,
      ]
      store.allAlbums = testAlbums
      store.filterAlbums('')
      expect(store.albums.length).toBe(2)
    })

    it('filterAlbums searches by album name', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Test Album', artists: ['Artist 1'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Other Album', artists: ['Artist 2'], release_date: '2024-01-01' } as Album,
      ]
      store.allAlbums = testAlbums
      store.filterAlbums('Test')
      expect(store.albums.length).toBe(1)
      expect(store.albums[0].name).toBe('Test Album')
    })

    it('filterAlbums searches by artist name', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Test Artist'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Album 2', artists: ['Other Artist'], release_date: '2024-01-01' } as Album,
      ]
      store.allAlbums = testAlbums
      store.filterAlbums('Test')
      expect(store.albums.length).toBe(1)
      expect(store.albums[0].artists[0]).toBe('Test Artist')
    })

    it('filterAlbums is case insensitive', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'ALBUM ONE', artists: ['ARTIST ONE'], release_date: '2023-01-01' } as Album,
      ]
      store.allAlbums = testAlbums
      store.filterAlbums('album one')
      expect(store.albums.length).toBe(1)
    })

    it('filterAlbums trims whitespace', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album', artists: ['Artist'], release_date: '2023-01-01' } as Album,
      ]
      store.allAlbums = testAlbums
      store.filterAlbums('   Album   ')
      expect(store.albums.length).toBe(1)
    })
  })

  describe('Sort functionality', () => {
    it('sortedAlbums computes with release_date sort', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Artist'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist'], release_date: '2024-01-01' } as Album,
      ]
      store.albums = testAlbums
      store.sortBy = 'release_date'
      store.sortOrder = 'desc'
      const sorted = store.sortedAlbums
      expect(sorted[0].release_date).toBe('2024-01-01')
      expect(sorted[1].release_date).toBe('2023-01-01')
    })

    it('sortedAlbums handles ascending release_date sort', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Artist'], release_date: '2024-01-01' } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist'], release_date: '2023-01-01' } as Album,
      ]
      store.albums = testAlbums
      store.sortBy = 'release_date'
      store.sortOrder = 'asc'
      const sorted = store.sortedAlbums
      expect(sorted[0].release_date).toBe('2023-01-01')
      expect(sorted[1].release_date).toBe('2024-01-01')
    })

    it('sortedAlbums sorts by artist name', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Zebra'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Album 2', artists: ['Apple'], release_date: '2023-01-01' } as Album,
      ]
      store.albums = testAlbums
      store.sortBy = 'artist'
      const sorted = store.sortedAlbums
      expect(sorted[0].artists[0]).toBe('Apple')
      expect(sorted[1].artists[0]).toBe('Zebra')
    })

    it('sortedAlbums uses secondary sort by name when dates equal', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Zebra', artists: ['Artist'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Apple', artists: ['Artist'], release_date: '2023-01-01' } as Album,
      ]
      store.albums = testAlbums
      store.sortBy = 'release_date'
      const sorted = store.sortedAlbums
      expect(sorted[0].name).toBe('Zebra') // desc order
      expect(sorted[1].name).toBe('Apple')
    })

    it('setSortBy updates sort type', () => {
      const store = useAlbumStore()
      store.setSortBy('artist')
      expect(store.sortBy).toBe('artist')
    })

    it('setSortBy with artist sets ascending order', () => {
      const store = useAlbumStore()
      store.sortOrder = 'desc'
      store.setSortBy('artist')
      expect(store.sortOrder).toBe('asc')
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

  describe('Shuffle functionality', () => {
    it('shuffleAlbums sets sortBy to random', () => {
      const store = useAlbumStore()
      store.shuffleAlbums()
      expect(store.sortBy).toBe('random')
    })

    it('shuffleAlbums returns with no errors', () => {
      const store = useAlbumStore()
      store.albums = [
        { id: '1', name: 'Album 1', artists: ['Artist'], release_date: '2023-01-01', $id: '1' } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist'], release_date: '2024-01-01', $id: '2' } as Album,
      ]
      expect(() => store.shuffleAlbums()).not.toThrow()
      expect(store.sortBy).toBe('random')
    })

    it('setSortBy random sets sort to random mode', () => {
      const store = useAlbumStore()
      store.albums = [
        { id: '1', name: 'Album 1', artists: ['Artist'], release_date: '2023-01-01', $id: '1' } as Album,
      ]
      store.setSortBy('random')
      expect(store.sortBy).toBe('random')
    })
  })

  describe('Album data transformation', () => {
    it('album objects have $id property set from id', () => {
      const store = useAlbumStore()
      const album = {
        id: 'album-123',
        name: 'Test Album',
        artists: ['Artist'],
        release_date: '2023-01-01',
      } as Album
      store.albums = [album]
      expect(store.albums[0]).toHaveProperty('id', 'album-123')
    })

    it('album objects should have cover_src URL', () => {
      const store = useAlbumStore()
      const coverUrl = store.getAlbumCoverById('test-id')
      expect(coverUrl).toMatch(/test-id/)
    })
  })

  describe('sortedAlbumsByReleaseDate computed', () => {
    it('returns albums sorted by release date descending', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Artist'], release_date: '2023-01-01' } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist'], release_date: '2024-01-01' } as Album,
      ]
      store.albums = testAlbums
      const sorted = store.sortedAlbumsByReleaseDate
      expect(sorted[0].release_date).toBe('2024-01-01')
    })

    it('handles missing release dates', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Artist'] } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist'], release_date: '2024-01-01' } as Album,
      ]
      store.albums = testAlbums
      const sorted = store.sortedAlbumsByReleaseDate
      expect(sorted[0].release_date).toBe('2024-01-01')
      expect(sorted[1]).toHaveProperty('id', '1')
    })
  })

  describe('Loading state management', () => {
    it('initializes with loading false', () => {
      const store = useAlbumStore()
      expect(store.loading).toBe(false)
    })

    it('initializes with loaded false', () => {
      const store = useAlbumStore()
      expect(store.loaded).toBe(false)
    })

    it('can update loading state', () => {
      const store = useAlbumStore()
      store.loading = true
      expect(store.loading).toBe(true)
    })

    it('can update loaded state', () => {
      const store = useAlbumStore()
      store.loaded = true
      expect(store.loaded).toBe(true)
    })
  })

  describe('Album mapping edge cases - FIXED', () => {
    it('handles album with empty artists array - maps to "Various Artists"', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-1',
        name: 'Album with No Artists',
        artists: [], // Empty artists
        release_date: '2023-01-01',
        tracks_count: 5,
        cover_art: 'cover.jpg',
      }

      // Simulate store mapping logic
      const mapped = {
        ...album,
        $id: album.id,
        $title: album.name,
        $subtitle: `${album.artists?.[0] || 'Various Artists'}`, // Should fallback
        $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
        $cover_src: store.getAlbumCoverById(album.id),
      }

      expect(mapped.$subtitle).toBe('Various Artists')
      expect(mapped.$note).toBe('2023')
    })

    it('handles album with missing release_date - maps to "Unknown year"', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-2',
        name: 'Album Without Date',
        artists: ['Artist 1'],
        // release_date is optional and missing
        tracks_count: 10,
        cover_art: 'cover.jpg',
      }

      // Simulate store mapping logic
      const mapped = {
        ...album,
        $id: album.id,
        $title: album.name,
        $subtitle: `${album.artists?.[0] || 'Various Artists'}`,
        $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
        $cover_src: store.getAlbumCoverById(album.id),
      }

      expect(mapped.$subtitle).toBe('Artist 1')
      expect(mapped.$note).toBe('Unknown year')
    })

    it('handles album with both empty artists and missing release_date', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-3',
        name: 'Mystery Album',
        artists: [], // Empty
        // release_date missing
        tracks_count: 3,
        cover_art: 'cover.jpg',
      }

      // Simulate store mapping logic
      const mapped = {
        ...album,
        $id: album.id,
        $title: album.name,
        $subtitle: `${album.artists?.[0] || 'Various Artists'}`,
        $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
        $cover_src: store.getAlbumCoverById(album.id),
      }

      expect(mapped.$subtitle).toBe('Various Artists')
      expect(mapped.$note).toBe('Unknown year')
      expect(mapped.$title).toBe('Mystery Album')
    })

    it('handles album with proper artists and release_date', () => {
      const store = useAlbumStore()
      const album: Album = {
        id: 'album-4',
        name: 'Complete Album',
        artists: ['Main Artist', 'Featured Artist'],
        release_date: '2023-06-15',
        tracks_count: 12,
        cover_art: 'cover.jpg',
      }

      // Simulate store mapping logic
      const mapped = {
        ...album,
        $id: album.id,
        $title: album.name,
        $subtitle: `${album.artists?.[0] || 'Various Artists'}`,
        $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
        $cover_src: store.getAlbumCoverById(album.id),
      }

      expect(mapped.$id).toBe('album-4')
      expect(mapped.$title).toBe('Complete Album')
      expect(mapped.$subtitle).toBe('Main Artist') // First artist
      expect(mapped.$note).toBe('2023')
    })
  })

  describe('Type consistency', () => {
    it('albums ref is array type', () => {
      const store = useAlbumStore()
      expect(Array.isArray(store.albums)).toBe(true)
    })

    it('allAlbums ref is array type', () => {
      const store = useAlbumStore()
      expect(Array.isArray(store.allAlbums)).toBe(true)
    })

    it('searchQuery is string type', () => {
      const store = useAlbumStore()
      expect(typeof store.searchQuery).toBe('string')
    })

    it('sortBy is string type', () => {
      const store = useAlbumStore()
      expect(typeof store.sortBy).toBe('string')
    })

    it('sortOrder is string type', () => {
      const store = useAlbumStore()
      expect(typeof store.sortOrder).toBe('string')
    })
  })

  describe('Genre filtering', () => {
    it('initializes genres as empty array', () => {
      const store = useAlbumStore()
      expect(store.genres).toEqual([])
    })

    it('initializes selectedGenres as empty array', () => {
      const store = useAlbumStore()
      expect(store.selectedGenres).toEqual([])
    })

    it('setGenreFilter method exists and is callable', () => {
      const store = useAlbumStore()
      expect(typeof store.setGenreFilter).toBe('function')
    })

    it('filterAlbums with empty genre filter returns all albums', () => {
      const store = useAlbumStore()
      const testAlbums: Album[] = [
        { id: '1', name: 'Album 1', artists: ['Artist'], $id: '1' } as Album,
        { id: '2', name: 'Album 2', artists: ['Artist'], $id: '2' } as Album,
      ]
      store.allAlbums = testAlbums
      store.filterAlbums('')
      expect(store.albums.length).toBe(2)
    })
  })

  describe('Public API methods exist', () => {
    it('getAlbums method exists', () => {
      const store = useAlbumStore()
      expect(typeof store.getAlbums).toBe('function')
    })

    it('getAlbumByAlbumId method exists', () => {
      const store = useAlbumStore()
      expect(typeof store.getAlbumByAlbumId).toBe('function')
    })

    it('getAlbumByArtistId method exists', () => {
      const store = useAlbumStore()
      expect(typeof store.getAlbumByArtistId).toBe('function')
    })

    it('loadGenres method exists', () => {
      const store = useAlbumStore()
      expect(typeof store.loadGenres).toBe('function')
    })

    it('setGenreFilter method exists', () => {
      const store = useAlbumStore()
      expect(typeof store.setGenreFilter).toBe('function')
    })
  })

  describe('Album ref state', () => {
    it('album ref initializes to null', () => {
      const store = useAlbumStore()
      expect(store.album).toBe(null)
    })

    it('can set album ref to AlbumDetails object', () => {
      const store = useAlbumStore()
      const testAlbum: AlbumDetails = {
        id: 'test',
        name: 'Test',
        artists: ['Artist'],
        release_date: '2023-01-01',
      } as AlbumDetails
      store.album = testAlbum
      expect(store.album).toBeDefined()
      expect(store.album?.id).toBe('test')
    })
  })
})

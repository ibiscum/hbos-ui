import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArtistStore } from '../artist'
import type { Artist, ArtistMetadata } from '@/types/library'

const mockLibraryFetch = vi.fn()
const mockShowErrorToast = vi.fn()
const mockRefreshLibraryStatus = vi.fn()
const mockRouterPush = vi.fn()
const mockRewriteImageUrl = vi.fn((url: string) => `rewritten:${url}`)

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => mockLibraryFetch,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mockShowErrorToast,
  }),
}))

vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    refreshLibraryStatus: mockRefreshLibraryStatus,
  }),
}))

vi.mock('@/api/utils', () => ({
  rewriteImageUrl: (url: string) => mockRewriteImageUrl(url),
}))

const artist = (overrides: Partial<Artist> = {}): Artist => ({
  id: 'artist-1',
  name: 'Alpha Artist',
  is_multi: false,
  album_count: 2,
  thumb_url: ['thumb-1.jpg'],
  ...overrides,
})

const artistMetadata = (overrides: Partial<ArtistMetadata> = {}): ArtistMetadata => ({
  id: 'artist-9',
  name: 'Artist Nine',
  is_multi: false,
  metadata: {
    mbid: [],
    thumb_url: [],
    banner_url: [],
    biography: 'bio',
    genres: [],
  },
  ...overrides,
})

const queueLibraryResponse = (payload: {
  error?: unknown
  data?: unknown
  isFinished?: boolean
}) => {
  mockLibraryFetch.mockReturnValueOnce({
    json: vi.fn().mockResolvedValue({
      error: { value: payload.error ?? null },
      data: { value: payload.data ?? null },
      isFinished: { value: payload.isFinished ?? true },
    }),
  })
}

describe('Artist Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('State initialization', () => {
    it('initializes with expected defaults', () => {
      const store = useArtistStore()
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(false)
      expect(store.artists).toEqual([])
      expect(store.allArtists).toEqual([])
      expect(store.artistByName).toBe(null)
      expect(store.searchQuery).toBe('')
    })
  })

  describe('Sorting and filtering', () => {
    it('sorts artists by name', () => {
      const store = useArtistStore()
      store.artists = [artist({ name: 'Zulu' }), artist({ name: 'alpha' })]
      const sorted = store.sortedArtists
      expect(sorted[0].name).toBe('alpha')
      expect(sorted[1].name).toBe('Zulu')
    })

    it('setSearchQuery updates query and filters against allArtists', () => {
      const store = useArtistStore()
      store.allArtists = [artist({ name: 'Alpha Artist' }), artist({ name: 'Beta Artist' })]

      store.setSearchQuery('alpha')

      expect(store.searchQuery).toBe('alpha')
      expect(store.artists).toHaveLength(1)
      expect(store.artists[0].name).toBe('Alpha Artist')
    })

    it('clearSearch resets query and restores all artists', () => {
      const store = useArtistStore()
      store.allArtists = [artist({ name: 'A' }), artist({ name: 'B' })]
      store.setSearchQuery('A')

      store.clearSearch()

      expect(store.searchQuery).toBe('')
      expect(store.artists).toHaveLength(2)
    })
  })

  describe('Store lookup helpers', () => {
    it('getArtistByIdFromStore returns artist when present', () => {
      const store = useArtistStore()
      store.allArtists = [
        { ...artist({ id: 'id-1' }), $id: 'id-1' },
        { ...artist({ id: 'id-2' }), $id: 'id-2' },
      ]

      const result = store.getArtistByIdFromStore('id-2')

      expect(result?.id).toBe('id-2')
    })

    it('getArtistByIdFromStore returns null when missing', () => {
      const store = useArtistStore()
      store.allArtists = [artist({ id: 'id-1' })]

      const result = store.getArtistByIdFromStore('id-9')

      expect(result).toBe(null)
    })
  })

  describe('getArtists', () => {
    it('maps and stores artists with UI fields', async () => {
      const store = useArtistStore()
      queueLibraryResponse({
        data: {
          artists: [
            artist({
              id: 'artist-1',
              name: 'Mapped Artist',
              album_count: 1,
              thumb_url: ['cover.jpg'],
            }),
          ],
        },
      })

      await store.getArtists()

      expect(store.artists).toHaveLength(1)
      expect(store.allArtists).toHaveLength(1)
      expect(store.artists[0].$id).toBe('artist-1')
      expect(store.artists[0].$title).toBe('Mapped Artist')
      expect(store.artists[0].$subtitle).toBe('1 album')
      expect(store.artists[0].$cover_src).toBe('rewritten:cover.jpg')
      expect(mockRewriteImageUrl).toHaveBeenCalledWith('cover.jpg')
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(true)
    })

    it('does not call rewriteImageUrl when thumb_url is empty', async () => {
      const store = useArtistStore()
      queueLibraryResponse({
        data: { artists: [artist({ thumb_url: [] })] },
      })

      await store.getArtists()

      expect(mockRewriteImageUrl).toHaveBeenCalledTimes(0)
      expect(store.artists[0].$cover_src).toBeUndefined()
    })

    it('refreshes library status when no artists are returned', async () => {
      const store = useArtistStore()
      queueLibraryResponse({ data: { artists: [] } })

      await store.getArtists()

      expect(mockRefreshLibraryStatus).toHaveBeenCalledTimes(1)
      expect(store.loading).toBe(false)
    })

    it('shows toast when API returns error', async () => {
      const store = useArtistStore()
      queueLibraryResponse({
        error: 'backend error',
        data: { artists: [] },
      })

      await store.getArtists()

      expect(mockShowErrorToast).toHaveBeenCalledWith('Get Artists Error: backend error')
      expect(store.loading).toBe(false)
    })

    it('resets loading on thrown request errors', async () => {
      const store = useArtistStore()
      mockLibraryFetch.mockReturnValueOnce({
        json: vi.fn().mockRejectedValue(new Error('network failed')),
      })

      await store.getArtists()

      expect(mockShowErrorToast).toHaveBeenCalled()
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(false)
    })
  })

  describe('getMoreArtists', () => {
    it('appends mapped artists on success', async () => {
      const store = useArtistStore()
      queueLibraryResponse({
        data: {
          artists: [artist({ id: 'more-1', name: 'More Artist', thumb_url: ['more.jpg'] })],
        },
      })

      await store.getMoreArtists()

      expect(store.artists).toHaveLength(1)
      expect(store.artists[0].$id).toBe('more-1')
      expect(store.artists[0].$cover_src).toBe('rewritten:more.jpg')
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(true)
    })

    it('sets hasMore to false when no additional artists are returned', async () => {
      const store = useArtistStore()
      queueLibraryResponse({ data: { artists: [] } })

      await store.getMoreArtists()
      await store.getMoreArtists()

      expect(mockLibraryFetch).toHaveBeenCalledTimes(1)
    })

    it('shows toast on API error response', async () => {
      const store = useArtistStore()
      queueLibraryResponse({ error: 'bad page', data: { artists: [] } })

      await store.getMoreArtists()

      expect(mockShowErrorToast).toHaveBeenCalledWith('Get Artists Error: bad page')
      expect(store.loading).toBe(false)
    })

    it('resets loading on thrown errors', async () => {
      const store = useArtistStore()
      mockLibraryFetch.mockReturnValueOnce({
        json: vi.fn().mockRejectedValue(new Error('page failed')),
      })

      await store.getMoreArtists()

      expect(mockShowErrorToast).toHaveBeenCalled()
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(false)
    })
  })

  describe('getArtistByName', () => {
    it('stores artist and navigates to artist page on success', async () => {
      const store = useArtistStore()
      queueLibraryResponse({
        data: { artist: artistMetadata({ id: 'artist-42' }) },
      })

      await store.getArtistByName('Artist 42')

      expect(store.artistByName?.id).toBe('artist-42')
      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'artist-album',
        params: { artistId: 'artist-42' },
      })
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(true)
    })

    it('clears artistByName but does not clear artists when no result', async () => {
      const store = useArtistStore()
      store.artists = [artist({ id: 'keep-1' })]
      store.artistByName = artistMetadata({ id: 'old-id' })
      queueLibraryResponse({ data: { artist: null } })

      await store.getArtistByName('missing')

      expect(store.artistByName).toBe(null)
      expect(store.artists).toHaveLength(1)
      expect(store.loading).toBe(false)
    })

    it('shows toast and resets loading on thrown errors', async () => {
      const store = useArtistStore()
      mockLibraryFetch.mockReturnValueOnce({
        json: vi.fn().mockRejectedValue(new Error('name failed')),
      })

      await store.getArtistByName('Name')

      expect(mockShowErrorToast).toHaveBeenCalled()
      expect(store.loading).toBe(false)
      expect(store.loaded).toBe(false)
    })

    it('normalizes name to lowercase in request URL', async () => {
      const store = useArtistStore()
      queueLibraryResponse({ data: { artist: artistMetadata() } })

      await store.getArtistByName('MiXeD Name')

      const firstCallPath = mockLibraryFetch.mock.calls[0][0] as string
      expect(firstCallPath).toContain('/artist/by-name/mixed%20name')
    })
  })
})

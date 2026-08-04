/**
 * Unit and Regression Tests for PosterItem Interface
 *
 * Tests cover:
 * 1. Field optionality and types
 * 2. Extension consistency (Album, Artist inheritance)
 * 3. UI mapping field semantics ($id, $title, $subtitle, $cover_src, $note)
 * 4. Backward compatibility with extending interfaces
 * 5. Real-world usage patterns from components
 */

import { describe, it, expect } from 'vitest'
import type { PosterItem } from '@/types/library'
import type { Album } from '@/types/library'
import type { Artist } from '@/types/library'

/**
 * Factory for creating test PosterItems with optional overrides
 */
function createPosterItem(overrides: Partial<PosterItem> = {}): PosterItem {
  return {
    $id: 'poster-1',
    $title: 'Test Poster',
    $subtitle: 'Subtitle',
    $note: 'Note',
    $cover_src: '/covers/test.jpg',
    ...overrides,
  }
}

describe('PosterItem Interface', () => {
  describe('Field Definitions', () => {
    it('should allow all fields to be optional', () => {
      const emptyPoster: PosterItem = {}
      expect(emptyPoster).toEqual({})
    })

    it('should have $id field as optional string', () => {
      const posterWithId: PosterItem = { $id: 'poster-123' }
      expect(posterWithId.$id).toBe('poster-123')
      expect(typeof posterWithId.$id).toBe('string')

      const posterWithoutId: PosterItem = {}
      expect(posterWithoutId.$id).toBeUndefined()
    })

    it('should have $title field as optional string', () => {
      const posterWithTitle: PosterItem = { $title: 'My Title' }
      expect(posterWithTitle.$title).toBe('My Title')
      expect(typeof posterWithTitle.$title).toBe('string')

      const posterWithoutTitle: PosterItem = {}
      expect(posterWithoutTitle.$title).toBeUndefined()
    })

    it('should have $subtitle field as optional string', () => {
      const posterWithSubtitle: PosterItem = { $subtitle: 'Artist Name' }
      expect(posterWithSubtitle.$subtitle).toBe('Artist Name')

      const posterWithoutSubtitle: PosterItem = {}
      expect(posterWithoutSubtitle.$subtitle).toBeUndefined()
    })

    it('should have $note field as optional string', () => {
      const posterWithNote: PosterItem = { $note: 'Release 2024' }
      expect(posterWithNote.$note).toBe('Release 2024')

      const posterWithoutNote: PosterItem = {}
      expect(posterWithoutNote.$note).toBeUndefined()
    })

    it('should have $cover_src field as optional string', () => {
      const posterWithCover: PosterItem = { $cover_src: 'http://example.com/cover.jpg' }
      expect(posterWithCover.$cover_src).toBe('http://example.com/cover.jpg')

      const posterWithoutCover: PosterItem = {}
      expect(posterWithoutCover.$cover_src).toBeUndefined()
    })
  })

  describe('UI Mapping Semantics', () => {
    it('should use $id for unique identification in UI rendering', () => {
      const posters: PosterItem[] = [
        { $id: 'album-1', $title: 'Album 1' },
        { $id: 'album-2', $title: 'Album 2' },
        { $id: 'album-3', $title: 'Album 3' },
      ]

      const ids = new Set(posters.map((p) => p.$id))
      expect(ids.size).toBe(3)
      posters.forEach((poster) => {
        expect(poster.$id).toBeDefined()
      })
    })

    it('should use $title as primary display text', () => {
      const poster: PosterItem = {
        $title: 'Thriller',
        $subtitle: 'Michael Jackson',
      }

      expect(poster.$title).toBe('Thriller')
      // $title should be used in PosterGrid as :title attribute
    })

    it('should use $subtitle as secondary display text', () => {
      const poster: PosterItem = {
        $title: 'Album Name',
        $subtitle: 'Artist Name',
      }

      expect(poster.$subtitle).toBe('Artist Name')
      // $subtitle represents artist, genre, or album count
    })

    it('should use $cover_src as image source URL or path', () => {
      const posterWithAbsoluteUrl: PosterItem = {
        $cover_src: 'https://api.example.com/covers/album1.jpg',
      }
      expect(posterWithAbsoluteUrl.$cover_src).toContain('http')

      const posterWithRelativePath: PosterItem = {
        $cover_src: '/covers/album1.jpg',
      }
      expect(posterWithRelativePath.$cover_src).toMatch(/^\//)

      const posterWithNoPath: PosterItem = {
        $cover_src: 'default-cover.jpg',
      }
      expect(posterWithNoPath.$cover_src).toBeDefined()
    })

    it('should use $note for optional additional information', () => {
      const posterWithNote: PosterItem = {
        $title: 'Album',
        $note: '2024 Remaster',
      }
      expect(posterWithNote.$note).toBe('2024 Remaster')

      const posterWithoutNote: PosterItem = {
        $title: 'Album',
      }
      expect(posterWithoutNote.$note).toBeUndefined()
    })
  })

  describe('Composition with Extending Interfaces', () => {
    it('Album extends PosterItem with additional fields', () => {
      const album: Album = {
        id: 'album-123',
        name: 'Test Album',
        tracks_count: 12,
        cover_art: '/art.jpg',
        artists: ['Artist 1'],
        $id: 'album-123',
        $title: 'Test Album',
        $subtitle: 'Artist 1',
        $cover_src: '/art.jpg',
      }

      // Album has all PosterItem fields
      expect(album.$id).toBe('album-123')
      expect(album.$title).toBe('Test Album')

      // Album has its own semantic fields
      expect(album.id).toBe('album-123')
      expect(album.name).toBe('Test Album')
      expect(album.artists).toEqual(['Artist 1'])
    })

    it('Artist extends PosterItem with additional fields', () => {
      const artist: Artist = {
        id: 'artist-456',
        name: 'Test Artist',
        is_multi: false,
        album_count: 5,
        thumb_url: ['/thumb.jpg'],
        $id: 'artist-456',
        $title: 'Test Artist',
        $subtitle: '5 albums',
        $cover_src: '/thumb.jpg',
      }

      // Artist has all PosterItem fields
      expect(artist.$id).toBe('artist-456')
      expect(artist.$title).toBe('Test Artist')

      // Artist has its own semantic fields
      expect(artist.id).toBe('artist-456')
      expect(artist.name).toBe('Test Artist')
      expect(artist.album_count).toBe(5)
    })
  })

  describe('Real-world Usage Patterns', () => {
    it('should work with Album store mapping pattern', () => {
      // Simulates album store: computeAlbumDisplayFormat()
      const apiAlbum = {
        id: 'album-1',
        name: 'Dark Side of the Moon',
        artists: ['Pink Floyd'],
        release_date: '1973-03-01',
        tracks_count: 10,
        cover_art: '/albums/dark-side.jpg',
      }

      const displayAlbum: PosterItem & Album = {
        ...apiAlbum,
        $id: apiAlbum.id,
        $title: apiAlbum.name,
        $subtitle: apiAlbum.artists?.[0] || 'Various Artists',
        $cover_src: apiAlbum.cover_art,
      }

      expect(displayAlbum.$id).toBe('album-1')
      expect(displayAlbum.$title).toBe('Dark Side of the Moon')
      expect(displayAlbum.$subtitle).toBe('Pink Floyd')
      expect(displayAlbum.$cover_src).toBe('/albums/dark-side.jpg')
    })

    it('should work with Artist store mapping pattern', () => {
      // Simulates artist store: computeArtistDisplayFormat()
      const apiArtist = {
        id: 'artist-1',
        name: 'Pink Floyd',
        is_multi: false,
        album_count: 15,
        thumb_url: ['/artists/pink-floyd.jpg'],
      }

      const displayArtist: PosterItem & Artist = {
        ...apiArtist,
        $id: apiArtist.id,
        $title: apiArtist.name,
        $subtitle: `${apiArtist.album_count} album${apiArtist.album_count !== 1 ? 's' : ''}`,
        $cover_src: apiArtist.thumb_url[0],
      }

      expect(displayArtist.$id).toBe('artist-1')
      expect(displayArtist.$title).toBe('Pink Floyd')
      expect(displayArtist.$subtitle).toBe('15 albums')
      expect(displayArtist.$cover_src).toBe('/artists/pink-floyd.jpg')
    })

    it('should work with PosterGrid component generic constraint', () => {
      // Simulates: <PosterGrid<Album> :items="albums" />
      const albums: Album[] = [
        {
          id: 'a1',
          name: 'Album 1',
          tracks_count: 10,
          cover_art: '/cover1.jpg',
          artists: ['Artist A'],
          $id: 'a1',
          $title: 'Album 1',
          $subtitle: 'Artist A',
          $cover_src: '/cover1.jpg',
        },
        {
          id: 'a2',
          name: 'Album 2',
          tracks_count: 12,
          cover_art: '/cover2.jpg',
          artists: ['Artist B'],
          $id: 'a2',
          $title: 'Album 2',
          $subtitle: 'Artist B',
          $cover_src: '/cover2.jpg',
        },
      ]

      // PosterGrid iterates using $id as key
      albums.forEach((item) => {
        expect(item.$id).toBeDefined()
        expect(item.$title).toBeDefined()
        expect(item.$cover_src).toBeDefined()
      })
    })

    it('should handle missing subtitle fallback', () => {
      // Albums with no artists should fallback to "Various Artists"
      const albumWithoutArtists: Album = {
        id: 'compilation-1',
        name: 'Compilation Album',
        tracks_count: 20,
        cover_art: '/compilation.jpg',
        artists: [],
        $id: 'compilation-1',
        $title: 'Compilation Album',
        $subtitle: 'Various Artists', // Fallback value
        $cover_src: '/compilation.jpg',
      }

      expect(albumWithoutArtists.$subtitle).toBe('Various Artists')
    })

    it('should handle missing cover image', () => {
      const posterWithoutCover: PosterItem = {
        $id: 'item-1',
        $title: 'Item Without Cover',
        // $cover_src omitted
      }

      expect(posterWithoutCover.$cover_src).toBeUndefined()
      // Component should render default/placeholder image
    })
  })

  describe('DOM Integration', () => {
    it('should support key attribute for Vue list rendering', () => {
      // In PosterGrid.vue: v-for="item in items" :key="item.$id"
      const posters: PosterItem[] = [
        { $id: 'p1', $title: 'Title 1' },
        { $id: 'p2', $title: 'Title 2' },
      ]

      posters.forEach((poster) => {
        expect(poster.$id).toBeDefined()
        expect(typeof poster.$id).toBe('string')
      })
    })

    it('should support data-id attribute for DOM queries', () => {
      // In PosterGrid.vue: :data-id="item.$id"
      // In artists.vue: document.querySelector(`[data-id="${targetArtist.$id}"]`)
      const poster: PosterItem = {
        $id: 'album-focus-target',
        $title: 'Focus Album',
      }

      expect(poster.$id).toBeDefined()
      // DOM selector would be: [data-id="album-focus-target"]
    })

    it('should support title attribute for tooltips', () => {
      // In PosterGrid.vue: :title="item.$title || ''"
      const posterWithTitle: PosterItem = {
        $title: 'Full Album Title',
      }

      expect(posterWithTitle.$title).toBe('Full Album Title')

      const posterWithoutTitle: PosterItem = {}
      expect(posterWithoutTitle.$title || '').toBe('')
    })
  })

  describe('Backward Compatibility', () => {
    it('should support partial initialization', () => {
      const poster1: PosterItem = { $id: 'p1' }
      const poster2: PosterItem = { $title: 'Title Only' }
      const poster3: PosterItem = { $cover_src: '/cover.jpg' }

      expect(poster1.$id).toBe('p1')
      expect(poster1.$title).toBeUndefined()

      expect(poster2.$title).toBe('Title Only')
      expect(poster2.$id).toBeUndefined()

      expect(poster3.$cover_src).toBe('/cover.jpg')
      expect(poster3.$title).toBeUndefined()
    })

    it('should accept spreading from partial objects', () => {
      const partialData = { $id: 'item-1', $title: 'Item' }
      const poster: PosterItem = { ...partialData }

      expect(poster.$id).toBe('item-1')
      expect(poster.$title).toBe('Item')
    })

    it('should work with type assertions from extending interfaces', () => {
      const album: Album = {
        id: 'a1',
        name: 'Album',
        tracks_count: 10,
        cover_art: '/cover.jpg',
        artists: [],
        $id: 'a1',
        $title: 'Album',
        $cover_src: '/cover.jpg',
      }

      // Can be used as PosterItem
      const poster: PosterItem = album
      expect(poster.$id).toBe('a1')
      expect(poster.$title).toBe('Album')
    })
  })

  describe('Field Name Semantics', () => {
    it('should distinguish $ prefix fields from semantic fields', () => {
      // $ prefix indicates UI mapping/presentation fields
      // Used internally by components for rendering
      const poster: PosterItem = {
        $id: 'ui-key',
        $title: 'Display Title',
        $subtitle: 'Display Subtitle',
        $note: 'Extra Info',
        $cover_src: 'Image URL',
      }

      // All are presentation-layer fields
      expect(poster.$id).toBeDefined()
      expect(poster.$title).toBeDefined()
      expect(poster.$subtitle).toBeDefined()
      expect(poster.$note).toBeDefined()
      expect(poster.$cover_src).toBeDefined()
    })

    it('should have no non-$ fields (base interface only)', () => {
      const poster: PosterItem = createPosterItem()

      // PosterItem itself only has $-prefixed fields
      // Semantic fields come from extending interfaces (Album, Artist)
      const keys = Object.keys(poster)
      keys.forEach((key) => {
        expect(key).toMatch(/^\$/)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      const poster: PosterItem = {
        $id: '',
        $title: '',
        $subtitle: '',
        $cover_src: '',
      }

      expect(poster.$id).toBe('')
      expect(poster.$title).toBe('')
      // Components should handle empty strings as falsy
    })

    it('should handle very long string values', () => {
      const longTitle = 'A'.repeat(1000)
      const poster: PosterItem = {
        $title: longTitle,
        $subtitle: longTitle,
      }

      expect(poster.$title).toBe(longTitle)
      expect(poster.$subtitle).toBe(longTitle)
      // CSS text-truncation should be applied in components
    })

    it('should handle special characters in strings', () => {
      const poster: PosterItem = {
        $title: 'Album & Artist <Name>',
        $subtitle: 'Feat. "Special" Chars',
        $note: "It's a good 'album' 100%",
      }

      expect(poster.$title).toContain('&')
      expect(poster.$subtitle).toContain('"')
      expect(poster.$note).toContain("'")
      // Components should handle HTML escaping
    })

    it('should handle URL-like strings in cover source', () => {
      const posterWithUrl: PosterItem = {
        $cover_src: 'https://cdn.example.com/covers/album?id=123&format=jpg',
      }

      expect(posterWithUrl.$cover_src).toContain('https://')
      expect(posterWithUrl.$cover_src).toContain('?')

      const posterWithPath: PosterItem = {
        $cover_src: '/api/covers/album-123.jpg',
      }

      expect(posterWithPath.$cover_src).toMatch(/^\//)
    })

    it('should handle undefined and null-like states', () => {
      const posterEmpty: PosterItem = {}
      expect(posterEmpty.$id).toBeUndefined()
      expect(posterEmpty.$title).toBeUndefined()

      // Components should handle: item?.$id, item.$title || 'default'
    })
  })

  describe('Integration with Component Patterns', () => {
    it('should match PosterGrid.vue data binding requirements', () => {
      // PosterGrid uses: :key="item.$id", :data-id="item.$id", :title="item.$title || ''"
      const item: PosterItem = {
        $id: 'poster-1',
        $title: 'Test',
      }

      // Must support Vue bindings
      expect(item.$id).toBeDefined()
      expect(item.$title || '').toBe('Test')
    })

    it('should match router.push() parameter pattern', () => {
      // albums-by-category.vue: router.push({ name: 'album', params: { albumId: album.$id } })
      const album: PosterItem = {
        $id: 'album-123',
      }

      expect(album.$id).toBeDefined()
      // Router expects: { albumId: 'album-123' }
    })

    it('should match DOM selector pattern', () => {
      // artists.vue: document.querySelector(`[data-id="${targetArtist.$id}"]`)
      const artist: PosterItem = {
        $id: 'artist-456',
      }

      const selector = `[data-id="${artist.$id}"]`
      expect(selector).toBe('[data-id="artist-456"]')
    })
  })
})

import { describe, it, expect } from 'vitest'
import type { Metadata } from '@/types/library'

/**
 * Regression tests for the Metadata interface.
 * These tests verify:
 * - Stability of field structure and types
 * - Correct array/object semantics
 * - Proper handling of edge cases that may have caused bugs
 */

describe('Metadata interface - regression tests', () => {
  describe('structure stability', () => {
    it('maintains consistent field count', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: [],
      }

      const keys = Object.keys(metadata)
      expect(keys).toHaveLength(5)
      expect(keys).toContain('mbid')
      expect(keys).toContain('thumb_url')
      expect(keys).toContain('banner_url')
      expect(keys).toContain('biography')
      expect(keys).toContain('genres')
    })

    it('preserves field types consistently', () => {
      const metadata: Metadata = {
        mbid: ['id1'],
        thumb_url: ['url1'],
        banner_url: ['url1'],
        biography: 'bio',
        genres: ['genre1'],
      }

      expect(Array.isArray(metadata.mbid)).toBe(true)
      expect(Array.isArray(metadata.thumb_url)).toBe(true)
      expect(Array.isArray(metadata.banner_url)).toBe(true)
      expect(typeof metadata.biography).toBe('string')
      expect(Array.isArray(metadata.genres)).toBe(true)
    })

    it('does not allow extra fields to be accessed', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: [],
      }

      // TypeScript ensures this at compile time, but verify runtime behavior
      const extraField = (metadata as any).extraField
      expect(extraField).toBeUndefined()
    })
  })

  describe('url field independence', () => {
    it('thumb_url and banner_url are independent arrays', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: ['thumb1.jpg', 'thumb2.jpg'],
        banner_url: ['banner1.jpg'],
        biography: '',
        genres: [],
      }

      expect(metadata.thumb_url).toEqual(['thumb1.jpg', 'thumb2.jpg'])
      expect(metadata.banner_url).toEqual(['banner1.jpg'])
      expect(metadata.thumb_url.length).not.toBe(metadata.banner_url.length)
    })

    it('modifying one URL array does not affect the other', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: ['thumb.jpg'],
        banner_url: ['banner.jpg'],
        biography: '',
        genres: [],
      }

      metadata.thumb_url.push('thumb2.jpg')

      expect(metadata.thumb_url).toHaveLength(2)
      expect(metadata.banner_url).toHaveLength(1)
    })
  })

  describe('mbid and genres independence', () => {
    it('mbid and genres are independent despite both being arrays', () => {
      const metadata: Metadata = {
        mbid: ['mbid1', 'mbid2'],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: ['Rock', 'Pop'],
      }

      expect(metadata.mbid.length).toBe(2)
      expect(metadata.genres.length).toBe(2)

      metadata.mbid.push('mbid3')

      expect(metadata.mbid).toHaveLength(3)
      expect(metadata.genres).toHaveLength(2)
    })
  })

  describe('biography isolation', () => {
    it('biography does not interfere with array fields', () => {
      const metadata: Metadata = {
        mbid: ['id1', 'id2'],
        thumb_url: ['url1'],
        banner_url: ['url1'],
        biography: 'This biography contains array-like text [1, 2, 3]',
        genres: ['Genre1'],
      }

      // Verify biography is still a string and arrays are still arrays
      expect(typeof metadata.biography).toBe('string')
      expect(Array.isArray(metadata.mbid)).toBe(true)
      expect(Array.isArray(metadata.genres)).toBe(true)

      // Verify biography content is preserved exactly
      expect(metadata.biography).toContain('[1, 2, 3]')
    })

    it('empty biography and empty arrays coexist', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: [],
      }

      expect(metadata.biography).toBe('')
      expect(metadata.mbid).toEqual([])
      expect(metadata.genres).toEqual([])
    })
  })

  describe('array mutation safety', () => {
    it('pushing to array fields works correctly', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: [],
      }

      metadata.genres.push('NewGenre')
      metadata.mbid.push('new-id')

      expect(metadata.genres).toContain('NewGenre')
      expect(metadata.mbid).toContain('new-id')
    })

    it('filtering array fields maintains type safety', () => {
      const metadata: Metadata = {
        mbid: ['id1', 'id2', 'id3'],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: ['Rock', 'Pop', 'Jazz'],
      }

      const filteredGenres = metadata.genres.filter(g => g !== 'Rock')
      expect(filteredGenres).toEqual(['Pop', 'Jazz'])

      const filteredMbid = metadata.mbid.filter(id => id !== 'id2')
      expect(filteredMbid).toEqual(['id1', 'id3'])
    })

    it('array assignment replaces entire array', () => {
      const metadata: Metadata = {
        mbid: ['id1'],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: ['Rock'],
      }

      metadata.genres = ['NewGenre1', 'NewGenre2']

      expect(metadata.genres).toEqual(['NewGenre1', 'NewGenre2'])
      expect(metadata.genres).toHaveLength(2)
    })
  })

  describe('real-world usage patterns', () => {
    it('handles artist metadata with all fields populated', () => {
      const metadata: Metadata = {
        mbid: ['12345678-1234-1234-1234-123456789012'],
        thumb_url: ['https://example.com/artist-thumb.jpg'],
        banner_url: ['https://example.com/artist-banner.jpg'],
        biography: 'Award-winning artist with extensive discography',
        genres: ['Rock', 'Alternative', 'Indie'],
      }

      expect(metadata.mbid).toHaveLength(1)
      expect(metadata.thumb_url).toHaveLength(1)
      expect(metadata.banner_url).toHaveLength(1)
      expect(metadata.biography).toBeTruthy()
      expect(metadata.genres).toHaveLength(3)
    })

    it('handles metadata with minimal information', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: [],
      }

      // Should not throw or cause issues
      expect(metadata.mbid.length).toBe(0)
      expect(metadata.genres.length).toBe(0)
    })

    it('handles metadata from incomplete API responses', () => {
      const metadata: Metadata = {
        mbid: [],
        thumb_url: ['partial-thumb.jpg'],
        banner_url: [],
        biography: 'Some biography text',
        genres: ['Rock'],
      }

      expect(metadata.mbid).toEqual([])
      expect(metadata.banner_url).toEqual([])
      expect(metadata.thumb_url).toHaveLength(1)
      expect(metadata.biography).toBeTruthy()
    })
  })

  describe('type compatibility', () => {
    it('is assignable from object with correct structure', () => {
      const obj: Metadata = {
        mbid: ['test'],
        thumb_url: ['test.jpg'],
        banner_url: ['test.jpg'],
        biography: 'test',
        genres: ['test'],
      }

      expect(obj).toBeDefined()
    })

    it('serializes and deserializes correctly', () => {
      const original: Metadata = {
        mbid: ['id1'],
        thumb_url: ['url1'],
        banner_url: ['url1'],
        biography: 'bio',
        genres: ['genre1'],
      }

      const json = JSON.stringify(original)
      const deserialized: Metadata = JSON.parse(json)

      expect(deserialized).toEqual(original)
      expect(Array.isArray(deserialized.mbid)).toBe(true)
      expect(typeof deserialized.biography).toBe('string')
    })
  })
})

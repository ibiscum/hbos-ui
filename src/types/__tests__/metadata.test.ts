import { describe, it, expect } from 'vitest'
import type { Metadata } from '@/types/library'

const createMetadata = (overrides: Partial<Metadata> = {}): Metadata => ({
  mbid: ['mbid-1'],
  thumb_url: ['https://example.com/thumb.jpg'],
  banner_url: ['https://example.com/banner.jpg'],
  biography: 'A detailed biography of the artist',
  genres: ['Rock', 'Alternative'],
  ...overrides,
})

describe('Metadata interface', () => {
  describe('Field presence and types', () => {
    it('has all required fields', () => {
      const metadata = createMetadata()

      expect(metadata).toHaveProperty('mbid')
      expect(metadata).toHaveProperty('thumb_url')
      expect(metadata).toHaveProperty('banner_url')
      expect(metadata).toHaveProperty('biography')
      expect(metadata).toHaveProperty('genres')
    })

    it('stores mbid as string array', () => {
      const metadata = createMetadata({ mbid: ['id-1', 'id-2'] })

      expect(Array.isArray(metadata.mbid)).toBe(true)
      expect(metadata.mbid).toEqual(['id-1', 'id-2'])
      expect(typeof metadata.mbid[0]).toBe('string')
    })

    it('stores thumb_url as string array', () => {
      const urls = ['https://example.com/thumb1.jpg', 'https://example.com/thumb2.jpg']
      const metadata = createMetadata({ thumb_url: urls })

      expect(Array.isArray(metadata.thumb_url)).toBe(true)
      expect(metadata.thumb_url).toEqual(urls)
    })

    it('stores banner_url as string array', () => {
      const urls = ['https://example.com/banner1.jpg']
      const metadata = createMetadata({ banner_url: urls })

      expect(Array.isArray(metadata.banner_url)).toBe(true)
      expect(metadata.banner_url).toEqual(urls)
    })

    it('stores biography as string', () => {
      const bio = 'Test biography text'
      const metadata = createMetadata({ biography: bio })

      expect(typeof metadata.biography).toBe('string')
      expect(metadata.biography).toBe(bio)
    })

    it('stores genres as string array', () => {
      const genres = ['Jazz', 'Fusion', 'Blues']
      const metadata = createMetadata({ genres })

      expect(Array.isArray(metadata.genres)).toBe(true)
      expect(metadata.genres).toEqual(genres)
    })
  })

  describe('Empty array handling', () => {
    it('allows empty mbid array', () => {
      const metadata = createMetadata({ mbid: [] })

      expect(metadata.mbid).toEqual([])
      expect(metadata.mbid.length).toBe(0)
    })

    it('allows empty thumb_url array', () => {
      const metadata = createMetadata({ thumb_url: [] })

      expect(metadata.thumb_url).toEqual([])
      expect(metadata.thumb_url.length).toBe(0)
    })

    it('allows empty banner_url array', () => {
      const metadata = createMetadata({ banner_url: [] })

      expect(metadata.banner_url).toEqual([])
      expect(metadata.banner_url.length).toBe(0)
    })

    it('allows empty genres array', () => {
      const metadata = createMetadata({ genres: [] })

      expect(metadata.genres).toEqual([])
      expect(metadata.genres.length).toBe(0)
    })

    it('handles completely empty metadata', () => {
      const metadata = createMetadata({
        mbid: [],
        thumb_url: [],
        banner_url: [],
        biography: '',
        genres: [],
      })

      expect(metadata.mbid).toEqual([])
      expect(metadata.thumb_url).toEqual([])
      expect(metadata.banner_url).toEqual([])
      expect(metadata.biography).toBe('')
      expect(metadata.genres).toEqual([])
    })
  })

  describe('Empty string handling', () => {
    it('allows empty biography string', () => {
      const metadata = createMetadata({ biography: '' })

      expect(metadata.biography).toBe('')
      expect(typeof metadata.biography).toBe('string')
    })

    it('allows whitespace-only biography', () => {
      const metadata = createMetadata({ biography: '   ' })

      expect(metadata.biography).toBe('   ')
    })

    it('preserves multiline biography text', () => {
      const bio = 'Line 1\nLine 2\nLine 3'
      const metadata = createMetadata({ biography: bio })

      expect(metadata.biography).toBe(bio)
      expect(metadata.biography).toContain('\n')
    })
  })

  describe('Data integrity', () => {
    it('maintains array references independently', () => {
      const metadata1 = createMetadata()
      const metadata2 = createMetadata()

      metadata1.mbid.push('new-id')

      expect(metadata2.mbid).not.toContain('new-id')
    })

    it('supports multiple values in collection fields', () => {
      const metadata = createMetadata({
        mbid: ['mbid-1', 'mbid-2', 'mbid-3'],
        thumb_url: ['url1', 'url2', 'url3', 'url4'],
        banner_url: ['banner1', 'banner2'],
        genres: ['Rock', 'Alternative', 'Indie', 'Pop'],
      })

      expect(metadata.mbid).toHaveLength(3)
      expect(metadata.thumb_url).toHaveLength(4)
      expect(metadata.banner_url).toHaveLength(2)
      expect(metadata.genres).toHaveLength(4)
    })

    it('handles mixed empty and populated arrays', () => {
      const metadata = createMetadata({
        mbid: [],
        thumb_url: ['url'],
        banner_url: [],
        genres: ['Genre1', 'Genre2'],
      })

      expect(metadata.mbid.length).toBe(0)
      expect(metadata.thumb_url.length).toBe(1)
      expect(metadata.banner_url.length).toBe(0)
      expect(metadata.genres.length).toBe(2)
    })
  })

  describe('URL field validation patterns', () => {
    it('supports various URL formats in thumb_url', () => {
      const urls = [
        'https://example.com/thumb.jpg',
        'http://example.com/image.png',
        '/relative/path/image.jpg',
        'data:image/jpeg;base64,...',
      ]
      const metadata = createMetadata({ thumb_url: urls })

      expect(metadata.thumb_url).toEqual(urls)
      expect(metadata.thumb_url).toHaveLength(4)
    })

    it('supports various URL formats in banner_url', () => {
      const urls = [
        'https://cdn.example.com/banner.jpg',
        '/images/banner.png',
      ]
      const metadata = createMetadata({ banner_url: urls })

      expect(metadata.banner_url).toEqual(urls)
    })
  })

  describe('MBID field patterns', () => {
    it('stores multiple MusicBrainz IDs', () => {
      const mbids = [
        '12345678-1234-1234-1234-123456789012',
        'abcdefgh-abcd-abcd-abcd-abcdefghijkl',
      ]
      const metadata = createMetadata({ mbid: mbids })

      expect(metadata.mbid).toEqual(mbids)
      expect(metadata.mbid).toHaveLength(2)
    })

    it('handles single MBID', () => {
      const metadata = createMetadata({ mbid: ['single-mbid'] })

      expect(metadata.mbid).toHaveLength(1)
      expect(metadata.mbid[0]).toBe('single-mbid')
    })
  })

  describe('Genre field patterns', () => {
    it('stores multiple genres', () => {
      const genres = ['Rock', 'Alternative', 'Indie', 'Pop']
      const metadata = createMetadata({ genres })

      expect(metadata.genres).toEqual(genres)
      expect(metadata.genres).toHaveLength(4)
    })

    it('handles duplicate genres if present', () => {
      const genres = ['Rock', 'Rock', 'Alternative']
      const metadata = createMetadata({ genres })

      expect(metadata.genres).toEqual(genres)
      expect(metadata.genres.length).toBe(3)
    })

    it('preserves genre capitalization', () => {
      const genres = ['Rock', 'JAZZ', 'blues', 'Pop']
      const metadata = createMetadata({ genres })

      expect(metadata.genres).toEqual(genres)
    })
  })

  describe('Biography field patterns', () => {
    it('handles long biography text', () => {
      const longBio = 'Lorem ipsum dolor sit amet, '.repeat(100)
      const metadata = createMetadata({ biography: longBio })

      expect(metadata.biography).toBe(longBio)
      expect(metadata.biography.length).toBeGreaterThan(2000)
    })

    it('handles biography with special characters', () => {
      const bio = 'Artist & Band (2020) - "Famous" Album\'s Review!'
      const metadata = createMetadata({ biography: bio })

      expect(metadata.biography).toBe(bio)
    })

    it('handles biography with unicode characters', () => {
      const bio = '艺术家传记 - 日本アーティスト - Café Français'
      const metadata = createMetadata({ biography: bio })

      expect(metadata.biography).toBe(bio)
    })
  })
})

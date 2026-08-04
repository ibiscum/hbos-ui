import { describe, it, expect } from 'vitest'
import type { Artist, ArtistBase, ArtistMetadata, Metadata } from '@/types/library'

const createArtistBase = (overrides: Partial<ArtistBase> = {}): ArtistBase => ({
  id: 'artist-1',
  name: 'Test Artist',
  is_multi: false,
  ...overrides,
})

const createMetadata = (overrides: Partial<Metadata> = {}): Metadata => ({
  mbid: ['mbid-1'],
  thumb_url: ['thumb.jpg'],
  banner_url: ['banner.jpg'],
  biography: 'Test biography',
  genres: ['Rock'],
  ...overrides,
})

const createArtist = (overrides: Partial<Artist> = {}): Artist => ({
  ...createArtistBase(),
  album_count: 3,
  thumb_url: ['artist-thumb.jpg'],
  ...overrides,
})

describe('library artist interfaces', () => {
  it('models ArtistBase minimal identity fields', () => {
    const base = createArtistBase({ id: 'artist-a', name: 'Artist A' })

    expect(base.id).toBe('artist-a')
    expect(base.name).toBe('Artist A')
    expect(base.is_multi).toBe(false)
  })

  it('allows Artist poster mapping fields from PosterItem', () => {
    const artist: Artist = createArtist({
      $id: 'mapped-id',
      $title: 'Mapped Artist',
      $subtitle: '3 albums',
      $note: 'featured',
      $cover_src: 'mapped-cover.jpg',
    })

    expect(artist.$id).toBe('mapped-id')
    expect(artist.$title).toBe('Mapped Artist')
    expect(artist.$cover_src).toBe('mapped-cover.jpg')
  })

  it('supports artists without thumbnails (regression)', () => {
    const artist = createArtist({ thumb_url: [] })

    expect(artist.thumb_url).toEqual([])
    expect(artist.album_count).toBe(3)
  })

  it('keeps album_count independent from thumb_url size', () => {
    const artist = createArtist({ album_count: 12, thumb_url: ['a.jpg'] })

    expect(artist.album_count).toBe(12)
    expect(artist.thumb_url).toHaveLength(1)
  })

  it('models ArtistMetadata with nested Metadata payload', () => {
    const artistMetadata: ArtistMetadata = {
      ...createArtistBase({ id: 'artist-meta' }),
      metadata: createMetadata({ biography: 'Detailed bio', genres: ['Jazz', 'Fusion'] }),
    }

    expect(artistMetadata.id).toBe('artist-meta')
    expect(artistMetadata.metadata.biography).toBe('Detailed bio')
    expect(artistMetadata.metadata.genres).toEqual(['Jazz', 'Fusion'])
  })

  it('allows empty metadata lists while keeping biography text', () => {
    const artistMetadata: ArtistMetadata = {
      ...createArtistBase(),
      metadata: createMetadata({
        mbid: [],
        thumb_url: [],
        banner_url: [],
        genres: [],
        biography: '',
      }),
    }

    expect(artistMetadata.metadata.mbid).toEqual([])
    expect(artistMetadata.metadata.thumb_url).toEqual([])
    expect(artistMetadata.metadata.biography).toBe('')
  })
})

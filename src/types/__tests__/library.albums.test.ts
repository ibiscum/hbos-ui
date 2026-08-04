import { describe, it, expect } from 'vitest'
import type {
  Album,
  AlbumByArtistResponse,
  AlbumDetails,
  AlbumResponse,
  AlbumsResponse,
  Track,
} from '@/types/library'

const createAlbum = (overrides: Partial<Album> = {}): Album => ({
  id: 'album-1',
  name: 'Test Album',
  tracks_count: 10,
  cover_art: 'cover.jpg',
  artists: ['Artist 1'],
  ...overrides,
})

const createTrack = (overrides: Partial<Track> = {}): Track => ({
  disc_number: '1',
  track_number: 1,
  name: 'Track 1',
  uri: 'spotify:track:1',
  ...overrides,
})

describe('library album interfaces', () => {
  it('supports Album without release_date (regression)', () => {
    const album = createAlbum()

    expect(album.release_date).toBeUndefined()
    expect(album.tracks_count).toBe(10)
  })

  it('allows Album poster fields from PosterItem', () => {
    const album: Album = createAlbum({
      $id: 'mapped-id',
      $title: 'Mapped Title',
      $subtitle: 'Mapped Subtitle',
      $note: '2026',
      $cover_src: 'mapped-cover.jpg',
    })

    expect(album.$id).toBe('mapped-id')
    expect(album.$title).toBe('Mapped Title')
    expect(album.$cover_src).toBe('mapped-cover.jpg')
  })

  it('supports AlbumDetails track list extension', () => {
    const details: AlbumDetails = {
      ...createAlbum({ tracks_count: 2 }),
      tracks: [createTrack(), createTrack({ name: 'Track 2', track_number: 2 })],
    }

    expect(details.tracks).toHaveLength(2)
    expect(details.tracks[1].name).toBe('Track 2')
  })

  it('models AlbumResponse as single album payload', () => {
    const response: AlbumResponse = {
      player_name: 'player-a',
      album: {
        ...createAlbum(),
        tracks: [createTrack()],
      },
    }

    expect(Object.keys(response)).toEqual(['player_name', 'album'])
    expect(response.album.tracks[0].uri).toBe('spotify:track:1')
  })

  it('models AlbumsResponse as collection payload', () => {
    const response: AlbumsResponse = {
      player_name: 'player-a',
      count: 2,
      albums: [createAlbum({ id: 'album-1' }), createAlbum({ id: 'album-2' })],
    }

    expect(response.albums).toHaveLength(2)
    expect(response.count).toBe(2)
  })

  it('keeps count independent from albums array length (regression)', () => {
    const response: AlbumsResponse = {
      player_name: 'player-a',
      count: 10,
      albums: [createAlbum({ id: 'album-1' })],
    }

    expect(response.count).toBe(10)
    expect(response.albums).toHaveLength(1)
  })

  it('includes artist context and albums in AlbumByArtistResponse', () => {
    const response: AlbumByArtistResponse = {
      player_name: 'player-a',
      count: 1,
      artists: [
        {
          id: 'artist-1',
          name: 'Artist 1',
          is_multi: false,
          album_count: 1,
          thumb_url: [],
        },
      ],
      albums: [createAlbum()],
    }

    expect(response.artists[0].name).toBe('Artist 1')
    expect(response.albums[0].id).toBe('album-1')
  })
})

import { describe, it, expect } from 'vitest'
import type {
  Album,
  AlbumDetails,
  AlbumResponse,
  AlbumByArtistResponse,
  AlbumsResponse,
} from '@/types/library'
import type { Track, PosterItem } from '@/types/library'

/**
 * Regression Tests for Album Type Definitions
 *
 * These tests verify current behavior of Album-related types and identify
 * type inconsistencies that need to be addressed.
 */

describe('Album Types - Structure & Contracts', () => {
  describe('Album Base Type', () => {
    it('Album has required core fields', () => {
      const album: Album = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 10,
        cover_art: 'http://example.com/cover.jpg',
        artists: ['Artist 1', 'Artist 2'],
      }

      expect(album.id).toBeDefined()
      expect(album.name).toBeDefined()
      expect(album.release_date).toBeDefined()
      expect(album.tracks_count).toBeDefined()
      expect(album.cover_art).toBeDefined()
      expect(album.artists).toBeDefined()
    })

    it('Album extends PosterItem which has optional $ properties', () => {
      const album: Album & PosterItem = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 10,
        cover_art: 'http://example.com/cover.jpg',
        artists: ['Artist 1'],
        // PosterItem properties are optional
        $id: 'mapped-id',
        $title: 'Mapped Title',
        $cover_src: 'mapped-cover.jpg',
      }

      expect(album.$id).toBe('mapped-id')
      expect(album.$title).toBe('Mapped Title')
      expect(album.$cover_src).toBe('mapped-cover.jpg')
    })

    it('Album artists array can be empty', () => {
      const album: Album = {
        id: 'album-123',
        name: 'Unknown Album',
        release_date: '2023-01-01',
        tracks_count: 5,
        cover_art: 'cover.jpg',
        artists: [], // Empty artists array - edge case
      }

      expect(album.artists).toEqual([])
      expect(album.artists.length).toBe(0)
    })

    it('Album release_date format is ISO string', () => {
      const album: Album = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-12-25',
        tracks_count: 10,
        cover_art: 'cover.jpg',
        artists: ['Artist'],
      }

      // Can be parsed as valid date
      const date = new Date(album.release_date)
      expect(date.getFullYear()).toBe(2023)
      expect(date.getMonth()).toBe(11) // 0-indexed
      expect(date.getDate()).toBe(25)
    })

    it('Album tracks_count uses underscore naming convention', () => {
      const album: Album = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 10, // Note: underscore, not camelCase
        cover_art: 'cover.jpg',
        artists: ['Artist'],
      }

      expect(album.tracks_count).toBe(10)
      // Verify property name is exactly as defined
      expect(Object.keys(album)).toContain('tracks_count')
    })
  })

  describe('AlbumDetails Type', () => {
    it('AlbumDetails extends Album with tracks array', () => {
      const track: Track = {
        id: 'track-1',
        name: 'Song 1',
        artist: 'Artist',
        disc_number: '1',
        track_number: 1,
        uri: 'spotify:track:123',
      }

      const details: AlbumDetails = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover.jpg',
        artists: ['Artist'],
        tracks: [track],
      }

      expect(details.tracks).toBeDefined()
      expect(Array.isArray(details.tracks)).toBe(true)
      expect(details.tracks.length).toBe(1)
      expect(details.tracks[0].name).toBe('Song 1')
    })

    it('AlbumDetails tracks can be empty array', () => {
      const details: AlbumDetails = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 0,
        cover_art: 'cover.jpg',
        artists: ['Artist'],
        tracks: [], // Empty tracks
      }

      expect(details.tracks).toEqual([])
    })

    it('AlbumDetails inherits all Album properties', () => {
      const details: AlbumDetails = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 5,
        cover_art: 'cover.jpg',
        artists: ['Artist 1', 'Artist 2'],
        tracks: [],
      }

      // Should have all Album properties
      expect(details.id).toBe('album-123')
      expect(details.name).toBe('Test Album')
      expect(details.release_date).toBe('2023-01-01')
      expect(details.tracks_count).toBe(5)
      expect(details.cover_art).toBe('cover.jpg')
      expect(details.artists.length).toBe(2)
    })
  })

  describe('AlbumResponse Type', () => {
    it('AlbumResponse wraps AlbumDetails with player_name', () => {
      const response: AlbumResponse = {
        player_name: 'main-player',
        album: {
          id: 'album-123',
          name: 'Test Album',
          release_date: '2023-01-01',
          tracks_count: 5,
          cover_art: 'cover.jpg',
          artists: ['Artist'],
          tracks: [],
        },
      }

      expect(response.player_name).toBe('main-player')
      expect(response.album).toBeDefined()
      expect(response.album.tracks).toEqual([])
    })

    it('AlbumResponse contains required fields', () => {
      const response: AlbumResponse = {
        player_name: 'player',
        album: {
          id: 'id',
          name: 'name',
          release_date: '2023-01-01',
          tracks_count: 1,
          cover_art: 'cover',
          artists: ['artist'],
          tracks: [],
        },
      }

      expect(Object.keys(response)).toEqual(['player_name', 'album'])
    })

    // INCONSISTENCY: AlbumResponse doesn't have 'count' field like AlbumsResponse does
    it('AlbumResponse structure differs from AlbumsResponse', () => {
      const albumResponse: AlbumResponse = {
        player_name: 'player',
        album: {
          id: 'id',
          name: 'name',
          release_date: '2023-01-01',
          tracks_count: 1,
          cover_art: 'cover',
          artists: [],
          tracks: [],
        },
      }

      const albumsResponse: AlbumsResponse = {
        player_name: 'player',
        count: 1, // AlbumsResponse has count
        albums: [],
      }

      // Note: AlbumResponse doesn't have 'count' - this is inconsistent
      expect('count' in albumResponse).toBe(false)
      expect('count' in albumsResponse).toBe(true)
    })
  })

  describe('AlbumsResponse Type', () => {
    it('AlbumsResponse contains player_name, count, and albums array', () => {
      const response: AlbumsResponse = {
        player_name: 'main-player',
        count: 2,
        albums: [
          {
            id: 'album-1',
            name: 'Album 1',
            release_date: '2023-01-01',
            tracks_count: 10,
            cover_art: 'cover1.jpg',
            artists: ['Artist 1'],
          },
          {
            id: 'album-2',
            name: 'Album 2',
            release_date: '2023-02-01',
            tracks_count: 12,
            cover_art: 'cover2.jpg',
            artists: ['Artist 2'],
          },
        ],
      }

      expect(response.player_name).toBe('main-player')
      expect(response.count).toBe(2)
      expect(response.albums.length).toBe(2)
    })

    it('AlbumsResponse can have empty albums array', () => {
      const response: AlbumsResponse = {
        player_name: 'player',
        count: 0,
        albums: [],
      }

      expect(response.albums).toEqual([])
      expect(response.count).toBe(0)
    })

    it('AlbumsResponse count matches albums array length', () => {
      const albums = [
        {
          id: '1',
          name: 'Album 1',
          release_date: '2023-01-01',
          tracks_count: 1,
          cover_art: 'c',
          artists: [],
        },
      ]

      const response: AlbumsResponse = {
        player_name: 'player',
        count: albums.length,
        albums,
      }

      expect(response.count).toBe(response.albums.length)
    })
  })

  describe('AlbumByArtistResponse Type - FIXED', () => {
    it('AlbumByArtistResponse has all required fields including albums', () => {
      const response: AlbumByArtistResponse = {
        artists: [],
        count: 0,
        player_name: 'player',
        albums: [],
      }

      expect(response.player_name).toBeDefined()
      expect(response.count).toBeDefined()
      expect(response.artists).toBeDefined()
      expect(response.albums).toBeDefined() // FIXED: Now included
      expect(Array.isArray(response.albums)).toBe(true)
    })

    it('AlbumByArtistResponse albums array contains Album objects', () => {
      const response: AlbumByArtistResponse = {
        artists: [],
        count: 1,
        player_name: 'player',
        albums: [
          {
            id: 'album-1',
            name: 'Album 1',
            release_date: '2023-01-01',
            tracks_count: 10,
            cover_art: 'cover.jpg',
            artists: ['Artist 1'],
          },
        ],
      }

      expect(response.albums.length).toBe(1)
      expect(response.albums[0].id).toBe('album-1')
      expect(response.albums[0].name).toBe('Album 1')
    })

    it('AlbumByArtistResponse albums field matches store code expectations', () => {
      // Store code checks: if (data.value?.albums && data.value.albums.length > 0)
      const response: AlbumByArtistResponse = {
        artists: [],
        count: 2,
        player_name: 'player',
        albums: [
          {
            id: '1',
            name: 'Album 1',
            release_date: '2023-01-01',
            tracks_count: 1,
            cover_art: 'c',
            artists: [],
          },
          {
            id: '2',
            name: 'Album 2',
            release_date: '2023-02-01',
            tracks_count: 2,
            cover_art: 'c',
            artists: [],
          },
        ],
      }

      // Verify the type structure matches store expectations
      if (response.albums && response.albums.length > 0) {
        expect(response.albums.length).toBe(2)
        expect(response.count).toBe(response.albums.length)
      }
    })
  })

  describe('Type Field Optionality & Defaults', () => {
    it('Album fields track_count is required, not optional', () => {
      const album: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 0, // Required, must be number
        cover_art: 'cover',
        artists: [],
      }

      // All fields are required
      expect('id' in album).toBe(true)
      expect('tracks_count' in album).toBe(true)
    })

    it('Album artists is array but could be empty - callers must check length', () => {
      const albumWithArtists: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: ['Artist'],
      }

      const albumWithoutArtists: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: [], // Empty - common edge case
      }

      // Store code does: album.artists[0] without checking length
      // This is safe only if artists array is guaranteed to have at least 1 element
      expect(albumWithArtists.artists[0]).toBe('Artist')

      // This would be undefined without proper checks:
      expect(albumWithoutArtists.artists[0]).toBeUndefined()
    })

    it('Track optional fields: id, artist might be missing', () => {
      const trackWithAllFields: Track = {
        id: 'track-1',
        artist: 'Artist',
        disc_number: '1',
        track_number: 1,
        name: 'Song',
        uri: 'uri:123',
      }

      const trackWithoutOptional: Track = {
        // id is optional
        // artist is optional
        disc_number: '1',
        track_number: 1,
        name: 'Song',
        uri: 'uri:123',
      }

      expect(trackWithAllFields.id).toBe('track-1')
      expect(trackWithoutOptional.id).toBeUndefined()
    })
  })

  describe('Response Type Naming Inconsistencies', () => {
    it('Response types use different field naming', () => {
      // API response type field names:
      // - LibraryStatsResponse uses: albums_count (underscore)
      // - Album uses: tracks_count (underscore)
      // Both use underscore naming, but different property names

      const statsResponse = {
        player_name: 'player',
        player_id: 'id',
        has_library: true,
        is_loaded: true,
        albums_count: 100, // underscore naming
        artists_count: 50,
        tracks_count: 1000, // underscore naming
      }

      expect(statsResponse.albums_count).toBeDefined()
      expect(statsResponse.tracks_count).toBeDefined()

      const album: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 10, // underscore naming
        cover_art: 'cover',
        artists: [],
      }

      // Both use underscore, which is consistent
      expect(album.tracks_count).toBeDefined()
    })

    it('AlbumsResponse count vs individual Album tracks_count', () => {
      const response: AlbumsResponse = {
        player_name: 'player',
        count: 2, // count of albums
        albums: [
          {
            id: '1',
            name: 'Album 1',
            release_date: '2023-01-01',
            tracks_count: 10, // count of tracks in this album
            cover_art: 'c',
            artists: [],
          },
        ],
      }

      // Naming is inconsistent:
      // - AlbumsResponse uses "count" for number of albums
      // - Album uses "tracks_count" for number of tracks
      // Should probably use consistent naming like:
      // - albums_count vs track_count, or
      // - album_count vs tracks_count

      expect(response.count).toBe(2) // albums count
      expect(response.albums[0].tracks_count).toBe(10) // tracks count
    })
  })

  describe('Type Mapping: Raw API vs Album with $ properties', () => {
    it('Store maps Album to Album with PosterItem $ properties', () => {
      // Raw album from API
      const rawAlbum: Album = {
        id: 'album-123',
        name: 'Test Album',
        release_date: '2023-01-01',
        tracks_count: 10,
        cover_art: 'cover.jpg',
        artists: ['Artist 1'],
      }

      // What the store does:
      const mappedAlbum = {
        ...rawAlbum,
        $id: rawAlbum.id,
        $title: rawAlbum.name,
        $subtitle: rawAlbum.artists[0],
        $note: rawAlbum.release_date.substring(0, 4),
        $cover_src: `mapped-cover-${rawAlbum.id}.jpg`,
      }

      expect(mappedAlbum.id).toBe(rawAlbum.id)
      expect(mappedAlbum.$id).toBe(rawAlbum.id)
      expect(mappedAlbum.$title).toBe(rawAlbum.name)
      expect(mappedAlbum.$subtitle).toBe('Artist 1')

      // This creates duplication of data in the object:
      // Original: id, name, cover_art
      // Mapped: $id, $title, $cover_src
      // Both exist on same object for PosterGrid compatibility
    })

    it('Mapping assumes artists array has at least 1 element', () => {
      const album: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: ['Artist 1', 'Artist 2'],
      }

      // This is what store does: album.artists[0]
      // But artists can be empty array - needs guard
      expect(album.artists[0]).toBe('Artist 1')

      const albumNoArtists: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: [], // Empty artists
      }

      expect(albumNoArtists.artists[0]).toBeUndefined()
      // Store code should use: album.artists[0] || 'Unknown Artist'
    })

    it('Mapping assumes release_date exists for year extraction', () => {
      const album: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: [],
      }

      // This is what store does:
      const year = album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'
      expect(year).toBe('2023')

      // The code checks if release_date exists, which is good defensive programming
      // But type says release_date is required (not optional)
      // This inconsistency means either:
      // 1. Type should make release_date optional: release_date?: string
      // 2. Or code shouldn't need to check if it exists
    })
  })

  describe('Edge Cases & Defensive Coding', () => {
    it('release_date is now optional - fixed to match code behavior', () => {
      // Type definition now correctly says release_date is optional
      // This matches the store code: album.release_date ?  substring...

      const albumWithDate: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01', // Optional but provided
        tracks_count: 1,
        cover_art: 'cover',
        artists: [],
      }

      expect(albumWithDate.release_date).toBe('2023-01-01')

      const albumWithoutDate: Album = {
        id: 'id',
        name: 'name',
        // release_date is now optional, so it can be missing
        tracks_count: 1,
        cover_art: 'cover',
        artists: [],
      }

      expect(albumWithoutDate.release_date).toBeUndefined()
    })

    it('Album artists array with empty value is safely handled', () => {
      const album: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: [],
      }

      // Store code now uses: album.artists?.[0] || 'Various Artists'
      // This safely handles empty array
      const subtitle = `${album.artists?.[0] || 'Various Artists'}`
      expect(subtitle).toBe('Various Artists')
    })

    it('Album artists array with items returns first artist', () => {
      const album: Album = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 1,
        cover_art: 'cover',
        artists: ['Artist 1', 'Artist 2'],
      }

      // Store code: album.artists?.[0] || 'Various Artists'
      const subtitle = `${album.artists?.[0] || 'Various Artists'}`
      expect(subtitle).toBe('Artist 1')
    })

    it('tracks array in AlbumDetails could be empty', () => {
      const details: AlbumDetails = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 0,
        cover_art: 'cover',
        artists: [],
        tracks: [], // Empty tracks even though tracks_count says 0
      }

      expect(details.tracks.length).toBe(0)
      expect(details.tracks_count).toBe(0)
    })

    it('tracks_count vs actual tracks array length could mismatch', () => {
      // Type doesn't enforce that tracks_count matches tracks.length
      // This could lead to UI bugs

      const detailsWithMismatch: AlbumDetails = {
        id: 'id',
        name: 'name',
        release_date: '2023-01-01',
        tracks_count: 5, // Says 5 tracks
        cover_art: 'cover',
        artists: [],
        tracks: [], // But actually 0 tracks loaded
      }

      expect(detailsWithMismatch.tracks_count).not.toBe(detailsWithMismatch.tracks.length)
      // This inconsistency could cause display issues
    })
  })
})

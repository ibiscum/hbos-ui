import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getApiBaseUrl: () => 'http://host/api/audiocontrol' }),
}))

import {
  getLibraryPlayers,
  getLibraryStats,
  deleteAlbum,
  getAllLibraryStats,
  type LibraryPlayerListResponse,
  type LibraryStatsResponse,
} from '@/api/audiocontrol-library'

const jsonResponse = (status: number, body: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('audiocontrol-library', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getLibraryPlayers', () => {
    it('should return list of library players', async () => {
      const mockResponse: LibraryPlayerListResponse = {
        players: [
          {
            player_name: 'player1',
            player_id: 'id1',
            has_library: true,
            is_loaded: true,
          },
          {
            player_name: 'player2',
            player_id: 'id2',
            has_library: false,
            is_loaded: false,
          },
        ],
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, mockResponse)))

      const result = await getLibraryPlayers()

      expect(result).toEqual(mockResponse)
      expect(result.players).toHaveLength(2)
      expect(result.players[0].player_name).toBe('player1')
    })

    it('should throw error on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, {})))

      await expect(getLibraryPlayers()).rejects.toThrow('HTTP error! status: 500')
    })

    it('should throw error on 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, {})))

      await expect(getLibraryPlayers()).rejects.toThrow('HTTP error! status: 404')
    })
  })

  describe('getLibraryStats', () => {
    it('should return library stats for a player', async () => {
      const mockResponse: LibraryStatsResponse = {
        player_name: 'player1',
        player_id: 'id1',
        has_library: true,
        is_loaded: true,
        albums_count: 100,
        artists_count: 50,
        tracks_count: 500,
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, mockResponse)))

      const result = await getLibraryStats('player1')

      expect(result).toEqual(mockResponse)
      expect(result.albums_count).toBe(100)
      expect(result.artists_count).toBe(50)
      expect(result.tracks_count).toBe(500)
    })

    it('should throw error on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, {})))

      await expect(getLibraryStats('player1')).rejects.toThrow('HTTP error! status: 500')
    })

    it('should include player name in request URL', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, {
            player_name: 'testplayer',
            player_id: 'id1',
            has_library: true,
            is_loaded: true,
            albums_count: 0,
            artists_count: 0,
            tracks_count: 0,
          })
        )

      vi.stubGlobal('fetch', mockFetch)

      await getLibraryStats('testplayer')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://host/api/audiocontrol/library/testplayer',
        expect.any(Object)
      )
    })
  })

  describe('deleteAlbum', () => {
    it('should send DELETE request with correct parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(200, {}))
      vi.stubGlobal('fetch', mockFetch)

      await deleteAlbum('player1', 'album-id-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://host/api/audiocontrol/library/player1/album/album-id-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should throw error with message from response body', async () => {
      const mockError = { message: 'Album not found' }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse(404, mockError))
      )

      await expect(deleteAlbum('player1', 'invalid-id')).rejects.toThrow('Album not found')
    })

    it('should throw generic error when response body has no message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, {})))

      await expect(deleteAlbum('player1', 'album-id')).rejects.toThrow('HTTP error! status: 500')
    })

    it('should throw generic error when response body is not valid JSON', async () => {
      const mockResponse = jsonResponse(500, {})
      mockResponse.json = async () => {
        throw new Error('Invalid JSON')
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

      await expect(deleteAlbum('player1', 'album-id')).rejects.toThrow('HTTP error! status: 500')
    })
  })

  describe('getAllLibraryStats', () => {
    it('should return stats for all loaded libraries', async () => {
      const playersList: LibraryPlayerListResponse = {
        players: [
          { player_name: 'player1', player_id: 'id1', has_library: true, is_loaded: true },
          { player_name: 'player2', player_id: 'id2', has_library: false, is_loaded: false },
          { player_name: 'player3', player_id: 'id3', has_library: true, is_loaded: true },
        ],
      }

      const stats1: LibraryStatsResponse = {
        player_name: 'player1',
        player_id: 'id1',
        has_library: true,
        is_loaded: true,
        albums_count: 100,
        artists_count: 50,
        tracks_count: 500,
      }

      const stats3: LibraryStatsResponse = {
        player_name: 'player3',
        player_id: 'id3',
        has_library: true,
        is_loaded: true,
        albums_count: 75,
        artists_count: 40,
        tracks_count: 400,
      }

      let callCount = 0
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call is getLibraryPlayers
          return Promise.resolve(jsonResponse(200, playersList))
        } else if (callCount === 2) {
          // Second call is getLibraryStats for player1
          return Promise.resolve(jsonResponse(200, stats1))
        } else {
          // Third call is getLibraryStats for player3
          return Promise.resolve(jsonResponse(200, stats3))
        }
      }))

      const result = await getAllLibraryStats()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(stats1)
      expect(result[1]).toEqual(stats3)
    })

    it('should filter out players without library or not loaded', async () => {
      const playersList: LibraryPlayerListResponse = {
        players: [
          { player_name: 'player1', player_id: 'id1', has_library: true, is_loaded: true },
          { player_name: 'player2', player_id: 'id2', has_library: false, is_loaded: false },
          { player_name: 'player3', player_id: 'id3', has_library: true, is_loaded: false },
        ],
      }

      const stats1: LibraryStatsResponse = {
        player_name: 'player1',
        player_id: 'id1',
        has_library: true,
        is_loaded: true,
        albums_count: 100,
        artists_count: 50,
        tracks_count: 500,
      }

      let callCount = 0
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(jsonResponse(200, playersList))
        } else {
          return Promise.resolve(jsonResponse(200, stats1))
        }
      }))

      const result = await getAllLibraryStats()

      expect(result).toHaveLength(1)
      expect(result[0].player_name).toBe('player1')
    })

    it('should return empty array when no players have library', async () => {
      const playersList: LibraryPlayerListResponse = {
        players: [
          { player_name: 'player1', player_id: 'id1', has_library: false, is_loaded: true },
          { player_name: 'player2', player_id: 'id2', has_library: false, is_loaded: false },
        ],
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, playersList)))

      const result = await getAllLibraryStats()

      expect(result).toEqual([])
    })
  })
})

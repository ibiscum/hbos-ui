import { describe, it, expect } from 'vitest'
import type { LibraryPlayer, LibraryPlayerResponse } from '@/types/library'

const createLibraryPlayer = (overrides: Partial<LibraryPlayer> = {}): LibraryPlayer => ({
  player_id: 'player-1',
  player_name: 'mpd',
  has_library: true,
  is_loaded: false,
  ...overrides,
})

describe('library interfaces', () => {
  describe('LibraryPlayer', () => {
    it('requires core fields for player identification', () => {
      const player: LibraryPlayer = createLibraryPlayer()

      expect(player.player_id).toBe('player-1')
      expect(player.player_name).toBe('mpd')
    })

    it('requires boolean fields for library status', () => {
      const player: LibraryPlayer = createLibraryPlayer()

      expect(typeof player.has_library).toBe('boolean')
      expect(typeof player.is_loaded).toBe('boolean')
    })

    it('supports optional supports_delete field (regression)', () => {
      const playerWithoutDelete: LibraryPlayer = createLibraryPlayer()
      expect(playerWithoutDelete.supports_delete).toBeUndefined()

      const playerWithDelete: LibraryPlayer = createLibraryPlayer({
        supports_delete: true,
      })
      expect(playerWithDelete.supports_delete).toBe(true)
    })

    it('distinguishes between has_library and is_loaded', () => {
      const playerWithoutLibrary: LibraryPlayer = createLibraryPlayer({
        has_library: false,
        is_loaded: false,
      })
      expect(playerWithoutLibrary.has_library).toBe(false)
      expect(playerWithoutLibrary.is_loaded).toBe(false)

      const playerWithUnloadedLibrary: LibraryPlayer = createLibraryPlayer({
        has_library: true,
        is_loaded: false,
      })
      expect(playerWithUnloadedLibrary.has_library).toBe(true)
      expect(playerWithUnloadedLibrary.is_loaded).toBe(false)

      const playerWithLoadedLibrary: LibraryPlayer = createLibraryPlayer({
        has_library: true,
        is_loaded: true,
      })
      expect(playerWithLoadedLibrary.has_library).toBe(true)
      expect(playerWithLoadedLibrary.is_loaded).toBe(true)
    })
  })

  describe('LibraryPlayerResponse', () => {
    it('models collection payload with players array', () => {
      const response: LibraryPlayerResponse = {
        players: [
          createLibraryPlayer({ player_id: '1', player_name: 'mpd' }),
          createLibraryPlayer({ player_id: '2', player_name: 'lms', supports_delete: true }),
        ],
      }

      expect(response.players).toHaveLength(2)
      expect(response.players[0].player_name).toBe('mpd')
      expect(response.players[1].supports_delete).toBe(true)
    })

    it('allows empty players array', () => {
      const response: LibraryPlayerResponse = {
        players: [],
      }

      expect(response.players).toHaveLength(0)
    })

    it('models single player in response', () => {
      const response: LibraryPlayerResponse = {
        players: [createLibraryPlayer()],
      }

      expect(response.players[0].player_id).toBe('player-1')
    })
  })

  describe('Field consistency across players', () => {
    it('supports multiple players with different delete capabilities', () => {
      const players: LibraryPlayer[] = [
        createLibraryPlayer({
          player_id: '1',
          player_name: 'mpd',
          supports_delete: false,
        }),
        createLibraryPlayer({
          player_id: '2',
          player_name: 'lms',
          supports_delete: true,
        }),
        createLibraryPlayer({
          player_id: '3',
          player_name: 'spotify',
          // no supports_delete field
        }),
      ]

      expect(players[0].supports_delete).toBe(false)
      expect(players[1].supports_delete).toBe(true)
      expect(players[2].supports_delete).toBeUndefined()
    })

    it('handles player names with various formats', () => {
      const playerNames = ['mpd', 'lms', 'spotify', 'player-1', 'Player With Spaces']

      playerNames.forEach((name) => {
        const player = createLibraryPlayer({ player_name: name })
        expect(player.player_name).toBe(name)
      })
    })

    it('enforces unique player_id per player', () => {
      const players: LibraryPlayer[] = [
        createLibraryPlayer({ player_id: 'unique-1', player_name: 'player1' }),
        createLibraryPlayer({ player_id: 'unique-2', player_name: 'player2' }),
      ]

      const ids = new Set(players.map((p) => p.player_id))
      expect(ids.size).toBe(players.length)
    })
  })

  describe('API contract expectations', () => {
    it('models expected API response structure', () => {
      const apiResponse: LibraryPlayerResponse = {
        players: [
          {
            player_id: 'mpd-instance-1',
            player_name: 'mpd',
            has_library: true,
            is_loaded: true,
            supports_delete: false,
          },
          {
            player_id: 'lms-instance-1',
            player_name: 'lms',
            has_library: true,
            is_loaded: false,
            supports_delete: true,
          },
          {
            player_id: 'spotify-instance-1',
            player_name: 'spotify',
            has_library: false,
            is_loaded: false,
          },
        ],
      }

      expect(apiResponse.players).toHaveLength(3)
      expect(apiResponse.players[0].is_loaded).toBe(true)
      expect(apiResponse.players[1].is_loaded).toBe(false)
      expect(apiResponse.players[2].has_library).toBe(false)
    })
  })
})

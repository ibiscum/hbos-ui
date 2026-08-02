import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryPlayer, LibraryPlayerResponse } from '@/types/library'

/**
 * LibraryPlayer Regression Tests
 *
 * These tests verify that the LibraryPlayer and LibraryPlayerResponse types
 * maintain backwards compatibility and correctly model the API contract
 * as used by the library store and API wrappers.
 */

describe('LibraryPlayer - Regression Tests', () => {
  describe('Type safety with library store usage', () => {
    it('supports field access patterns from library store', () => {
      const response: LibraryPlayerResponse = {
        players: [
          {
            player_id: '1',
            player_name: 'mpd',
            has_library: true,
            is_loaded: true,
            supports_delete: false,
          },
          {
            player_id: '2',
            player_name: 'lms',
            has_library: true,
            is_loaded: false,
            supports_delete: true,
          },
        ],
      }

      // Simulate store behavior: find loaded player with library
      const availableLibrary = response.players.find((p: LibraryPlayer) =>
        p.has_library && p.is_loaded
      )

      expect(availableLibrary).toBeDefined()
      expect(availableLibrary?.player_name).toBe('mpd')
      expect(availableLibrary?.is_loaded).toBe(true)
    })

    it('supports fallback search for any player with library', () => {
      const response: LibraryPlayerResponse = {
        players: [
          {
            player_id: '1',
            player_name: 'mpd',
            has_library: true,
            is_loaded: false,
          },
          {
            player_id: '2',
            player_name: 'lms',
            has_library: false,
            is_loaded: false,
          },
        ],
      }

      // Simulate store fallback logic
      let availableLibrary = response.players.find((p: LibraryPlayer) =>
        p.has_library && p.is_loaded
      )

      if (!availableLibrary) {
        availableLibrary = response.players.find((p: LibraryPlayer) => p.has_library)
      }

      expect(availableLibrary).toBeDefined()
      expect(availableLibrary?.player_name).toBe('mpd')
      expect(availableLibrary?.is_loaded).toBe(false)
    })

    it('supports safe defaulting of supports_delete field', () => {
      const response: LibraryPlayerResponse = {
        players: [
          {
            player_id: '1',
            player_name: 'mpd',
            has_library: true,
            is_loaded: true,
          },
        ],
      }

      const player = response.players[0]
      // Simulate store behavior: default to false if not present
      const supportsDelete = player.supports_delete ?? false

      expect(supportsDelete).toBe(false)
    })
  })

  describe('Compatibility with API responses', () => {
    it('maintains backward compatibility when supports_delete is missing', () => {
      const player: LibraryPlayer = {
        player_id: 'old-api-player',
        player_name: 'legacy-player',
        has_library: true,
        is_loaded: true,
        // supports_delete intentionally omitted to test backward compat
      }

      expect(player.supports_delete).toBeUndefined()
      expect(player.has_library).toBe(true)
      expect(player.is_loaded).toBe(true)
    })

    it('maintains backward compatibility when supports_delete is present', () => {
      const player: LibraryPlayer = {
        player_id: 'new-api-player',
        player_name: 'modern-player',
        has_library: true,
        is_loaded: true,
        supports_delete: true,
      }

      expect(player.supports_delete).toBe(true)
      expect(player.has_library).toBe(true)
    })

    it('correctly models typical API response variants', () => {
      const variant1: LibraryPlayerResponse = {
        players: [
          {
            player_id: 'mpd',
            player_name: 'mpd',
            has_library: true,
            is_loaded: true,
            supports_delete: false,
          },
        ],
      }

      const variant2: LibraryPlayerResponse = {
        players: [
          {
            player_id: 'spotify',
            player_name: 'spotify',
            has_library: false,
            is_loaded: false,
          },
        ],
      }

      const variant3: LibraryPlayerResponse = {
        players: [],
      }

      expect(variant1.players[0].supports_delete).toBe(false)
      expect(variant2.players[0].supports_delete).toBeUndefined()
      expect(variant3.players).toHaveLength(0)
    })
  })

  describe('Type narrowing and null safety', () => {
    it('safely handles null or undefined response data', () => {
      const nullResponse: LibraryPlayerResponse | null = null
      const undefinedResponse: LibraryPlayerResponse | undefined = undefined

      // Simulate defensive code patterns
      const players1 = nullResponse?.players ?? []
      const players2 = undefinedResponse?.players ?? []

      expect(players1).toEqual([])
      expect(players2).toEqual([])
    })

    it('safely accesses nested player properties', () => {
      const response: LibraryPlayerResponse = {
        players: [
          {
            player_id: '1',
            player_name: 'player',
            has_library: true,
            is_loaded: true,
          },
        ],
      }

      // Simulate defensive access patterns
      const playerName = response.players?.[0]?.player_name ?? 'unknown'
      const supportsDelete = response.players?.[0]?.supports_delete ?? false

      expect(playerName).toBe('player')
      expect(supportsDelete).toBe(false)
    })
  })

  describe('Edge cases and boundary conditions', () => {
    it('handles player with empty player_name', () => {
      const player: LibraryPlayer = {
        player_id: '1',
        player_name: '',
        has_library: true,
        is_loaded: false,
      }

      expect(player.player_name).toBe('')
      expect(player.player_id).toBe('1')
    })

    it('handles player with multiple players in response', () => {
      const response: LibraryPlayerResponse = {
        players: Array.from({ length: 5 }, (_, i) => ({
          player_id: `player-${i}`,
          player_name: `player-${i}`,
          has_library: i % 2 === 0,
          is_loaded: i % 3 === 0,
        })),
      }

      expect(response.players).toHaveLength(5)
      const loadedCount = response.players.filter((p) => p.is_loaded).length
      expect(loadedCount).toBe(2) // indices 0 and 3
    })

    it('handles boolean field combinations', () => {
      const combinations: Array<[boolean, boolean]> = [
        [true, true],
        [true, false],
        [false, true],
        [false, false],
      ]

      combinations.forEach(([hasLib, isLoaded]) => {
        const player: LibraryPlayer = {
          player_id: `player-${hasLib}-${isLoaded}`,
          player_name: 'test',
          has_library: hasLib,
          is_loaded: isLoaded,
        }

        expect(player.has_library).toBe(hasLib)
        expect(player.is_loaded).toBe(isLoaded)
      })
    })
  })

  describe('Type narrowing scenarios', () => {
    it('narrows available library from response', () => {
      const response: LibraryPlayerResponse = {
        players: [
          { player_id: '1', player_name: 'p1', has_library: true, is_loaded: false },
          { player_id: '2', player_name: 'p2', has_library: false, is_loaded: false },
          { player_id: '3', player_name: 'p3', has_library: true, is_loaded: true },
        ],
      }

      const loadedPlayers = response.players.filter((p) => p.is_loaded && p.has_library)
      expect(loadedPlayers).toHaveLength(1)
      expect(loadedPlayers[0].player_name).toBe('p3')
    })

    it('maps player names to library support status', () => {
      const response: LibraryPlayerResponse = {
        players: [
          { player_id: '1', player_name: 'mpd', has_library: true, is_loaded: true, supports_delete: false },
          { player_id: '2', player_name: 'lms', has_library: true, is_loaded: false, supports_delete: true },
          { player_id: '3', player_name: 'spotify', has_library: false, is_loaded: false },
        ],
      }

      const playerMap = Object.fromEntries(
        response.players.map((p) => [p.player_name, { hasLib: p.has_library, canDelete: p.supports_delete ?? false }])
      )

      expect(playerMap['mpd'].hasLib).toBe(true)
      expect(playerMap['mpd'].canDelete).toBe(false)
      expect(playerMap['lms'].canDelete).toBe(true)
      expect(playerMap['spotify'].hasLib).toBe(false)
    })
  })
})

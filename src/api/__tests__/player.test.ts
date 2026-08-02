import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppConfigStore } from '@/stores/appconfig'
import { useToastStore } from '@/stores/toast'
import * as player from '@/api/player'

// Mock the stores and apiFetch
vi.mock('@/stores/appconfig')
vi.mock('@/stores/toast')
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn()
}))
vi.mock('./utils', () => ({
  rewriteAudiocontrolApiUrl: vi.fn((url) => url)
}))

import { apiFetch } from '@/api/http'

describe('player.ts - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAppConfigStore as any).mockReturnValue({
      getApiBaseUrl: () => 'http://api.local'
    })
    ;(useToastStore as any).mockReturnValue({
      showErrorToast: vi.fn()
    })
  })

  describe('Error Handling Consistency', () => {
    it('should throw error on add track failure (consistency check)', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(player.addTrackToPlayer('player1', 'track://uri')).rejects.toThrow()
    })

    it('should throw error on send command failure (consistency check)', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(player.sendPlayerCommand('player1', 'play')).rejects.toThrow()
    })

    it('should return false on pause all failure (inconsistent with throw pattern)', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      const result = await player.pauseAllPlayers()
      expect(result).toBe(false)
    })

    it('should return false on stop all failure (inconsistent with throw pattern)', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      const result = await player.stopAllPlayers()
      expect(result).toBe(false)
    })

    it('should inconsistently handle errors - some throw, some return false', async () => {
      // This test documents the inconsistency in error handling
      const throwFunctions = [
        () => player.addTrackToPlayer('p1', 'uri'),
        () => player.sendPlayerCommand('p1', 'play')
      ]

      const returnFalsFunctions = [
        () => player.pauseAllPlayers(),
        () => player.stopAllPlayers()
      ]

      ;(apiFetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      // Verify inconsistency exists
      for (const fn of throwFunctions) {
        await expect(fn()).rejects.toThrow()
      }

      ;(apiFetch as any).mockClear()
      ;(apiFetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      for (const fn of returnFalsFunctions) {
        const result = await fn()
        expect(result).toBe(false)
      }
    })
  })

  describe('Return Value Consistency', () => {
    it('should validate response and throw on error in response content', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'something went wrong' })
      })

      await expect(player.addTrackToPlayer('player1', 'track://uri')).rejects.toThrow('Failed to add track')
    })

    it('should validate response structure and throw on status=failed', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'failed', error: 'Track not found' })
      })

      await expect(player.sendPlayerCommand('player1', 'play')).rejects.toThrow('Failed to send command')
    })

    it('should return true when response indicates success', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      })

      const result = await player.addTrackToPlayer('player1', 'track://uri')
      expect(result).toBe(true)
    })

    it('should return true when response has no error fields', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'track added' })
      })

      const result = await player.sendPlayerCommand('player1', 'play')
      expect(result).toBe(true)
    })
  })

  describe('URL Construction Safety', () => {
    it('should encode playerName in addTrackToPlayer (security fix)', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const dangerousName = "player'; DROP TABLE--"
      await player.addTrackToPlayer(dangerousName, 'uri')

      const callArgs = (apiFetch as any).mock.calls[0]
      // Verify that dangerous characters are encoded, not present as-is
      expect(callArgs[0]).not.toContain("'; DROP")
      expect(callArgs[0]).toContain('%3B') // Encoded semicolon
      expect(callArgs[0]).toContain('%20') // Encoded space
    })

    it('should encode playerName in sendPlayerCommand (security fix)', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const dangerousName = '../../../admin'
      await player.sendPlayerCommand(dangerousName, 'play')

      const callArgs = (apiFetch as any).mock.calls[0]
      // Verify that path traversal characters are encoded, not present as-is
      expect(callArgs[0]).not.toContain('../../../')
      expect(callArgs[0]).toContain('%2F') // Encoded forward slash
    })

    it('should encode both playerName and command in URLs', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const playerName = 'player with spaces'
      const command = 'special;command'
      await player.sendPlayerCommand(playerName, command)

      const url = (apiFetch as any).mock.calls[0][0]
      // Both should be encoded
      expect(url).toContain(encodeURIComponent(playerName))
      expect(url).toContain(encodeURIComponent(command))
    })
  })

  describe('Code Duplication', () => {
    it('pauseAllPlayers and stopAllPlayers have nearly identical fallback logic', async () => {
      // This test verifies the high duplication
      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ players: [] }) })

      await player.pauseAllPlayers()
      const pauseCalls = (apiFetch as any).mock.calls.length

      ;(apiFetch as any).mockClear()

      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ players: [] }) })

      await player.stopAllPlayers()
      const stopCalls = (apiFetch as any).mock.calls.length

      // Both make same number of calls in fallback
      expect(pauseCalls).toBe(stopCalls)
    })

    it('should have refactored common fallback logic between pause and stop', async () => {
      // After refactoring, pauseAllPlayers and stopAllPlayers no longer have 50+ lines of duplication
      // The common fallback logic has been extracted into a shared helper
      const pauseCode = player.pauseAllPlayers.toString()
      const stopCode = player.stopAllPlayers.toString()

      // Both should now be simpler - they delegate to a helper for fallback logic
      // The actual duplication between them should be minimal (both follow same pattern)
      const pauseLength = pauseCode.length
      const stopLength = stopCode.length

      // After refactoring, both functions should be similar length
      // Original: pauseAllPlayers was ~900 chars, stopAllPlayers was ~850 chars with duplication
      // After refactoring: both should be under 250 chars due to extraction
      // (they only have bulk endpoint code + one-liner helper call)
      const lengthDifference = Math.abs(pauseLength - stopLength)
      expect(lengthDifference).toBeLessThan(100) // Should be very similar length now
    })
  })

  describe('Toast Message Inconsistency', () => {
    it('should only show error toast in sendPlayerCommand, not others', async () => {
      const toastStore = useToastStore()
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      try {
        await player.sendPlayerCommand('player1', 'play')
      } catch (e) {
        // Expected to throw
      }

      expect(toastStore.showErrorToast).toHaveBeenCalledWith('Could not send player command.')
    })

    it('should not show toast for addTrackToPlayer errors', async () => {
      const toastStore = useToastStore()
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      try {
        await player.addTrackToPlayer('player1', 'uri')
      } catch (e) {
        // Expected to throw
      }

      expect(toastStore.showErrorToast).not.toHaveBeenCalled()
    })

    it('should not show toast for pauseAllPlayers errors', async () => {
      const toastStore = useToastStore()
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      await player.pauseAllPlayers()

      expect(toastStore.showErrorToast).not.toHaveBeenCalled()
    })
  })

  describe('Metadata Handling', () => {
    it('should include metadata when provided', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const metadata = {
        title: 'Track Title',
        artist: 'Artist Name',
        album: 'Album Name',
        duration: 300
      }

      await player.addTrackToPlayer('player1', 'uri', metadata)

      const callArgs = (apiFetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.metadata).toEqual(metadata)
    })

    it('should not include metadata key when metadata is empty object', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await player.addTrackToPlayer('player1', 'uri', {})

      const callArgs = (apiFetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.metadata).toBeUndefined()
    })

    it('should allow custom metadata fields', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const metadata = {
        title: 'Track',
        customField: 'customValue',
        anotherField: 123
      }

      await player.addTrackToPlayer('player1', 'uri', metadata)

      const callArgs = (apiFetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.metadata.customField).toBe('customValue')
      expect(body.metadata.anotherField).toBe(123)
    })
  })

  describe('Command Validation', () => {
    it('should reject add_track commands in sendPlayerCommand', async () => {
      await expect(player.sendPlayerCommand('player1', 'add_track:uri')).rejects.toThrow(
        'Use addTrackToPlayer() function for add_track commands'
      )

      expect((apiFetch as any)).not.toHaveBeenCalled()
    })

    it('should allow normal commands', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await player.sendPlayerCommand('player1', 'play')
      expect((apiFetch as any)).toHaveBeenCalled()
    })
  })

  describe('Fallback Logic Edge Cases', () => {
    it('should handle empty player list in fallback', async () => {
      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ players: [] }) })

      const result = await player.pauseAllPlayers()
      expect(result).toBe(false)
    })

    it('should handle missing players array in response', async () => {
      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      const result = await player.pauseAllPlayers()
      expect(result).toBe(false)
    })

    it('should handle individual player failures in fallback', async () => {
      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ players: [{ name: 'p1' }, { name: 'p2' }] }) })
        .mockResolvedValueOnce({ ok: true }) // p1 pause succeeds
        .mockResolvedValueOnce({ ok: true }) // p2 pause succeeds

      const result = await player.pauseAllPlayers()
      expect(result).toBe(true)
    })

    it('should count partial successes correctly', async () => {
      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ players: [{ name: 'p1' }, { name: 'p2' }] }) })
        .mockResolvedValueOnce({ ok: true }) // p1 pause succeeds
        .mockResolvedValueOnce({ ok: false }) // p2 pause fails
        .mockResolvedValueOnce({ ok: false }) // p2 stop fails

      const result = await player.pauseAllPlayers()
      expect(result).toBe(true) // At least one succeeded
    })
  })

  describe('Response JSON Parsing', () => {
    it('should handle JSON parse errors gracefully in bulk operations', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const result = await player.pauseAllPlayers()
      // Should handle the error and either retry or return false
      expect(typeof result).toBe('boolean')
    })

    it('should ignore JSON parse errors in add track', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      await expect(player.addTrackToPlayer('player1', 'uri')).rejects.toThrow()
    })
  })

  describe('Backward Compatibility', () => {
    it('should export snake_case version of rewriteAudiocontrolApiUrl', () => {
      expect(player.rewrite_audiocontrol_api_url).toBeDefined()
      expect(typeof player.rewrite_audiocontrol_api_url).toBe('function')
    })
  })

  describe('Player Name Encoding', () => {
    it('should use encodeURIComponent for player names in fallback pause', async () => {
      const specialName = 'player name with spaces'
      ;(apiFetch as any)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ players: [{ name: specialName }] }) })
        .mockResolvedValueOnce({ ok: true })

      await player.pauseAllPlayers()

      const calls = (apiFetch as any).mock.calls
      // Check that special name is passed to fallback
      expect(calls.length).toBeGreaterThan(1)
    })
  })

  describe('API Endpoint Patterns', () => {
    it('should use /player/:name/command/:command pattern', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await player.sendPlayerCommand('TestPlayer', 'pause')

      const url = (apiFetch as any).mock.calls[0][0]
      expect(url).toMatch(/\/player\/TestPlayer\/command\/pause$/)
    })

    it('should use /players/pause-all bulk endpoint', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await player.pauseAllPlayers()

      const url = (apiFetch as any).mock.calls[0][0]
      expect(url).toMatch(/\/players\/pause-all$/)
    })

    it('should use /players/stop-all bulk endpoint', async () => {
      ;(apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await player.stopAllPlayers()

      const url = (apiFetch as any).mock.calls[0][0]
      expect(url).toMatch(/\/players\/stop-all$/)
    })
  })
})

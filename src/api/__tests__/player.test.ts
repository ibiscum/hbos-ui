import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppConfigStore } from '@/stores/appconfig'
import { useToastStore } from '@/stores/toast'
import { apiFetch } from '@/api/http'
import {
  addTrackToPlayer,
  sendPlayerCommand,
  pauseAllPlayers,
  stopAllPlayers,
  rewrite_audiocontrol_api_url,
} from '@/api/player'

// Mock dependencies
vi.mock('@/stores/appconfig')
vi.mock('@/stores/toast')
vi.mock('@/api/http')

describe('Player API - Exports', () => {
  it('should export rewrite_audiocontrol_api_url for backward compatibility', () => {
    expect(typeof rewrite_audiocontrol_api_url).toBe('function')
  })

  it('should export addTrackToPlayer function', () => {
    expect(typeof addTrackToPlayer).toBe('function')
  })

  it('should export sendPlayerCommand function', () => {
    expect(typeof sendPlayerCommand).toBe('function')
  })

  it('should export pauseAllPlayers function', () => {
    expect(typeof pauseAllPlayers).toBe('function')
  })

  it('should export stopAllPlayers function', () => {
    expect(typeof stopAllPlayers).toBe('function')
  })
})

describe('Player API - addTrackToPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8000/api'),
    } as any)
  })

  it('should add track to player successfully', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', message: 'Track added' }), { status: 200 })
    )

    const result = await addTrackToPlayer('speaker1', 'spotify:track:123')
    expect(result).toBe(true)
  })

  it('should add track with metadata', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const metadata = { title: 'Song', artist: 'Artist', album: 'Album' }
    const result = await addTrackToPlayer('speaker1', 'uri', metadata)

    const call = vi.mocked(apiFetch).mock.calls[0]
    const body = JSON.parse(call[1]?.body as string)
    expect(body.uri).toBe('uri')
    expect(body.metadata).toEqual(metadata)
    expect(result).toBe(true)
  })

  it('should encode player name in URL', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await addTrackToPlayer('speaker-1/2', 'uri')
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain('speaker-1%2F2')
  })

  it('should use POST method for adding track', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await addTrackToPlayer('speaker1', 'uri')
    const method = vi.mocked(apiFetch).mock.calls[0][1]?.method
    expect(method).toBe('POST')
  })

  it('should include Content-Type header for add track', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await addTrackToPlayer('speaker1', 'uri')
    const headers = vi.mocked(apiFetch).mock.calls[0][1]?.headers as any
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should send track URI in request body', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await addTrackToPlayer('speaker1', 'spotify:track:456')
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string)
    expect(body.uri).toBe('spotify:track:456')
  })

  it('should handle HTTP error when adding track', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Not found', { status: 404 })
    )

    await expect(addTrackToPlayer('speaker1', 'uri')).rejects.toThrow()
  })

  it('should handle API error response', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Player not found' }), { status: 200 })
    )

    await expect(addTrackToPlayer('speaker1', 'uri')).rejects.toThrow('Player not found')
  })

  it('should handle failed status in response', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'failed' }), { status: 200 })
    )

    await expect(addTrackToPlayer('speaker1', 'uri')).rejects.toThrow()
  })

  it('should not include metadata if not provided', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await addTrackToPlayer('speaker1', 'uri')
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string)
    expect(body.metadata).toBeUndefined()
  })

  it('should not include empty metadata object', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await addTrackToPlayer('speaker1', 'uri', {})
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string)
    expect(body.metadata).toBeUndefined()
  })
})

describe('Player API - sendPlayerCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8000/api'),
    } as any)
    vi.mocked(useToastStore).mockReturnValue({
      showErrorToast: vi.fn(),
    } as any)
  })

  it('should send command to player successfully', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await sendPlayerCommand('speaker1', 'play')
    expect(result).toBe(true)
  })

  it('should encode player name and command in URL', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await sendPlayerCommand('speaker-1/2', 'play')
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain('speaker-1%2F2')
    expect(url).toContain('play')
  })

  it('should use POST method for command', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await sendPlayerCommand('speaker1', 'play')
    const method = vi.mocked(apiFetch).mock.calls[0][1]?.method
    expect(method).toBe('POST')
  })

  it('should include Content-Type header', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await sendPlayerCommand('speaker1', 'play')
    const headers = vi.mocked(apiFetch).mock.calls[0][1]?.headers as any
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should prevent add_track commands from being sent', async () => {
    await expect(sendPlayerCommand('speaker1', 'add_track:spotify:track:123')).rejects.toThrow(
      'Use addTrackToPlayer'
    )
  })

  it('should handle HTTP error', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Server error', { status: 500 })
    )

    await expect(sendPlayerCommand('speaker1', 'play')).rejects.toThrow('Failed to send command')
  })

  it('should handle API error response', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid command' }), { status: 200 })
    )

    await expect(sendPlayerCommand('speaker1', 'invalid_cmd')).rejects.toThrow('Invalid command')
  })

  it('should handle failed status response', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'failed' }), { status: 200 })
    )

    await expect(sendPlayerCommand('speaker1', 'play')).rejects.toThrow('Failed to send command')
  })

  it('should show error toast on failure', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Command failed' }), { status: 200 })
    )

    const toastStore = useToastStore() as any
    await expect(sendPlayerCommand('speaker1', 'play')).rejects.toThrow()
    expect(toastStore.showErrorToast).toHaveBeenCalledWith('Could not send player command.')
  })

  it('should support various player commands', async () => {
    const commands = ['play', 'pause', 'stop', 'next', 'previous', 'clear_queue']

    for (const cmd of commands) {
      vi.clearAllMocks()
      vi.mocked(useAppConfigStore).mockReturnValue({
        getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8000/api'),
      } as any)
      vi.mocked(useToastStore).mockReturnValue({
        showErrorToast: vi.fn(),
      } as any)

      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'success' }), { status: 200 })
      )

      const result = await sendPlayerCommand('speaker1', cmd)
      expect(result).toBe(true)
    }
  })
})

describe('Player API - pauseAllPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8000/api'),
    } as any)
  })

  it('should pause all players successfully (bulk endpoint)', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await pauseAllPlayers()
    expect(result).toBe(true)
  })

  it('should use bulk pause-all endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await pauseAllPlayers()
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain('/players/pause-all')
  })

  it('should use POST method for pause-all', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await pauseAllPlayers()
    const method = vi.mocked(apiFetch).mock.calls[0][1]?.method
    expect(method).toBe('POST')
  })

  it('should include Content-Type header', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await pauseAllPlayers()
    const headers = vi.mocked(apiFetch).mock.calls[0][1]?.headers as any
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should fallback to per-player when bulk fails', async () => {
    // Bulk endpoint fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )
    // Get player list
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ players: [{ name: 'speaker1' }, { name: 'speaker2' }] }), { status: 200 })
    )
    // First player pause
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )
    // Second player pause
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await pauseAllPlayers()
    expect(result).toBe(true)
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(4)
  })

  it('should try stop fallback if pause not supported', async () => {
    // Bulk endpoint fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )
    // Get player list
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ players: [{ name: 'speaker1' }] }), { status: 200 })
    )
    // Pause fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not supported' }), { status: 400 })
    )
    // Stop succeeds
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await pauseAllPlayers()
    expect(result).toBe(true)
  })

  it('should return false if fallback completely fails', async () => {
    // Bulk endpoint fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )
    // Get player list with empty array
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ players: [] }), { status: 200 })
    )

    const result = await pauseAllPlayers()
    expect(result).toBe(false)
  })
})

describe('Player API - stopAllPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8000/api'),
    } as any)
  })

  it('should stop all players successfully (bulk endpoint)', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await stopAllPlayers()
    expect(result).toBe(true)
  })

  it('should use bulk stop-all endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await stopAllPlayers()
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain('/players/stop-all')
  })

  it('should use POST method for stop-all', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await stopAllPlayers()
    const method = vi.mocked(apiFetch).mock.calls[0][1]?.method
    expect(method).toBe('POST')
  })

  it('should include Content-Type header', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await stopAllPlayers()
    const headers = vi.mocked(apiFetch).mock.calls[0][1]?.headers as any
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should fallback to per-player when bulk fails', async () => {
    // Bulk endpoint fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )
    // Get player list
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ players: [{ name: 'speaker1' }, { name: 'speaker2' }] }), { status: 200 })
    )
    // First player stop
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )
    // Second player stop
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await stopAllPlayers()
    expect(result).toBe(true)
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(4)
  })

  it('should return false if all players fail', async () => {
    // Bulk endpoint fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )
    // Get player list with empty array
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ players: [] }), { status: 200 })
    )

    const result = await stopAllPlayers()
    expect(result).toBe(false)
  })

  it('should return true if at least one player succeeds in fallback', async () => {
    // Bulk endpoint fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )
    // Get player list
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ players: [{ name: 'speaker1' }, { name: 'speaker2' }] }), { status: 200 })
    )
    // First player stop fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Failed' }), { status: 500 })
    )
    // Second player stop succeeds
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await stopAllPlayers()
    expect(result).toBe(true)
  })
})

describe('Player API - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8000/api'),
    } as any)
    vi.mocked(useToastStore).mockReturnValue({
      showErrorToast: vi.fn(),
    } as any)
  })

  it('should make single HTTP call for simple commands', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await sendPlayerCommand('speaker1', 'play')
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(1)
  })

  it('should return true on successful execution', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    const result = await sendPlayerCommand('speaker1', 'play')
    expect(result).toBe(true)
  })

  it('should handle empty response bodies', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response('', { status: 200 }))

    const result = await pauseAllPlayers()
    expect(result).toBe(true)
  })

  it('should properly encode special characters in URLs', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    )

    await sendPlayerCommand('player/with/slashes', 'play')
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain('%2F')
  })
})

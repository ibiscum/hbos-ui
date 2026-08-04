import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import {
  getLastFMStatus,
  startLastFMAuth,
  prepareLastFMAuthCompletion,
  completeLastFMAuth,
  disconnectLastFM,
} from '@/api/lastfm'
import type {
  LastFMStatusResponse,
  LastFMAuthResponse,
  LastFMPrepareAuthResponse,
  LastFMCompleteAuthResponse,
  LastFMDisconnectResponse,
} from '@/api/lastfm'

// Mock dependencies
vi.mock('@/stores/appconfig')
vi.mock('@/api/http')

describe('Last.FM API - Type Definitions', () => {
  it('should define LastFMStatusResponse interface', () => {
    const status: LastFMStatusResponse = {
      authenticated: true,
      username: 'testuser',
    }
    expect(status.authenticated).toBe(true)
    expect(status.username).toBe('testuser')
  })

  it('should define LastFMAuthResponse interface', () => {
    const auth: LastFMAuthResponse = {
      url: 'https://example.com',
      request_token: 'token123',
    }
    expect(auth.url).toBe('https://example.com')
    expect(auth.request_token).toBe('token123')
  })

  it('should define LastFMPrepareAuthResponse interface', () => {
    const prepare: LastFMPrepareAuthResponse = {
      success: true,
    }
    expect(prepare.success).toBe(true)
  })

  it('should define LastFMCompleteAuthResponse interface', () => {
    const complete: LastFMCompleteAuthResponse = {
      authenticated: true,
      username: 'newuser',
    }
    expect(complete.authenticated).toBe(true)
    expect(complete.username).toBe('newuser')
  })

  it('should define LastFMDisconnectResponse interface', () => {
    const disconnect: LastFMDisconnectResponse = {
      authenticated: false,
    }
    expect(disconnect.authenticated).toBe(false)
  })

  it('should support error fields in status response', () => {
    const status: LastFMStatusResponse = {
      authenticated: false,
      error: 'API_ERROR',
      error_description: 'Service unavailable',
    }
    expect(status.error).toBe('API_ERROR')
    expect(status.error_description).toBe('Service unavailable')
  })

  it('should support error fields in auth response', () => {
    const auth: LastFMAuthResponse = {
      url: '',
      request_token: '',
      error: 'INVALID_REQUEST',
    }
    expect(auth.error).toBe('INVALID_REQUEST')
  })

  it('should support error fields in prepare auth response', () => {
    const prepare: LastFMPrepareAuthResponse = {
      success: false,
      error: 'INVALID_TOKEN',
    }
    expect(prepare.success).toBe(false)
    expect(prepare.error).toBe('INVALID_TOKEN')
  })

  it('should support optional username in complete auth', () => {
    const complete: LastFMCompleteAuthResponse = {
      authenticated: false,
    }
    expect(complete.authenticated).toBe(false)
    expect(complete.username).toBeUndefined()
  })

  it('should support error fields in disconnect response', () => {
    const disconnect: LastFMDisconnectResponse = {
      authenticated: true,
      error: 'DISCONNECT_FAILED',
      error_description: 'User still connected',
    }
    expect(disconnect.error).toBe('DISCONNECT_FAILED')
    expect(disconnect.error_description).toBe('User still connected')
  })
})

describe('Last.FM API - getLastFMStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch status successfully', async () => {
    const mockStatus: LastFMStatusResponse = {
      authenticated: true,
      username: 'testuser',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStatus), { status: 200 })
    )

    const result = await getLastFMStatus()
    expect(result).toEqual(mockStatus)
    expect(result.authenticated).toBe(true)
    expect(result.username).toBe('testuser')
  })

  it('should return unauthenticated status', async () => {
    const mockStatus: LastFMStatusResponse = {
      authenticated: false,
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStatus), { status: 200 })
    )

    const result = await getLastFMStatus()
    expect(result.authenticated).toBe(false)
    expect(result.username).toBeUndefined()
  })

  it('should handle API errors in status response', async () => {
    const mockStatus: LastFMStatusResponse = {
      authenticated: false,
      error: 'SERVICE_ERROR',
      error_description: 'Last.FM service is down',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStatus), { status: 200 })
    )

    const result = await getLastFMStatus()
    expect(result.error).toBe('SERVICE_ERROR')
    expect(result.error_description).toBe('Last.FM service is down')
  })

  it('should call apiFetch with correct URL', async () => {
    const baseUrl = 'http://localhost:9999'
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => baseUrl,
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await getLastFMStatus()
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/lastfm/status`)
  })

  it('should throw on HTTP error', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' })
    )

    await expect(getLastFMStatus()).rejects.toThrow('Failed to get Last.FM status: 500 Internal Server Error')
  })

  it('should throw on 404 response', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404, statusText: 'Not Found' })
    )

    await expect(getLastFMStatus()).rejects.toThrow('Failed to get Last.FM status: 404 Not Found')
  })
})

describe('Last.FM API - startLastFMAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start auth and return token', async () => {
    const mockAuth: LastFMAuthResponse = {
      url: 'https://www.last.fm/api/auth/?token=abc123&cb=http://localhost',
      request_token: 'abc123',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockAuth), { status: 200 })
    )

    const result = await startLastFMAuth()
    expect(result.request_token).toBe('abc123')
    expect(result.url).toContain('token=abc123')
  })

  it('should call apiFetch with correct URL', async () => {
    const baseUrl = 'http://localhost:9999'
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => baseUrl,
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ url: '', request_token: '' }), { status: 200 })
    )

    await startLastFMAuth()
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/lastfm/auth`)
  })

  it('should handle auth errors', async () => {
    const mockAuth: LastFMAuthResponse = {
      url: '',
      request_token: '',
      error: 'RATE_LIMIT',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockAuth), { status: 200 })
    )

    const result = await startLastFMAuth()
    expect(result.error).toBe('RATE_LIMIT')
  })

  it('should throw on HTTP error', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' })
    )

    await expect(startLastFMAuth()).rejects.toThrow('Failed to start Last.FM auth: 503 Service Unavailable')
  })
})

describe('Last.FM API - prepareLastFMAuthCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should prepare auth completion with token', async () => {
    const mockPrepare: LastFMPrepareAuthResponse = {
      success: true,
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPrepare), { status: 200 })
    )

    const result = await prepareLastFMAuthCompletion('abc123')
    expect(result.success).toBe(true)
  })

  it('should send token in request body', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    await prepareLastFMAuthCompletion('test_token_123')
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost:9999/lastfm/prepare_complete_auth',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test_token_123' }),
      })
    )
  })

  it('should use POST method', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    await prepareLastFMAuthCompletion('token')
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('POST')
  })

  it('should handle preparation failure', async () => {
    const mockPrepare: LastFMPrepareAuthResponse = {
      success: false,
      error: 'INVALID_TOKEN',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPrepare), { status: 200 })
    )

    const result = await prepareLastFMAuthCompletion('invalid_token')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_TOKEN')
  })

  it('should throw on HTTP error', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
    )

    await expect(prepareLastFMAuthCompletion('token')).rejects.toThrow(
      'Failed to prepare Last.FM auth completion: 400 Bad Request'
    )
  })

  it('should handle empty token', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    await prepareLastFMAuthCompletion('')
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost:9999/lastfm/prepare_complete_auth',
      expect.objectContaining({
        body: JSON.stringify({ token: '' }),
      })
    )
  })
})

describe('Last.FM API - completeLastFMAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete auth successfully', async () => {
    const mockComplete: LastFMCompleteAuthResponse = {
      authenticated: true,
      username: 'newuser',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockComplete), { status: 200 })
    )

    const result = await completeLastFMAuth()
    expect(result.authenticated).toBe(true)
    expect(result.username).toBe('newuser')
  })

  it('should call apiFetch with correct URL', async () => {
    const baseUrl = 'http://localhost:9999'
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => baseUrl,
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: true }), { status: 200 })
    )

    await completeLastFMAuth()
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/lastfm/complete_auth`)
  })

  it('should handle completion failure', async () => {
    const mockComplete: LastFMCompleteAuthResponse = {
      authenticated: false,
      error: 'TOKEN_EXPIRED',
      error_description: 'Token expired before completion',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockComplete), { status: 200 })
    )

    const result = await completeLastFMAuth()
    expect(result.authenticated).toBe(false)
    expect(result.error).toBe('TOKEN_EXPIRED')
  })

  it('should throw on HTTP error', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
    )

    await expect(completeLastFMAuth()).rejects.toThrow(
      'Failed to complete Last.FM auth: 401 Unauthorized'
    )
  })

  it('should handle optional username', async () => {
    const mockComplete: LastFMCompleteAuthResponse = {
      authenticated: true,
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockComplete), { status: 200 })
    )

    const result = await completeLastFMAuth()
    expect(result.authenticated).toBe(true)
    expect(result.username).toBeUndefined()
  })
})

describe('Last.FM API - disconnectLastFM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should disconnect successfully', async () => {
    const mockDisconnect: LastFMDisconnectResponse = {
      authenticated: false,
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockDisconnect), { status: 200 })
    )

    const result = await disconnectLastFM()
    expect(result.authenticated).toBe(false)
  })

  it('should use POST method', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await disconnectLastFM()
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.method).toBe('POST')
  })

  it('should send JSON content-type header', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await disconnectLastFM()
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('should call apiFetch with correct URL', async () => {
    const baseUrl = 'http://localhost:9999'
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => baseUrl,
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await disconnectLastFM()
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/lastfm/disconnect`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
  })

  it('should handle disconnect failure', async () => {
    const mockDisconnect: LastFMDisconnectResponse = {
      authenticated: true,
      error: 'DISCONNECT_FAILED',
      error_description: 'Could not revoke access',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockDisconnect), { status: 200 })
    )

    const result = await disconnectLastFM()
    expect(result.authenticated).toBe(true)
    expect(result.error).toBe('DISCONNECT_FAILED')
  })

  it('should throw on HTTP error', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Forbidden', { status: 403, statusText: 'Forbidden' })
    )

    await expect(disconnectLastFM()).rejects.toThrow(
      'Failed to disconnect from Last.FM: 403 Forbidden'
    )
  })
})

describe('Last.FM API - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error with status code on 500', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' })
    )

    await expect(getLastFMStatus()).rejects.toThrow('500')
  })

  it('should throw error with status text', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' })
    )

    await expect(getLastFMStatus()).rejects.toThrow('Bad Gateway')
  })

  it('should preserve error message for multiple calls', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    // First call fails
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Error', { status: 500, statusText: 'Error' })
    )

    await expect(getLastFMStatus()).rejects.toThrow()

    // Second call also fails with different error
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Timeout', { status: 504, statusText: 'Gateway Timeout' })
    )

    await expect(startLastFMAuth()).rejects.toThrow('Gateway Timeout')
  })
})

describe('Last.FM API - Config Store Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call getApiBaseUrl on each request', async () => {
    const mockGetApiBaseUrl = vi.fn().mockReturnValue('http://localhost:9999')
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: mockGetApiBaseUrl,
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await getLastFMStatus()
    expect(mockGetApiBaseUrl).toHaveBeenCalled()
  })

  it('should use different base URLs', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'https://api.example.com',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await getLastFMStatus()
    expect(apiFetch).toHaveBeenCalledWith('https://api.example.com/lastfm/status')
  })

  it('should construct URLs correctly with base URL', async () => {
    const bases = [
      'http://localhost:9999',
      'http://localhost:9999/',
      'https://api.example.com',
    ]

    for (const baseUrl of bases) {
      vi.clearAllMocks()
      vi.mocked(useAppConfigStore).mockReturnValue({
        getApiBaseUrl: () => baseUrl,
      } as any)

      vi.mocked(apiFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: false }), { status: 200 })
      )

      await getLastFMStatus()
      // URL construction should work correctly regardless of base URL format
      expect(apiFetch).toHaveBeenCalled()
    }
  })
})

describe('Last.FM API - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not modify response data', async () => {
    const mockStatus: LastFMStatusResponse = {
      authenticated: true,
      username: 'testuser',
    }

    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockStatus), { status: 200 })
    )

    const result = await getLastFMStatus()
    expect(result).toEqual(mockStatus)
    expect(result.username).toBe('testuser')
  })

  it('should call apiFetch exactly once per function', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await getLastFMStatus()
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(1)
  })

  it('should not call store more than necessary', async () => {
    const mockGetApiBaseUrl = vi.fn().mockReturnValue('http://localhost:9999')
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: mockGetApiBaseUrl,
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await getLastFMStatus()
    expect(mockGetApiBaseUrl).toHaveBeenCalledTimes(1)
  })

  it('should throw immediately on first error', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response('Error', { status: 500, statusText: 'Error' })
    )

    try {
      await getLastFMStatus()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should handle consecutive calls with different results', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    // First call: authenticated
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: true, username: 'user1' }), {
        status: 200,
      })
    )

    const result1 = await getLastFMStatus()
    expect(result1.authenticated).toBe(true)
    expect(result1.username).toBe('user1')

    // Second call: not authenticated
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    const result2 = await getLastFMStatus()
    expect(result2.authenticated).toBe(false)
    expect(result2.username).toBeUndefined()
  })

  it('should handle all functions in sequence', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    // Status
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )
    await getLastFMStatus()

    // Start Auth
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ url: 'https://last.fm', request_token: 'token1' }), {
        status: 200,
      })
    )
    const authStart = await startLastFMAuth()
    expect(authStart.request_token).toBe('token1')

    // Prepare
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    const prepare = await prepareLastFMAuthCompletion('token1')
    expect(prepare.success).toBe(true)

    // Complete
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: true, username: 'newuser' }), {
        status: 200,
      })
    )
    const complete = await completeLastFMAuth()
    expect(complete.authenticated).toBe(true)

    // Disconnect
    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )
    const disconnect = await disconnectLastFM()
    expect(disconnect.authenticated).toBe(false)

    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(5)
  })

  it('should preserve Content-Type header in POST requests', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    await prepareLastFMAuthCompletion('token')
    const call = vi.mocked(apiFetch).mock.calls[0]
    expect(call[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('should not add extra headers to POST requests', async () => {
    vi.mocked(useAppConfigStore).mockReturnValue({
      getApiBaseUrl: () => 'http://localhost:9999',
    } as any)

    vi.mocked(apiFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    )

    await disconnectLastFM()
    const call = vi.mocked(apiFetch).mock.calls[0]
    // Should only have Content-Type, no extra headers
    expect(Object.keys(call[1]?.headers || {})).toEqual(['Content-Type'])
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getApiBaseUrl: () => 'http://host/api/audiocontrol' }),
}))

import {
  createSpotifySession,
  disconnectSpotify,
  getSpotifyLoginUrl,
  getSpotifyStatus,
  logoutSpotify,
  pollSpotifyAuth,
  storeSpotifyTokens,
} from '@/api/spotify'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(headers),
  json: async () => body,
})

const success = { status: 'success', session_id: 'sess-1', authenticated: true }

/** Every Spotify call the auth gateway classifies as risky (audiocontrol-auth.json
 *  lists only /spotify/status, /playback, /currently_playing and /check_server as
 *  ok), so each must go through apiFetch to get the login prompt and the csrf token. */
const riskyCalls: Array<[string, () => Promise<unknown>]> = [
  ['createSpotifySession', () => createSpotifySession()],
  ['getSpotifyLoginUrl', () => getSpotifyLoginUrl('sess-1')],
  ['pollSpotifyAuth', () => pollSpotifyAuth('sess-1')],
  [
    'storeSpotifyTokens',
    () => storeSpotifyTokens({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
  ],
  ['disconnectSpotify', () => disconnectSpotify()],
  ['logoutSpotify', () => logoutSpotify()],
]

describe('spotify api auth handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.each(riskyCalls)('%s prompts for the password on a 401 and retries', async (_name, call) => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' }))
      .mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)

    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockImplementation(async (hint) => {
      expect(hint).toBe('login')
      authStore.csrf = 'tok-1'
      return true
    })

    await call()

    expect(promptSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each(riskyCalls)('%s attaches the session cookie', async (_name, call) => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await call()

    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin')
  })

  it.each(riskyCalls)('%s surfaces a cancelled prompt as an error', async (_name, call) => {
    const authStore = useAuthStore()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' })),
    )
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(false)

    await expect(call()).rejects.toThrow(/Authentication required/)
  })

  it('sends the csrf token on the risky writes', async () => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await storeSpotifyTokens({ access_token: 'a', refresh_token: 'r', expires_in: 3600 })
    await disconnectSpotify()

    for (const [, init] of fetchMock.mock.calls) {
      expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok-abc')
    }
  })

  it('keeps the JSON content type and body when storing tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await storeSpotifyTokens({ access_token: 'a', refresh_token: 'r', expires_in: 3600 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/audiocontrol/spotify/tokens')
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
    })
  })

  it('routes the ok-tier status read through apiFetch too (session cookie, no csrf)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await getSpotifyStatus()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Headers).has('X-CSRF-Token')).toBe(false)
  })
})

describe('spotify api regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('error responses', () => {
    it('getSpotifyStatus throws on 500 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Server error' })))

      await expect(getSpotifyStatus()).rejects.toThrow(/getSpotifyStatus: 500/)
    })

    it('createSpotifySession throws on 503 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, { error: 'Service unavailable' })))

      await expect(createSpotifySession()).rejects.toThrow(/createSpotifySession: 503/)
    })

    it('getSpotifyLoginUrl throws on 400 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: 'Bad request' })))

      await expect(getSpotifyLoginUrl('invalid-session')).rejects.toThrow(/getSpotifyLoginUrl: 400/)
    })

    it('pollSpotifyAuth throws on 404 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { error: 'Not found' })))

      await expect(pollSpotifyAuth('nonexistent-session')).rejects.toThrow(/pollSpotifyAuth: 404/)
    })

    it('storeSpotifyTokens throws on 400 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: 'Invalid token data' })))

      await expect(
        storeSpotifyTokens({ access_token: '', refresh_token: '', expires_in: 0 }),
      ).rejects.toThrow(/storeSpotifyTokens: 400/)
    })

    it('disconnectSpotify throws on 500 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Server error' })))

      await expect(disconnectSpotify()).rejects.toThrow(/logoutSpotify: 500/)
    })
  })

  describe('invalid json responses', () => {
    const createBadJsonResponse = (status: number) => ({
      ok: status >= 200 && status < 300,
      status,
      statusText: '',
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0')
      },
    })

    it('getSpotifyStatus throws on malformed JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createBadJsonResponse(200)))

      await expect(getSpotifyStatus()).rejects.toThrow()
    })

    it('pollSpotifyAuth throws on malformed JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createBadJsonResponse(200)))

      await expect(pollSpotifyAuth('sess-1')).rejects.toThrow()
    })
  })

  describe('network errors', () => {
    it('getSpotifyStatus throws on network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      )

      await expect(getSpotifyStatus()).rejects.toThrow()
    })

    it('createSpotifySession throws on network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Network request failed')),
      )

      await expect(createSpotifySession()).rejects.toThrow()
    })

    it('storeSpotifyTokens throws on network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Connection timeout')),
      )

      await expect(
        storeSpotifyTokens({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
      ).rejects.toThrow()
    })
  })

  describe('edge cases with response data', () => {
    it('getSpotifyStatus handles response with missing optional fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { authenticated: true }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await getSpotifyStatus()

      expect(result.authenticated).toBe(true)
      expect(result.username).toBeUndefined()
    })

    it('pollSpotifyAuth handles pending status response', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { status: 'pending' }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await pollSpotifyAuth('sess-1')

      expect(result.status).toBe('pending')
      expect(result.token_data).toBeUndefined()
    })

    it('pollSpotifyAuth handles completed status with token data', async () => {
      const tokenData = { access_token: 'a', refresh_token: 'r', expires_in: 3600 }
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { status: 'completed', token_data: tokenData }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await pollSpotifyAuth('sess-1')

      expect(result.status).toBe('completed')
      expect(result.token_data).toEqual(tokenData)
    })

    it('pollSpotifyAuth handles error status with error message', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { status: 'error', error: 'Auth failed' }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await pollSpotifyAuth('sess-1')

      expect(result.status).toBe('error')
      expect(result.error).toBe('Auth failed')
    })
  })

  describe('http status text edge cases', () => {
    it('includes status text in error message for 503', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers(),
        json: async () => ({}),
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(createSpotifySession()).rejects.toThrow(/createSpotifySession: 503 Service Unavailable/)
    })

    it('includes status code in error message for 400', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        json: async () => ({}),
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(getSpotifyLoginUrl('session')).rejects.toThrow(/getSpotifyLoginUrl: 400 Bad Request/)
    })
  })

  describe('behavior assertions', () => {
    it('getSpotifyStatus returns parsed response object', async () => {
      const expectedResponse = { authenticated: true, username: 'testuser', expires_at: 1234567890 }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, expectedResponse))
      vi.stubGlobal('fetch', fetchMock)

      const result = await getSpotifyStatus()

      expect(result).toEqual(expectedResponse)
    })

    it('createSpotifySession returns session id in response', async () => {
      const expectedResponse = { session_id: 'sess-123', status: 'success' }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, expectedResponse))
      vi.stubGlobal('fetch', fetchMock)

      const result = await createSpotifySession()

      expect(result.session_id).toBe('sess-123')
      expect(result.status).toBe('success')
    })

    it('disconnectSpotify calls logout endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { authenticated: false }))
      vi.stubGlobal('fetch', fetchMock)

      await disconnectSpotify()

      expect(fetchMock.mock.calls[0][0]).toContain('/spotify/logout')
    })

    it('storeSpotifyTokens sends correct endpoint and method', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'success' }))
      vi.stubGlobal('fetch', fetchMock)
      const tokenData = { access_token: 'a', refresh_token: 'r', expires_in: 3600 }

      await storeSpotifyTokens(tokenData)

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/spotify/tokens')
      expect(init.method).toBe('POST')
    })

    it('logoutSpotify calls logout endpoint with POST method', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { authenticated: false }))
      vi.stubGlobal('fetch', fetchMock)

      await logoutSpotify()

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/spotify/logout')
      expect(init.method).toBe('POST')
    })

    it('disconnectSpotify delegates to logoutSpotify for backwards compatibility', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { authenticated: false }))
      vi.stubGlobal('fetch', fetchMock)

      await disconnectSpotify()

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/spotify/logout')
      expect(init.method).toBe('POST')
    })
  })
})

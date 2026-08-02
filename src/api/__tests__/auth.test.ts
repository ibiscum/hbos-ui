import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AuthApiError,
  AuthStatus,
  AuthTokenResponse,
  ProtectionLevel,
  getAuthStatus,
  getCsrf,
  login,
  logout,
  setPassword,
  setPolicy,
} from '@/api/auth'

const ok = (data: unknown) => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data })
const noContent = () => vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => undefined })

describe('auth api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAuthStatus', () => {
    it('gets status same-origin with credentials', async () => {
      const fetchMock = ok({ protection: 'risky', has_password: true, authenticated: false })
      vi.stubGlobal('fetch', fetchMock)

      const result = await getAuthStatus()

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/auth/status`,
        expect.objectContaining({ credentials: 'same-origin' }),
      )
      expect(result.protection).toBe('risky')
    })

    it('returns all protection levels correctly', async () => {
      const levels: ProtectionLevel[] = ['unset', 'off', 'risky', 'all']
      for (const level of levels) {
        const fetchMock = ok({ protection: level, has_password: true, authenticated: true })
        vi.stubGlobal('fetch', fetchMock)

        const result = await getAuthStatus()
        expect(result.protection).toBe(level)
      }
    })

    it('returns correct authentication status', async () => {
      const fetchMock = ok({ protection: 'all', has_password: false, authenticated: true })
      vi.stubGlobal('fetch', fetchMock)

      const result = await getAuthStatus()
      expect(result.authenticated).toBe(true)
      expect(result.has_password).toBe(false)
    })

    it('sets Content-Type header to application/json', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await getAuthStatus()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      )
    })
  })

  describe('login', () => {
    it('POSTs login with password and remember true', async () => {
      const fetchMock = ok({ csrf: 'tok' })
      vi.stubGlobal('fetch', fetchMock)

      const result = await login('secret', true)

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'secret', remember: true }),
          credentials: 'same-origin',
        }),
      )
      expect(result.csrf).toBe('tok')
    })

    it('POSTs login with password and remember false', async () => {
      const fetchMock = ok({ csrf: 'tok' })
      vi.stubGlobal('fetch', fetchMock)

      await login('secret', false)

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ password: 'secret', remember: false }),
        }),
      )
    })

    it('POSTs login with remember defaulting to false', async () => {
      const fetchMock = ok({ csrf: 'tok' })
      vi.stubGlobal('fetch', fetchMock)

      await login('secret')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ password: 'secret', remember: false }),
        }),
      )
    })

    it('throws AuthApiError on 401 with message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ message: 'wrong password' }),
        }),
      )

      await expect(login('nope')).rejects.toMatchObject({
        status: 401,
        message: 'wrong password',
      })
    })

    it('throws AuthApiError on 401 without JSON body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => {
            throw new Error('no json')
          },
        }),
      )

      const error = await login('nope').catch((e) => e)
      expect(error).toBeInstanceOf(AuthApiError)
      expect(error.status).toBe(401)
      expect(error.message).toBe('401')
    })

    it('throws AuthApiError on 429 rate limiting', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          json: async () => ({ message: 'too many attempts' }),
        }),
      )

      const error = await login('nope').catch((e) => e)
      expect(error).toBeInstanceOf(AuthApiError)
      expect(error.status).toBe(429)
    })
  })

  describe('setPassword', () => {
    it('POSTs set-password with password, current, and remember', async () => {
      const fetchMock = ok({ csrf: 'tok2' })
      vi.stubGlobal('fetch', fetchMock)

      await setPassword('newpass', 'oldpass', true)

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/auth/set-password`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'newpass', current: 'oldpass', remember: true }),
        }),
      )
    })

    it('POSTs set-password without current when undefined', async () => {
      const fetchMock = ok({ csrf: 'tok2' })
      vi.stubGlobal('fetch', fetchMock)

      await setPassword('newpass', undefined, false)

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ password: 'newpass', remember: false }),
        }),
      )
    })

    it('POSTs set-password with default remember=false', async () => {
      const fetchMock = ok({ csrf: 'tok2' })
      vi.stubGlobal('fetch', fetchMock)

      await setPassword('newpass')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ password: 'newpass', remember: false }),
        }),
      )
    })

    it('throws on 401 with wrong current password', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ message: 'current password incorrect' }),
        }),
      )

      await expect(setPassword('new', 'wrong')).rejects.toMatchObject({
        status: 401,
      })
    })
  })

  describe('logout', () => {
    it('POSTs logout with CSRF header', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await logout('csrf-tok')

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/auth/logout`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-tok' }),
        }),
      )
    })

    it('POSTs logout without CSRF header when token is undefined', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await logout()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({ 'X-CSRF-Token': expect.anything() }),
        }),
      )
    })

    it('returns void on 204 No Content', async () => {
      vi.stubGlobal('fetch', noContent())

      const result = await logout('token')
      expect(result).toBeUndefined()
    })
  })

  describe('setPolicy', () => {
    const protectionLevels: ProtectionLevel[] = ['unset', 'off', 'risky', 'all']

    it('POSTs policy with protection level and CSRF header', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await setPolicy('all', 'csrf-tok')

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/auth/policy`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-tok' }),
          body: JSON.stringify({ protection: 'all' }),
        }),
      )
    })

    it('sends all protection levels correctly', async () => {
      for (const level of protectionLevels) {
        const fetchMock = ok({})
        vi.stubGlobal('fetch', fetchMock)

        await setPolicy(level, 'token')

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({ protection: level }),
          }),
        )
      }
    })

    it('POSTs policy without CSRF header when token is undefined', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await setPolicy('risky')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({ 'X-CSRF-Token': expect.anything() }),
        }),
      )
    })

    it('returns void on 204 No Content', async () => {
      vi.stubGlobal('fetch', noContent())

      const result = await setPolicy('all', 'token')
      expect(result).toBeUndefined()
    })
  })

  describe('getCsrf', () => {
    it('gets a fresh CSRF token', async () => {
      const fetchMock = ok({ csrf: 'tok3' })
      vi.stubGlobal('fetch', fetchMock)

      const result = await getCsrf()

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/auth/csrf`,
        expect.objectContaining({ credentials: 'same-origin' }),
      )
      expect(result.csrf).toBe('tok3')
    })

    it('includes Content-Type header', async () => {
      const fetchMock = ok({ csrf: 'tok' })
      vi.stubGlobal('fetch', fetchMock)

      await getCsrf()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      )
    })
  })

  describe('error handling', () => {
    it('creates AuthApiError with correct name', () => {
      const error = new AuthApiError(403, 'forbidden')
      expect(error.name).toBe('AuthApiError')
      expect(error).toBeInstanceOf(Error)
    })

    it('extracts message from JSON error body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ message: 'internal server error' }),
        }),
      )

      const error = await login('pass').catch((e) => e)
      expect(error.message).toBe('internal server error')
    })

    it('uses status code as message when JSON parsing fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('invalid json')
          },
        }),
      )

      const error = await login('pass').catch((e) => e)
      expect(error.message).toBe('500')
    })

    it('handles error body without message field', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ error: 'bad request' }),
        }),
      )

      const error = await login('pass').catch((e) => e)
      expect(error.message).toBe('400')
    })
  })

  describe('headers and options', () => {
    it('sets credentials to same-origin on all requests', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await getAuthStatus()
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'same-origin' }),
      )

      const fetchMock2 = ok({})
      vi.stubGlobal('fetch', fetchMock2)
      await getCsrf()
      expect(fetchMock2).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'same-origin' }),
      )
    })

    it('merges custom headers with Content-Type', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await login('pass')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })
  })

  describe('regression tests', () => {
    it('handles 204 No Content response without attempting JSON parsing', async () => {
      const jsonSpy = vi.fn()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
          json: jsonSpy,
        }),
      )

      const result = await logout('token')
      expect(result).toBeUndefined()
      expect(jsonSpy).not.toHaveBeenCalled()
    })

    it('does not send CSRF token for login endpoint', async () => {
      const fetchMock = ok({ csrf: 'new-token' })
      vi.stubGlobal('fetch', fetchMock)

      await login('password')

      const callArgs = fetchMock.mock.calls[0][1]
      expect(callArgs?.headers).not.toHaveProperty('X-CSRF-Token')
    })

    it('does not send CSRF token for setPassword endpoint', async () => {
      const fetchMock = ok({ csrf: 'new-token' })
      vi.stubGlobal('fetch', fetchMock)

      await setPassword('password')

      const callArgs = fetchMock.mock.calls[0][1]
      expect(callArgs?.headers).not.toHaveProperty('X-CSRF-Token')
    })

    it('preserves body when CSRF headers are added', async () => {
      const fetchMock = ok({})
      vi.stubGlobal('fetch', fetchMock)

      await setPolicy('all', 'token')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ protection: 'all' }),
          headers: expect.objectContaining({ 'X-CSRF-Token': 'token' }),
        }),
      )
    })
  })
})

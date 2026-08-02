import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiFetch } from '@/api/http'
import { useAuthStore, type AuthHint } from '@/stores/auth'

// Mock the auth store
let mockAuthStore = {
  csrf: 'test-csrf-token',
  ensureCsrf: vi.fn(),
  promptForAuth: vi.fn(),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

// Mock the global fetch function
global.fetch = vi.fn()

describe('HTTP API Module', () => {
  beforeEach(() => {
    mockAuthStore = {
      csrf: 'test-csrf-token',
      ensureCsrf: vi.fn(),
      promptForAuth: vi.fn(),
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('apiFetch - Successful Requests', () => {
    it('should perform a successful GET request with credentials', async () => {
      const mockResponse = new Response('{"data": "test"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/test')

      expect(result.status).toBe(200)
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith('/api/test', {
        credentials: 'same-origin',
        headers: expect.any(Headers),
      })
    })

    it('should perform a POST request with CSRF token', async () => {
      const mockResponse = new Response('{"success": true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/test', { method: 'POST', body: JSON.stringify({ key: 'value' }) })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      expect(callArgs[0]).toBe('/api/test')
      expect(callArgs[1]?.credentials).toBe('same-origin')

      // Check that CSRF header was added for POST
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should preserve custom headers when adding CSRF token', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Custom-Header': 'custom-value' },
        body: JSON.stringify({ key: 'value' }),
      })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should handle 200 OK responses', async () => {
      const mockResponse = new Response('{"data": "success"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/endpoint')

      expect(result.status).toBe(200)
    })

    it('should handle 201 Created responses', async () => {
      const mockResponse = new Response('{"id": 123}', {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/resource', { method: 'POST' })

      expect(result.status).toBe(201)
    })

    it('should handle 204 No Content responses', async () => {
      const mockResponse = new Response(null, { status: 204 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/delete', { method: 'DELETE' })

      expect(result.status).toBe(204)
    })
  })

  describe('apiFetch - HTTP Methods and CSRF Protection', () => {
    it('should NOT add CSRF token for GET requests', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/data', { method: 'GET' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })

    it('should NOT add CSRF token for HEAD requests', async () => {
      const mockResponse = new Response(null, { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/data', { method: 'HEAD' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })

    it('should add CSRF token for POST requests', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/endpoint', { method: 'POST' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should add CSRF token for PUT requests', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/resource', { method: 'PUT' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should add CSRF token for PATCH requests', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/resource', { method: 'PATCH' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should add CSRF token for DELETE requests', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/resource', { method: 'DELETE' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should handle case-insensitive HTTP method names', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/endpoint', { method: 'get' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })
  })

  describe('apiFetch - 401 Unauthorized Handling', () => {
    describe('401 with login hint on write method - CSRF recovery path', () => {
      it('should attempt CSRF recovery and retry on 401 with login hint for POST', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('{"success": true}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(true)

        const result = await apiFetch('/api/config', { method: 'POST' })

        expect(result.status).toBe(200)
        expect(vi.mocked(mockAuthStore.ensureCsrf)).toHaveBeenCalledTimes(1)
        expect(vi.mocked(mockAuthStore.promptForAuth)).not.toHaveBeenCalled()
        expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
      })

      it('should attempt CSRF recovery for PUT requests', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('{}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(true)

        await apiFetch('/api/resource', { method: 'PUT' })

        expect(vi.mocked(mockAuthStore.ensureCsrf)).toHaveBeenCalledTimes(1)
      })

      it('should attempt CSRF recovery for DELETE requests', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('{}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(true)

        await apiFetch('/api/resource', { method: 'DELETE' })

        expect(vi.mocked(mockAuthStore.ensureCsrf)).toHaveBeenCalledTimes(1)
      })

      it('should prompt for auth if CSRF recovery fails', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('{"success": true}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(false)
        vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

        const result = await apiFetch('/api/config', { method: 'POST' })

        expect(vi.mocked(mockAuthStore.ensureCsrf)).toHaveBeenCalledTimes(1)
        expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalledWith('login')
        expect(result.status).toBe(200)
      })
    })

    describe('401 with set-password hint', () => {
      it('should skip CSRF recovery and prompt for auth immediately', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'set-password' },
        })
        const secondResponse = new Response('{"success": true}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

        const result = await apiFetch('/api/config', { method: 'POST' })

        expect(vi.mocked(mockAuthStore.ensureCsrf)).not.toHaveBeenCalled()
        expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalledWith('set-password')
        expect(result.status).toBe(200)
      })
    })

    describe('401 on body-less methods (GET/HEAD)', () => {
      it('should skip CSRF recovery for GET requests and prompt for auth', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('{}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

        await apiFetch('/api/data', { method: 'GET' })

        expect(vi.mocked(mockAuthStore.ensureCsrf)).not.toHaveBeenCalled()
        expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalledWith('login')
      })

      it('should skip CSRF recovery for HEAD requests and prompt for auth', async () => {
        const firstResponse = new Response(null, {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response(null, { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

        await apiFetch('/api/check', { method: 'HEAD' })

        expect(vi.mocked(mockAuthStore.ensureCsrf)).not.toHaveBeenCalled()
        expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalledWith('login')
      })
    })

    describe('401 after successful prompt', () => {
      it('should retry the request after user authentication', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('{}', { status: 200 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(false)
        vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

        const result = await apiFetch('/api/endpoint', { method: 'POST' })

        expect(result.status).toBe(200)
        expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
      })
    })

    describe('401 after authentication prompt is cancelled', () => {
      it('should throw error if user cancels prompt', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })

        vi.mocked(global.fetch).mockResolvedValueOnce(firstResponse)
        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(false)
        vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(false)

        await expect(apiFetch('/api/endpoint', { method: 'POST' })).rejects.toThrow(
          'Authentication required'
        )

        expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalled()
      })
    })

    describe('Second 401 after retry', () => {
      it('should not retry again if second fetch returns 401', async () => {
        const firstResponse = new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate-Hint': 'login' },
        })
        const secondResponse = new Response('Unauthorized', { status: 401 })

        vi.mocked(global.fetch)
          .mockResolvedValueOnce(firstResponse)
          .mockResolvedValueOnce(secondResponse)

        vi.mocked(mockAuthStore.ensureCsrf).mockResolvedValueOnce(true)

        const result = await apiFetch('/api/endpoint', { method: 'POST' })

        expect(result.status).toBe(401)
        expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('apiFetch - Error Responses (Non-401)', () => {
    it('should pass through 403 Forbidden', async () => {
      const mockResponse = new Response('Forbidden', { status: 403 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/protected')

      expect(result.status).toBe(403)
      expect(vi.mocked(mockAuthStore.promptForAuth)).not.toHaveBeenCalled()
    })

    it('should pass through 404 Not Found', async () => {
      const mockResponse = new Response('Not Found', { status: 404 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/nonexistent')

      expect(result.status).toBe(404)
      expect(vi.mocked(mockAuthStore.promptForAuth)).not.toHaveBeenCalled()
    })

    it('should pass through 500 Internal Server Error', async () => {
      const mockResponse = new Response('Internal Server Error', { status: 500 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/broken')

      expect(result.status).toBe(500)
      expect(vi.mocked(mockAuthStore.promptForAuth)).not.toHaveBeenCalled()
    })

    it('should pass through 503 Service Unavailable', async () => {
      const mockResponse = new Response('Service Unavailable', { status: 503 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/service')

      expect(result.status).toBe(503)
    })
  })

  describe('apiFetch - No CSRF Token Cases', () => {
    it('should handle missing CSRF token gracefully for GET requests', async () => {
      mockAuthStore.csrf = null

      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/data', { method: 'GET' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })

    it('should not add CSRF header when CSRF token is null for write methods', async () => {
      mockAuthStore.csrf = null

      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/config', { method: 'POST' })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })
  })

  describe('apiFetch - Edge Cases', () => {
    it('should handle requests without init parameter', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/default')

      expect(result.status).toBe(200)
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith('/api/default', expect.any(Object))
    })

    it('should handle empty response body', async () => {
      const mockResponse = new Response('', { status: 204 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/delete', { method: 'DELETE' })

      expect(result.status).toBe(204)
    })

    it('should handle default method as GET', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/data')

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      // GET doesn't need CSRF
      expect(headers.get('X-CSRF-Token')).toBeNull()
    })

    it('should preserve credentials in all requests', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/test')

      const callArgs = vi.mocked(global.fetch).mock.calls[0]

      expect(callArgs[1]?.credentials).toBe('same-origin')
    })

    it('should handle requests with query parameters', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/search?q=test&limit=10')

      expect(result.status).toBe(200)
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/search?q=test&limit=10',
        expect.any(Object)
      )
    })
  })

  describe('apiFetch - Regression Tests', () => {
    it('should not perform retry if first response is not 401', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/endpoint', { method: 'POST' })

      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(mockAuthStore.ensureCsrf)).not.toHaveBeenCalled()
    })

    it('should not attempt CSRF recovery if response hint is missing', async () => {
      const mockResponse = new Response('Unauthorized', {
        status: 401,
        // No WWW-Authenticate-Hint header
      })
      const secondResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(secondResponse)

      vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

      const result = await apiFetch('/api/config', { method: 'POST' })

      // Missing header should default to 'login' hint
      expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalledWith('login')
      expect(result.status).toBe(200)
    })

    it('should not duplicate CSRF token if already in headers', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      await apiFetch('/api/endpoint', {
        method: 'POST',
        headers: { 'X-CSRF-Token': 'custom-token' },
      })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      // Should be overwritten with the store's token
      expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should maintain header object type after merge', async () => {
      const mockResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const customHeaders = {
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json',
      }

      await apiFetch('/api/endpoint', {
        method: 'POST',
        headers: customHeaders,
      })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const headers = callArgs[1]?.headers

      expect(headers).toBeInstanceOf(Headers)
      expect(headers?.get('Authorization')).toBe('Bearer token')
      expect(headers?.get('Content-Type')).toBe('application/json')
      expect(headers?.get('X-CSRF-Token')).toBe('test-csrf-token')
    })

    it('should handle response with multiple Set-Cookie headers', async () => {
      const mockResponse = new Response('{}', {
        status: 200,
        headers: {
          'Set-Cookie': 'session=abc; Path=/',
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

      const result = await apiFetch('/api/login', { method: 'POST' })

      expect(result.status).toBe(200)
    })

    it('should handle null CSRF in response hint header', async () => {
      const mockResponse = new Response('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate-Hint': '' },
      })
      const secondResponse = new Response('{}', { status: 200 })

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(secondResponse)

      vi.mocked(mockAuthStore.promptForAuth).mockResolvedValueOnce(true)

      await apiFetch('/api/endpoint', { method: 'POST' })

      // Empty/falsy hint should default to 'login'
      expect(vi.mocked(mockAuthStore.promptForAuth)).toHaveBeenCalledWith('login')
    })
  })
})

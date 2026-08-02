import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getFilterChain, type FilterChainResponse } from '@/api/filterchain'
import * as httpApi from '@/api/http'
import { useAppConfigStore } from '@/stores/appconfig'

// Create a persistent mock store instance
const createMockConfigStore = () => ({
  getConfigApiBaseUrl: vi.fn(() => 'http://localhost:8080/api/config')
})

let mockConfigStore = createMockConfigStore()

// Mock dependencies
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn()
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => mockConfigStore)
}))

describe('FilterChain API', () => {
  let mockApiFetch: typeof httpApi.apiFetch

  beforeEach(() => {
    mockApiFetch = httpApi.apiFetch as typeof httpApi.apiFetch
    mockConfigStore = createMockConfigStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getFilterChain', () => {
    describe('Success Cases', () => {
      it('should return filtergraph in DOT format when response is text/plain', async () => {
        const dotContent = `digraph pipewire {
  rankdir=LR;
  "PulseAudio Source" -> "ALSA Sink";
}`
        const mockFetchResponse = new Response(dotContent, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toBe(dotContent)
        expect(result.message).toBeUndefined()
        expect(mockApiFetch).toHaveBeenCalledWith('http://localhost:8080/api/config/pipewire/filtergraph')
      })

      it('should handle DOT content with multiple nodes and connections', async () => {
        const complexDotContent = `digraph pipewire {
  rankdir=LR;
  node [shape=box];
  "Input Device" -> "Mixer";
  "Mixer" -> "EQ Filter";
  "EQ Filter" -> "Output Device";
  "Microphone" -> "Mixer";
}`
        const mockFetchResponse = new Response(complexDotContent, {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toContain('digraph pipewire')
        expect(result.data).toContain('EQ Filter')
        expect(mockApiFetch).toHaveBeenCalledTimes(1)
      })

      it('should handle empty DOT content gracefully', async () => {
        const emptyDot = ''
        const mockFetchResponse = new Response(emptyDot, {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toBe('')
      })

      it('should handle DOT content with special characters', async () => {
        const specialCharDot = `digraph pipewire {
  "Node with spaces" -> "Another Node (with parens)";
  "Quote\\"Test" -> "Node[with]brackets";
}`
        const mockFetchResponse = new Response(specialCharDot, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toBe(specialCharDot)
      })
    })

    describe('Error Cases - JSON Response', () => {
      it('should return error status when response is JSON with error message', async () => {
        const errorData = {
          message: 'PipeWire not available'
        }
        const mockFetchResponse = new Response(JSON.stringify(errorData), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.message).toBe('PipeWire not available')
        expect(result.data).toBeUndefined()
      })

      it('should use default error message when JSON response has no message field', async () => {
        const errorData = {
          code: 'PIPEWIRE_NOT_FOUND'
        }
        const mockFetchResponse = new Response(JSON.stringify(errorData), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.message).toBe('Failed to get filtergraph')
        expect(result.data).toBeUndefined()
      })

      it('should handle JSON error responses with additional metadata', async () => {
        const errorData = {
          message: 'Access denied',
          code: 'PERMISSION_DENIED',
          timestamp: '2024-01-01T00:00:00Z'
        }
        const mockFetchResponse = new Response(JSON.stringify(errorData), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.message).toBe('Access denied')
      })
    })

    describe('HTTP Error Handling', () => {
      it('should throw error when response is not ok with 404 status', async () => {
        const mockFetchResponse = new Response('Not Found', {
          status: 404,
          statusText: 'Not Found'
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow(
          'Failed to get filtergraph: 404 Not Found'
        )
      })

      it('should throw error when response is not ok with 500 status', async () => {
        const mockFetchResponse = new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error'
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow(
          'Failed to get filtergraph: 500 Internal Server Error'
        )
      })

      it('should throw error when response is not ok with 403 status', async () => {
        const mockFetchResponse = new Response('Forbidden', {
          status: 403,
          statusText: 'Forbidden'
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow(
          'Failed to get filtergraph: 403 Forbidden'
        )
      })

      it('should throw error when response is not ok with 401 status', async () => {
        const mockFetchResponse = new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized'
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow(
          'Failed to get filtergraph: 401 Unauthorized'
        )
      })

      it('should throw error when response is not ok with custom statusText', async () => {
        const mockFetchResponse = new Response('Custom Error', {
          status: 418,
          statusText: "I'm a teapot"
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow(
          "Failed to get filtergraph: 418 I'm a teapot"
        )
      })
    })

    describe('API Integration', () => {
      it('should call apiFetch with correct URL', async () => {
        const mockFetchResponse = new Response('digraph { }', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await getFilterChain()

        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/config/pipewire/filtergraph'
        )
      })

      it('should use base URL from config store', async () => {
        const customBaseUrl = 'http://custom-host:9000/api/v2'
        mockConfigStore.getConfigApiBaseUrl.mockReturnValue(customBaseUrl)

        const mockFetchResponse = new Response('digraph { }', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await getFilterChain()

        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://custom-host:9000/api/v2/pipewire/filtergraph'
        )
      })
    })

    describe('Content-Type Handling', () => {
      it('should recognize text/plain with charset', async () => {
        const dotContent = 'digraph { }'
        const mockFetchResponse = new Response(dotContent, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toBe(dotContent)
      })

      it('should recognize text/plain without charset', async () => {
        const dotContent = 'digraph { }'
        const mockFetchResponse = new Response(dotContent, {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toBe(dotContent)
      })

      it('should handle application/json response as error', async () => {
        const errorData = { message: 'Service unavailable' }
        const mockFetchResponse = new Response(JSON.stringify(errorData), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.message).toBe('Service unavailable')
      })

      it('should handle application/json; charset as error', async () => {
        const errorData = { message: 'Invalid request' }
        const mockFetchResponse = new Response(JSON.stringify(errorData), {
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.message).toBe('Invalid request')
      })

      it('should treat missing content-type as error response', async () => {
        const errorData = { message: 'Malformed response' }
        const mockFetchResponse = new Response(JSON.stringify(errorData), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.message).toBe('Malformed response')
      })
    })

    describe('Regression Tests', () => {
      it('should handle network timeout errors', async () => {
        vi.mocked(mockApiFetch).mockRejectedValueOnce(
          new Error('Network timeout')
        )

        await expect(getFilterChain()).rejects.toThrow('Network timeout')
      })

      it('should handle large DOT content', async () => {
        const largeDot = `digraph pipewire {
${Array.from({ length: 1000 }, (_, i) => `  "Node${i}" -> "Node${i + 1}";`).join('\n')}
}`
        const mockFetchResponse = new Response(largeDot, {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toContain('Node999')
        expect(result.data?.length).toBeGreaterThan(5000)
      })

      it('should handle response.text() errors', async () => {
        const mockFetchResponse = new Response('digraph { }', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true
        mockFetchResponse.text = vi.fn().mockRejectedValueOnce(
          new Error('Failed to read response body')
        )

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow('Failed to read response body')
      })

      it('should handle response.json() errors', async () => {
        const mockFetchResponse = new Response('invalid json', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
        mockFetchResponse.ok = true
        mockFetchResponse.json = vi.fn().mockRejectedValueOnce(
          new Error('Invalid JSON')
        )

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getFilterChain()).rejects.toThrow('Invalid JSON')
      })

      it('should consistently return FilterChainResponse type', async () => {
        const mockFetchResponse = new Response('digraph { }', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result).toHaveProperty('status')
        expect(['success', 'error']).toContain(result.status)
        expect(typeof result.status).toBe('string')
      })

      it('should return response with undefined data when error occurs', async () => {
        const mockFetchResponse = new Response(
          JSON.stringify({ message: 'Error' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('error')
        expect(result.data).toBeUndefined()
        expect(result.message).toBeDefined()
      })

      it('should return response with undefined message on success', async () => {
        const mockFetchResponse = new Response('digraph { }', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getFilterChain()

        expect(result.status).toBe('success')
        expect(result.data).toBeDefined()
        expect(result.message).toBeUndefined()
      })
    })
  })
})

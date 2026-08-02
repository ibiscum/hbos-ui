import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { updateArtistImage, getCoverArtMethods } from '@/api/coverart'
import type { CoverArtUpdateResponse, CoverArtMethodsResponse } from '@/api/coverart'
import * as httpApi from '@/api/http'
import { useAppConfigStore } from '@/stores/appconfig'

// Mock dependencies
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn()
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => ({
    getApiBaseUrl: vi.fn(() => 'http://localhost:8080/api')
  }))
}))

describe('Cover Art API', () => {
  let mockApiFetch: typeof httpApi.apiFetch
  let mockConfigStore: ReturnType<typeof useAppConfigStore>

  beforeEach(() => {
    mockApiFetch = httpApi.apiFetch as typeof httpApi.apiFetch
    mockConfigStore = useAppConfigStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('updateArtistImage', () => {
    it('should successfully update artist image with valid inputs', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'Image updated successfully'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await updateArtistImage('The Beatles', 'https://example.com/image.jpg')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Image updated successfully')
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('should encode artist name to URL-safe base64', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await updateArtistImage('Test Artist', 'https://example.com/image.jpg')

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      const url = callArgs[0] as string

      // Extract the base64-encoded part and verify it's URL-safe (no +, /, or =)
      const base64Match = url.match(/\/coverart\/artist\/([A-Za-z0-9_-]+)\/update/)
      expect(base64Match).not.toBeNull()
      const base64Part = base64Match?.[1] || ''
      expect(base64Part).not.toContain('+')
      expect(base64Part).not.toContain('/')
      expect(base64Part).not.toContain('=')
    })

    it('should handle special characters in artist name', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await updateArtistImage('AC/DC & Friends', 'https://example.com/image.jpg')

      expect(result.success).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle unicode characters in artist name', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await updateArtistImage('Björk', 'https://example.com/image.jpg')

      expect(result.success).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('should send correct request headers', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await updateArtistImage('Artist', 'https://example.com/image.jpg')

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      const options = callArgs[1] as RequestInit

      expect(options.method).toBe('POST')
      expect(options.headers).toEqual({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    })

    it('should send correct request body', async () => {
      const imageUrl = 'https://example.com/image.jpg'
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await updateArtistImage('Artist', imageUrl)

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      const options = callArgs[1] as RequestInit
      const body = JSON.parse(options.body as string)

      expect(body.url).toBe(imageUrl)
    })

    it('should throw on HTTP error response', async () => {
      const mockFetchResponse = new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/plain' }
      })
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(updateArtistImage('Artist', 'https://example.com/image.jpg')).rejects.toThrow(
        'HTTP error! status: 404'
      )
    })

    it('should throw on 500 server error', async () => {
      const mockFetchResponse = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' }
      })
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(updateArtistImage('Artist', 'https://example.com/image.jpg')).rejects.toThrow(
        'HTTP error! status: 500'
      )
    })

    it('should throw on network error', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateArtistImage('Artist', 'https://example.com/image.jpg')).rejects.toThrow(
        'Network error'
      )
    })

    it('should throw on invalid JSON response', async () => {
      const mockFetchResponse = new Response('Invalid JSON', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(updateArtistImage('Artist', 'https://example.com/image.jpg')).rejects.toThrow()
    })

    it('should throw when artist name is empty', async () => {
      await expect(updateArtistImage('', 'https://example.com/image.jpg')).rejects.toThrow(
        'Artist name cannot be empty'
      )
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should throw when artist name is whitespace only', async () => {
      await expect(updateArtistImage('   ', 'https://example.com/image.jpg')).rejects.toThrow(
        'Artist name cannot be empty'
      )
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should throw when image URL is empty', async () => {
      await expect(updateArtistImage('Artist', '')).rejects.toThrow('Image URL cannot be empty')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should throw when image URL is whitespace only', async () => {
      await expect(updateArtistImage('Artist', '   ')).rejects.toThrow('Image URL cannot be empty')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should construct correct API URL', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await updateArtistImage('Artist', 'https://example.com/image.jpg')

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      const url = callArgs[0] as string

      expect(url).toMatch(/^http:\/\/localhost:8080\/api\/coverart\/artist\//)
      expect(url).toMatch(/\/update$/)
    })
  })

  describe('getCoverArtMethods', () => {
    it('should successfully fetch cover art methods', async () => {
      const mockResponse: CoverArtMethodsResponse = {
        methods: [
          {
            method: 'embedded',
            providers: [
              { name: 'embedded_tags', display_name: 'Embedded Tags' },
              { name: 'embedded_artists', display_name: 'Embedded Artist Images' }
            ]
          },
          {
            method: 'local',
            providers: [
              { name: 'folder_images', display_name: 'Folder Images' },
              { name: 'artist_images', display_name: 'Artist Images' }
            ]
          }
        ]
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getCoverArtMethods()

      expect(result.methods).toHaveLength(2)
      expect(result.methods[0].method).toBe('embedded')
      expect(result.methods[0].providers).toHaveLength(2)
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('should send GET request with correct headers', async () => {
      const mockResponse: CoverArtMethodsResponse = {
        methods: []
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getCoverArtMethods()

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      const options = callArgs[1] as RequestInit

      expect(options.method).toBe('GET')
      expect(options.headers).toEqual({ 'Accept': 'application/json' })
    })

    it('should construct correct API URL', async () => {
      const mockResponse: CoverArtMethodsResponse = {
        methods: []
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getCoverArtMethods()

      const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
      const url = callArgs[0] as string

      expect(url).toBe('http://localhost:8080/api/coverart/methods')
    })

    it('should throw on HTTP error response', async () => {
      const mockFetchResponse = new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'text/plain' }
      })
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(getCoverArtMethods()).rejects.toThrow('HTTP error! status: 401')
    })

    it('should throw on 500 server error', async () => {
      const mockFetchResponse = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' }
      })
      mockFetchResponse.ok = false

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(getCoverArtMethods()).rejects.toThrow('HTTP error! status: 500')
    })

    it('should throw on network error', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(new Error('Network timeout'))

      await expect(getCoverArtMethods()).rejects.toThrow('Network timeout')
    })

    it('should throw on invalid JSON response', async () => {
      const mockFetchResponse = new Response('Invalid JSON', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await expect(getCoverArtMethods()).rejects.toThrow()
    })

    it('should handle empty methods array', async () => {
      const mockResponse: CoverArtMethodsResponse = {
        methods: []
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getCoverArtMethods()

      expect(result.methods).toHaveLength(0)
    })
  })

  describe('Regression Tests', () => {
    it('should maintain backward compatibility for updateArtistImage response format', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'Image updated successfully'
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await updateArtistImage('Artist', 'https://example.com/image.jpg')

      // Verify response structure hasn't changed
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.message).toBe('string')
    })

    it('should maintain backward compatibility for getCoverArtMethods response format', async () => {
      const mockResponse: CoverArtMethodsResponse = {
        methods: [
          {
            method: 'embedded',
            providers: [
              { name: 'embedded_tags', display_name: 'Embedded Tags' }
            ]
          }
        ]
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse.ok = true

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getCoverArtMethods()

      // Verify response structure hasn't changed
      expect(result).toHaveProperty('methods')
      expect(Array.isArray(result.methods)).toBe(true)
      expect(result.methods[0]).toHaveProperty('method')
      expect(result.methods[0]).toHaveProperty('providers')
      expect(Array.isArray(result.methods[0].providers)).toBe(true)
      expect(result.methods[0].providers[0]).toHaveProperty('name')
      expect(result.methods[0].providers[0]).toHaveProperty('display_name')
    })

    it('should persist base64 encoding logic across updates', async () => {
      const mockResponse: CoverArtUpdateResponse = {
        success: true,
        message: 'OK'
      }

      // First call
      const mockFetchResponse1 = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse1.ok = true
      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse1)
      const result1 = await updateArtistImage('Björk', 'https://example.com/image1.jpg')

      // Second call with same artist name
      const mockFetchResponse2 = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      mockFetchResponse2.ok = true
      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse2)
      const result2 = await updateArtistImage('Björk', 'https://example.com/image2.jpg')

      const url1 = vi.mocked(mockApiFetch).mock.calls[0][0]
      const url2 = vi.mocked(mockApiFetch).mock.calls[1][0]

      // Same artist name should encode to same base64
      expect(url1).toBe(url2)
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })
})

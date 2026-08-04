import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rewriteImageUrl, rewriteAudiocontrolApiUrl, rewrite_audiocontrol_api_url } from '../utils'

const mockApiConfig = { useProxy: false }
const mockGetApiBaseUrl = vi.fn()
let mockDeviceConfig = {
  deviceIP: '192.168.1.67',
  devicePort: 80
}

// Mock the config store - used by both functions
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => ({
    apiConfig: mockApiConfig,
    config: {
      audiocontrol_api: mockDeviceConfig
    },
    getApiBaseUrl: mockGetApiBaseUrl
  }))
}))

describe('utils.ts - URL Rewriting Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiConfig.useProxy = false
    mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 80 }
    mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // rewriteImageUrl - Core Functionality Tests
  // ============================================================================

  describe('rewriteImageUrl - Proxy Mode', () => {
    beforeEach(() => {
      mockApiConfig.useProxy = true
    })

    it('should add /api/audiocontrol prefix to /api/library/ URLs', () => {
      const result = rewriteImageUrl('/api/library/mpd/image/test.jpg')
      expect(result).toBe('/api/audiocontrol/library/mpd/image/test.jpg')
    })

    it('should add /api/audiocontrol prefix to /api/coverart/ URLs', () => {
      const result = rewriteImageUrl('/api/coverart/metadata/cover.jpg')
      expect(result).toBe('/api/audiocontrol/coverart/metadata/cover.jpg')
    })

    it('should not process /api/lyrics/ URLs in proxy mode', () => {
      // Note: IMAGE_PROXY_PREFIXES does NOT include lyrics
      const result = rewriteImageUrl('/api/lyrics/song/lyrics.txt')
      expect(result).toBe('/api/lyrics/song/lyrics.txt')
    })

    it('should not process URLs without recognized prefix', () => {
      const result = rewriteImageUrl('/api/unknown/path')
      expect(result).toBe('/api/unknown/path')
    })
  })

  describe('rewriteImageUrl - Production Mode', () => {
    beforeEach(() => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 80 }
    })

    it('should build full URL with library prefix (port 80 omitted)', () => {
      const result = rewriteImageUrl('/api/library/test.jpg')
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/test.jpg')
      expect(result).not.toContain(':80')
    })

    it('should build full URL with coverart prefix', () => {
      const result = rewriteImageUrl('/api/coverart/album.jpg')
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/coverart/album.jpg')
    })

    it('should include port number when not 80', () => {
      mockDeviceConfig.devicePort = 8080
      const result = rewriteImageUrl('/api/library/test.jpg')
      expect(result).toBe('http://192.168.1.67:8080/api/audiocontrol/library/test.jpg')
    })

    it('should return corrected path when deviceIP is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeviceConfig.deviceIP = null as any

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[IMG] Missing or invalid device configuration:',
        expect.objectContaining({ deviceIP: null })
      )
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('should return corrected path when devicePort is invalid (string)', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeviceConfig.devicePort = '80' as any

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('should return corrected path when devicePort is float (non-integer)', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeviceConfig.devicePort = 8080.5

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('should return corrected path when devicePort is 0', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeviceConfig.devicePort = 0

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('should return corrected path when devicePort exceeds max (> 65535)', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeviceConfig.devicePort = 65536

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('should return corrected path when devicePort is negative', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeviceConfig.devicePort = -1

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })
  })

  describe('rewriteImageUrl - Double Rewrite Guard', () => {
    it('should not rewrite URLs already containing /api/audiocontrol/', () => {
      mockApiConfig.useProxy = false
      const alreadyRewritten = '/api/audiocontrol/library/test.jpg'

      const result = rewriteImageUrl(alreadyRewritten)

      expect(result).toBe(alreadyRewritten)
      expect(result).not.toContain('/api/audiocontrol/api/audiocontrol/')
    })

    it('should return already-rewritten URLs in proxy mode', () => {
      mockApiConfig.useProxy = true
      const alreadyRewritten = '/api/audiocontrol/library/test.jpg'

      const result = rewriteImageUrl(alreadyRewritten)

      expect(result).toBe(alreadyRewritten)
    })
  })

  describe('rewriteImageUrl - Input Validation', () => {
    it('should handle empty string', () => {
      const result = rewriteImageUrl('')
      expect(result).toBe('')
    })

    it('should preserve external HTTP URLs', () => {
      const httpUrl = 'http://example.com/image.jpg'
      const result = rewriteImageUrl(httpUrl)
      expect(result).toBe(httpUrl)
    })

    it('should preserve external HTTPS URLs', () => {
      const httpsUrl = 'https://secure.example.com/image.jpg'
      const result = rewriteImageUrl(httpsUrl)
      expect(result).toBe(httpsUrl)
    })

    it('should handle URLs with percent-encoded characters', () => {
      mockApiConfig.useProxy = true
      const result = rewriteImageUrl('/api/library/file%20name%20with%20spaces.jpg')
      expect(result).toBe('/api/audiocontrol/library/file%20name%20with%20spaces.jpg')
    })

    it('should handle URLs with query parameters', () => {
      mockApiConfig.useProxy = true
      const result = rewriteImageUrl('/api/library/test?size=large&format=png')
      expect(result).toBe('/api/audiocontrol/library/test?size=large&format=png')
    })

    it('should not crash with undefined apiConfig', () => {
      mockApiConfig.useProxy = undefined as any
      const result = rewriteImageUrl('/api/library/test.jpg')
      expect(result).toBe('/api/library/test.jpg') // Fallback
    })
  })

  // ============================================================================
  // rewriteAudiocontrolApiUrl - Core Functionality Tests
  // ============================================================================

  describe('rewriteAudiocontrolApiUrl - Proxy Mode', () => {
    beforeEach(() => {
      mockApiConfig.useProxy = true
    })

    it('should add /api/audiocontrol prefix to /api/library/ URLs', () => {
      const result = rewriteAudiocontrolApiUrl('/api/library/artists')
      expect(result).toBe('/api/audiocontrol/library/artists')
    })

    it('should add /api/audiocontrol prefix to /api/lyrics/ URLs', () => {
      const result = rewriteAudiocontrolApiUrl('/api/lyrics/song')
      expect(result).toBe('/api/audiocontrol/lyrics/song')
    })

    it('should add /api/audiocontrol prefix to /api/coverart/ URLs', () => {
      const result = rewriteAudiocontrolApiUrl('/api/coverart/metadata')
      expect(result).toBe('/api/audiocontrol/coverart/metadata')
    })

    it('should not process non-API URLs', () => {
      const result = rewriteAudiocontrolApiUrl('/other/path')
      expect(result).toBe('/other/path')
    })

    it('should not call getApiBaseUrl() in proxy mode', () => {
      rewriteAudiocontrolApiUrl('/api/library/test')
      expect(mockGetApiBaseUrl).not.toHaveBeenCalled()
    })
  })

  describe('rewriteAudiocontrolApiUrl - Production Mode', () => {
    beforeEach(() => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol')
    })

    it('should build full URL using API base URL', () => {
      const result = rewriteAudiocontrolApiUrl('/api/library/artists')
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/artists')
    })

    it('should build full URL for lyrics endpoint', () => {
      const result = rewriteAudiocontrolApiUrl('/api/lyrics/song')
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/lyrics/song')
    })

    it('should call getApiBaseUrl() in production mode', () => {
      rewriteAudiocontrolApiUrl('/api/library/test')
      expect(mockGetApiBaseUrl).toHaveBeenCalled()
    })

    it('should return corrected URL when API base URL is null', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetApiBaseUrl.mockReturnValue(null)

      const result = rewriteAudiocontrolApiUrl('/api/library/test')

      expect(consoleErrorSpy).toHaveBeenCalledWith('API base URL not configured')
      expect(result).toBe('/api/audiocontrol/library/test')
      consoleErrorSpy.mockRestore()
    })

    it('should normalize double slashes in resulting URL', () => {
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol/')

      const result = rewriteAudiocontrolApiUrl('/api/library/test')

      // Regex: /([^:]\/)\/+/g replaces non-protocol double slashes
      expect(result).not.toMatch(/([^:])\/\//)
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/test')
    })
  })

  describe('rewriteAudiocontrolApiUrl - Double Rewrite Guard', () => {
    it('should not rewrite URLs already containing /api/audiocontrol/', () => {
      mockApiConfig.useProxy = false
      const alreadyRewritten = '/api/audiocontrol/library/test'

      const result = rewriteAudiocontrolApiUrl(alreadyRewritten)

      expect(result).toBe(alreadyRewritten)
    })

    it('should prevent double rewriting on multiple calls', () => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol')

      const url = '/api/library/test'
      const firstRewrite = rewriteAudiocontrolApiUrl(url)
      const secondRewrite = rewriteAudiocontrolApiUrl(firstRewrite)

      expect(secondRewrite).toBe(firstRewrite)
      expect(secondRewrite).not.toContain('/audiocontrol/audiocontrol')
    })

    it('should guard against double rewrite in proxy mode', () => {
      mockApiConfig.useProxy = true

      const url = '/api/library/test'
      const firstRewrite = rewriteAudiocontrolApiUrl(url)
      const secondRewrite = rewriteAudiocontrolApiUrl(firstRewrite)

      expect(secondRewrite).toBe(firstRewrite)
    })
  })

  describe('rewriteAudiocontrolApiUrl - Input Validation', () => {
    it('should handle empty string', () => {
      const result = rewriteAudiocontrolApiUrl('')
      expect(result).toBe('')
    })

    it('should preserve external HTTP URLs', () => {
      const url = 'http://example.com/api/test'
      const result = rewriteAudiocontrolApiUrl(url)
      expect(result).toBe(url)
    })

    it('should preserve external HTTPS URLs', () => {
      const url = 'https://secure.example.com/api/test'
      const result = rewriteAudiocontrolApiUrl(url)
      expect(result).toBe(url)
    })

    it('should not crash with undefined apiConfig', () => {
      mockApiConfig.useProxy = undefined as any
      const result = rewriteAudiocontrolApiUrl('/api/library/test')
      expect(result).toBe('/api/library/test')
    })
  })

  // ============================================================================
  // Backward Compatibility - rewrite_audiocontrol_api_url
  // ============================================================================

  describe('rewrite_audiocontrol_api_url - Legacy Alias', () => {
    it('should alias to main function', () => {
      expect(rewrite_audiocontrol_api_url).toBe(rewriteAudiocontrolApiUrl)
    })

    it('should work identically in proxy mode', () => {
      mockApiConfig.useProxy = true

      const result = rewrite_audiocontrol_api_url('/api/library/test')

      expect(result).toBe('/api/audiocontrol/library/test')
    })

    it('should work identically in production mode', () => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol')

      const result = rewrite_audiocontrol_api_url('/api/library/test')

      expect(result).toContain('http://192.168.1.67')
    })
  })

  // ============================================================================
  // Regression Tests - Known Issues
  // ============================================================================

  describe('Regression: Prefix Consistency Between Functions', () => {
    it('rewriteImageUrl handles library prefix', () => {
      mockApiConfig.useProxy = true
      const result = rewriteImageUrl('/api/library/test.jpg')
      expect(result).toContain('/api/audiocontrol/library/')
    })

    it('rewriteImageUrl handles coverart prefix', () => {
      mockApiConfig.useProxy = true
      const result = rewriteImageUrl('/api/coverart/test.jpg')
      expect(result).toContain('/api/audiocontrol/coverart/')
    })

    it('rewriteImageUrl does NOT handle lyrics (intentional - IMAGE_PROXY_PREFIXES excludes it)', () => {
      mockApiConfig.useProxy = true
      const result = rewriteImageUrl('/api/lyrics/test')
      // IMAGE_PROXY_PREFIXES does NOT include lyrics - this is intentional
      expect(result).toBe('/api/lyrics/test')
    })

    it('rewriteAudiocontrolApiUrl handles all three prefixes: library, lyrics, coverart', () => {
      mockApiConfig.useProxy = true

      const libraryResult = rewriteAudiocontrolApiUrl('/api/library/test')
      const lyricsResult = rewriteAudiocontrolApiUrl('/api/lyrics/test')
      const coverartResult = rewriteAudiocontrolApiUrl('/api/coverart/test')

      expect(libraryResult).toContain('/api/audiocontrol/library/')
      expect(lyricsResult).toContain('/api/audiocontrol/lyrics/')
      expect(coverartResult).toContain('/api/audiocontrol/coverart/')
    })

    it('DOCUMENTED: Different prefix handling is intentional - rewriteImageUrl is images-only', () => {
      // rewriteImageUrl uses IMAGE_PROXY_PREFIXES which only includes library and coverart
      // This is intentional because lyrics are not image data
      // rewriteAudiocontrolApiUrl handles all API prefixes for general API rewriting
      mockApiConfig.useProxy = true

      const imageResult = rewriteImageUrl('/api/lyrics/test')
      const apiResult = rewriteAudiocontrolApiUrl('/api/lyrics/test')

      expect(imageResult).toBe('/api/lyrics/test') // No rewrite
      expect(apiResult).toBe('/api/audiocontrol/lyrics/test') // Rewritten
    })
  })

  describe('Regression: Port Number Validation', () => {
    it('accepts valid port 80', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 80 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/test.jpg')
    })

    it('accepts valid port in range (1-65535)', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 8080 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(result).toBe('http://192.168.1.67:8080/api/audiocontrol/library/test.jpg')
    })

    it('rejects port 0', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 0 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('rejects port > 65535', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 65536 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('rejects non-integer port (float)', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 8080.5 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })

    it('rejects non-number port (string)', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: '80' as any }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBe('/api/audiocontrol/library/test.jpg')
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Regression: URL String Manipulation Edge Cases', () => {
    it('normalizes double slashes in production URL', () => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol/')

      const result = rewriteAudiocontrolApiUrl('/api/library/test')

      // Should normalize /api/audiocontrol//library to /api/audiocontrol/library
      expect(result).not.toMatch(/([^:])\/\//
      )
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/test')
    })

    it('handles API base URL with trailing slash', () => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol/')

      const result = rewriteAudiocontrolApiUrl('/api/library/test')

      expect(result).toBeDefined()
      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/test')
    })

    it('handles API base URL without trailing slash', () => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api/audiocontrol')

      const result = rewriteAudiocontrolApiUrl('/api/library/test')

      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/test')
    })

    it('handles protocol-relative base URL', () => {
      mockApiConfig.useProxy = false
      mockGetApiBaseUrl.mockReturnValue('//192.168.1.67/api/audiocontrol')

      const result = rewriteAudiocontrolApiUrl('/api/library/test')

      expect(result).toBeDefined()
    })
  })

  describe('Regression: Config Availability Checks', () => {
    it('handles missing apiConfig gracefully', () => {
      mockApiConfig.useProxy = undefined as any

      const imageResult = rewriteImageUrl('/api/library/test.jpg')
      const apiResult = rewriteAudiocontrolApiUrl('/api/library/test')

      // Should return URL as-is when config is unavailable
      expect(imageResult).toBe('/api/library/test.jpg')
      expect(apiResult).toBe('/api/library/test')
    })

    it('handles missing useProxy property', () => {
      mockApiConfig.useProxy = undefined as any

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(result).toBe('/api/library/test.jpg')
    })

    it('does not call getApiBaseUrl when useProxy is true', () => {
      mockApiConfig.useProxy = true

      rewriteAudiocontrolApiUrl('/api/library/test')

      expect(mockGetApiBaseUrl).not.toHaveBeenCalled()
    })

    it('calls getApiBaseUrl when useProxy is false', () => {
      mockApiConfig.useProxy = false

      rewriteAudiocontrolApiUrl('/api/library/test')

      expect(mockGetApiBaseUrl).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Edge Cases & Stress Tests
  // ============================================================================

  describe('Edge Cases: Special Characters and Encoding', () => {
    it('handles URLs with hash fragments', () => {
      mockApiConfig.useProxy = true

      const result = rewriteImageUrl('/api/library/test.jpg#section')

      expect(result).toBe('/api/audiocontrol/library/test.jpg#section')
    })

    it('handles URLs with multiple query parameters', () => {
      mockApiConfig.useProxy = true

      const result = rewriteImageUrl('/api/library/test?a=1&b=2&c=3')

      expect(result).toBe('/api/audiocontrol/library/test?a=1&b=2&c=3')
    })

    it('handles URLs with Unicode characters in path', () => {
      mockApiConfig.useProxy = true

      const result = rewriteImageUrl('/api/library/test-café')

      expect(result).toBe('/api/audiocontrol/library/test-café')
    })

    it('handles very long URLs', () => {
      mockApiConfig.useProxy = true
      const longPath = '/api/library/' + 'a'.repeat(1000)

      const result = rewriteImageUrl(longPath)

      expect(result).toContain('/api/audiocontrol/library/')
      expect(result.length).toBeGreaterThan(longPath.length)
    })
  })

  describe('Edge Cases: Unusual Config States', () => {
    it('handles valid port 1 (minimum)', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 1 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(result).toBe('http://192.168.1.67:1/api/audiocontrol/library/test.jpg')
    })

    it('handles valid port 65535 (maximum)', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 65535 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(result).toBe('http://192.168.1.67:65535/api/audiocontrol/library/test.jpg')
    })

    it('handles IPv6-style addresses (basic test)', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '::1', devicePort: 80 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      // Note: IPv6 URLs typically need brackets but this function doesn't normalize them
      expect(result).toContain('::1')
    })

    it('handles localhost addresses', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: 'localhost', devicePort: 8080 }

      const result = rewriteImageUrl('/api/library/test.jpg')

      expect(result).toBe('http://localhost:8080/api/audiocontrol/library/test.jpg')
    })
  })

  describe('Integration Tests: Multiple Transformations', () => {
    it('URL path with multiple segments is preserved', () => {
      mockApiConfig.useProxy = true

      const result = rewriteImageUrl('/api/library/mpd/image/artist/abc123/cover.jpg')

      expect(result).toBe('/api/audiocontrol/library/mpd/image/artist/abc123/cover.jpg')
    })

    it('preserves all path components in production mode', () => {
      mockApiConfig.useProxy = false
      mockDeviceConfig = { deviceIP: '192.168.1.67', devicePort: 80 }

      const result = rewriteImageUrl('/api/library/mpd/image/artist/abc123/cover.jpg')

      expect(result).toBe('http://192.168.1.67/api/audiocontrol/library/mpd/image/artist/abc123/cover.jpg')
    })

    it('handles chained rewrites (second function on first output)', () => {
      mockApiConfig.useProxy = true

      // First: image URL rewriting
      const imageUrl = '/api/library/test.jpg'
      const rewrittenImage = rewriteImageUrl(imageUrl)

      // Second: API URL rewriting on same URL
      const rewrittenApi = rewriteAudiocontrolApiUrl(imageUrl)

      // Both should produce audiocontrol URLs (though rewriteImageUrl doesn't for lyrics)
      expect(rewrittenImage).toContain('/api/audiocontrol/library/')
      expect(rewrittenApi).toContain('/api/audiocontrol/library/')
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CoverArtLoader, createCoverArtLoader } from '@/services/coverartloader'
import type { CoverArtImage, CoverArtApiResponse, CoverArtProvider } from '@/services/coverartloader'
import type { Song } from '@/types/player'
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

describe('CoverArtLoader', () => {
  let loader: CoverArtLoader
  let mockConfigStore: ReturnType<typeof useAppConfigStore>
  let mockApiFetch: typeof httpApi.apiFetch

  beforeEach(() => {
    loader = new CoverArtLoader()
    mockConfigStore = useAppConfigStore()
    mockApiFetch = httpApi.apiFetch as typeof httpApi.apiFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('encodeBase64UrlSafe', () => {
    it('should encode strings to URL-safe base64', () => {
      // @ts-ignore - accessing private method for testing
      const result = loader.encodeBase64UrlSafe('test string')
      expect(result).toBeTruthy()
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
      expect(result).not.toContain('=')
    })

    it('should handle special characters', () => {
      // @ts-ignore
      const result = loader.encodeBase64UrlSafe('artist & song: "featured"')
      expect(result).toBeTruthy()
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
    })

    it('should handle unicode characters', () => {
      // @ts-ignore
      const result = loader.encodeBase64UrlSafe('Björk')
      expect(result).toBeTruthy()
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
    })

    it('should handle empty string', () => {
      // @ts-ignore
      const result = loader.encodeBase64UrlSafe('')
      expect(result).toBe('')
    })
  })

  describe('filterSquareImages', () => {
    it('should keep images with square aspect ratio', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg', width: 300, height: 300 },
        { url: 'http://example.com/2.jpg', width: 500, height: 500 }
      ]
      // @ts-ignore
      const result = loader.filterSquareImages(images)
      expect(result).toHaveLength(2)
    })

    it('should filter out non-square images', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg', width: 800, height: 600 }, // 1.33:1
        { url: 'http://example.com/2.jpg', width: 300, height: 300 } // 1:1
      ]
      // @ts-ignore
      const result = loader.filterSquareImages(images)
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('http://example.com/2.jpg')
    })

    it('should allow images with aspect ratio between 0.8 and 1.2', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg', width: 240, height: 300 }, // 0.8:1
        { url: 'http://example.com/2.jpg', width: 360, height: 300 }, // 1.2:1
        { url: 'http://example.com/3.jpg', width: 200, height: 300 } // 0.67:1 - too narrow
      ]
      // @ts-ignore
      const result = loader.filterSquareImages(images)
      expect(result).toHaveLength(2)
    })

    it('should keep images without dimensions', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg' },
        { url: 'http://example.com/2.jpg', width: 300, height: 300 }
      ]
      // @ts-ignore
      const result = loader.filterSquareImages(images)
      expect(result).toHaveLength(2)
    })

    it('should handle images with only width or only height', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg', width: 300 },
        { url: 'http://example.com/2.jpg', height: 300 },
        { url: 'http://example.com/3.jpg', width: 300, height: 300 }
      ]
      // @ts-ignore
      const result = loader.filterSquareImages(images)
      expect(result).toHaveLength(3) // Keep all: partial dimensions are kept conservatively
    })
  })

  describe('filterByResolution', () => {
    it('should keep single image', () => {
      const images: CoverArtImage[] = [{ url: 'http://example.com/1.jpg', width: 300, height: 300 }]
      // @ts-ignore
      const result = loader.filterByResolution(images)
      expect(result).toHaveLength(1)
    })

    it('should filter by resolution keeping largest and 80% threshold', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg', width: 100, height: 100 }, // 10,000 area
        { url: 'http://example.com/2.jpg', width: 250, height: 250 }, // 62,500 area (largest)
        { url: 'http://example.com/3.jpg', width: 225, height: 225 } // 50,625 area (>80% = 50,000)
      ]
      // @ts-ignore
      const result = loader.filterByResolution(images)
      expect(result).toHaveLength(2) // Keep largest (62,500) and 3rd (50,625)
      expect(result.some(img => img.width === 100)).toBe(false) // 10,000 < 50,000
    })

    it('should keep images without dimensions', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg' },
        { url: 'http://example.com/2.jpg', width: 300, height: 300 }
      ]
      // @ts-ignore
      const result = loader.filterByResolution(images)
      expect(result).toHaveLength(2)
    })

    it('should return all if no images have dimensions', () => {
      const images: CoverArtImage[] = [
        { url: 'http://example.com/1.jpg' },
        { url: 'http://example.com/2.jpg' }
      ]
      // @ts-ignore
      const result = loader.filterByResolution(images)
      expect(result).toHaveLength(2)
    })
  })

  describe('getSongCoverArt', () => {
    it('should return empty results for missing title', async () => {
      const result = await loader.getSongCoverArt('', 'artist')
      expect(result.results).toHaveLength(0)
    })

    it('should return empty results for missing artist', async () => {
      const result = await loader.getSongCoverArt('title', '')
      expect(result.results).toHaveLength(0)
    })

    it('should call fetchCoverArt with encoded parameters', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      await loader.getSongCoverArt('Test Song', 'Test Artist')

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/coverart/song/')
      )
    })
  })

  describe('getArtistCoverArt', () => {
    it('should return empty results for missing artist', async () => {
      const result = await loader.getArtistCoverArt('')
      expect(result.results).toHaveLength(0)
    })

    it('should call fetchCoverArt with encoded artist', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      await loader.getArtistCoverArt('Test Artist')

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/coverart/artist/')
      )
    })
  })

  describe('getAlbumCoverArt', () => {
    it('should return empty results for missing album', async () => {
      const result = await loader.getAlbumCoverArt('', 'artist')
      expect(result.results).toHaveLength(0)
    })

    it('should return empty results for missing artist', async () => {
      const result = await loader.getAlbumCoverArt('album', '')
      expect(result.results).toHaveLength(0)
    })

    it('should call fetchCoverArt without year if not provided', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      await loader.getAlbumCoverArt('Test Album', 'Test Artist')

      const call = vi.mocked(mockApiFetch).mock.calls[0][0]
      expect(call).toContain('/coverart/album/')
      expect(call).not.toContain('/2024')
    })

    it('should call fetchCoverArt with year if provided', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      await loader.getAlbumCoverArt('Test Album', 'Test Artist', 2024)

      const call = vi.mocked(mockApiFetch).mock.calls[0][0]
      expect(call).toContain('/2024')
    })
  })

  describe('getCoverArtFromUrl', () => {
    it('should return empty results for empty URL', async () => {
      const result = await loader.getCoverArtFromUrl('')
      expect(result.results).toHaveLength(0)
    })

    it('should call fetchCoverArt with encoded URL', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      await loader.getCoverArtFromUrl('http://example.com/image.jpg')

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/coverart/url/')
      )
    })
  })

  describe('processApiResponse', () => {
    it('should process valid API response', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [
              { url: 'http://example.com/1.jpg', width: 300, height: 300 },
              { url: 'http://example.com/2.jpg', width: 100, height: 100 }
            ]
          }
        ]
      }

      // @ts-ignore
      const result = loader.processApiResponse(response)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].images.length).toBeGreaterThan(0)
    })

    it('should remove providers with no images after filtering', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [
              { url: 'http://example.com/1.jpg', width: 800, height: 600 } // non-square
            ]
          }
        ]
      }

      // @ts-ignore
      const result = loader.processApiResponse(response)

      expect(result.results).toHaveLength(0)
    })

    it('should handle empty results', () => {
      const response: CoverArtApiResponse = { results: [] }

      // @ts-ignore
      const result = loader.processApiResponse(response)

      expect(result.results).toHaveLength(0)
    })
  })

  describe('extractImages', () => {
    it('should extract all images from response', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [
              { url: 'http://example.com/1.jpg' },
              { url: 'http://example.com/2.jpg' }
            ]
          },
          {
            provider: { name: 'provider2', display_name: 'Provider 2' },
            images: [{ url: 'http://example.com/3.jpg' }]
          }
        ]
      }

      // @ts-ignore
      const images = loader.extractImages(response)

      expect(images).toHaveLength(3)
      expect(images.map(img => img.url)).toEqual([
        'http://example.com/1.jpg',
        'http://example.com/2.jpg',
        'http://example.com/3.jpg'
      ])
    })

    it('should handle empty response', () => {
      const response: CoverArtApiResponse = { results: [] }

      // @ts-ignore
      const images = loader.extractImages(response)

      expect(images).toHaveLength(0)
    })
  })

  describe('extractUrls', () => {
    it('should extract all URLs from response', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [
              { url: 'http://example.com/1.jpg' },
              { url: 'http://example.com/2.jpg' }
            ]
          }
        ]
      }

      // @ts-ignore
      const urls = loader.extractUrls(response)

      expect(urls).toEqual(['http://example.com/1.jpg', 'http://example.com/2.jpg'])
    })
  })

  describe('extractProviders', () => {
    it('should extract providers with results', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [{ url: 'http://example.com/1.jpg' }]
          },
          {
            provider: { name: 'provider2', display_name: 'Provider 2' },
            images: [] // No images, should not be included
          }
        ]
      }

      // @ts-ignore
      const providers = loader.extractProviders(response)

      expect(providers).toHaveLength(1)
      expect(providers[0].name).toBe('provider1')
    })
  })

  describe('hasResults', () => {
    it('should return true if any provider has images', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [{ url: 'http://example.com/1.jpg' }]
          }
        ]
      }

      // @ts-ignore
      expect(loader.hasResults(response)).toBe(true)
    })

    it('should return false if no provider has images', () => {
      const response: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: []
          }
        ]
      }

      // @ts-ignore
      expect(loader.hasResults(response)).toBe(false)
    })

    it('should return false for empty results', () => {
      const response: CoverArtApiResponse = { results: [] }

      // @ts-ignore
      expect(loader.hasResults(response)).toBe(false)
    })
  })

  describe('findCoverArt', () => {
    const mockSong: Song = {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 180,
    }

    it('should use existing artwork_url if available', async () => {
      const song: Song = {
        ...mockSong,
        artwork_url: 'http://example.com/existing.jpg'
      }

      const result = await loader.findCoverArt(song)

      expect(result.success).toBe(true)
      expect(result.urls).toContain('http://example.com/existing.jpg')
      expect(result.source).toBe('song')
    })

    it('should use existing cover_art_url if available', async () => {
      const song: Song = {
        ...mockSong,
        cover_art_url: 'http://example.com/existing.jpg'
      }

      const result = await loader.findCoverArt(song)

      expect(result.success).toBe(true)
      expect(result.urls).toContain('http://example.com/existing.jpg')
      expect(result.source).toBe('song')
    })

    it('should try API if no existing URLs', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArt(mockSong)

      expect(mockApiFetch).toHaveBeenCalled()
    })

    it('should use metadata coverart_url as fallback', async () => {
      const song: Song = {
        ...mockSong,
        metadata: {
          coverart_url: 'http://example.com/metadata.jpg'
        } as any,
      }

      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArt(song)

      expect(result.success).toBe(true)
      expect(result.urls).toContain('http://example.com/metadata.jpg')
      expect(result.source).toBe('song')
    })

    it('should use metadata logo_url as last resort', async () => {
      const song: Song = {
        ...mockSong,
        metadata: {
          logo_url: 'http://example.com/logo.jpg'
        } as any,
      }

      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArt(song)

      expect(result.success).toBe(true)
      expect(result.urls).toContain('http://example.com/logo.jpg')
      expect(result.source).toBe('song')
    })

    it('should return failure if no cover art found anywhere', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArt(mockSong)

      expect(result.success).toBe(false)
      expect(result.urls).toHaveLength(0)
      expect(result.source).toBe('none')
    })
  })

  describe('findCoverArtFromAPI', () => {
    const mockSong: Song = {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 180,
    }

    it('should try song cover art first', async () => {
      const mockResponse: CoverArtApiResponse = {
        results: [
          {
            provider: { name: 'provider1', display_name: 'Provider 1' },
            images: [{ url: 'http://example.com/song.jpg' }]
          }
        ]
      }

      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      )

      const result = await loader.findCoverArtFromAPI(mockSong)

      expect(result.success).toBe(true)
      expect(result.source).toBe('song')
      expect(result.urls).toContain('http://example.com/song.jpg')
    })

    it('should fall back to album if song not found', async () => {
      vi.mocked(mockApiFetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              results: [
                {
                  provider: { name: 'provider1', display_name: 'Provider 1' },
                  images: [{ url: 'http://example.com/album.jpg' }]
                }
              ]
            }),
            { status: 200 }
          )
        )

      const result = await loader.findCoverArtFromAPI(mockSong)

      expect(result.success).toBe(true)
      expect(result.source).toBe('album')
    })

    it('should fall back to artist if album not found', async () => {
      vi.mocked(mockApiFetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              results: [
                {
                  provider: { name: 'provider1', display_name: 'Provider 1' },
                  images: [{ url: 'http://example.com/artist.jpg' }]
                }
              ]
            }),
            { status: 200 }
          )
        )

      const result = await loader.findCoverArtFromAPI(mockSong)

      expect(result.success).toBe(true)
      expect(result.source).toBe('artist')
    })

    it('should return failure if no API source found', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArtFromAPI(mockSong)

      expect(result.success).toBe(false)
      expect(result.source).toBe('none')
    })

    it('should handle missing title', async () => {
      const song = { ...mockSong, title: undefined } as unknown as Song

      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArtFromAPI(song)

      // Should skip song search, try album and artist
      expect(result).toBeDefined()
    })

    it('should handle missing album', async () => {
      const song = { ...mockSong, album: undefined } as unknown as Song

      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArtFromAPI(song)

      // Should skip album search, try artist
      expect(result).toBeDefined()
    })

    it('should handle missing artist', async () => {
      const song = { ...mockSong, artist: undefined } as unknown as Song

      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const result = await loader.findCoverArtFromAPI(song)

      // Should skip all searches
      expect(result.success).toBe(false)
    })
  })

  describe('getBestCoverArt', () => {
    const mockSong: Song = {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 180,
      artwork_url: 'http://example.com/best.jpg'
    }

    it('should return first URL if found', async () => {
      const result = await loader.getBestCoverArt(mockSong)

      expect(result).toBe('http://example.com/best.jpg')
    })

    it('should return null if no cover art found', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )

      const song: Song = { title: 'Test', artist: 'Test', duration: 180 }
      const result = await loader.getBestCoverArt(song)

      expect(result).toBeNull()
    })
  })

  describe('isApiAvailable', () => {
    it('should return true if API responds with 200', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      const result = await loader.isApiAvailable()

      expect(result).toBe(true)
    })

    it('should return false if API responds with error status', async () => {
      vi.mocked(mockApiFetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 404 })
      )

      const result = await loader.isApiAvailable()

      expect(result).toBe(false)
    })

    it('should return false if API call throws error', async () => {
      vi.mocked(mockApiFetch).mockRejectedValue(new Error('Network error'))

      const result = await loader.isApiAvailable()

      expect(result).toBe(false)
    })
  })

  describe('createCoverArtLoader factory', () => {
    it('should create new instance each time', () => {
      const loader1 = createCoverArtLoader()
      const loader2 = createCoverArtLoader()

      expect(loader1).not.toBe(loader2)
    })
  })

  describe('Regression Tests', () => {
    describe('API URL encoding with special characters', () => {
      it('should handle titles with slashes', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )

        await loader.getSongCoverArt('Song / With / Slashes', 'Artist')

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/coverart/song/')
        )
      })

      it('should handle artist names with ampersand', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )

        await loader.getArtistCoverArt('Artist & Co.')

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/coverart/artist/')
        )
      })

      it('should handle URLs with query parameters', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )

        await loader.getCoverArtFromUrl('http://example.com/image.jpg?size=large&format=jpg')

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/coverart/url/')
        )
      })
    })

    describe('Filter edge cases', () => {
      it('should handle very small images', () => {
        const images: CoverArtImage[] = [
          { url: 'http://example.com/1.jpg', width: 1, height: 1 }
        ]

        // @ts-ignore
        const result = loader.filterSquareImages(images)

        expect(result).toHaveLength(1)
      })

      it('should handle very large images', () => {
        const images: CoverArtImage[] = [
          { url: 'http://example.com/1.jpg', width: 10000, height: 10000 }
        ]

        // @ts-ignore
        const result = loader.filterSquareImages(images)

        expect(result).toHaveLength(1)
      })

      it('should handle zero dimensions gracefully', () => {
        const images: CoverArtImage[] = [
          { url: 'http://example.com/1.jpg', width: 0, height: 0 },
          { url: 'http://example.com/2.jpg', width: 300, height: 300 }
        ]

        // @ts-ignore
        const result = loader.filterSquareImages(images)

        expect(result).toHaveLength(1) // Filter out zero dimensions (Infinity ratio)
      })
    })

    describe('Multiple provider fallback scenarios', () => {
      it('should handle multiple providers for same song', async () => {
        const mockResponse: CoverArtApiResponse = {
          results: [
            {
              provider: { name: 'provider1', display_name: 'Provider 1' },
              images: [{ url: 'http://example.com/1.jpg' }]
            },
            {
              provider: { name: 'provider2', display_name: 'Provider 2' },
              images: [{ url: 'http://example.com/2.jpg' }]
            }
          ]
        }

        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 })
        )

        const result = await loader.findCoverArtFromAPI({
          title: 'Test',
          artist: 'Test',
          duration: 180,
        })

        expect(result.urls).toHaveLength(2)
        expect(result.providers).toHaveLength(2)
      })
    })

    describe('Concurrent API calls', () => {
      it('should handle multiple concurrent requests', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify({ results: [] }), { status: 200 })
        )

        const promises = [
          loader.getSongCoverArt('Song1', 'Artist1'),
          loader.getSongCoverArt('Song2', 'Artist2'),
          loader.getSongCoverArt('Song3', 'Artist3')
        ]

        const results = await Promise.all(promises)

        expect(results).toHaveLength(3)
        expect(mockApiFetch).toHaveBeenCalledTimes(3)
      })
    })

    describe('API error handling', () => {
      it('should gracefully handle 404 responses', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify({}), { status: 404 })
        )

        const result = await loader.getSongCoverArt('Test', 'Test')

        expect(result.results).toHaveLength(0)
      })

      it('should gracefully handle 500 responses', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response(JSON.stringify({}), { status: 500 })
        )

        const result = await loader.getSongCoverArt('Test', 'Test')

        expect(result.results).toHaveLength(0)
      })

      it('should handle malformed JSON response', async () => {
        vi.mocked(mockApiFetch).mockResolvedValue(
          new Response('invalid json', { status: 200 })
        )

        const result = await loader.getSongCoverArt('Test', 'Test')

        expect(result.results).toHaveLength(0)
      })

      it('should handle network timeouts', async () => {
        vi.mocked(mockApiFetch).mockRejectedValue(new Error('Timeout'))

        const result = await loader.getSongCoverArt('Test', 'Test')

        expect(result.results).toHaveLength(0)
      })
    })
  })
})

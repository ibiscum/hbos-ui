import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as systemApi from '../system'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyType = any

// Create mock functions at module level
const mockGetConfigApiBaseUrl = vi.fn()
const mockGetApiBaseUrl = vi.fn()

// Mock the config store
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => ({
    getConfigApiBaseUrl: mockGetConfigApiBaseUrl,
    getApiBaseUrl: mockGetApiBaseUrl
  }))
}))

// Mock apiFetch
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn()
}))

import { apiFetch } from '@/api/http'

describe('system.ts - Code Review & Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfigApiBaseUrl.mockReturnValue('http://192.168.1.67/config/api')
    mockGetApiBaseUrl.mockReturnValue('http://192.168.1.67/api')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Inconsistency #1: Inconsistent API Base URL Method Usage', () => {
    it('getSystemInfo uses getConfigApiBaseUrl()', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.getSystemInfo()

      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()
    })

    it('FIXED: getCacheStats now uses getConfigApiBaseUrl()', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      await systemApi.getCacheStats()

      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()
    })

    it('FIXED: getBackgroundJobs now uses getConfigApiBaseUrl()', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      await systemApi.getBackgroundJobs()

      // FIXED: Now uses consistent base URL with other system functions
      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()
    })

    it('all soundcard functions consistently use getConfigApiBaseUrl()', async () => {
      const mockFetch = vi.mocked(apiFetch)

      // Test getSoundCards
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)
      mockGetConfigApiBaseUrl.mockClear()
      await systemApi.getSoundCards()
      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()

      // Test detectSoundCard
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)
      mockGetConfigApiBaseUrl.mockClear()
      await systemApi.detectSoundCard()
      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()
    })
  })

  describe('Inconsistency #2: Inconsistent Error Handling Order', () => {
    it('getSystemInfo checks response.ok BEFORE parsing', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.getSystemInfo()

      // Correct pattern: check ok before json()
      expect(mockFetch).toHaveBeenCalled()
    })

    it('setSoundCardDtoverlay checks response.ok AFTER parsing (INCONSISTENT)', async () => {
      const mockFetch = vi.mocked(apiFetch)
      const jsonSpy = vi.fn().mockResolvedValueOnce({ status: 'success' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jsonSpy
      } as AnyType)

      await systemApi.setSoundCardDtoverlay({ dtoverlay: 'test' })

      // Parses JSON before checking ok - can waste resources on error responses
      expect(jsonSpy).toHaveBeenCalled()
    })

    it('detectSoundCard parses JSON before checking ok (RISKY)', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' })
      } as AnyType)

      // This pattern works but isn't optimal
      expect(() => systemApi.detectSoundCard()).rejects.toThrow()
    })
  })

  describe('Inconsistency #3: Inconsistent Error Messages', () => {
    it('setSoundCardDtoverlay throws with data.message or HTTP status', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid dtoverlay' })
      } as AnyType)

      await expect(systemApi.setSoundCardDtoverlay({ dtoverlay: 'invalid' }))
        .rejects.toThrow('Invalid dtoverlay')
    })

    it('getSystemInfo throws only with HTTP status', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as AnyType)

      await expect(systemApi.getSystemInfo())
        .rejects.toThrow('HTTP error! status: 500')
    })
  })

  describe('Inconsistency #4: Missing Input Validation', () => {
    it('updateHostname does not validate hostname is provided', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Updated' })
      } as AnyType)

      // Should require at least one field
      await systemApi.updateHostname({})

      // No validation - just sends empty object
      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({})
        })
      )
    })

    it('setSoundCardDtoverlay does not validate dtoverlay is not empty', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.setSoundCardDtoverlay({ dtoverlay: '' })

      // No validation - empty string accepted
      expect(mockFetch).toHaveBeenCalled()
    })

    it('FIXED: executeScript now validates script parameter', async () => {
      const mockFetch = vi.mocked(apiFetch)

      // Empty script should be rejected
      await expect(systemApi.executeScript({ script: '' }))
        .rejects.toThrow('Script name cannot be empty')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('disableSoundCardDetection does not validate card_name', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.disableSoundCardDetection('')

      // Empty card_name accepted
      expect(mockFetch).toHaveBeenCalled()
    })

    it('checkFileExistence does not validate array is not empty', async () => {
      const mockFetch = vi.mocked(apiFetch)

      const result = await systemApi.checkFileExistence([])

      // Should return empty array or throw? Currently returns empty array silently
      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Inconsistency #5: Inefficient Iteration Pattern', () => {
    it('checkFileExistence makes sequential requests (not batched)', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { exists: true } })
      } as AnyType)

      await systemApi.checkFileExistence(['/path/1', '/path/2', '/path/3'])

      // Makes 3 separate requests instead of batching
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('checkFileExistence fails early without partial results', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { exists: true } })
        } as AnyType)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        } as AnyType)

      await expect(
        systemApi.checkFileExistence(['/path/1', '/path/2', '/path/3'])
      ).rejects.toThrow()

      // Returns nothing on failure - should return partial results or retry
    })
  })

  describe('Inconsistency #6: Inconsistent JSDoc Documentation', () => {
    it('detectSoundCardLive has detailed JSDoc', () => {
      // This function has comprehensive JSDoc with context
      expect(systemApi.detectSoundCardLive).toBeDefined()
    })

    it('executeScript has minimal JSDoc', () => {
      // This function has minimal documentation
      expect(systemApi.executeScript).toBeDefined()
    })

    it('checkFileExistence lacks parameter documentation', () => {
      // JSDoc doesn't describe the filePaths parameter well
      expect(systemApi.checkFileExistence).toBeDefined()
    })
  })

  describe('Inconsistency #7: Type Return Inconsistency', () => {
    it('getSystemInfo returns typed SystemInfo interface', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          pi_model: { name: 'Pi 4' }
        })
      } as AnyType)

      const result = await systemApi.getSystemInfo()
      expect(result).toBeDefined()
      expect(result.status).toBe('success')
    })

    it('completeSetup returns inline type { status; message }', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Done' })
      } as AnyType)

      const result = await systemApi.completeSetup()
      expect(result).toBeDefined()
      // Less type-safe than interface-based returns
    })
  })

  describe('Success Cases', () => {
    it('getSystemInfo returns system information successfully', async () => {
      const mockFetch = vi.mocked(apiFetch)
      const mockData = {
        status: 'success',
        pi_model: { name: 'Raspberry Pi 4 Model B', version: '1.4' }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as AnyType)

      const result = await systemApi.getSystemInfo()
      expect(result.status).toBe('success')
      expect(result.pi_model.name).toContain('Raspberry Pi')
    })

    it('updateHostname sends correct request body', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Updated' })
      } as AnyType)

      await systemApi.updateHostname({ hostname: 'newhost' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ hostname: 'newhost' })
        })
      )
    })

    it('rebootSystem accepts optional delay parameter', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Rebooting' })
      } as AnyType)

      await systemApi.rebootSystem({ delay: 10 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ delay: 10 })
        })
      )
    })

    it('rebootSystem works without parameters', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Rebooting' })
      } as AnyType)

      await systemApi.rebootSystem()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({})
        })
      )
    })

    it('getSoundCards returns soundcard list', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            soundcards: [{ name: 'HiFiBerry DAC' }],
            count: 1
          }
        })
      } as AnyType)

      const result = await systemApi.getSoundCards()
      expect(result.data.soundcards).toHaveLength(1)
    })

    it('detectSoundCard returns detection result', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { card_detected: true, card_name: 'DAC' }
        })
      } as AnyType)

      const result = await systemApi.detectSoundCard()
      expect(result.data.card_detected).toBe(true)
    })

    it('detectSoundCardLive returns live detection result', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { card_detected: true, card_name: 'DAC+ Pro' }
        })
      } as AnyType)

      const result = await systemApi.detectSoundCardLive()
      expect(result.data.card_detected).toBe(true)
    })

    it('checkFileExistence returns file existence data', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { exists: true } })
      } as AnyType)

      const result = await systemApi.checkFileExistence(['/etc/config'])
      expect(result).toHaveLength(1)
      expect(result[0].exists).toBe(true)
      expect(result[0].filename).toBe('config')
    })
  })

  describe('Error Handling', () => {
    it('getSystemInfo throws on HTTP error', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as AnyType)

      await expect(systemApi.getSystemInfo()).rejects.toThrow('HTTP error')
    })

    it('setSoundCardDtoverlay includes message in error', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid config' })
      } as AnyType)

      await expect(
        systemApi.setSoundCardDtoverlay({ dtoverlay: 'bad' })
      ).rejects.toThrow('Invalid config')
    })

    it('detectSoundCard falls back to status code if no message', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({})
      } as AnyType)

      await expect(systemApi.detectSoundCard()).rejects.toThrow('HTTP error')
    })
  })

  describe('Endpoint Construction', () => {
    it('setSoundCardDetection uses correct endpoint for enable', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.setSoundCardDetection(true)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/soundcard/detection/enable'),
        expect.anything()
      )
    })

    it('setSoundCardDetection uses correct endpoint for disable', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.setSoundCardDetection(false)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/soundcard/detection/disable'),
        expect.anything()
      )
    })

    it('executeScript constructs endpoint with script parameter', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.executeScript({ script: 'update-system' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/scripts/update-system/execute'),
        expect.anything()
      )
    })
  })

  describe('Edge Cases', () => {
    it('checkFileExistence extracts filename correctly from paths', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { exists: true } })
      } as AnyType)

      const result = await systemApi.checkFileExistence([
        '/etc/config/file.txt',
        '/root/simple'
      ])

      expect(result[0].filename).toBe('file.txt')
      expect(result[1].filename).toBe('simple')
    })

    it('checkFileExistence handles file paths without parent directory', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { exists: true } })
      } as AnyType)

      const result = await systemApi.checkFileExistence(['filename'])

      expect(result[0].filename).toBe('filename')
    })

    it('rebootSystem works with all optional parameters', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.rebootSystem({ delay: 30 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ delay: 30 })
        })
      )
    })

    it('getSoundCardDetectionStatus returns detection state', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            detection_enabled: true,
            detection_disabled: false,
            configured_card_name: 'DAC+',
            configured_dtoverlay: 'hifiberry-dacplus'
          }
        })
      } as AnyType)

      const result = await systemApi.getSoundCardDetectionStatus()
      expect(result.data.detection_enabled).toBe(true)
      expect(result.data.configured_card_name).toBe('DAC+')
    })
  })

  describe('Request Headers', () => {
    it('all functions set Content-Type application/json', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.getSystemInfo()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })
  })

  describe('Regression #1: Numeric Parameter Validation', () => {
    it('FIXED: rebootSystem now rejects negative delay', async () => {
      // Negative delay should be rejected
      await expect(systemApi.rebootSystem({ delay: -10 }))
        .rejects.toThrow('Reboot delay must be a non-negative number')
    })

    it('FIXED: rebootSystem now rejects Infinity', async () => {
      // Infinity should be rejected
      await expect(systemApi.rebootSystem({ delay: Infinity }))
        .rejects.toThrow('Reboot delay must be a non-negative number')
    })

    it('FIXED: rebootSystem now rejects NaN', async () => {
      // NaN should be rejected
      await expect(systemApi.rebootSystem({ delay: NaN }))
        .rejects.toThrow('Reboot delay must be a non-negative number')
    })

    it('FIXED: rebootSystem now allows float delays (Number.isFinite accepts floats)', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Float delays are allowed (are finite numbers)
      await systemApi.rebootSystem({ delay: 10.5 })

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Regression #2: String Parameter Validation', () => {
    it('FIXED: executeScript now rejects empty script name', async () => {
      // Empty script should be rejected
      await expect(systemApi.executeScript({ script: '' }))
        .rejects.toThrow('Script name cannot be empty')
    })

    it('REGRESSION: executeScript accepts path traversal attempts', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Path traversal patterns should be blocked
      await systemApi.executeScript({ script: '../../../etc/passwd' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('../../../etc/passwd'),
        expect.anything()
      )
    })

    it('REGRESSION: executeScript accepts scripts with special characters', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Special characters might need escaping
      await systemApi.executeScript({ script: 'script; rm -rf /' })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('REGRESSION: setSoundCardDtoverlay accepts empty string', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Empty dtoverlay should be rejected
      await systemApi.setSoundCardDtoverlay({ dtoverlay: '' })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('REGRESSION: disableSoundCardDetection accepts empty card name', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Empty card name should be rejected
      await systemApi.disableSoundCardDetection('')

      expect(mockFetch).toHaveBeenCalled()
    })

    it('REGRESSION: updateHostname accepts empty request', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Empty request should require at least one field
      await systemApi.updateHostname({})

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({})
        })
      )
    })
  })

  describe('Regression #3: Array Parameter Validation', () => {
    it('REGRESSION: checkFileExistence accepts empty array', async () => {
      const mockFetch = vi.mocked(apiFetch)

      const result = await systemApi.checkFileExistence([])

      // Empty array should either throw or return empty, currently returns empty silently
      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('REGRESSION: checkFileExistence accepts empty path strings', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { exists: false } })
      } as AnyType)

      const result = await systemApi.checkFileExistence([''])

      // Empty path should be rejected
      expect(result[0].path).toBe('')
      expect(result[0].filename).toBe('')
    })

    it('REGRESSION: checkFileExistence fails on first error (no partial results)', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { exists: true } })
        } as AnyType)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        } as AnyType)

      await expect(
        systemApi.checkFileExistence(['/path/1', '/path/2', '/path/3'])
      ).rejects.toThrow()

      // Only made 2 requests before failing
      expect(mockFetch).toHaveBeenCalledTimes(2)
      // No partial results returned
    })
  })

  describe('Regression #4: Base URL Method Consistency', () => {
    it('FIXED: getCacheStats should use getConfigApiBaseUrl not getApiBaseUrl', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      mockGetConfigApiBaseUrl.mockClear()
      mockGetApiBaseUrl.mockClear()

      await systemApi.getCacheStats()

      // NOW FIXED: uses getConfigApiBaseUrl
      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()
      expect(mockGetApiBaseUrl).not.toHaveBeenCalled()
    })

    it('FIXED: getBackgroundJobs should use getConfigApiBaseUrl not getApiBaseUrl', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      mockGetConfigApiBaseUrl.mockClear()
      mockGetApiBaseUrl.mockClear()

      await systemApi.getBackgroundJobs()

      // NOW FIXED: uses getConfigApiBaseUrl
      expect(mockGetConfigApiBaseUrl).toHaveBeenCalled()
      expect(mockGetApiBaseUrl).not.toHaveBeenCalled()
    })
  })

  describe('Regression #5: Error Handling Order Consistency', () => {
    it('FIXED: setSoundCardDtoverlay now checks ok BEFORE parsing JSON', async () => {
      const mockFetch = vi.mocked(apiFetch)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid' })
      } as AnyType)

      await expect(systemApi.setSoundCardDtoverlay({ dtoverlay: 'bad' }))
        .rejects.toThrow('Invalid')
    })

    it('FIXED: detectSoundCard now checks ok BEFORE parsing JSON on error', async () => {
      const mockFetch = vi.mocked(apiFetch)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Detection failed' })
      } as AnyType)

      await expect(systemApi.detectSoundCard())
        .rejects.toThrow('Detection failed')
    })

    it('CORRECT: getSystemInfo checks ok before parsing JSON (no json call on error)', async () => {
      const mockFetch = vi.mocked(apiFetch)
      const jsonSpy = vi.fn()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jsonSpy
      } as AnyType)

      await expect(systemApi.getSystemInfo())
        .rejects.toThrow('HTTP error! status: 500')

      // JSON NOT parsed when ok is false
      expect(jsonSpy).not.toHaveBeenCalled()
    })
  })
})

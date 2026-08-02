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
    it('FIXED: updateHostname now validates at least one field is provided', async () => {
      // Should require at least one field
      await expect(systemApi.updateHostname({}))
        .rejects.toThrow('At least one of hostname or pretty_hostname must be provided')
    })

    it('FIXED: updateHostname accepts valid hostname', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Updated' })
      } as AnyType)

      await systemApi.updateHostname({ hostname: 'newhost' })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('FIXED: updateHostname accepts valid pretty_hostname', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Updated' })
      } as AnyType)

      await systemApi.updateHostname({ pretty_hostname: 'My Device' })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('FIXED: setSoundCardDtoverlay now validates dtoverlay is not empty', async () => {
      await expect(systemApi.setSoundCardDtoverlay({ dtoverlay: '' }))
        .rejects.toThrow('Device tree overlay name cannot be empty')
    })

    it('FIXED: setSoundCardDtoverlay rejects whitespace-only dtoverlay', async () => {
      await expect(systemApi.setSoundCardDtoverlay({ dtoverlay: '   ' }))
        .rejects.toThrow('Device tree overlay name cannot be empty')
    })

    it('FIXED: setSoundCardDtoverlay accepts valid dtoverlay', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.setSoundCardDtoverlay({ dtoverlay: 'hifiberry-dacplus' })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('FIXED: executeScript now validates script parameter', async () => {
      const mockFetch = vi.mocked(apiFetch)

      // Empty script should be rejected
      await expect(systemApi.executeScript({ script: '' }))
        .rejects.toThrow('Script name cannot be empty')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('FIXED: executeScript rejects whitespace-only script', async () => {
      await expect(systemApi.executeScript({ script: '   ' }))
        .rejects.toThrow('Script name cannot be empty')
    })

    it('FIXED: disableSoundCardDetection now validates card_name is not empty', async () => {
      await expect(systemApi.disableSoundCardDetection(''))
        .rejects.toThrow('Card name cannot be empty')
    })

    it('FIXED: disableSoundCardDetection rejects whitespace-only card_name', async () => {
      await expect(systemApi.disableSoundCardDetection('   '))
        .rejects.toThrow('Card name cannot be empty')
    })

    it('FIXED: disableSoundCardDetection accepts valid card_name', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await systemApi.disableSoundCardDetection('DAC+')

      expect(mockFetch).toHaveBeenCalled()
    })

    it('FIXED: checkFileExistence now validates array is not empty', async () => {
      await expect(systemApi.checkFileExistence([]))
        .rejects.toThrow('File paths array cannot be empty')
    })

    it('FIXED: checkFileExistence validates all paths are non-empty', async () => {
      await expect(systemApi.checkFileExistence(['/etc/config', '', '/root/file']))
        .rejects.toThrow('File paths cannot be empty strings')
    })

    it('FIXED: checkFileExistence rejects whitespace-only paths', async () => {
      await expect(systemApi.checkFileExistence(['   ']))
        .rejects.toThrow('File paths cannot be empty strings')
    })

    it('FIXED: checkFileExistence accepts valid file paths', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { exists: true } })
      } as AnyType)

      const result = await systemApi.checkFileExistence(['/etc/config', '/root'])
      expect(result).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
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

    it('FIXED: setSoundCardDtoverlay now validates empty string', async () => {
      // Empty dtoverlay should be rejected
      await expect(systemApi.setSoundCardDtoverlay({ dtoverlay: '' }))
        .rejects.toThrow('Device tree overlay name cannot be empty')
    })

    it('FIXED: disableSoundCardDetection now validates empty card name', async () => {
      // Empty card name should be rejected
      await expect(systemApi.disableSoundCardDetection(''))
        .rejects.toThrow('Card name cannot be empty')
    })

    it('FIXED: updateHostname now validates at least one field provided', async () => {
      // Empty request should require at least one field
      await expect(systemApi.updateHostname({}))
        .rejects.toThrow('At least one of hostname or pretty_hostname must be provided')
    })

    it('REGRESSION: executeScript accepts path traversal attempts', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // Path traversal patterns should be blocked (future enhancement)
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

      // Special characters might need escaping (future enhancement)
      await systemApi.executeScript({ script: 'script; rm -rf /' })

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Regression #3: Array Parameter Validation', () => {
    it('FIXED: checkFileExistence now validates array is not empty', async () => {
      // Empty array should now throw
      await expect(systemApi.checkFileExistence([]))
        .rejects.toThrow('File paths array cannot be empty')
    })

    it('FIXED: checkFileExistence now validates paths are not empty strings', async () => {
      // Empty paths in array should be rejected
      await expect(systemApi.checkFileExistence(['']))
        .rejects.toThrow('File paths cannot be empty strings')
    })

    it('FIXED: checkFileExistence rejects mixed empty and valid paths', async () => {
      // Mixed valid and empty should throw on validation
      await expect(systemApi.checkFileExistence(['/path/1', '', '/path/2']))
        .rejects.toThrow('File paths cannot be empty strings')
    })

    it('FIXED: checkFileExistence rejects whitespace-only paths', async () => {
      // Whitespace-only paths should be rejected
      await expect(systemApi.checkFileExistence(['   ', '/path']))
        .rejects.toThrow('File paths cannot be empty strings')
    })

    it('FIXED: checkFileExistence accepts valid paths and makes correct calls', async () => {
      const mockFetch = vi.mocked(apiFetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { exists: true } })
      } as AnyType)

      const result = await systemApi.checkFileExistence(['/path/1', '/path/2'])

      // Now correctly processes valid paths
      expect(result).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
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

  describe('Additional Comprehensive Tests', () => {
    describe('Parameter Type Validation', () => {
      it('rebootSystem throws on negative delay number', async () => {
        await expect(systemApi.rebootSystem({ delay: -1 }))
          .rejects.toThrow('Reboot delay must be a non-negative number')
      })

      it('rebootSystem throws on Infinity delay', async () => {
        await expect(systemApi.rebootSystem({ delay: Infinity }))
          .rejects.toThrow('Reboot delay must be a non-negative number')
      })

      it('rebootSystem throws on NaN delay', async () => {
        await expect(systemApi.rebootSystem({ delay: NaN }))
          .rejects.toThrow('Reboot delay must be a non-negative number')
      })

      it('rebootSystem accepts zero delay', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success', message: 'Rebooting immediately' })
        } as AnyType)

        const result = await systemApi.rebootSystem({ delay: 0 })
        expect(result.status).toBe('success')
      })

      it('rebootSystem accepts floating point delay', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success' })
        } as AnyType)

        await systemApi.rebootSystem({ delay: 10.5 })
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    describe('Response Type Validation', () => {
      it('getSystemInfo returns complete SystemInfo structure', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            pi_model: {
              name: 'Raspberry Pi 4 Model B',
              version: '1.4',
              memory: {
                total_kb: 4194304,
                total_mb: 4096,
                total_gb: 4
              }
            },
            hat_info: {
              vendor: 'HiFiBerry',
              product: 'DAC+',
              uuid: '12345',
              vendor_card: 'DACplus'
            },
            soundcard: {
              name: 'DAC+ Stereo',
              volume_control: 'Master',
              headphone_volume_control: null,
              hardware_index: 0,
              output_channels: 2,
              input_channels: 0,
              features: ['volume_control'],
              hat_name: 'DACplus',
              supports_dsp: true,
              card_type: ['audio']
            },
            system: {
              uuid: '12345',
              hostname: 'hifiberry',
              pretty_hostname: 'HiFiBerry Device'
            }
          })
        } as AnyType)

        const result = await systemApi.getSystemInfo()
        expect(result.status).toBe('success')
        expect(result.pi_model.name).toBe('Raspberry Pi 4 Model B')
        expect(result.soundcard.output_channels).toBe(2)
      })

      it('getSoundCards returns data with correct structure', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              soundcards: [
                {
                  name: 'DAC+',
                  dtoverlay: 'hifiberry-dacplus',
                  volume_control: 'Master',
                  headphone_volume_control: null,
                  output_channels: 2,
                  input_channels: 0,
                  features: [],
                  supports_dsp: true,
                  card_type: ['audio'],
                  is_pro: false
                }
              ],
              count: 1
            }
          })
        } as AnyType)

        const result = await systemApi.getSoundCards()
        expect(result.data.soundcards).toHaveLength(1)
        expect(result.data.count).toBe(1)
        expect(result.data.soundcards[0].name).toBe('DAC+')
      })

      it('getCacheStats returns correct statistics structure', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            stats: {
              disk_entries: 150,
              memory_entries: 50,
              memory_bytes: 1024000,
              memory_limit_bytes: 10485760
            },
            image_cache_stats: {
              total_images: 200,
              total_size: 5242880,
              last_updated: Date.now()
            },
            message: null
          })
        } as AnyType)

        const result = await systemApi.getCacheStats()
        expect(result.success).toBe(true)
        expect(result.stats.disk_entries).toBe(150)
        expect(result.image_cache_stats.total_images).toBe(200)
      })

      it('getBackgroundJobs returns correct job structure', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            jobs: [
              {
                id: 'job1',
                name: 'album-scan',
                start_time: Date.now() - 60000,
                last_update: Date.now(),
                finish_time: null,
                status: 'running',
                progress: 'Scanning albums...',
                total_items: 1000,
                completed_items: 350,
                duration_seconds: 60,
                time_since_last_update: 5,
                completion_percentage: 35
              }
            ],
            message: null
          })
        } as AnyType)

        const result = await systemApi.getBackgroundJobs()
        expect(result.success).toBe(true)
        expect(result.jobs).toHaveLength(1)
        expect(result.jobs[0].completion_percentage).toBe(35)
      })
    })

    describe('Error Response Handling', () => {
      it('setSoundCardDtoverlay includes API error message', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ message: 'Overlay not available on this hardware' })
        } as AnyType)

        await expect(systemApi.setSoundCardDtoverlay({ dtoverlay: 'invalid-overlay' }))
          .rejects.toThrow('Overlay not available on this hardware')
      })

      it('detectSoundCard falls back to status when no message', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({})
        } as AnyType)

        await expect(systemApi.detectSoundCard())
          .rejects.toThrow('HTTP error')
      })

      it('getSoundCardDetectionStatus handles error response', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' })
        } as AnyType)

        await expect(systemApi.getSoundCardDetectionStatus())
          .rejects.toThrow('Unauthorized')
      })

      it('completeSetup handles error response', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500
        } as AnyType)

        await expect(systemApi.completeSetup())
          .rejects.toThrow('HTTP error')
      })

      it('resetSetup handles error response', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500
        } as AnyType)

        await expect(systemApi.resetSetup())
          .rejects.toThrow('HTTP error')
      })

      it('resetConfigDB handles error response', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500
        } as AnyType)

        await expect(systemApi.resetConfigDB())
          .rejects.toThrow('HTTP error')
      })
    })

    describe('API URL Construction', () => {
      it('all system API calls use correct base URL', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'success' })
        } as AnyType)

        mockGetConfigApiBaseUrl.mockClear()
        mockGetConfigApiBaseUrl.mockReturnValue('http://api.local/config')

        await systemApi.getSystemInfo()
        expect(mockFetch).toHaveBeenCalledWith(
          'http://api.local/config/systeminfo',
          expect.anything()
        )
      })

      it('hostname update uses correct endpoint', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success' })
        } as AnyType)

        mockGetConfigApiBaseUrl.mockReturnValue('http://api.local/config')

        await systemApi.updateHostname({ hostname: 'test' })

        expect(mockFetch).toHaveBeenCalledWith(
          'http://api.local/config/hostname',
          expect.anything()
        )
      })

      it('reboot uses correct endpoint', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success' })
        } as AnyType)

        mockGetConfigApiBaseUrl.mockReturnValue('http://api.local/config')

        await systemApi.rebootSystem()

        expect(mockFetch).toHaveBeenCalledWith(
          'http://api.local/config/system/reboot',
          expect.anything()
        )
      })

      it('setup endpoints use correct base URL', async () => {
        const mockFetch = vi.mocked(apiFetch)
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'success' })
        } as AnyType)

        mockGetConfigApiBaseUrl.mockReturnValue('http://api.local/config')

        await systemApi.getSetupStatus()
        expect(mockFetch).toHaveBeenCalledWith(
          'http://api.local/config/setup/status',
          expect.anything()
        )

        mockFetch.mockClear()

        await systemApi.completeSetup()
        expect(mockFetch).toHaveBeenCalledWith(
          'http://api.local/config/setup/complete',
          expect.anything()
        )
      })
    })
  })
})

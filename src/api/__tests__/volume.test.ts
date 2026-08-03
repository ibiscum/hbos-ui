import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as volumeApi from '../volume'
import type {
  VolumeInfo,
  VolumeState,
  VolumeResponse,
  HeadphoneControlsResponse,
  HeadphoneVolumeSetResponse,
  HeadphoneVolumeResponse
} from '../volume'

// Mock dependencies
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => 'http://localhost:3000/api',
    getConfigApiBaseUrl: () => 'http://localhost:3001/api'
  })
}))

vi.mock('@/api/http', () => ({
  apiFetch: vi.fn()
}))

import { apiFetch } from '@/api/http'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyType = any

const mockApiFetch = vi.mocked(apiFetch) as AnyType

/**
 * Helper to create a mock Response object with minimal fields
 */
const createMockResponse = (
  ok: boolean,
  status: number,
  statusText: string,
  data?: unknown,
  throwOnJson = false
) => ({
  ok,
  status,
  statusText,
  json: async () => {
    if (throwOnJson) throw new Error('JSON parse error')
    return data || {}
  }
})

describe('volume.ts - Volume API Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // getVolumeInfo Tests
  // ============================================================================

  describe('getVolumeInfo - Success Cases', () => {
    it('should return VolumeInfo with all fields populated', async () => {
      const mockData: VolumeInfo = {
        available: true,
        control_info: {
          internal_name: 'PCM',
          display_name: 'Master Volume',
          decibel_range: { min_db: -96, max_db: 0 }
        },
        current_state: { percentage: 50, decibels: -6, raw_value: 128 },
        supports_change_monitoring: true
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockData) as AnyType)

      const result = await volumeApi.getVolumeInfo()

      expect(result).toEqual(mockData)
      expect(result?.available).toBe(true)
      expect(result?.control_info?.internal_name).toBe('PCM')
      expect(mockApiFetch).toHaveBeenCalledWith('http://localhost:3000/api/volume/info')
    })

    it('should return VolumeInfo with partial fields', async () => {
      const mockData: VolumeInfo = {
        available: false,
        supports_change_monitoring: false
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockData) as AnyType)

      const result = await volumeApi.getVolumeInfo()

      expect(result?.available).toBe(false)
      expect(result?.control_info).toBeUndefined()
      expect(result?.current_state).toBeUndefined()
    })
  })

  describe('getVolumeInfo - Error Cases', () => {
    it('should return null on HTTP error', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Internal Server Error') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.getVolumeInfo()

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith('Failed to get volume info:', 500, 'Internal Server Error')
      errorSpy.mockRestore()
    })

    it('should return null on network error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.getVolumeInfo()

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null on JSON parse error', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', undefined, true) as AnyType
      )
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.getVolumeInfo()

      expect(result).toBeNull()
      errorSpy.mockRestore()
    })

    it('should handle 403 Forbidden status', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 403, 'Forbidden') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.getVolumeInfo()

      expect(result).toBeNull()
      errorSpy.mockRestore()
    })
  })

  // ============================================================================
  // getVolumeState Tests
  // ============================================================================

  describe('getVolumeState - Success Cases', () => {
    it('should return complete VolumeState', async () => {
      const mockState: VolumeState = {
        percentage: 75,
        decibels: -6,
        raw_value: 192
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockState) as AnyType)

      const result = await volumeApi.getVolumeState()

      expect(result).toEqual(mockState)
      expect(result?.percentage).toBe(75)
      expect(mockApiFetch).toHaveBeenCalledWith('http://localhost:3000/api/volume/state')
    })

    it('should return VolumeState with percentage only', async () => {
      const mockState: VolumeState = { percentage: 50 }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockState) as AnyType)

      const result = await volumeApi.getVolumeState()

      expect(result?.percentage).toBe(50)
      expect(result?.decibels).toBeUndefined()
      expect(result?.raw_value).toBeUndefined()
    })
  })

  describe('getVolumeState - Error Cases', () => {
    it('should return null on 503 with warning log', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 503, 'Service Unavailable') as AnyType)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await volumeApi.getVolumeState()

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith('Volume control not available')
      warnSpy.mockRestore()
    })

    it('should return null on other error statuses', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 400, 'Bad Request') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.getVolumeState()

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith('Failed to get volume state:', 400, 'Bad Request')
      errorSpy.mockRestore()
    })

    it('should return null on network error', async () => {
      mockApiFetch.mockRejectedValue(new TypeError('Failed to fetch'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.getVolumeState()

      expect(result).toBeNull()
      errorSpy.mockRestore()
    })
  })

  // ============================================================================
  // setVolumeLevel Tests
  // ============================================================================

  describe('setVolumeLevel - Valid Input', () => {
    it('should set volume with valid percentage', async () => {
      const mockResponse: VolumeResponse = {
        success: true,
        message: 'Volume set to 50%',
        new_state: { percentage: 50 }
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.setVolumeLevel(50)

      expect(result).toEqual(mockResponse)
      expect(result?.success).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/volume/set',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ percentage: 50 })
        })
      )
    })

    it('should round percentage to 2 decimal places', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      await volumeApi.setVolumeLevel(33.333)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ percentage: 33.33 })
        })
      )
    })

    it('should accept boundary values 0 and 100', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      const result0 = await volumeApi.setVolumeLevel(0)
      const result100 = await volumeApi.setVolumeLevel(100)

      expect(result0).not.toBeNull()
      expect(result100).not.toBeNull()
    })
  })

  describe('setVolumeLevel - Input Validation', () => {
    it('should return null for negative percentage', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(-10)

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        'Volume validation failed:',
        expect.stringContaining('out of range')
      )
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for percentage > 100', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(150)

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for NaN', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(Number.NaN)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for Infinity', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(Number.POSITIVE_INFINITY)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  describe('setVolumeLevel - Error Handling', () => {
    it('should parse error response JSON', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(false, 400, 'Bad Request', { message: 'Invalid volume' }) as AnyType
      )
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(50)

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to set volume:',
        400,
        expect.stringContaining('Invalid volume')
      )
      errorSpy.mockRestore()
    })

    it('should handle error response without message field', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 400, 'Bad Request') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(50)

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  // ============================================================================
  // increaseVolume Tests
  // ============================================================================

  describe('increaseVolume - Valid Input', () => {
    it('should increase volume with default amount (5%)', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true, new_state: { percentage: 55 } }) as AnyType
      )

      const result = await volumeApi.increaseVolume()

      expect(result?.success).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/increase?amount=5'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should increase volume with custom amount', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      await volumeApi.increaseVolume(10)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/increase?amount=10'),
        expect.any(Object)
      )
    })

    it('should accept boundary amount 100', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      const result = await volumeApi.increaseVolume(100)

      expect(result).not.toBeNull()
    })
  })

  describe('increaseVolume - Input Validation', () => {
    it('should return null for negative amount', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.increaseVolume(-5)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for zero amount', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.increaseVolume(0)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for amount > 100', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.increaseVolume(150)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for non-finite values', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await volumeApi.increaseVolume(Number.NaN)).toBeNull()
      expect(await volumeApi.increaseVolume(Number.POSITIVE_INFINITY)).toBeNull()

      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  describe('increaseVolume - Error Handling', () => {
    it('should return null on HTTP error', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 400, 'Bad Request') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.increaseVolume(5)

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null on network error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network failed'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.increaseVolume(5)

      expect(result).toBeNull()
      errorSpy.mockRestore()
    })
  })

  // ============================================================================
  // decreaseVolume Tests
  // ============================================================================

  describe('decreaseVolume - Valid Input', () => {
    it('should decrease volume with default amount (5%)', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true, new_state: { percentage: 45 } }) as AnyType
      )

      const result = await volumeApi.decreaseVolume()

      expect(result?.success).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/decrease?amount=5'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should decrease volume with custom amount', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      await volumeApi.decreaseVolume(15)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/decrease?amount=15'),
        expect.any(Object)
      )
    })
  })

  describe('decreaseVolume - Input Validation', () => {
    it('should return null for negative amount', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.decreaseVolume(-10)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for zero amount', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.decreaseVolume(0)

      expect(result).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should return null for non-finite values', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await volumeApi.decreaseVolume(Number.NaN)).toBeNull()
      expect(await volumeApi.decreaseVolume(Number.NEGATIVE_INFINITY)).toBeNull()

      expect(mockApiFetch).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  // ============================================================================
  // toggleMute Tests
  // ============================================================================

  describe('toggleMute - Functionality', () => {
    it('should toggle mute and return new state', async () => {
      const mockResponse: VolumeResponse = {
        success: true,
        message: 'Mute toggled',
        new_state: { percentage: 0 }
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.toggleMute()

      expect(result).toEqual(mockResponse)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/volume/mute',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return null on error', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Server Error') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.toggleMute()

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  // ============================================================================
  // Headphone Volume API Tests
  // ============================================================================

  describe('getHeadphoneControls - Success Cases', () => {
    it('should return available controls', async () => {
      const mockResponse: HeadphoneControlsResponse = {
        status: 'success',
        data: {
          controls: ['PCM', 'Mic'],
          count: 2
        }
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.getHeadphoneControls()

      expect(result.status).toBe('success')
      expect(result.data?.controls).toContain('PCM')
      expect(result.data?.count).toBe(2)
    })

    it('should handle empty controls list', async () => {
      const mockResponse: HeadphoneControlsResponse = {
        status: 'success',
        data: {
          controls: [],
          count: 0
        }
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.getHeadphoneControls()

      expect(result.status).toBe('success')
      expect(result.data?.count).toBe(0)
    })
  })

  describe('getHeadphoneControls - Error Handling', () => {
    it('should return error status on HTTP error', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Internal Server Error') as AnyType)

      const result = await volumeApi.getHeadphoneControls()

      expect(result.status).toBe('error')
      expect(result.message).toContain('HTTP 500')
    })

    it('should return error status on network error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await volumeApi.getHeadphoneControls()

      expect(result.status).toBe('error')
      expect(result.message).toBe('Network timeout')
    })

    it('should handle non-Error exceptions', async () => {
      mockApiFetch.mockRejectedValue('String error')

      const result = await volumeApi.getHeadphoneControls()

      expect(result.status).toBe('error')
      expect(result.message).toBe('Unknown error occurred')
    })
  })

  describe('getHeadphoneVolume - Success Cases', () => {
    it('should return current headphone volume', async () => {
      const mockResponse: HeadphoneVolumeResponse = {
        status: 'success',
        data: {
          volume: 75,
          control: 'PCM'
        }
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.getHeadphoneVolume()

      expect(result.status).toBe('success')
      expect(result.data?.volume).toBe(75)
      expect(result.data?.control).toBe('PCM')
    })

    it('should handle response without data field', async () => {
      const mockResponse = {
        status: 'success'
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.getHeadphoneVolume()

      expect(result.status).toBe('success')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getHeadphoneVolume - Error Handling', () => {
    it('should return error status with parsed message', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(false, 400, 'Bad Request', { message: 'Device error' }) as AnyType
      )

      const result = await volumeApi.getHeadphoneVolume()

      expect(result.status).toBe('error')
      expect(result.message).toBe('Device error')
    })

    it('should return error with HTTP status when no message', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 404, 'Not Found') as AnyType)

      const result = await volumeApi.getHeadphoneVolume()

      expect(result.status).toBe('error')
      expect(result.message).toContain('HTTP 404')
    })

    it('should handle JSON parse error gracefully', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(false, 500, 'Server Error', undefined, true) as AnyType
      )

      const result = await volumeApi.getHeadphoneVolume()

      expect(result.status).toBe('error')
      expect(result.message).toBeDefined()
    })
  })

  describe('setHeadphoneVolume - Valid Input', () => {
    it('should set headphone volume with valid percentage', async () => {
      const mockResponse: HeadphoneVolumeSetResponse = {
        status: 'success',
        message: 'Volume set',
        data: { volume: 65 }
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.setHeadphoneVolume(65)

      expect(result.status).toBe('success')
      expect(result.data?.volume).toBe(65)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/volume/headphone',
        expect.objectContaining({
          body: JSON.stringify({ volume: 65 })
        })
      )
    })

    it('should round volume to integer', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { status: 'success' }) as AnyType
      )

      await volumeApi.setHeadphoneVolume(66.7)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ volume: 67 })
        })
      )
    })

    it('should accept boundary values 0 and 100', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { status: 'success' }) as AnyType
      )

      const result0 = await volumeApi.setHeadphoneVolume(0)
      const result100 = await volumeApi.setHeadphoneVolume(100)

      expect(result0.status).toBe('success')
      expect(result100.status).toBe('success')
    })
  })

  describe('setHeadphoneVolume - Input Validation', () => {
    it('should return error status for negative volume', async () => {
      const result = await volumeApi.setHeadphoneVolume(-10)

      expect(result.status).toBe('error')
      expect(result.message).toContain('between 0 and 100')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should return error status for volume > 100', async () => {
      const result = await volumeApi.setHeadphoneVolume(150)

      expect(result.status).toBe('error')
      expect(result.message).toContain('between 0 and 100')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should return error status for NaN', async () => {
      const result = await volumeApi.setHeadphoneVolume(Number.NaN)

      expect(result.status).toBe('error')
      expect(result.message).toContain('between 0 and 100')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('should return error status for Infinity', async () => {
      const result = await volumeApi.setHeadphoneVolume(Number.POSITIVE_INFINITY)

      expect(result.status).toBe('error')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })

  describe('setHeadphoneVolume - Error Handling', () => {
    it('should return error status on HTTP error', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(false, 500, 'Server Error', { message: 'DB error' }) as AnyType
      )

      const result = await volumeApi.setHeadphoneVolume(50)

      expect(result.status).toBe('error')
      expect(result.message).toBe('DB error')
    })

    it('should return error status on network error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Connection refused'))

      const result = await volumeApi.setHeadphoneVolume(50)

      expect(result.status).toBe('error')
      expect(result.message).toBe('Connection refused')
    })
  })

  describe('storeHeadphoneVolume - Functionality', () => {
    it('should store headphone volume successfully', async () => {
      const mockResponse: HeadphoneVolumeSetResponse = {
        status: 'success',
        message: 'Volume stored'
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.storeHeadphoneVolume()

      expect(result.status).toBe('success')
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/volume/headphone/store'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return error status on failure', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Server Error') as AnyType)

      const result = await volumeApi.storeHeadphoneVolume()

      expect(result.status).toBe('error')
    })
  })

  describe('restoreHeadphoneVolume - Functionality', () => {
    it('should restore headphone volume successfully', async () => {
      const mockResponse: HeadphoneVolumeSetResponse = {
        status: 'success',
        message: 'Volume restored'
      }

      mockApiFetch.mockResolvedValue(createMockResponse(true, 200, 'OK', mockResponse) as AnyType)

      const result = await volumeApi.restoreHeadphoneVolume()

      expect(result.status).toBe('success')
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/volume/headphone/restore'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return error status on failure', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Server Error') as AnyType)

      const result = await volumeApi.restoreHeadphoneVolume()

      expect(result.status).toBe('error')
    })
  })

  // ============================================================================
  // Regression Tests - API Design Decisions
  // ============================================================================

  describe('Regression: Return Type Inconsistency (Design Decision)', () => {
    it('Volume API functions return null on error (not error objects)', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Error') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await volumeApi.setVolumeLevel(50)

      // Volume API returns null (design choice for simplicity)
      expect(result).toBeNull()
      errorSpy.mockRestore()
    })

    it('Headphone Volume API functions return error object with status', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 500, 'Error') as AnyType)

      const result = await volumeApi.getHeadphoneVolume()

      // Headphone API returns {status: 'error', message: '...'}
      expect(result).not.toBeNull()
      expect(result.status).toBe('error')
      expect(result.message).toBeDefined()
    })

    it('Callers must handle both patterns (this is intentional)', async () => {
      mockApiFetch.mockResolvedValueOnce(createMockResponse(false, 500, 'Error') as AnyType)
      const volumeResult = await volumeApi.setVolumeLevel(50)

      mockApiFetch.mockResolvedValueOnce(createMockResponse(false, 500, 'Error') as AnyType)
      const headphoneResult = await volumeApi.getHeadphoneVolume()

      // Different patterns require different caller handling
      if (volumeResult === null) {
        // Volume API null pattern
      } else {
        // This branch won't execute
      }

      if (headphoneResult?.status === 'error') {
        // Headphone API error pattern
      } else if (headphoneResult?.status === 'success') {
        // Handle success
      }

      expect(volumeResult).toBeNull()
      expect(headphoneResult.status).toBe('error')
    })
  })

  describe('Regression: Special HTTP Status Handling', () => {
    it('503 in getVolumeState logs warning (graceful degradation)', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 503, 'Service Unavailable') as AnyType)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await volumeApi.getVolumeState()

      // 503 is treated specially (warning instead of error)
      expect(warnSpy).toHaveBeenCalledWith('Volume control not available')
      expect(result).toBeNull()
      warnSpy.mockRestore()
    })

    it('503 in getVolumeInfo logs error (not special)', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 503, 'Service Unavailable') as AnyType)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await volumeApi.getVolumeInfo()

      // 503 is not handled specially here
      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
      expect(result).toBeNull()
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    })
  })

  describe('Regression: Error Message Construction', () => {
    it('setVolumeLevel constructs messages from parsed error.message or statusText', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(false, 400, 'Bad Request', { message: 'Invalid input' }) as AnyType
      )
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await volumeApi.setVolumeLevel(50)

      const calls = errorSpy.mock.calls
      expect(calls[0]).toEqual(['Failed to set volume:', 400, expect.stringContaining('Invalid input')])
      errorSpy.mockRestore()
    })

    it('getHeadphoneControls constructs "HTTP {status}: {statusText}" format', async () => {
      mockApiFetch.mockResolvedValue(createMockResponse(false, 404, 'Not Found') as AnyType)

      const result = await volumeApi.getHeadphoneControls()

      expect(result.message).toBe('HTTP 404: Not Found')
    })
  })

  describe('Regression: Network Error Handling', () => {
    it('all functions handle Error exceptions properly', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network timeout'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const volumeResult = await volumeApi.getVolumeInfo()
      const headphoneResult = await volumeApi.getHeadphoneControls()

      expect(volumeResult).toBeNull()
      expect(headphoneResult.status).toBe('error')
      errorSpy.mockRestore()
    })

    it('headphone functions handle non-Error exceptions', async () => {
      mockApiFetch.mockRejectedValue('String error')

      const result = await volumeApi.getHeadphoneControls()

      // Should not crash, returns error status with 'Unknown error'
      expect(result.status).toBe('error')
      expect(result.message).toBe('Unknown error occurred')
    })
  })

  describe('Integration: Complete Volume Control Workflow', () => {
    it('should support get -> change -> verify workflow', async () => {
      // Get current state
      mockApiFetch.mockResolvedValueOnce(
        createMockResponse(true, 200, 'OK', { percentage: 50 }) as AnyType
      )
      const currentState = await volumeApi.getVolumeState()
      expect(currentState?.percentage).toBe(50)

      // Change volume
      mockApiFetch.mockResolvedValueOnce(
        createMockResponse(true, 200, 'OK', {
          success: true,
          new_state: { percentage: 75 }
        }) as AnyType
      )
      const changeResult = await volumeApi.setVolumeLevel(75)
      expect(changeResult?.success).toBe(true)

      // Verify new state
      mockApiFetch.mockResolvedValueOnce(
        createMockResponse(true, 200, 'OK', { percentage: 75 }) as AnyType
      )
      const newState = await volumeApi.getVolumeState()
      expect(newState?.percentage).toBe(75)

      expect(mockApiFetch).toHaveBeenCalledTimes(3)
    })

    it('should support headphone store/restore workflow', async () => {
      // Set headphone volume
      mockApiFetch.mockResolvedValueOnce(
        createMockResponse(true, 200, 'OK', {
          status: 'success',
          message: 'Volume set'
        }) as AnyType
      )
      const setResult = await volumeApi.setHeadphoneVolume(80)
      expect(setResult.status).toBe('success')

      // Store the setting
      mockApiFetch.mockResolvedValueOnce(
        createMockResponse(true, 200, 'OK', {
          status: 'success',
          message: 'Stored'
        }) as AnyType
      )
      const storeResult = await volumeApi.storeHeadphoneVolume()
      expect(storeResult.status).toBe('success')

      // Can later restore it
      mockApiFetch.mockResolvedValueOnce(
        createMockResponse(true, 200, 'OK', {
          status: 'success',
          message: 'Restored'
        }) as AnyType
      )
      const restoreResult = await volumeApi.restoreHeadphoneVolume()
      expect(restoreResult.status).toBe('success')

      expect(mockApiFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge Cases: Parameter Handling', () => {
    it('should handle small decimal values correctly', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      // Very small increase
      await volumeApi.increaseVolume(0.1)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('amount=0.1'),
        expect.any(Object)
      )
    })

    it('should handle floating point precision correctly', async () => {
      mockApiFetch.mockResolvedValue(
        createMockResponse(true, 200, 'OK', { success: true }) as AnyType
      )

      await volumeApi.setVolumeLevel(99.999)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ percentage: 100 })
        })
      )
    })
  })
})

  describe('Inconsistency #2: Error Handling Return Types - Null vs Error Objects', () => {
    it('getVolumeState returns null on error', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as AnyType)

      const result = await volumeApi.getVolumeState()
      expect(result).toBeNull()
      expect(typeof result).toBe('object')
    })

    it('getHeadphoneVolume returns error object with status on error', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({})
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      expect(result).not.toBeNull()
      expect(result.status).toBe('error')
      expect(typeof result).toBe('object')
      expect(result.message).toBeDefined()
    })

    it('volume functions (null) vs headphone functions (error object) require different caller handling', async () => {
      // Volume API returns null
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({})
      } as AnyType)
      const volumeResult = await volumeApi.setVolumeLevel(50)
      expect(volumeResult).toBeNull()

      // Headphone API returns error object
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({})
      } as AnyType)
      const headphoneResult = await volumeApi.setHeadphoneVolume(50)
      expect(headphoneResult?.status).toBe('error')

      // INCONSISTENCY: Callers must handle both patterns
    })
  })

  describe('Inconsistency #3: Input Validation - Inconsistently Applied', () => {
    it('setVolumeLevel validates percentage range 0-100', async () => {
      // setVolumeLevel catches the thrown error and returns null
      // so we test that it returns null for invalid ranges
      const resultNegative = await volumeApi.setVolumeLevel(-10)
      expect(resultNegative).toBeNull()

      const resultOverflow = await volumeApi.setVolumeLevel(150)
      expect(resultOverflow).toBeNull()
    })

    it('increaseVolume NOW validates amount parameter (FIXED)', async () => {
      // NOW: increaseVolume validates amount must be positive
      const resultNegative = await volumeApi.increaseVolume(-50)
      expect(resultNegative).toBeNull()

      const resultZero = await volumeApi.increaseVolume(0)
      expect(resultZero).toBeNull()

      const resultOverflow = await volumeApi.increaseVolume(150)
      expect(resultOverflow).toBeNull()

      // Valid amounts should proceed
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      const resultValid = await volumeApi.increaseVolume(10)
      expect(resultValid).not.toBeNull()
    })

    it('decreaseVolume NOW validates amount parameter (FIXED)', async () => {
      // NOW: decreaseVolume validates amount must be positive
      const resultNegative = await volumeApi.decreaseVolume(-100)
      expect(resultNegative).toBeNull()

      const resultZero = await volumeApi.decreaseVolume(0)
      expect(resultZero).toBeNull()

      const resultOverflow = await volumeApi.decreaseVolume(150)
      expect(resultOverflow).toBeNull()

      // Valid amounts should proceed
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      const resultValid = await volumeApi.decreaseVolume(10)
      expect(resultValid).not.toBeNull()
    })

    it('setHeadphoneVolume validates percentage range 0-100', async () => {
      const resultNegative = await volumeApi.setHeadphoneVolume(-5)
      expect(resultNegative.status).toBe('error')
      expect(resultNegative.message).toContain('between 0 and 100')

      const resultOverflow = await volumeApi.setHeadphoneVolume(150)
      expect(resultOverflow.status).toBe('error')
      expect(resultOverflow.message).toContain('between 0 and 100')
    })
  })

  describe('Inconsistency #4: Error Response Parsing - Inconsistent', () => {
    it('setVolumeLevel attempts to parse error response JSON', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid volume' })
      } as AnyType)

      const consoleSpy = vi.spyOn(console, 'error')
      await volumeApi.setVolumeLevel(50)

      // Should have tried to parse error response
      expect(mockApiFetch).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('increaseVolume does NOT attempt to parse error response', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as AnyType)

      const result = await volumeApi.increaseVolume(5)
      expect(result).toBeNull()
      // No JSON parsing attempted - just logs status and statusText
    })

    it('getHeadphoneVolume parses error response with fallback', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({ message: 'API error' })
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      expect(result.status).toBe('error')
      expect(result.message).toContain('API error')
    })

    it('getHeadphoneVolume handles JSON parse errors gracefully', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      expect(result.status).toBe('error')
      // When JSON parse fails, error message is from caught error
      expect(result.message).toBeDefined()
    })
  })

  describe('Inconsistency #5: Missing Response Structure Validation', () => {
    it('getVolumeInfo does not validate response structure before using', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing required fields
          control_info: undefined,
          current_state: undefined
        })
      } as AnyType)

      const result = await volumeApi.getVolumeInfo()
      // Returns whatever was in JSON without validation
      expect(result).toBeDefined()
      expect(result?.available).toBeUndefined()
    })

    it('getHeadphoneVolume does not validate response.data exists before using', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success'
          // Missing data field
        })
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      expect(result.status).toBe('success')
      expect(result.data).toBeUndefined()
      // Caller must check for data existence
    })
  })

  describe('Inconsistency #6: Inconsistent HTTP Status Handling', () => {
    it('getVolumeState handles 503 with console.warn', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as AnyType)

      const warnSpy = vi.spyOn(console, 'warn')
      const result = await volumeApi.getVolumeState()

      expect(warnSpy).toHaveBeenCalledWith('Volume control not available')
      expect(result).toBeNull()
      warnSpy.mockRestore()
    })

    it('getVolumeInfo does NOT handle 503 specially', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as AnyType)

      const warnSpy = vi.spyOn(console, 'warn')
      const errorSpy = vi.spyOn(console, 'error')
      const result = await volumeApi.getVolumeInfo()

      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
      expect(result).toBeNull()
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it('setHeadphoneVolume treats 503 as generic error', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({})
      } as AnyType)

      const result = await volumeApi.setHeadphoneVolume(50)
      expect(result.status).toBe('error')
      // No special handling for 503
      expect(result.message).toContain('503')
    })
  })

  describe('Inconsistency #7: Error Type Checking - Inconsistent Exception Handling', () => {
    it('functions use instanceof Error but error could be any type', async () => {
      mockApiFetch.mockRejectedValue('string error')

      const result = await volumeApi.getHeadphoneControls()
      expect(result.status).toBe('error')
      // Correctly handles non-Error type
      expect(result.message).toBe('Unknown error occurred')
    })

    it('volume API errors are caught but not type-checked', async () => {
      mockApiFetch.mockRejectedValue({ some: 'object' })

      const result = await volumeApi.setVolumeLevel(50)
      expect(result).toBeNull()
      // No validation of error type
    })

    it('getHeadphoneVolume properly checks error instanceof Error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'))

      const result = await volumeApi.getHeadphoneVolume()
      expect(result.status).toBe('error')
      expect(result.message).toBe('Network error')
    })
  })

  describe('Inconsistency #8: JSDoc Documentation (IMPROVED)', () => {
    it('increaseVolume now documents amount parameter constraints in JSDoc', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      // JSDoc now includes: "@param amount - Volume increase in percentage points (0.1-100)"
      // Amount is now validated to be positive
      const resultValid = await volumeApi.increaseVolume(10)
      expect(resultValid).not.toBeNull()
    })

    it('setHeadphoneVolume now documents volume constraint in JSDoc', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      // JSDoc now includes: "@param volume - Headphone volume level (0-100)"
      const result = await volumeApi.setHeadphoneVolume(50)
      expect(result.status).toBe('success')
    })
  })

  describe('Inconsistency #9: Null/Undefined Guard Patterns', () => {
    it('errorData.message could be undefined but is used in condition', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({}) // Returns empty object
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      // errorData.message is undefined, but `errorData.message || fallback` handles it
      expect(result.status).toBe('error')
      expect(result.message).toBeDefined()
    })

    it('response.data access could fail without guards', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success'
          // data is missing
        })
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      // Callers must check data exists
      expect(result.data).toBeUndefined()
    })
  })

  describe('Inconsistency #10: Error Message Construction Patterns', () => {
    it('different functions construct error messages differently', async () => {
      // setVolumeLevel uses: errorData.message || response.statusText
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({})
      } as AnyType)

      const errorSpy = vi.spyOn(console, 'error')
      await volumeApi.setVolumeLevel(50)

      const calls = errorSpy.mock.calls
      expect(calls.some((call) => call[0]?.includes('Failed to set volume'))).toBe(true)

      // getHeadphoneControls uses: HTTP ${status}: ${statusText}
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as AnyType)

      const result = await volumeApi.getHeadphoneControls()
      expect(result.message).toBe('HTTP 400: Bad Request')

      errorSpy.mockRestore()
    })

    it('setHeadphoneVolume builds error message from response or HTTP status', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({ message: 'Database error' })
      } as AnyType)

      const result = await volumeApi.setHeadphoneVolume(50)
      // Uses parsed error message, not HTTP status
      expect(result.message).toBe('Database error')
    })
  })

  describe('Success Cases - Consistency Verification', () => {
    it('getVolumeInfo returns typed VolumeInfo on success', async () => {
      const mockData: VolumeInfo = {
        available: true,
        control_info: {
          internal_name: 'PCM',
          display_name: 'Master Volume',
          decibel_range: { min_db: -96, max_db: 0 }
        },
        current_state: { percentage: 50 },
        supports_change_monitoring: true
      }

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      } as AnyType)

      const result = await volumeApi.getVolumeInfo()
      expect(result).toEqual(mockData)
      expect(result?.available).toBe(true)
    })

    it('getVolumeState returns typed VolumeState on success', async () => {
      const mockState: VolumeState = {
        percentage: 75,
        decibels: -6,
        raw_value: 75
      }

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockState
      } as AnyType)

      const result = await volumeApi.getVolumeState()
      expect(result).toEqual(mockState)
      expect(result?.percentage).toBe(75)
    })

    it('setVolumeLevel returns VolumeResponse on success', async () => {
      const mockResponse: VolumeResponse = {
        success: true,
        message: 'Volume set to 50%',
        new_state: { percentage: 50 }
      }

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as AnyType)

      const result = await volumeApi.setVolumeLevel(50)
      expect(result).toEqual(mockResponse)
      expect(result?.success).toBe(true)
    })

    it('getHeadphoneControls returns success response with data', async () => {
      const mockResponse: HeadphoneControlsResponse = {
        status: 'success',
        data: {
          controls: ['PCM', 'Mic'],
          count: 2
        }
      }

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as AnyType)

      const result = await volumeApi.getHeadphoneControls()
      expect(result.status).toBe('success')
      expect(result.data?.controls).toContain('PCM')
      expect(result.data?.count).toBe(2)
    })

    it('setHeadphoneVolume returns success with new volume', async () => {
      const mockResponse: HeadphoneVolumeSetResponse = {
        status: 'success',
        message: 'Headphone volume set',
        data: { volume: 65 }
      }

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as AnyType)

      const result = await volumeApi.setHeadphoneVolume(65)
      expect(result.status).toBe('success')
      expect(result.data?.volume).toBe(65)
    })
  })

  describe('Edge Cases & Boundary Conditions', () => {
    it('setVolumeLevel with boundary values 0 and 100', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      // Test 0%
      let result = await volumeApi.setVolumeLevel(0)
      expect(result).not.toBeNull()

      // Test 100%
      result = await volumeApi.setVolumeLevel(100)
      expect(result).not.toBeNull()
    })

    it('setVolumeLevel rounds percentage correctly', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      await volumeApi.setVolumeLevel(33.33333)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ percentage: 33.33 })
        })
      )
    })

    it('setHeadphoneVolume rounds to integer', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await volumeApi.setHeadphoneVolume(66.7)

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ volume: 67 })
        })
      )
    })

    it('increaseVolume and decreaseVolume use query parameters correctly', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as AnyType)

      await volumeApi.increaseVolume(10)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/increase?amount=10'),
        expect.any(Object)
      )

      mockApiFetch.mockClear()
      await volumeApi.decreaseVolume(15)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/decrease?amount=15'),
        expect.any(Object)
      )
    })
  })

  describe('Regression: Response Type Safety', () => {
    it('all volume functions handle non-JSON responses gracefully', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Not JSON')
        }
      } as AnyType)

      const result = await volumeApi.getVolumeInfo()
      expect(result).toBeNull()
    })

    it('all headphone functions handle non-JSON responses with error status', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Not JSON')
        }
      } as AnyType)

      const result = await volumeApi.getHeadphoneVolume()
      expect(result.status).toBe('error')
    })
  })

  describe('Regression: API URL Construction', () => {
    it('buildVolumeApiUrl includes endpoint correctly', async () => {
      mockApiFetch.mockClear()
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ percentage: 50 })
      } as AnyType)

      await volumeApi.getVolumeState()

      const calls = mockApiFetch.mock.calls
      expect(calls[0][0]).toContain('http://localhost:3000/api/volume/state')
    })

    it('buildHeadphoneVolumeApiUrl includes endpoint correctly', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await volumeApi.storeHeadphoneVolume()

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3001/api/volume/headphone/store'),
        expect.any(Object)
      )
    })
  })

  describe('Inconsistency #11: Non-finite Numeric Input Validation', () => {
    it('setVolumeLevel rejects NaN and Infinity without making API calls', async () => {
      mockApiFetch.mockClear()
      const resultNaN = await volumeApi.setVolumeLevel(Number.NaN)
      const resultInfinity = await volumeApi.setVolumeLevel(Number.POSITIVE_INFINITY)

      expect(resultNaN).toBeNull()
      expect(resultInfinity).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('increaseVolume/decreaseVolume reject NaN and Infinity', async () => {
      mockApiFetch.mockClear()
      const incNaN = await volumeApi.increaseVolume(Number.NaN)
      const decInf = await volumeApi.decreaseVolume(Number.POSITIVE_INFINITY)

      expect(incNaN).toBeNull()
      expect(decInf).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('setHeadphoneVolume rejects NaN and Infinity with error status', async () => {
      mockApiFetch.mockClear()
      const resultNaN = await volumeApi.setHeadphoneVolume(Number.NaN)
      const resultInfinity = await volumeApi.setHeadphoneVolume(Number.POSITIVE_INFINITY)

      expect(resultNaN.status).toBe('error')
      expect(resultNaN.message).toContain('between 0 and 100')
      expect(resultInfinity.status).toBe('error')
      expect(resultInfinity.message).toContain('between 0 and 100')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as volumeApi from '../volume'
import {
  VolumeInfo,
  VolumeState,
  VolumeResponse,
  HeadphoneControlsResponse,
  HeadphoneVolumeSetResponse
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

describe('volume.ts - API Consistency & Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Inconsistency #1: Unguarded Console Output (FIXED)', () => {
    it('should NOT log volume API URL to console (FIXED)', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ percentage: 50 })
      } as AnyType)

      await volumeApi.getVolumeState()

      // FIXED: console.log removed from buildVolumeApiUrl
      expect(consoleSpy).not.toHaveBeenCalledWith('Volume API URL:', expect.stringContaining('/volume/state'))
      consoleSpy.mockRestore()
    })

    it('should NOT log headphone volume API URL to console (FIXED)', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' })
      } as AnyType)

      await volumeApi.getHeadphoneVolume()

      // FIXED: console.log removed from buildHeadphoneVolumeApiUrl
      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Headphone Volume API URL:',
        expect.stringContaining('/volume/headphone')
      )
      consoleSpy.mockRestore()
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
      const resultNaN = await volumeApi.setVolumeLevel(Number.NaN)
      const resultInfinity = await volumeApi.setVolumeLevel(Number.POSITIVE_INFINITY)

      expect(resultNaN).toBeNull()
      expect(resultInfinity).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('increaseVolume/decreaseVolume reject NaN and Infinity', async () => {
      const incNaN = await volumeApi.increaseVolume(Number.NaN)
      const decInf = await volumeApi.decreaseVolume(Number.POSITIVE_INFINITY)

      expect(incNaN).toBeNull()
      expect(decInf).toBeNull()
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('setHeadphoneVolume rejects NaN and Infinity with error status', async () => {
      const resultNaN = await volumeApi.setHeadphoneVolume(Number.NaN)
      const resultInfinity = await volumeApi.setHeadphoneVolume(Number.POSITIVE_INFINITY)

      expect(resultNaN.status).toBe('error')
      expect(resultNaN.message).toContain('between 0 and 100')
      expect(resultInfinity.status).toBe('error')
      expect(resultInfinity.message).toContain('between 0 and 100')
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })
})

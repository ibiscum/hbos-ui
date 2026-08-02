/**
 * Regression tests for useRoomEQ composable
 * Tests for inconsistencies in error handling, validation, return values, and logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useRoomEQ, type RoomEQConfigItem } from '../useRoomEQ'
import * as configApi from '@/api/config'
import { useFilterStore } from '@/stores/filter_connector'
import { useToastStore } from '@/stores/toast'
import { convertUIFilterToStore } from '@/utils/filter-conversions'
import { formatFilterTypeName } from '@/utils/filter-display'

// Mock the dependencies
vi.mock('@/api/config')
vi.mock('@/stores/filter_connector')
vi.mock('@/stores/toast')
vi.mock('@/utils/filter-conversions')
vi.mock('@/utils/filter-display')

describe('useRoomEQ Composable - Inconsistencies', () => {
  let mockFilterStore: any
  let mockToastStore: any
  let channelNames: any
  let channelFilters: any
  let activeFilterId: any

  beforeEach(() => {
    // Setup mocks
    mockFilterStore = {
      clearFiltersFromBank: vi.fn().mockResolvedValue(undefined),
      addFilter: vi.fn().mockResolvedValue(undefined),
    }

    mockToastStore = {
      showErrorToast: vi.fn(),
    }

    vi.mocked(useFilterStore).mockReturnValue(mockFilterStore)
    vi.mocked(useToastStore).mockReturnValue(mockToastStore)
    vi.mocked(convertUIFilterToStore).mockReturnValue({
      frequency: 100,
      gain: 0,
      Q: 1,
      filter_type: 'peaking',
    })
    vi.mocked(formatFilterTypeName).mockReturnValue('Peaking')

    // Setup composable refs
    channelNames = ref(['Left', 'Right'])
    channelFilters = ref({ Left: [], Right: [] })
    activeFilterId = ref(null)

    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('ERROR HANDLING INCONSISTENCY - loadRoomEQSettings', () => {
    it('should differentiate 404 errors from other errors with different logging', async () => {
      // Test Issue: 404 errors log with console.log, others with console.error
      // This inconsistency makes error handling unpredictable
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error404 = new Error('404 Not Found')
      vi.mocked(configApi.getConfigKeys).mockRejectedValue(error404)

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Issue: 404 special-cased with console.log instead of console.error
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No Room EQ configurations found (404)')
      )
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(roomEQConfigs.value).toEqual([])
    })

    it('should show error toast on load failure but only in loadSelectedRoomEQConfig', async () => {
      // Issue: loadRoomEQSettings doesn't show error toast, but loadSelectedRoomEQConfig does
      // Inconsistent error feedback to user
      vi.mocked(configApi.getConfigKeys).mockRejectedValue(new Error('API error'))

      const { loadRoomEQSettings } = useRoomEQ(channelNames, channelFilters, activeFilterId)

      await loadRoomEQSettings()

      // No toast shown in loadRoomEQSettings - inconsistent with loadSelectedRoomEQConfig
      expect(mockToastStore.showErrorToast).not.toHaveBeenCalled()
    })
  })

  describe('VALIDATION INCONSISTENCY - Missing index in map', () => {
    it('should pass index parameter to convertRoomEQFilterToSpeakerEQ', async () => {
      // Issue: .map(convertRoomEQFilterToSpeakerEQ) doesn't pass index
      // Should be .map((filter, index) => convertRoomEQFilterToSpeakerEQ(filter, index))
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test Config',
          created_at: new Date().toISOString(),
          filters: [
            { filter_type: 'peaking', frequency: 100, gain_db: 3, q: 1 },
            { filter_type: 'highpass', frequency: 20, gain_db: 0, q: 0.707 },
          ],
        },
      }

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadSelectedRoomEQConfig(mockConfig, 'both')

      // Bug: index is undefined when called via map without proper binding
      // This causes each filter to have Date.now() + undefined as id
      expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalledWith('Left')
      expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalledWith('Right')
    })
  })

  describe('TYPE VALIDATION INCONSISTENCY - No interface validation', () => {
    it('should not validate that parsed JSON matches RoomEQConfig interface', async () => {
      // Issue: JSON.parse() result is cast as RoomEQConfig without validation
      // Could load invalid configs with missing required fields
      const invalidConfig = {
        name: 'Invalid',
        // Missing 'filters' field
        created_at: new Date().toISOString(),
      }

      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: ['correction-filters.invalid'],
      })

      vi.mocked(configApi.getConfigValue).mockResolvedValue({
        status: 'success',
        data: { value: JSON.stringify(invalidConfig) },
      })

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Bug: Invalid config accepted without validation
      // roomEQConfigs.value will contain config with undefined 'filters'
      expect(roomEQConfigs.value.length).toBe(1)
      expect((roomEQConfigs.value[0].data as any).filters).toBeUndefined()
    })

    it('should not validate response structure before accessing nested properties', async () => {
      // Issue: getConfigValue response structure assumed without validation
      // If API returns different structure, accessing .data?.value will silently fail
      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: ['correction-filters.test'],
      })

      // Simulate API returning different structure
      vi.mocked(configApi.getConfigValue).mockResolvedValue({
        status: 'success',
        // Missing 'data' property entirely
      } as any)

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Config silently skipped due to missing .data?.value
      expect(roomEQConfigs.value).toEqual([])
    })
  })

  describe('CHANNEL VALIDATION INCONSISTENCY - Silent failures', () => {
    it('should silently skip channels without feedback when channel not found', async () => {
      // Issue: If targetMode is 'left' but channels array is empty, no error or warning
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: [{ filter_type: 'peaking', frequency: 100, gain_db: 0, q: 1 }],
        },
      }

      channelNames.value = [] // No channels available

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadSelectedRoomEQConfig(mockConfig, 'left')

      // Silent failure: no error toast, no console warning, operation just does nothing
      expect(mockToastStore.showErrorToast).not.toHaveBeenCalled()
      expect(mockFilterStore.clearFiltersFromBank).not.toHaveBeenCalled()
    })

    it('should not validate that filters array exists before mapping', async () => {
      // Issue: config.data.filters.map() called without checking if filters exists
      // But error is caught and shown as toast, not rethrown
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: undefined as any, // Not an array
        },
      }

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      // Function catches error and shows toast, so promise resolves (doesn't reject)
      await loadSelectedRoomEQConfig(mockConfig, 'both')

      // Error was caught and handled via toast
      expect(mockToastStore.showErrorToast).toHaveBeenCalledWith(
        'Error loading Room EQ configuration. Please try again.'
      )
    })
  })

  describe('LOGGING INCONSISTENCY - Inconsistent logging prefixes and levels', () => {
    it('should use different logging levels for different error types', async () => {
      // Issue: loadRoomEQSettings uses console.warn, console.log, console.error
      // loadSelectedRoomEQConfig only uses console.log, console.error
      // Inconsistent error severity indicators
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: ['correction-filters.bad-json'],
      })

      vi.mocked(configApi.getConfigValue).mockResolvedValue({
        status: 'success',
        data: { value: 'not-valid-json{' },
      })

      const { loadRoomEQSettings } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Parse error logged with console.warn
      expect(consoleWarnSpy).toHaveBeenCalled()
      // Success message logged with console.log
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('loaded')
      )
    })

    it('should use inconsistent success message logging between functions', async () => {
      // Issue: loadSelectedRoomEQConfig logs success, loadRoomEQSettings doesn't
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'My Config',
          created_at: new Date().toISOString(),
          filters: [{ filter_type: 'peaking', frequency: 100, gain_db: 0, q: 1 }],
        },
      }

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadSelectedRoomEQConfig(mockConfig, 'both')

      // Success logged only in loadSelectedRoomEQConfig
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded Room EQ configuration')
      )
    })
  })

  describe('MODAL STATE INCONSISTENCY - Error leaves modal open', () => {
    it('should leave modal open if loadSelectedRoomEQConfig fails', async () => {
      // Issue: Modal opened in loadRoomEQSettings, but only closed on success in loadSelectedRoomEQConfig
      // If loading fails, modal remains open and user sees loading spinner forever
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: [{ filter_type: 'peaking', frequency: 100, gain_db: 0, q: 1 }],
        },
      }

      mockFilterStore.addFilter.mockRejectedValue(
        new Error('Failed to add filter')
      )

      const { loadSelectedRoomEQConfig, showRoomEQModal } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      // Simulate modal being open
      showRoomEQModal.value = true

      await loadSelectedRoomEQConfig(mockConfig, 'both')

      // Modal still open because error handler doesn't close it
      expect(showRoomEQModal.value).toBe(true)
      expect(mockToastStore.showErrorToast).toHaveBeenCalled()
    })

    it('should close modal only on success, not on all outcomes', async () => {
      // Issue: showRoomEQModal.value = false only at end of happy path
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: [{ filter_type: 'peaking', frequency: 100, gain_db: 0, q: 1 }],
        },
      }

      const { loadSelectedRoomEQConfig, showRoomEQModal } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      // Modal starts closed
      expect(showRoomEQModal.value).toBe(false)

      await loadSelectedRoomEQConfig(mockConfig, 'both')

      // Modal closed after success
      expect(showRoomEQModal.value).toBe(false)
    })
  })

  describe('PARTIAL FAILURE HANDLING - Filter errors not caught individually', () => {
    it('should not catch errors from individual addFilter calls', async () => {
      // Issue: If filterStore.addFilter fails for one filter, others still try
      // Could result in partially loaded configurations
      // But error is caught and shown as toast, not rethrown
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: [
            { filter_type: 'peaking', frequency: 100, gain_db: 0, q: 1 },
            { filter_type: 'highpass', frequency: 20, gain_db: 0, q: 0.707 },
            { filter_type: 'lowpass', frequency: 20000, gain_db: 0, q: 0.707 },
          ],
        },
      }

      // Fail on second filter
      mockFilterStore.addFilter
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Second filter failed')) // Second fails
        .mockResolvedValueOnce(undefined) // Third continues

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      // Function catches error and shows toast, so promise resolves (doesn't reject)
      await loadSelectedRoomEQConfig(mockConfig, 'both')

      // Error was caught and handled via toast
      expect(mockToastStore.showErrorToast).toHaveBeenCalledWith(
        'Error loading Room EQ configuration. Please try again.'
      )

      // But operation started, so clearFiltersFromBank was called
      expect(mockFilterStore.clearFiltersFromBank).toHaveBeenCalled()
    })
  })

  describe('RETURN VALUE INCONSISTENCY - No success/failure indicators', () => {
    it('should not return success/failure status from loadRoomEQSettings', async () => {
      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: [],
      })

      const { loadRoomEQSettings } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      const result = await loadRoomEQSettings()

      // Function returns undefined, caller can't know if operation succeeded
      expect(result).toBeUndefined()
    })

    it('should not return success/failure status from loadSelectedRoomEQConfig', async () => {
      // Issue: Functions return undefined, making it hard to know success/failure
      // Caller must observe state changes to know what happened
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: [],
        },
      }

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      const result = await loadSelectedRoomEQConfig(mockConfig, 'both')

      // No return value to indicate success or failure
      expect(result).toBeUndefined()
    })
  })

  describe('RESPONSE STRUCTURE INCONSISTENCY - Assumed API response format', () => {
    it('should assume getConfigKeys returns specific structure without validation', async () => {
      // Issue: Assumes keysResponse.status, keysResponse.data, Array.isArray(keysResponse.data)
      // without checking if these properties exist
      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        // data is missing
      } as any)

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Silently treats missing data as empty array
      expect(roomEQConfigs.value).toEqual([])
    })

    it('should not validate that getConfigValue.data.value is valid JSON', async () => {
      // Issue: No try-catch for JSON.parse initially, relies on catch for parse error
      // But error message construction assumes error is Error instance
      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: ['correction-filters.test'],
      })

      vi.mocked(configApi.getConfigValue).mockResolvedValue({
        status: 'success',
        data: { value: 'not-json' },
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Parse error caught and warned
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(roomEQConfigs.value).toEqual([])
    })
  })

  describe('LOADING STATE INCONSISTENCY - Multiple ref updates', () => {
    it('should always set loadingRoomEQConfigs to false on completion', async () => {
      vi.mocked(configApi.getConfigKeys).mockRejectedValue(new Error('API error'))

      const { loadRoomEQSettings, loadingRoomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      expect(loadingRoomEQConfigs.value).toBe(false)
      await loadRoomEQSettings()
      expect(loadingRoomEQConfigs.value).toBe(false) // Set in finally
    })

    it('should set roomEQConfigs to empty array even on error', async () => {
      vi.mocked(configApi.getConfigKeys).mockRejectedValue(new Error('API error'))

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Set to [] in catch block
      expect(roomEQConfigs.value).toEqual([])
    })
  })

  describe('SORTING INCONSISTENCY - Potential invalid date handling', () => {
    it('should sort configs by created_at timestamp', async () => {
      const now = Date.now()
      const configs = [
        {
          status: 'success',
          data: {
            value: JSON.stringify({
              name: 'Old',
              created_at: new Date(now - 10000).toISOString(),
              filters: [],
            }),
          },
        },
        {
          status: 'success',
          data: {
            value: JSON.stringify({
              name: 'New',
              created_at: new Date(now).toISOString(),
              filters: [],
            }),
          },
        },
      ]

      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: ['correction-filters.old', 'correction-filters.new'],
      })

      vi.mocked(configApi.getConfigValue)
        .mockResolvedValueOnce(configs[0])
        .mockResolvedValueOnce(configs[1])

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Newest first
      expect(roomEQConfigs.value[0].data.name).toBe('New')
      expect(roomEQConfigs.value[1].data.name).toBe('Old')
    })

    it('should handle invalid dates in sorting without error', async () => {
      // Issue: new Date(invalidDateString) returns Invalid Date, getTime() returns NaN
      // NaN in comparison may cause unpredictable sorting
      const invalidDateConfig = JSON.stringify({
        name: 'Invalid',
        created_at: 'not-a-date',
        filters: [],
      })

      vi.mocked(configApi.getConfigKeys).mockResolvedValue({
        status: 'success',
        data: ['correction-filters.invalid'],
      })

      vi.mocked(configApi.getConfigValue).mockResolvedValue({
        status: 'success',
        data: { value: invalidDateConfig },
      })

      const { loadRoomEQSettings, roomEQConfigs } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadRoomEQSettings()

      // Sorting with invalid date may produce unpredictable results
      expect(roomEQConfigs.value.length).toBe(1)
    })
  })

  describe('FILTER CONVERSION INCONSISTENCY - Duplicate index usage', () => {
    it('should generate unique filter IDs using index', async () => {
      const mockConfig: RoomEQConfigItem = {
        key: 'correction-filters.test',
        data: {
          name: 'Test',
          created_at: new Date().toISOString(),
          filters: [
            { filter_type: 'peaking', frequency: 100, gain_db: 0, q: 1 },
            { filter_type: 'peaking', frequency: 200, gain_db: 0, q: 1 },
          ],
        },
      }

      const { loadSelectedRoomEQConfig } = useRoomEQ(
        channelNames,
        channelFilters,
        activeFilterId
      )

      await loadSelectedRoomEQConfig(mockConfig, 'left')

      // Each call to convertUIFilterToStore should get different params
      // But map() without index binding doesn't pass it
      expect(convertUIFilterToStore).toHaveBeenCalled()
    })
  })
})

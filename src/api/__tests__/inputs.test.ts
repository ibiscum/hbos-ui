import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getInputs,
  type BoundInputDevice,
  type UnboundInputDevice,
  type InputLastKey,
  type KeyboardInputStatus,
  type InputSource,
  type InputsResponse,
} from '@/api/inputs'
import * as httpApi from '@/api/http'
import { useAppConfigStore } from '@/stores/appconfig'

// Create a persistent mock store instance
const createMockConfigStore = () => ({
  getApiBaseUrl: vi.fn(() => 'http://localhost:8080/api/config'),
})

let mockConfigStore = createMockConfigStore()

// Mock dependencies
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => mockConfigStore),
}))

describe('Inputs API', () => {
  let mockApiFetch: typeof httpApi.apiFetch

  beforeEach(() => {
    mockApiFetch = httpApi.apiFetch as typeof httpApi.apiFetch
    mockConfigStore = createMockConfigStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Type Definitions', () => {
    it('should define BoundInputDevice interface', () => {
      const device: BoundInputDevice = {
        path: '/dev/input/event0',
        name: 'USB Keyboard',
        matched_keys: ['KEY_VOLUMEUP', 'KEY_VOLUMEDOWN'],
      }

      expect(device.path).toBe('/dev/input/event0')
      expect(device.name).toBe('USB Keyboard')
      expect(device.matched_keys).toHaveLength(2)
    })

    it('should define UnboundInputDevice interface with reason field', () => {
      const device: UnboundInputDevice = {
        path: '/dev/input/event1',
        name: null,
        reason: 'permission_denied',
      }

      expect(device.path).toBe('/dev/input/event1')
      expect(device.name).toBeNull()
      expect(device.reason).toBe('permission_denied')
    })

    it('should allow all UnboundInputDevice reason types', () => {
      const reasons: UnboundInputDevice['reason'][] = [
        'no_mapped_keys',
        'filtered_out',
        'permission_denied',
      ]

      reasons.forEach((reason) => {
        const device: UnboundInputDevice = {
          path: '/dev/input/event0',
          name: 'Device',
          reason,
        }
        expect(device.reason).toBe(reason)
      })
    })

    it('should define InputLastKey interface', () => {
      const lastKey: InputLastKey = {
        code: 115,
        name: 'KEY_VOLUMEUP',
        action: 'increase_volume',
        device: '/dev/input/event0',
      }

      expect(lastKey.code).toBe(115)
      expect(lastKey.name).toBe('KEY_VOLUMEUP')
      expect(lastKey.action).toBe('increase_volume')
      expect(lastKey.device).toBe('/dev/input/event0')
    })

    it('should allow null values in InputLastKey', () => {
      const lastKey: InputLastKey = {
        code: 0,
        name: null,
        action: null,
        device: '',
      }

      expect(lastKey.name).toBeNull()
      expect(lastKey.action).toBeNull()
    })

    it('should define KeyboardInputStatus interface', () => {
      const status: KeyboardInputStatus = {
        enabled: true,
        volume_step: 5,
        grab: false,
        device_filter: 'usb',
        mapped_keys: 2,
        devices: [
          {
            path: '/dev/input/event0',
            name: 'USB Keyboard',
            matched_keys: ['KEY_VOLUMEUP', 'KEY_VOLUMEDOWN'],
          },
        ],
        unbound_devices: [
          {
            path: '/dev/input/event1',
            name: 'Unknown Device',
            reason: 'permission_denied',
          },
        ],
        last_key: {
          code: 115,
          name: 'KEY_VOLUMEUP',
          action: 'increase_volume',
          device: '/dev/input/event0',
        },
      }

      expect(status.enabled).toBe(true)
      expect(status.volume_step).toBe(5)
      expect(status.grab).toBe(false)
      expect(status.device_filter).toBe('usb')
      expect(status.mapped_keys).toBe(2)
      expect(status.devices).toHaveLength(1)
      expect(status.unbound_devices).toHaveLength(1)
      expect(status.last_key).not.toBeNull()
    })

    it('should support optional unbound_devices in KeyboardInputStatus', () => {
      const statusWithout: KeyboardInputStatus = {
        enabled: true,
        volume_step: 5,
        grab: false,
        device_filter: 'usb',
        mapped_keys: 0,
        devices: [],
        last_key: null,
      }

      expect(statusWithout.unbound_devices).toBeUndefined()
    })

    it('should define InputSource interface', () => {
      const source: InputSource = {
        name: 'Audiocontrol',
        status: {
          enabled: true,
          volume_step: 5,
          grab: false,
          device_filter: 'usb',
          mapped_keys: 2,
          devices: [],
          last_key: null,
        },
      }

      expect(source.name).toBe('Audiocontrol')
      expect(source.status.enabled).toBe(true)
    })

    it('should define InputsResponse interface', () => {
      const response: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 2,
              devices: [],
              last_key: null,
            },
          },
        ],
      }

      expect(response.inputs).toHaveLength(1)
      expect(response.inputs[0].name).toBe('Audiocontrol')
    })
  })

  describe('getInputs - Success Cases', () => {
    it('should return InputsResponse on successful fetch', async () => {
      const mockResponse: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 2,
              devices: [
                {
                  path: '/dev/input/event0',
                  name: 'USB Keyboard',
                  matched_keys: ['KEY_VOLUMEUP', 'KEY_VOLUMEDOWN'],
                },
              ],
              last_key: {
                code: 115,
                name: 'KEY_VOLUMEUP',
                action: 'increase_volume',
                device: '/dev/input/event0',
              },
            },
          },
        ],
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toEqual(mockResponse)
      expect(result?.inputs).toHaveLength(1)
      expect(result?.inputs[0].name).toBe('Audiocontrol')
      expect(mockApiFetch).toHaveBeenCalledWith('http://localhost:8080/api/config/inputs')
    })

    it('should handle multiple input sources', async () => {
      const mockResponse: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 2,
              devices: [],
              last_key: null,
            },
          },
          {
            name: 'Alternative Source',
            status: {
              enabled: false,
              volume_step: 1,
              grab: true,
              device_filter: 'hid',
              mapped_keys: 0,
              devices: [],
              last_key: null,
            },
          },
        ],
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result?.inputs).toHaveLength(2)
      expect(result?.inputs[1].name).toBe('Alternative Source')
    })

    it('should handle response with unbound_devices', async () => {
      const mockResponse: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 1,
              devices: [
                {
                  path: '/dev/input/event0',
                  name: 'USB Keyboard',
                  matched_keys: ['KEY_VOLUMEUP'],
                },
              ],
              unbound_devices: [
                {
                  path: '/dev/input/event1',
                  name: 'Mouse Device',
                  reason: 'no_mapped_keys',
                },
                {
                  path: '/dev/input/event2',
                  name: null,
                  reason: 'permission_denied',
                },
              ],
              last_key: null,
            },
          },
        ],
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result?.inputs[0].status.unbound_devices).toHaveLength(2)
      expect(result?.inputs[0].status.unbound_devices?.[0].reason).toBe('no_mapped_keys')
      expect(result?.inputs[0].status.unbound_devices?.[1].name).toBeNull()
    })

    it('should handle empty inputs array', async () => {
      const mockResponse: InputsResponse = {
        inputs: [],
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result?.inputs).toHaveLength(0)
      expect(Array.isArray(result?.inputs)).toBe(true)
    })

    it('should handle response with no last_key', async () => {
      const mockResponse: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 2,
              devices: [],
              last_key: null,
            },
          },
        ],
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result?.inputs[0].status.last_key).toBeNull()
    })

    it('should handle status code 200 with OK flag', async () => {
      const mockResponse: InputsResponse = {
        inputs: [],
      }

      const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).not.toBeNull()
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getInputs - HTTP Error Cases', () => {
    it('should return null on 404 Not Found', async () => {
      const mockFetchResponse = new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on 500 Internal Server Error', async () => {
      const mockFetchResponse = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on 403 Forbidden', async () => {
      const mockFetchResponse = new Response('Forbidden', {
        status: 403,
        statusText: 'Forbidden',
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on 401 Unauthorized', async () => {
      const mockFetchResponse = new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on 503 Service Unavailable', async () => {
      const mockFetchResponse = new Response('Service Unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on any non-ok status', async () => {
      const nonOkStatuses = [400, 401, 403, 404, 500, 502, 503]

      for (const status of nonOkStatuses) {
        vi.clearAllMocks()

        const mockFetchResponse = new Response('Error', {
          status,
          statusText: 'Error',
        })

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getInputs()

        expect(result).toBeNull()
      }
    })
  })

  describe('getInputs - Network Error Cases', () => {
    it('should return null on network error', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(
        new Error('Network request failed')
      )

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on timeout error', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on fetch abort', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(
        new Error('The operation was aborted')
      )

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should return null on any exception', async () => {
      vi.mocked(mockApiFetch).mockRejectedValueOnce(
        new TypeError('Cannot read properties of undefined')
      )

      const result = await getInputs()

      expect(result).toBeNull()
    })
  })

  describe('getInputs - JSON Parsing Cases', () => {
    it('should return null when response.json() throws', async () => {
      const mockFetchResponse = new Response('Invalid JSON', {
        status: 200,
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should handle malformed JSON response', async () => {
      const mockFetchResponse = new Response('{ invalid json }', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })

    it('should handle empty response body', async () => {
      const mockFetchResponse = new Response('', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toBeNull()
    })
  })

  describe('getInputs - URL Construction', () => {
    it('should call apiFetch with correct URL', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({ inputs: [] }),
        { status: 200 }
      )

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getInputs()

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/config/inputs'
      )
    })

    it('should use correct base URL from config store', async () => {
      mockConfigStore.getApiBaseUrl = vi.fn(() => 'http://custom:9000/api')

      const mockFetchResponse = new Response(
        JSON.stringify({ inputs: [] }),
        { status: 200 }
      )

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getInputs()

      expect(mockApiFetch).toHaveBeenCalledWith('http://custom:9000/api/inputs')
    })

    it('should handle base URL without trailing slash', async () => {
      mockConfigStore.getApiBaseUrl = vi.fn(() => 'http://localhost:8080/api/config')

      const mockFetchResponse = new Response(
        JSON.stringify({ inputs: [] }),
        { status: 200 }
      )

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getInputs()

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/config/inputs'
      )
    })
  })

  describe('getInputs - Regression Tests', () => {
    it('should not modify response data', async () => {
      const originalResponse: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 2,
              devices: [
                {
                  path: '/dev/input/event0',
                  name: 'USB Keyboard',
                  matched_keys: ['KEY_VOLUMEUP', 'KEY_VOLUMEDOWN'],
                },
              ],
              last_key: {
                code: 115,
                name: 'KEY_VOLUMEUP',
                action: 'increase_volume',
                device: '/dev/input/event0',
              },
            },
          },
        ],
      }

      const mockFetchResponse = new Response(JSON.stringify(originalResponse), {
        status: 200,
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toEqual(originalResponse)
      expect(JSON.stringify(result)).toBe(JSON.stringify(originalResponse))
    })

    it('should return null consistently on repeated failures', async () => {
      const mockFetchResponse = new Response('Error', { status: 500 })

      vi.mocked(mockApiFetch).mockResolvedValue(mockFetchResponse)

      const result1 = await getInputs()
      const result2 = await getInputs()
      const result3 = await getInputs()

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(result3).toBeNull()
    })

    it('should handle consecutive calls with different results', async () => {
      const successResponse: InputsResponse = {
        inputs: [
          {
            name: 'Audiocontrol',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 2,
              devices: [],
              last_key: null,
            },
          },
        ],
      }

      // Create separate Response objects for each call since Response body can only be consumed once
      vi.mocked(mockApiFetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(successResponse), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response('Error', { status: 500 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(successResponse), { status: 200 })
        )

      const result1 = await getInputs()
      const result2 = await getInputs()
      const result3 = await getInputs()

      expect(result1).not.toBeNull()
      expect(result2).toBeNull()
      expect(result3).not.toBeNull()
    })

    it('should call apiFetch exactly once per call', async () => {
      const mockFetchResponse = new Response(
        JSON.stringify({ inputs: [] }),
        { status: 200 }
      )

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getInputs()

      expect(mockApiFetch).toHaveBeenCalledTimes(1)

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      await getInputs()

      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })

    it('should not cache results', async () => {
      const response1: InputsResponse = { inputs: [] }
      const response2: InputsResponse = {
        inputs: [
          {
            name: 'New Source',
            status: {
              enabled: true,
              volume_step: 5,
              grab: false,
              device_filter: 'usb',
              mapped_keys: 0,
              devices: [],
              last_key: null,
            },
          },
        ],
      }

      const mockFetchResponse1 = new Response(JSON.stringify(response1), {
        status: 200,
      })

      const mockFetchResponse2 = new Response(JSON.stringify(response2), {
        status: 200,
      })

      vi.mocked(mockApiFetch)
        .mockResolvedValueOnce(mockFetchResponse1)
        .mockResolvedValueOnce(mockFetchResponse2)

      const result1 = await getInputs()
      const result2 = await getInputs()

      expect(result1?.inputs).toHaveLength(0)
      expect(result2?.inputs).toHaveLength(1)
      expect(result1).not.toEqual(result2)
    })

    it('should handle response with minimal data', async () => {
      const minimalResponse: InputsResponse = {
        inputs: [
          {
            name: '',
            status: {
              enabled: false,
              volume_step: 0,
              grab: false,
              device_filter: '',
              mapped_keys: 0,
              devices: [],
              last_key: null,
            },
          },
        ],
      }

      const mockFetchResponse = new Response(JSON.stringify(minimalResponse), {
        status: 200,
      })

      vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

      const result = await getInputs()

      expect(result).toEqual(minimalResponse)
    })
  })
})

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getConfigApiBaseUrl: () => 'http://host/api/config/v1',
  }),
}))

vi.mock('@/api/http', () => ({
  apiFetch: vi.fn(),
}))

import {
  getAllConfig,
  getConfigKeys,
  getConfigValue,
  setConfigValue,
  updateConfigValue,
  deleteConfigValue,
  getVolume,
  setVolume,
  getSoundcard,
  setSoundcard,
  getSystemdServices,
  getSystemdServiceStatus,
  checkSystemdServiceExists,
  executeSystemdOperation,
  enableService,
  disableService,
  enableNowService,
  disableNowService,
  restartService,
  getMultipleServiceStatus,
  getNetworkConfiguration,
  scanI2CDevices,
  getExternalPlayers,
  saveExternalPlayerSettings,
  type ConfigApiResponse,
  type ConfigKeyValue,
  type SystemdServiceDetails,
  type SystemdServicesList,
  type SystemdServiceExists,
  type NetworkConfiguration,
  type I2CDeviceInfo,
  type ExternalPlayer,
} from '@/api/config'
import { apiFetch } from '@/api/http'

type MockResponse = {
  ok: boolean
  status?: number
  statusText?: string
  json: () => Promise<unknown>
  headers?: {
    get: (key: string) => string | null
  }
}

const mockApiFetch = vi.mocked(apiFetch)

const okResponse = (body: unknown): MockResponse => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  headers: {
    get: () => null,
  },
})

const errorResponse = (status: number, statusText: string): MockResponse => ({
  ok: false,
  status,
  statusText,
  json: async () => ({ status: 'error', message: statusText }),
  headers: {
    get: () => null,
  },
})

describe('config.ts - comprehensive unit and regression tests', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockApiFetch.mockResolvedValue(okResponse({ status: 'success', data: {} }) as never)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // ============================================================================
  // Core Configuration API Tests
  // ============================================================================

  describe('getAllConfig', () => {
    it('fetches all configuration without prefix', async () => {
      const mockData = { key1: 'value1', key2: 'value2' }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockData }) as never
      )

      const result = await getAllConfig()

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1')
      expect(result.data).toEqual(mockData)
    })

    it('encodes prefix query parameter', async () => {
      await getAllConfig('a/b c')
      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1?prefix=a%2Fb%20c')
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)
      await expect(getAllConfig()).rejects.toThrow('Failed to get config: 500 Server Error')
    })
  })

  describe('getConfigKeys', () => {
    it('fetches configuration keys without prefix', async () => {
      const mockKeys = ['key1', 'key2', 'key3']
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockKeys }) as never
      )

      const result = await getConfigKeys()

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/keys')
      expect(result.data).toEqual(mockKeys)
    })

    it('filters keys by prefix', async () => {
      await getConfigKeys('service.')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/keys?prefix=service.'
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(404, 'Not Found') as never)
      await expect(getConfigKeys()).rejects.toThrow('Failed to get config keys: 404 Not Found')
    })
  })

  describe('getConfigValue', () => {
    it('fetches plain configuration value', async () => {
      const mockValue: ConfigKeyValue = { key: 'volume', value: '50' }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockValue }) as never
      )

      const result = await getConfigValue('volume')

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/key/volume')
      expect(result.data).toEqual(mockValue)
    })

    it('uses secure endpoint when secure=true', async () => {
      await getConfigValue('spotify_secret', true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/spotify_secret/secure'
      )
    })

    it('preserves empty-string default value in query', async () => {
      await getConfigValue('service.key', false, '')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/service.key?default='
      )
    })

    it('omits undefined default from query', async () => {
      await getConfigValue('service.key', false, undefined)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/service.key'
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized') as never)
      await expect(getConfigValue('secret')).rejects.toThrow(
        'Failed to get config value: 401 Unauthorized'
      )
    })
  })

  describe('setConfigValue', () => {
    it('sets plain configuration value', async () => {
      const mockValue: ConfigKeyValue = { key: 'volume', value: '75' }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockValue }) as never
      )

      const result = await setConfigValue('volume', '75')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/volume',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: '75' }),
        }
      )
      expect(result.data).toEqual(mockValue)
    })

    it('sets secure configuration value', async () => {
      await setConfigValue('spotify_secret', 'secret123', true)

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/spotify_secret',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ value: 'secret123', secure: true }),
        })
      )
    })

    it('encodes special characters in key', async () => {
      await setConfigValue('audio/output', 'hdmi')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/audio%2Foutput',
        expect.any(Object)
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden') as never)
      await expect(setConfigValue('volume', '50')).rejects.toThrow(
        'Failed to set config value: 403 Forbidden'
      )
    })
  })

  describe('updateConfigValue', () => {
    it('updates configuration value with PUT method', async () => {
      await updateConfigValue('volume', '100')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/volume',
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('updates secure configuration value', async () => {
      await updateConfigValue('password', 'newpass', true)

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/password',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ value: 'newpass', secure: true }),
        })
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(409, 'Conflict') as never)
      await expect(updateConfigValue('volume', '50')).rejects.toThrow(
        'Failed to update config value: 409 Conflict'
      )
    })
  })

  describe('deleteConfigValue', () => {
    it('deletes configuration value', async () => {
      await deleteConfigValue('volume')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/volume',
        { method: 'DELETE' }
      )
    })

    it('encodes key in path', async () => {
      await deleteConfigValue('user/settings')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/user%2Fsettings',
        { method: 'DELETE' }
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(404, 'Not Found') as never)
      await expect(deleteConfigValue('nonexistent')).rejects.toThrow(
        'Failed to delete config value: 404 Not Found'
      )
    })
  })

  // ============================================================================
  // Convenience Functions
  // ============================================================================

  describe('getVolume', () => {
    it('returns volume value on success', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: { key: 'volume', value: '50' } }) as never
      )

      const result = await getVolume()

      expect(result).toBe('50')
    })

    it('returns null when volume key not found', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'error', message: 'Key not found' }) as never
      )

      const result = await getVolume()

      expect(result).toBeNull()
    })

    it('returns null and logs error on fetch failure', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)

      const result = await getVolume()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('setVolume', () => {
    it('returns true on success', async () => {
      const result = await setVolume('75')

      expect(result).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/volume',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('returns false and logs error on fetch failure', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden') as never)

      const result = await setVolume('75')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('getSoundcard', () => {
    it('returns soundcard value on success', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: { key: 'soundcard', value: 'hifiberry' } }) as never
      )

      const result = await getSoundcard()

      expect(result).toBe('hifiberry')
    })

    it('returns null and logs error on failure', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)

      const result = await getSoundcard()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('setSoundcard', () => {
    it('returns true on success', async () => {
      const result = await setSoundcard('alsa')

      expect(result).toBe(true)
    })

    it('returns false and logs error on failure', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)

      const result = await setSoundcard('alsa')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Systemd Service Management
  // ============================================================================

  describe('getSystemdServices', () => {
    it('fetches list of all systemd services', async () => {
      const mockServices: SystemdServicesList = {
        services: [
          {
            service: 'mpd',
            permission_level: 'user',
            allowed_operations: ['start', 'stop'],
            active: 'active',
            enabled: 'enabled',
          },
        ],
        count: 1,
      }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockServices }) as never
      )

      const result = await getSystemdServices()

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/systemd/services')
      expect(result.data).toEqual(mockServices)
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)
      await expect(getSystemdServices()).rejects.toThrow(
        'Failed to get systemd services: 500 Server Error'
      )
    })
  })

  describe('getSystemdServiceStatus', () => {
    it('fetches status of specific service', async () => {
      const mockStatus: SystemdServiceDetails = {
        service: 'mpd',
        active: 'active',
        enabled: 'enabled',
        status_output: 'running',
        status_returncode: 0,
        allowed_operations: ['start', 'stop'],
      }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockStatus }) as never
      )

      const result = await getSystemdServiceStatus('mpd')

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/systemd/service/mpd')
      expect(result.data).toEqual(mockStatus)
    })

    it('encodes service name in URL', async () => {
      await getSystemdServiceStatus('mpd/music-player')
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd%2Fmusic-player'
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(404, 'Not Found') as never)
      await expect(getSystemdServiceStatus('unknown')).rejects.toThrow(
        'Failed to get service status: 404 Not Found'
      )
    })
  })

  describe('checkSystemdServiceExists', () => {
    it('checks if service exists', async () => {
      const mockExists: SystemdServiceExists = { service: 'mpd', exists: true }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockExists }) as never
      )

      const result = await checkSystemdServiceExists('mpd')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd/exists'
      )
      expect(result.data).toEqual(mockExists)
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)
      await expect(checkSystemdServiceExists('mpd')).rejects.toThrow(
        'Failed to check service existence: 500 Server Error'
      )
    })
  })

  describe('executeSystemdOperation', () => {
    it('executes start operation', async () => {
      await executeSystemdOperation('mpd', 'start')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd/start',
        { method: 'POST' }
      )
    })

    it('encodes service name and operation in path', async () => {
      await executeSystemdOperation('user/service', 'enable-now')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/user%2Fservice/enable-now',
        { method: 'POST' }
      )
    })

    it('throws on HTTP error with operation context', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden') as never)
      await expect(executeSystemdOperation('mpd', 'restart')).rejects.toThrow(
        'Failed to execute restart on mpd: 403 Forbidden'
      )
    })
  })

  // ============================================================================
  // Service Orchestration Convenience Functions
  // ============================================================================

  describe('enableService', () => {
    it('enables and starts service on success', async () => {
      mockApiFetch
        .mockResolvedValueOnce(okResponse({ status: 'success' }) as never)
        .mockResolvedValueOnce(okResponse({ status: 'success' }) as never)

      const result = await enableService('mpd')

      expect(result).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })

    it('stops and returns false if enable fails', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'error', message: 'no permission' }) as never
      )

      const result = await enableService('mpd')

      expect(result).toBe(false)
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('returns false if start fails after enable succeeds', async () => {
      mockApiFetch
        .mockResolvedValueOnce(okResponse({ status: 'success' }) as never)
        .mockResolvedValueOnce(
          okResponse({ status: 'error', message: 'Service failed to start' }) as never
        )

      const result = await enableService('mpd')

      expect(result).toBe(false)
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })

    it('throws if enable operation fails with exception', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(enableService('mpd')).rejects.toThrow('Network error')
    })
  })

  describe('disableService', () => {
    it('stops and disables service on success', async () => {
      mockApiFetch
        .mockResolvedValueOnce(okResponse({ status: 'success' }) as never)
        .mockResolvedValueOnce(okResponse({ status: 'success' }) as never)

      const result = await disableService('mpd')

      expect(result).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })

    it('returns false if stop fails', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'error', message: 'Cannot stop' }) as never
      )

      const result = await disableService('mpd')

      expect(result).toBe(false)
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('throws if stop operation fails with exception', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Connection timeout'))

      await expect(disableService('mpd')).rejects.toThrow('Connection timeout')
    })
  })

  describe('enableNowService', () => {
    it('returns true when enable-now succeeds', async () => {
      const result = await enableNowService('mpd')

      expect(result).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd/enable-now',
        { method: 'POST' }
      )
    })

    it('returns false when enable-now fails in response', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'error', message: 'Failed' }) as never
      )

      const result = await enableNowService('mpd')

      expect(result).toBe(false)
    })

    it('throws if operation fails with exception', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(enableNowService('mpd')).rejects.toThrow('Network error')
    })
  })

  describe('disableNowService', () => {
    it('returns true when disable-now succeeds', async () => {
      const result = await disableNowService('mpd')

      expect(result).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd/disable-now',
        { method: 'POST' }
      )
    })

    it('returns false when disable-now fails in response', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'error', message: 'Failed' }) as never
      )

      const result = await disableNowService('mpd')

      expect(result).toBe(false)
    })

    it('throws if operation fails with exception', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(disableNowService('mpd')).rejects.toThrow('Forbidden')
    })
  })

  describe('restartService', () => {
    it('returns true on successful restart', async () => {
      const result = await restartService('mpd')

      expect(result).toBe(true)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd/restart',
        { method: 'POST' }
      )
    })

    it('returns false when restart fails in response', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'error', message: 'Service not found' }) as never
      )

      const result = await restartService('mpd')

      expect(result).toBe(false)
    })

    it('throws if operation fails with exception', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Timeout'))

      await expect(restartService('mpd')).rejects.toThrow('Timeout')
    })
  })

  describe('getMultipleServiceStatus', () => {
    it('fetches status for multiple services', async () => {
      const mockStatus1: SystemdServiceDetails = {
        service: 'mpd',
        active: 'active',
        enabled: 'enabled',
        status_output: '',
        status_returncode: 0,
        allowed_operations: [],
      }
      const mockStatus2: SystemdServiceDetails = {
        service: 'shairport',
        active: 'inactive',
        enabled: 'disabled',
        status_output: '',
        status_returncode: 3,
        allowed_operations: [],
      }

      mockApiFetch
        .mockResolvedValueOnce(okResponse({ status: 'success', data: mockStatus1 }) as never)
        .mockResolvedValueOnce(okResponse({ status: 'success', data: mockStatus2 }) as never)

      const result = await getMultipleServiceStatus(['mpd', 'shairport'])

      expect(result.size).toBe(2)
      expect(result.get('mpd')).toEqual(mockStatus1)
      expect(result.get('shairport')).toEqual(mockStatus2)
    })

    it('returns null for failed service status fetches', async () => {
      mockApiFetch
        .mockResolvedValueOnce(okResponse({ status: 'success', data: {} }) as never)
        .mockResolvedValueOnce(errorResponse(404, 'Not Found') as never)

      const result = await getMultipleServiceStatus(['mpd', 'unknown'])

      expect(result.get('mpd')).toBeTruthy()
      expect(result.get('unknown')).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Network Configuration
  // ============================================================================

  describe('getNetworkConfiguration', () => {
    it('fetches network configuration', async () => {
      const mockConfig: NetworkConfiguration = {
        hostname: 'hifiberry',
        default_gateway: '192.168.1.1',
        dns_servers: ['8.8.8.8'],
        interfaces: [],
      }
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: mockConfig }) as never
      )

      const result = await getNetworkConfiguration()

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/network')
      expect(result.data).toEqual(mockConfig)
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)
      await expect(getNetworkConfiguration()).rejects.toThrow(
        'Failed to get network configuration: 500 Server Error'
      )
    })
  })

  // ============================================================================
  // I2C Device Management
  // ============================================================================

  describe('scanI2CDevices', () => {
    it('scans I2C devices without bus parameter', async () => {
      await scanI2CDevices()

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/i2c/devices')
    })

    it('scans specific I2C bus', async () => {
      await scanI2CDevices(1)

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/i2c/devices?bus=1')
    })

    it('validates bus number range 0-10', async () => {
      await expect(scanI2CDevices(-1)).rejects.toThrow(
        'I2C bus number must be an integer between 0 and 10'
      )
      await expect(scanI2CDevices(11)).rejects.toThrow(
        'I2C bus number must be an integer between 0 and 10'
      )
    })

    it('rejects non-integer bus numbers', async () => {
      await expect(scanI2CDevices(1.5)).rejects.toThrow(
        'I2C bus number must be an integer between 0 and 10'
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)
      await expect(scanI2CDevices()).rejects.toThrow(
        'Failed to scan I2C devices: 500 Server Error'
      )
    })
  })

  // ============================================================================
  // External Player Management
  // ============================================================================

  describe('getExternalPlayers', () => {
    it('fetches external players', async () => {
      const mockPlayers: ExternalPlayer[] = [
        {
          name: 'LibreSpot',
          provided_by: 'librespot-service',
          systemd_service: 'librespot',
          icon_url: '/api/v1/players/librespot.svg',
          allow_change: true,
          maintainer_name: 'librespot team',
          maintainer_url: 'https://librespot.org',
        },
      ]
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: { players: mockPlayers } }) as never
      )

      const result = await getExternalPlayers()

      expect(result.length).toBe(1)
      expect(result[0].name).toBe('LibreSpot')
    })

    it('rewrites icon URLs to use config API proxy', async () => {
      const mockPlayers: ExternalPlayer[] = [
        {
          name: 'LibreSpot',
          provided_by: 'librespot-service',
          systemd_service: 'librespot',
          icon_url: '/api/v1/players/librespot.svg',
          allow_change: true,
          maintainer_name: 'team',
          maintainer_url: 'https://test.com',
        },
      ]
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: { players: mockPlayers } }) as never
      )

      const result = await getExternalPlayers()

      expect(result[0].icon_url).toBe('http://host/api/config/v1/players/librespot.svg')
    })

    it('returns empty array on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error') as never)

      const result = await getExternalPlayers()

      expect(result).toEqual([])
    })

    it('returns empty array when response lacks players data', async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse({ status: 'success', data: {} }) as never
      )

      const result = await getExternalPlayers()

      expect(result).toEqual([])
    })
  })

  describe('saveExternalPlayerSettings', () => {
    it('encodes systemd service name in settings endpoint path', async () => {
      await saveExternalPlayerSettings('pipewire filter/chain', { enabled: true })

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/players/pipewire%20filter%2Fchain/settings',
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('sends settings as JSON body', async () => {
      const settings = { enabled: true, volume: 80 }
      await saveExternalPlayerSettings('mpd', settings)

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/players/mpd/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        })
      )
    })

    it('throws on HTTP error', async () => {
      mockApiFetch.mockResolvedValueOnce(errorResponse(400, 'Bad Request') as never)

      await expect(
        saveExternalPlayerSettings('mpd', { enabled: false })
      ).rejects.toThrow('Failed to save player settings: 400')
    })
  })
})

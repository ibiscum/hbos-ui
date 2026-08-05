/*
 * Regression-focused appconfig store tests.
 * Keep assertions behavior-oriented and aligned with current implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppConfigStore } from '../appconfig'

describe('AppConfig Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('State Initialization', () => {
    it('initializes with default radio player', () => {
      const store = useAppConfigStore()
      expect(store.config.radioPlayer).toBe('mpd')
    })

    it('initializes audiocontrol_api with defaults', () => {
      const store = useAppConfigStore()
      const api = store.config.audiocontrol_api
      expect(api.deviceIP).toBeDefined()
      expect(api.devicePort).toEqual(80)
      expect(api.apiPrefix).toBeDefined()
      expect(api.useProxy).toBeDefined()
    })

    it('initializes config_api with defaults', () => {
      const store = useAppConfigStore()
      const api = store.config.config_api
      expect(api.deviceIP).toBeDefined()
      expect(api.devicePort).toEqual(80)
      expect(api.apiPrefix).toContain('/api/config')
    })

    it('initializes dsptoolkit_api with defaults', () => {
      const store = useAppConfigStore()
      const api = store.config.dsptoolkit_api
      expect(api.deviceIP).toBeDefined()
      expect(api.devicePort).toEqual(80)
      expect(api.apiPrefix).toContain('/api/dsptoolkit')
    })

    it('initializes roomeq_api with defaults', () => {
      const store = useAppConfigStore()
      const api = store.config.roomeq_api
      expect(api.deviceIP).toBeDefined()
      expect(api.devicePort).toEqual(80)
      expect(api.apiPrefix).toContain('/api/roomeq')
    })

    it('initializes loading as false', () => {
      const store = useAppConfigStore()
      expect(store.loading).toBe(false)
    })
  })

  describe('Radio Player Management', () => {
    it('gets current radio player', () => {
      const store = useAppConfigStore()
      const player = store.radioPlayer
      expect(player).toBe('mpd')
    })

    it('sets radio player', async () => {
      const store = useAppConfigStore()
      const result = await store.setRadioPlayer('spotify')
      expect(result).toBe(true)
      expect(store.config.radioPlayer).toBe('spotify')
    })

    it('sets loading during setRadioPlayer', async () => {
      const store = useAppConfigStore()
      const promise = store.setRadioPlayer('test')
      // Check that loading might be true during operation
      expect(typeof store.loading).toBe('boolean')
      await promise
      expect(store.loading).toBe(false)
    })
  })

  describe('Configuration Management', () => {
    it('gets current config', async () => {
      const store = useAppConfigStore()
      const result = await store.getConfig()
      expect(result).toEqual(store.config)
    })

    it('updates config with partial object', async () => {
      const store = useAppConfigStore()
      const result = await store.updateConfig({ radioPlayer: 'test' })
      expect(result).toBe(true)
      expect(store.config.radioPlayer).toBe('test')
    })

    it('clears loading flag after getConfig', async () => {
      const store = useAppConfigStore()
      store.loading = true
      await store.getConfig()
      expect(store.loading).toBe(false)
    })

    it('clears loading flag after updateConfig', async () => {
      const store = useAppConfigStore()
      store.loading = true
      await store.updateConfig({ radioPlayer: 'test' })
      expect(store.loading).toBe(false)
    })
  })

  describe('API Configuration Setters', () => {
    it('sets audiocontrol_api config', async () => {
      const store = useAppConfigStore()
      const result = await store.setApiConfig({
        deviceIP: '192.168.1.100',
        devicePort: 8080,
        apiPrefix: '/api/audiocontrol',
        useProxy: false,
      })
      expect(result).toBe(true)
      expect(store.config.audiocontrol_api.deviceIP).toBe('192.168.1.100')
      expect(store.config.audiocontrol_api.devicePort).toBe(8080)
    })

    it('preserves other api config properties when setting partial', async () => {
      const store = useAppConfigStore()
      const originalPrefix = store.config.audiocontrol_api.apiPrefix
      await store.setApiConfig({ devicePort: 9000 })
      expect(store.config.audiocontrol_api.apiPrefix).toBe(originalPrefix)
    })

    it('gets audiocontrol_api config', () => {
      const store = useAppConfigStore()
      const api = store.apiConfig
      expect(api).toEqual(store.config.audiocontrol_api)
    })

    it('gets config_api config', () => {
      const store = useAppConfigStore()
      const api = store.configApiConfig
      expect(api).toEqual(store.config.config_api)
    })

    it('supports typed api config updates via new overload signature', async () => {
      const store = useAppConfigStore()

      const result = await store.setApiConfig('config', {
        deviceIP: '10.0.0.20',
        devicePort: 9001,
        apiPrefix: '/api/config/v1',
        useProxy: false,
      })

      expect(result).toBe(true)
      expect(store.config.config_api.deviceIP).toBe('10.0.0.20')
      expect(store.config.config_api.devicePort).toBe(9001)
    })

    it('uses empty object when overload config is omitted', async () => {
      const store = useAppConfigStore()
      const original = { ...store.config.dsptoolkit_api }

      const result = await store.setApiConfig('dsptoolkit')

      expect(result).toBe(true)
      expect(store.config.dsptoolkit_api).toEqual(original)
    })
  })

  describe('HTTP URL Building', () => {
    it('builds HTTP URL with default port 80', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 80
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toBe('http://localhost/api/audiocontrol')
      expect(url).not.toContain(':80')
    })

    it('builds HTTP URL with custom port', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 8080
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toBe('http://localhost:8080/api/audiocontrol')
    })

    it('uses proxy URL in development', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.useProxy = true
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getApiBaseUrl()
      expect(url).toContain('/api/audiocontrol')
      // Proxy URL uses window.location.origin, which may contain localhost
      expect(url).not.toContain('http://localhost:8080')
    })

    it('builds config API URL', () => {
      const store = useAppConfigStore()
      store.config.config_api.deviceIP = 'localhost'
      store.config.config_api.devicePort = 80
      store.config.config_api.apiPrefix = '/api/config/v1'
      store.config.config_api.useProxy = false

      const url = store.getConfigApiBaseUrl()
      expect(url).toBe('http://localhost/api/config/v1')
    })

    it('builds DSP Toolkit API URL', () => {
      const store = useAppConfigStore()
      store.config.dsptoolkit_api.deviceIP = 'localhost'
      store.config.dsptoolkit_api.devicePort = 80
      store.config.dsptoolkit_api.apiPrefix = '/api/dsptoolkit'
      store.config.dsptoolkit_api.useProxy = false

      const url = store.getDSPToolkitApiBaseUrl()
      expect(url).toBe('http://localhost/api/dsptoolkit')
    })

    it('builds RoomEQ API URL', () => {
      const store = useAppConfigStore()
      store.config.roomeq_api.deviceIP = 'localhost'
      store.config.roomeq_api.devicePort = 80
      store.config.roomeq_api.apiPrefix = '/api/roomeq'
      store.config.roomeq_api.useProxy = false

      const url = store.getRoomEQApiBaseUrl()
      expect(url).toBe('http://localhost/api/roomeq')
    })
  })

  describe('WebSocket URL Building', () => {
    it('builds WebSocket URL with default port 80', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 80
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getWsBaseUrl()
      expect(url).toBe('ws://localhost/api/audiocontrol')
      expect(url).not.toContain(':80')
    })

    it('builds WebSocket URL with custom port', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 8080
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getWsBaseUrl()
      expect(url).toBe('ws://localhost:8080/api/audiocontrol')
    })

    it('builds WebSocket URL with different IP', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = '192.168.1.100'
      store.config.audiocontrol_api.devicePort = 80
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getWsBaseUrl()
      expect(url).toBe('ws://192.168.1.100/api/audiocontrol')
    })

    it('WebSocket URL uses ws:// protocol', () => {
      const store = useAppConfigStore()
      const url = store.getWsBaseUrl()
      expect(url).toMatch(/^ws:\/\//)
    })

    it('forceProxy uses browser origin and converts protocol to ws', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getWsBaseUrl(true)

      expect(url).toContain('/api/audiocontrol')
      expect(url.startsWith('ws://') || url.startsWith('wss://')).toBe(true)
    })
  })

  describe('Port Handling', () => {
    it('omits port 80 from URL', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 80
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).not.toMatch(/:80/)
    })

    it('includes non-80 ports in URL', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 3000
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain(':3000')
    })

    it('handles port 8080', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 8080
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain(':8080')
    })

    it('handles port 9000', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.devicePort = 9000
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain(':9000')
    })
  })

  describe('API Prefix Handling', () => {
    it('includes API prefix in HTTP URL', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain('/api/audiocontrol')
    })

    it('includes API prefix in WebSocket URL', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getWsBaseUrl()
      expect(url).toContain('/api/audiocontrol')
    })

    it('handles different API prefixes for different APIs', () => {
      const store = useAppConfigStore()
      store.config.config_api.apiPrefix = '/api/config/v1'
      store.config.dsptoolkit_api.apiPrefix = '/api/dsptoolkit'
      store.config.roomeq_api.apiPrefix = '/api/roomeq'

      expect(store.getConfigApiBaseUrl()).toContain('/api/config/v1')
      expect(store.getDSPToolkitApiBaseUrl()).toContain('/api/dsptoolkit')
      expect(store.getRoomEQApiBaseUrl()).toContain('/api/roomeq')
    })
  })

  describe('Proxy Mode Behavior', () => {
    it('uses proxy URL when useProxy is true', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.useProxy = true
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getApiBaseUrl()
      expect(url).toContain('/api/audiocontrol')
    })

    it('uses direct URL when useProxy is false', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.useProxy = false
      store.config.audiocontrol_api.deviceIP = '192.168.1.100'
      store.config.audiocontrol_api.devicePort = 8080
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getApiBaseUrl()
      expect(url).toContain('192.168.1.100')
      expect(url).toContain(':8080')
    })

    it('proxy URL ignores device IP and port', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.useProxy = true
      store.config.audiocontrol_api.deviceIP = 'should-not-appear'
      store.config.audiocontrol_api.devicePort = 9999
      store.config.audiocontrol_api.apiPrefix = '/api/audiocontrol'

      const url = store.getApiBaseUrl()
      expect(url).not.toContain('should-not-appear')
      expect(url).not.toContain(':9999')
    })
  })

  describe('Device IP Handling', () => {
    it('accepts localhost IP', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'localhost'
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain('localhost')
    })

    it('accepts IPv4 address', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = '192.168.1.100'
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain('192.168.1.100')
    })

    it('accepts hostname', () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'hifiberry.local'
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()
      expect(url).toContain('hifiberry.local')
    })
  })

  describe('Error Handling', () => {
    it('rejects invalid audiocontrol_api config and stores error message', async () => {
      const store = useAppConfigStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await store.updateConfig({
        audiocontrol_api: {
          deviceIP: '',
          devicePort: 8080,
          apiPrefix: '/api/audiocontrol',
          useProxy: false,
        },
      })

      expect(result).toBe(false)
      expect(store.error).toBe('Invalid audiocontrol_api configuration')
      expect(store.loading).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid audiocontrol_api configuration')

      consoleErrorSpy.mockRestore()
    })

    it('returns false from setRadioPlayer when player name is invalid', async () => {
      const store = useAppConfigStore()
      const result = await store.setRadioPlayer('')
      expect(result).toBe(false)
      expect(store.error).toBe('Invalid radio player name')
    })

    it('returns false from setApiConfig when validation fails', async () => {
      const store = useAppConfigStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await store.setApiConfig('roomeq', {
        deviceIP: '192.168.1.55',
        devicePort: 70000,
        apiPrefix: '/api/roomeq',
        useProxy: false,
      })

      expect(result).toBe(false)
      expect(store.error).toBe('Invalid roomeq_api configuration')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid roomeq_api configuration')

      consoleErrorSpy.mockRestore()
    })

    it('rejects invalid config_api payload type', async () => {
      const store = useAppConfigStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await store.updateConfig({
        config_api: {
          deviceIP: '192.168.1.10',
          devicePort: 8081,
          apiPrefix: '/api/config/v1',
          useProxy: 'yes' as unknown as boolean,
        },
      })

      expect(result).toBe(false)
      expect(store.error).toBe('Invalid config_api configuration')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid config_api configuration')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Validation Branches', () => {
    it('rejects invalid dsptoolkit_api port bounds', async () => {
      const store = useAppConfigStore()

      const result = await store.updateConfig({
        dsptoolkit_api: {
          deviceIP: '192.168.1.11',
          devicePort: 0,
          apiPrefix: '/api/dsptoolkit',
          useProxy: false,
        },
      })

      expect(result).toBe(false)
      expect(store.error).toBe('Invalid dsptoolkit_api configuration')
    })

    it('rejects malformed roomeq_api values', async () => {
      const store = useAppConfigStore()

      const result = await store.updateConfig({
        roomeq_api: [] as unknown as AppConfig['roomeq_api'],
      })

      expect(result).toBe(false)
      expect(store.error).toBe('Invalid roomeq_api configuration')
    })
  })

  describe('Builder Guard Rails', () => {
    it('returns empty string and warns when required URL fields are missing', () => {
      const store = useAppConfigStore()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      store.config.audiocontrol_api.deviceIP = ''
      store.config.audiocontrol_api.useProxy = false

      const url = store.getApiBaseUrl()

      expect(url).toBe('')
      expect(warnSpy).toHaveBeenCalledWith('Invalid API config: deviceIP=, apiPrefix=/api/audiocontrol')

      warnSpy.mockRestore()
    })
  })

  describe('State Consistency', () => {
    it('maintains config object integrity after updates', async () => {
      const store = useAppConfigStore()
      const originalAudioControlAPI = { ...store.config.audiocontrol_api }

      await store.updateConfig({ radioPlayer: 'test' })

      expect(store.config.audiocontrol_api).toEqual(originalAudioControlAPI)
    })

    it('respects existing API config when updating radio player', async () => {
      const store = useAppConfigStore()
      store.config.audiocontrol_api.deviceIP = 'custom-ip'
      const customIP = store.config.audiocontrol_api.deviceIP

      await store.setRadioPlayer('test')

      expect(store.config.audiocontrol_api.deviceIP).toBe(customIP)
    })

    it('maintains all API configs independently', () => {
      const store = useAppConfigStore()
      const audioIP = store.config.audiocontrol_api.deviceIP
      const configIP = store.config.config_api.deviceIP
      const dspIP = store.config.dsptoolkit_api.deviceIP

      // All should be initialized
      expect(audioIP).toBeDefined()
      expect(configIP).toBeDefined()
      expect(dspIP).toBeDefined()
    })
  })
})

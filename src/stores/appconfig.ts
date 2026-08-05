import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface AppConfig {
  radioPlayer: string
  audiocontrol_api: {
    deviceIP: string
    devicePort: number
    apiPrefix: string
    useProxy: boolean
  }
  config_api: {
    deviceIP: string
    devicePort: number
    apiPrefix: string
    useProxy: boolean
  }
  dsptoolkit_api: {
    deviceIP: string
    devicePort: number
    apiPrefix: string
    useProxy: boolean
  }
  roomeq_api: {
    deviceIP: string
    devicePort: number
    apiPrefix: string
    useProxy: boolean
  }
}

const viteEnv = (import.meta as ImportMeta & {
  env: {
    PROD?: boolean
    VITE_APP_DEVICE_IP?: string
    VITE_APP_DEVICE_PORT?: string
    VITE_APP_API_PREFIX?: string
    VITE_APP_CONFIG_API_PREFIX?: string
    VITE_APP_DSPTOOLKIT_API_PREFIX?: string
    VITE_APP_ROOMEQ_API_PREFIX?: string
  }
}).env

// Utility function to validate config values
const validateApiConfig = (config: unknown): boolean => {
  if (!config || typeof config !== 'object') return false

  const candidate = config as Record<string, unknown>
  if (typeof candidate.deviceIP !== 'string' || !candidate.deviceIP.trim()) return false
  if (
    typeof candidate.devicePort !== 'number' ||
    candidate.devicePort < 1 ||
    candidate.devicePort > 65535
  ) {
    return false
  }
  if (typeof candidate.apiPrefix !== 'string') return false
  if (typeof candidate.useProxy !== 'boolean') return false
  return true
}

// Helper function to build API URL with consistent logic (DRY principle)
const buildApiUrl = (
  protocol: 'http' | 'ws',
  deviceIP: string,
  devicePort: number,
  apiPrefix: string,
  useProxy: boolean,
): string => {
  if (!deviceIP || !apiPrefix) {
    console.warn(`Invalid API config: deviceIP=${deviceIP}, apiPrefix=${apiPrefix}`)
    return ''
  }

  if (useProxy) {
    // Use current host and port for proxy in development
    if (typeof window !== 'undefined' && window.location) {
      const currentUrl = window.location.origin
      // Convert http/https to ws/wss if needed
      if (protocol === 'ws') {
        // Replace http:// with ws:// and https:// with wss://
        const wsUrl = currentUrl.replace(/^https?:\/\//, `${protocol}://`)
        return `${wsUrl}${apiPrefix}`
      }
      return `${currentUrl}${apiPrefix}`
    }
    // Fallback if window not available
    return apiPrefix
  }

  // Direct connection to device
  // Don't include default ports (80 for http/ws, 443 for https/wss)
  let portSuffix = ''
  if (protocol === 'http' && devicePort !== 80) {
    portSuffix = `:${devicePort}`
  } else if (protocol === 'ws' && devicePort !== 80) {
    portSuffix = `:${devicePort}`
  }
  return `${protocol}://${deviceIP}${portSuffix}${apiPrefix}`
}

export const useAppConfigStore = defineStore('appconfig', () => {
  // State
  const config = ref<AppConfig>({
    radioPlayer: 'mpd', // Default radio player
    audiocontrol_api: {
      deviceIP: viteEnv.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(viteEnv.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: viteEnv.VITE_APP_API_PREFIX || '/api/audiocontrol',
      useProxy: !viteEnv.PROD // Use proxy in development to avoid CORS
    },
    config_api: {
      deviceIP: viteEnv.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(viteEnv.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: viteEnv.VITE_APP_CONFIG_API_PREFIX || '/api/config/v1',
      useProxy: !viteEnv.PROD // Use proxy in development to avoid CORS
    },
    dsptoolkit_api: {
      deviceIP: viteEnv.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(viteEnv.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: viteEnv.VITE_APP_DSPTOOLKIT_API_PREFIX || '/api/dsptoolkit',
      useProxy: !viteEnv.PROD // Use proxy in development to avoid CORS
    },
    roomeq_api: {
      deviceIP: viteEnv.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(viteEnv.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: viteEnv.VITE_APP_ROOMEQ_API_PREFIX || '/api/roomeq',
      useProxy: !viteEnv.PROD // Use proxy in development to avoid CORS
    }
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const getConfig = async (): Promise<AppConfig> => {
    loading.value = true
    error.value = null
    try {
      // In a real implementation, this would fetch from API
      // For now, return the default config
      return config.value
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get configuration'
      console.error(errorMessage)
      error.value = errorMessage
      return config.value
    } finally {
      loading.value = false
    }
  }

  const updateConfig = async (newConfig: Partial<AppConfig>): Promise<boolean> => {
    loading.value = true
    error.value = null
    try {
      // Validate that new config contains valid API configs if provided
      if (newConfig.audiocontrol_api && !validateApiConfig(newConfig.audiocontrol_api)) {
        throw new Error('Invalid audiocontrol_api configuration')
      }
      if (newConfig.config_api && !validateApiConfig(newConfig.config_api)) {
        throw new Error('Invalid config_api configuration')
      }
      if (newConfig.dsptoolkit_api && !validateApiConfig(newConfig.dsptoolkit_api)) {
        throw new Error('Invalid dsptoolkit_api configuration')
      }
      if (newConfig.roomeq_api && !validateApiConfig(newConfig.roomeq_api)) {
        throw new Error('Invalid roomeq_api configuration')
      }

      // In a real implementation, this would save to API
      config.value = { ...config.value, ...newConfig }
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration'
      console.error(errorMessage)
      error.value = errorMessage
      return false
    } finally {
      loading.value = false
    }
  }

  const setRadioPlayer = async (playerName: string): Promise<boolean> => {
    if (!playerName || typeof playerName !== 'string') {
      error.value = 'Invalid radio player name'
      return false
    }
    return updateConfig({ radioPlayer: playerName })
  }

  const setApiConfig = async (
    apiTypeOrConfig: 'audiocontrol' | 'config' | 'dsptoolkit' | 'roomeq' | Partial<AppConfig['audiocontrol_api']>,
    apiConfigOverload?: Partial<AppConfig['audiocontrol_api']>,
  ): Promise<boolean> => {
    // Handle backward compatibility: setApiConfig(config) vs setApiConfig(apiType, config)
    let apiType: 'audiocontrol' | 'config' | 'dsptoolkit' | 'roomeq' = 'audiocontrol'
    let apiConfig: Partial<AppConfig['audiocontrol_api']>

    if (typeof apiTypeOrConfig === 'string') {
      // New signature: setApiConfig(apiType, config)
      apiType = apiTypeOrConfig
      apiConfig = apiConfigOverload || {}
    } else {
      // Old signature: setApiConfig(config)
      apiConfig = apiTypeOrConfig
    }

    const apiKey = `${apiType}_api` as keyof AppConfig
    const configKey = apiKey as keyof AppConfig
    const currentConfig = config.value[configKey]

    if (typeof currentConfig !== 'object' || currentConfig === null) {
      error.value = `Invalid API type: ${apiType}`
      return false
    }

    return updateConfig({
      [apiKey]: { ...currentConfig, ...apiConfig },
    } as Partial<AppConfig>)
  }

  // API URL getters using unified builder function
  const getApiBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix, useProxy } = config.value.audiocontrol_api
    return buildApiUrl('http', deviceIP, devicePort, apiPrefix, useProxy)
  }

  const getWsBaseUrl = (forceProxy = false): string => {
    const { deviceIP, devicePort, apiPrefix } = config.value.audiocontrol_api
    // WebSocket connections are always direct (unless explicitly forced through proxy)
    // WebSocket doesn't have CORS restrictions like HTTP does
    const useProxy = forceProxy
    return buildApiUrl('ws', deviceIP, devicePort, apiPrefix, useProxy)
  }

  const getConfigApiBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix, useProxy } = config.value.config_api
    return buildApiUrl('http', deviceIP, devicePort, apiPrefix, useProxy)
  }

  const getDSPToolkitApiBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix, useProxy } = config.value.dsptoolkit_api
    return buildApiUrl('http', deviceIP, devicePort, apiPrefix, useProxy)
  }

  const getRoomEQApiBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix, useProxy } = config.value.roomeq_api
    return buildApiUrl('http', deviceIP, devicePort, apiPrefix, useProxy)
  }

  // Computed getters for consistent API (unifies function vs method patterns)
  const radioPlayer = computed(() => config.value.radioPlayer)
  const apiConfig = computed(() => config.value.audiocontrol_api)
  const configApiConfig = computed(() => config.value.config_api)

  return {
    // State
    config,
    loading,
    error,

    // Computed getters (consistent pattern)
    radioPlayer,
    apiConfig,
    configApiConfig,

    // Actions
    getConfig,
    updateConfig,
    setRadioPlayer,
    setApiConfig,

    // API URL getters
    getApiBaseUrl,
    getWsBaseUrl,
    getConfigApiBaseUrl,
    getDSPToolkitApiBaseUrl,
    getRoomEQApiBaseUrl,
  }
})

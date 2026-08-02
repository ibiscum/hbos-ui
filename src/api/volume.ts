import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

export interface VolumeInfo {
  available: boolean
  control_info?: {
    internal_name: string
    display_name: string
    decibel_range?: {
      min_db: number
      max_db: number
    }
  }
  current_state?: {
    percentage: number
    decibels?: number
    raw_value?: number
  }
  supports_change_monitoring: boolean
}

export interface VolumeState {
  percentage: number
  decibels?: number
  raw_value?: number
}

export interface VolumeResponse {
  success: boolean
  message: string
  new_state: VolumeState | null
}

// Headphone Volume API Interfaces
export interface HeadphoneControlsResponse {
  status: 'success' | 'error'
  data?: {
    controls: string[]
    count: number
  }
  message?: string
}

export interface HeadphoneVolumeResponse {
  status: 'success' | 'error'
  data?: {
    volume: number
    control?: string
  }
  message?: string
}

export interface HeadphoneVolumeSetRequest {
  volume: number
}

export interface HeadphoneVolumeSetResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    volume: number
  }
}

/**
 * Build volume API URL using audiocontrol base URL
 * @param endpoint - API endpoint path (e.g., '/info', '/state', '/set')
 * @returns Full API URL for the volume endpoint
 */
const buildVolumeApiUrl = (endpoint: string): string => {
  const configStore = useAppConfigStore()
  const apiBaseUrl = configStore.getApiBaseUrl()
  return `${apiBaseUrl}/volume${endpoint}`
}

/**
 * Build headphone volume API URL using configurator base URL
 * @param endpoint - API endpoint path (e.g., '', '/controls', '/store', '/restore')
 * @returns Full API URL for the headphone volume endpoint
 */
const buildHeadphoneVolumeApiUrl = (endpoint: string): string => {
  const configStore = useAppConfigStore()
  const configApiBaseUrl = configStore.getConfigApiBaseUrl()
  return `${configApiBaseUrl}/volume/headphone${endpoint}`
}

/**
 * Get volume information including current state and capabilities.
 * Returns null on error to allow graceful degradation.
 * @returns VolumeInfo object with available status and control details, or null on failure
 */
export const getVolumeInfo = async (): Promise<VolumeInfo | null> => {
  try {
    const url = buildVolumeApiUrl('/info')
    const response = await apiFetch(url)

    if (!response.ok) {
      console.error('Failed to get volume info:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting volume info:', error)
    return null
  }
}

/**
 * Get current volume state (percentage, decibels, raw value).
 * Returns null on error. Handles 503 Service Unavailable gracefully.
 * @returns Current volume state or null if unavailable
 */
export const getVolumeState = async (): Promise<VolumeState | null> => {
  try {
    const url = buildVolumeApiUrl('/state')
    const response = await apiFetch(url)

    if (!response.ok) {
      if (response.status === 503) {
        console.warn('Volume control not available')
        return null
      }
      console.error('Failed to get volume state:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting volume state:', error)
    return null
  }
}

/**
 * Set volume level using percentage (0-100).
 * Validates input range and returns null on error.
 * @param percentage - Volume level (0-100). Values outside range will return null.
 * @returns VolumeResponse with new state or null on failure
 */
export const setVolumeLevel = async (percentage: number): Promise<VolumeResponse | null> => {
  try {
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      console.error('Volume validation failed:', `percentage ${percentage} out of range (0-100)`)
      return null
    }

    const url = buildVolumeApiUrl('/set')
    const response = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Failed to set volume:', response.status, errorData.message || response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error setting volume:', error)
    return null
  }
}

/**
 * Increase volume by specified amount (default 5%).
 * Validates that amount is positive. Negative amounts are rejected.
 * @param amount - Volume increase in percentage points (0.1-100). Default 5. Negative values return null.
 * @returns VolumeResponse with new state or null on failure or invalid input
 */
export const increaseVolume = async (amount: number = 5.0): Promise<VolumeResponse | null> => {
  try {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
      console.error('Volume increase validation failed:', `amount ${amount} must be positive and ≤100`)
      return null
    }

    const url = buildVolumeApiUrl(`/increase?amount=${amount}`)
    const response = await apiFetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      console.error('Failed to increase volume:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error increasing volume:', error)
    return null
  }
}

/**
 * Decrease volume by specified amount (default 5%).
 * Validates that amount is positive. Negative amounts are rejected.
 * @param amount - Volume decrease in percentage points (0.1-100). Default 5. Negative values return null.
 * @returns VolumeResponse with new state or null on failure or invalid input
 */
export const decreaseVolume = async (amount: number = 5.0): Promise<VolumeResponse | null> => {
  try {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
      console.error('Volume decrease validation failed:', `amount ${amount} must be positive and ≤100`)
      return null
    }

    const url = buildVolumeApiUrl(`/decrease?amount=${amount}`)
    const response = await apiFetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      console.error('Failed to decrease volume:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error decreasing volume:', error)
    return null
  }
}

/**
 * Toggle mute state (switches between 0% and 50% volume).
 * Returns null on error.
 * @returns VolumeResponse with new mute state or null on failure
 */
export const toggleMute = async (): Promise<VolumeResponse | null> => {
  try {
    const url = buildVolumeApiUrl('/mute')
    const response = await apiFetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      console.error('Failed to toggle mute:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error toggling mute:', error)
    return null
  }
}

// Headphone Volume Control APIs

/**
 * Get available headphone volume controls on the current sound card.
 * Returns error status object on failure (consistent with other headphone APIs).
 * @returns HeadphoneControlsResponse with status 'success' or 'error'
 */
export const getHeadphoneControls = async (): Promise<HeadphoneControlsResponse> => {
  try {
    const url = buildHeadphoneVolumeApiUrl('/controls')
    const response = await apiFetch(url)

    if (!response.ok) {
      console.error('Failed to get headphone controls:', response.status, response.statusText)
      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting headphone controls:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get current headphone volume.
 * Returns error status object on failure (consistent with other headphone APIs).
 * @returns HeadphoneVolumeResponse with status 'success' or 'error' and optional volume data
 */
export const getHeadphoneVolume = async (): Promise<HeadphoneVolumeResponse> => {
  try {
    const url = buildHeadphoneVolumeApiUrl('')
    const response = await apiFetch(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Failed to get headphone volume:', response.status, errorData.message || response.statusText)
      return {
        status: 'error',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting headphone volume:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Set headphone volume (0-100).
 * Validates input range and returns error status on failure.
 * @param volume - Headphone volume level (0-100). Out of range values return error status.
 * @returns HeadphoneVolumeSetResponse with status 'success' or 'error'
 */
export const setHeadphoneVolume = async (volume: number): Promise<HeadphoneVolumeSetResponse> => {
  try {
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
      return {
        status: 'error',
        message: `Volume must be between 0 and 100, received ${volume}`
      }
    }

    const url = buildHeadphoneVolumeApiUrl('')
    const response = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        volume: Math.round(volume) // Ensure integer value
      } as HeadphoneVolumeSetRequest)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Failed to set headphone volume:', response.status, errorData.message || response.statusText)
      return {
        status: 'error',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Error setting headphone volume:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Store current headphone volume setting to persistent storage.
 * Returns error status object on failure.
 * @returns HeadphoneVolumeSetResponse with status 'success' or 'error'
 */
export const storeHeadphoneVolume = async (): Promise<HeadphoneVolumeSetResponse> => {
  try {
    const url = buildHeadphoneVolumeApiUrl('/store')
    const response = await apiFetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Failed to store headphone volume:', response.status, errorData.message || response.statusText)
      return {
        status: 'error',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Error storing headphone volume:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Restore previously stored headphone volume setting from persistent storage.
 * Returns error status object on failure.
 * @returns HeadphoneVolumeSetResponse with status 'success' or 'error'
 */
export const restoreHeadphoneVolume = async (): Promise<HeadphoneVolumeSetResponse> => {
  try {
    const url = buildHeadphoneVolumeApiUrl('/restore')
    const response = await apiFetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Failed to restore headphone volume:', response.status, errorData.message || response.statusText)
      return {
        status: 'error',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Error restoring headphone volume:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

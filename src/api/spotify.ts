import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

/**
 * Standardized Spotify API response types.
 * All responses follow a consistent structure with optional error fields.
 */

export interface SpotifySessionResponse {
  session_id: string
  status: string
  message?: string
  error?: string
}

export interface SpotifyStatusResponse {
  authenticated: boolean
  expires_at?: number
  username?: string
  error?: string
  error_description?: string
}

export interface SpotifyTokensResponse {
  authenticated?: boolean
  status?: string
  message?: string
  error?: string
}

export interface SpotifyLogoutResponse {
  authenticated: boolean
  status?: string
  message?: string
  error?: string
}

export interface SpotifyPollResponse {
  status: 'completed' | 'error' | 'pending'
  token_data?: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  error?: string
}

/**
 * Helper function to handle common error patterns in Spotify API responses
 * @param operation - Human-readable operation name for error messages
 * @param url - The API endpoint URL
 * @throws {Error} With formatted error message including status code and text
 */
const handleApiError = (operation: string, status: number, statusText: string): void => {
  throw new Error(`${operation}: ${status} ${statusText}`)
}

/**
 * Generic handler for API calls to reduce boilerplate
 * @param operation - Operation name for error messages
 * @param url - Full API endpoint URL
 * @param options - Optional fetch options (method, headers, body)
 * @returns Parsed JSON response
 */
const callSpotifyApi = async <T>(
  operation: string,
  url: string,
  options?: RequestInit,
): Promise<T> => {
  try {
    const response = await apiFetch(url, options)
    if (!response.ok) {
      handleApiError(operation, response.status, response.statusText)
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof Error && error.message.includes(':')) {
      // Already formatted by handleApiError
      throw error
    }
    console.error(`Error ${operation}:`, error)
    throw error
  }
}

/**
 * Get Spotify authentication status.
 * Checks if the user is authenticated with Spotify and retrieves session info.
 * @returns Authentication status with optional user info and expiration
 * @throws {Error} If the API call fails
 */
export const getSpotifyStatus = async (): Promise<SpotifyStatusResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()
  return callSpotifyApi<SpotifyStatusResponse>('getSpotifyStatus', `${baseUrl}/spotify/status`)
}

/**
 * Create a new Spotify authentication session.
 * Initiates the Spotify OAuth flow by creating a session on the server.
 * @returns Session response with session ID and status
 * @throws {Error} If session creation fails
 */
export const createSpotifySession = async (): Promise<SpotifySessionResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()
  return callSpotifyApi<SpotifySessionResponse>(
    'createSpotifySession',
    `${baseUrl}/spotify/create_session`,
  )
}

/**
 * Get the Spotify login URL for a session.
 * Returns the URL to redirect the user to for Spotify authorization.
 * @param sessionId - The session ID from createSpotifySession
 * @returns Response containing the login URL and session info
 * @throws {Error} If the API call fails
 */
export const getSpotifyLoginUrl = async (sessionId: string): Promise<SpotifySessionResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()
  return callSpotifyApi<SpotifySessionResponse>(
    'getSpotifyLoginUrl',
    `${baseUrl}/spotify/login/${sessionId}`,
  )
}

/**
 * Poll for Spotify authentication completion.
 * Checks if the user has completed the Spotify authorization process.
 * @param sessionId - The session ID to poll for
 * @returns Poll status with optional token data on completion
 * @throws {Error} If the poll request fails
 */
export const pollSpotifyAuth = async (sessionId: string): Promise<SpotifyPollResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()
  return callSpotifyApi<SpotifyPollResponse>(
    'pollSpotifyAuth',
    `${baseUrl}/spotify/poll/${sessionId}`,
  )
}

/**
 * Store Spotify authentication tokens.
 * Securely transmits tokens to the server for storage and future use.
 * @param tokenData - Object containing access_token, refresh_token, and expires_in
 * @returns Response confirming token storage
 * @throws {Error} If token storage fails
 */
export const storeSpotifyTokens = async (tokenData: {
  access_token: string
  refresh_token: string
  expires_in: number
}): Promise<SpotifyTokensResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()
  return callSpotifyApi<SpotifyTokensResponse>(
    'storeSpotifyTokens',
    `${baseUrl}/spotify/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenData),
    },
  )
}

/**
 * Log out from Spotify and disconnect the session.
 * Removes stored tokens and clears the Spotify connection on the server.
 * @returns Response confirming logout
 * @throws {Error} If logout fails
 * @deprecated Use logoutSpotify() instead. This is kept for backwards compatibility.
 */
export const disconnectSpotify = async (): Promise<SpotifyLogoutResponse> => {
  return logoutSpotify()
}

/**
 * Log out from Spotify and disconnect the session.
 * Removes stored tokens and clears the Spotify connection on the server.
 * @returns Response confirming logout with authentication status
 * @throws {Error} If logout fails
 */
export const logoutSpotify = async (): Promise<SpotifyLogoutResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()
  return callSpotifyApi<SpotifyLogoutResponse>('logoutSpotify', `${baseUrl}/spotify/logout`, {
    method: 'POST',
  })
}

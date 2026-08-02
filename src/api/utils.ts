import { useAppConfigStore } from '@/stores/appconfig'

/**
 * List of URL prefixes that need to be rewritten to include /api/audiocontrol/.
 * Used by both image URL rewriting and general API URL rewriting.
 * Includes library, coverart, and lyrics endpoints.
 */
const API_PROXY_PREFIXES = [
  '/api/library/',     // MPD/library images: /api/library/mpd/image/...
  '/api/coverart/',    // Cover art API: /api/coverart/...
  '/api/lyrics/'       // Lyrics API: /api/lyrics/...
] as const

/**
 * Legacy constant for backward compatibility - use API_PROXY_PREFIXES instead.
 * @deprecated Use API_PROXY_PREFIXES
 */
const IMAGE_PROXY_PREFIXES = API_PROXY_PREFIXES.slice(0, 2) // Only library and coverart

/**
 * Rewrite image URLs to be accessible through the proxy or production API.
 * This is specifically for images returned by the audiocontrol API.
 * Guards against double rewriting and validates device configuration.
 * @param url - The image URL to rewrite (must be valid URL or empty string)
 * @returns The rewritten URL that can be accessed from the browser
 */
export const rewriteImageUrl = (url: string): string => {
  if (!url) {
    return url
  }

  // Handle external URLs (http://, https://) - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const configStore = useAppConfigStore()
  const apiConfig = configStore.apiConfig

  if (!apiConfig || typeof apiConfig.useProxy !== 'boolean') {
    return url // Fallback if config unavailable
  }
  const { useProxy } = apiConfig

  // Guard against double rewriting - if URL already rewritten, use it as-is
  if (url.startsWith('/api/audiocontrol/')) {
    return url
  }

  // Check if URL matches any of the supported prefixes
  const matchedPrefix = IMAGE_PROXY_PREFIXES.find(prefix => url.startsWith(prefix))
  if (!matchedPrefix) {
    // URL doesn't need rewriting, return as-is
    return url
  }

  // Rewrite URL to /api/audiocontrol/ prefix
  let correctedUrl = url
  if (url.startsWith('/api/library/')) {
    correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
  } else if (url.startsWith('/api/coverart/')) {
    correctedUrl = url.replace('/api/coverart/', '/api/audiocontrol/coverart/')
  }

  if (useProxy) {
    // In development with proxy, return the corrected URL
    // The Vite proxy will handle routing this to the actual device
    return correctedUrl
  }

  // In production (or when not using proxy), prepend the device base URL
  const deviceIP = configStore.config?.audiocontrol_api?.deviceIP
  const devicePort = configStore.config?.audiocontrol_api?.devicePort

  // Validate device configuration exists
  if (!deviceIP || typeof devicePort !== 'number') {
    console.error('[IMG] Missing device configuration:', { deviceIP, devicePort })
    return correctedUrl // Fallback to corrected path if device config unavailable
  }

  // Build full URL with device IP/port
  // correctedUrl is like: /api/audiocontrol/library/mpd/image/...
  // We want: http://192.168.1.67/api/audiocontrol/library/mpd/image/...
  const portSuffix = devicePort === 80 ? '' : `:${devicePort}`
  const rewrittenUrl = `http://${deviceIP}${portSuffix}${correctedUrl}`

  return rewrittenUrl
}

/**
 * Rewrite audiocontrol API URLs with proper /api/audiocontrol prefix.
 * Handles proxy mode (development) and production mode with API base URL.
 * Guards against double rewriting to prevent path duplication.
 * @param url - The API URL to rewrite (must be valid URL or empty string)
 * @returns The rewritten URL with full /api/audiocontrol prefix
 */
export const rewriteAudiocontrolApiUrl = (url: string): string => {
  if (!url) {
    return url
  }

  // Handle external URLs (http://, https://) - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Guard against double rewriting - if already has /api/audiocontrol/, return as-is
  if (url.startsWith('/api/audiocontrol/')) {
    return url
  }

  // Only process URLs that start with /api/
  if (!url.startsWith('/api/')) {
    return url
  }

  const configStore = useAppConfigStore()
  const apiConfig = configStore.apiConfig

  if (!apiConfig || typeof apiConfig.useProxy !== 'boolean') {
    return url // Fallback if config unavailable
  }
  const { useProxy } = apiConfig

  // Rewrite URLs that need /audiocontrol/ inserted
  // The API server sometimes returns shortened paths like /api/library/...
  // but they should be /api/audiocontrol/library/... to match our API structure
  let correctedUrl = url
  if (url.startsWith('/api/library/')) {
    correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
  } else if (url.startsWith('/api/lyrics/')) {
    correctedUrl = url.replace('/api/lyrics/', '/api/audiocontrol/lyrics/')
  } else if (url.startsWith('/api/coverart/')) {
    correctedUrl = url.replace('/api/coverart/', '/api/audiocontrol/coverart/')
  }

  if (useProxy) {
    // In development with proxy, return the corrected URL
    // The Vite proxy will handle routing this to the actual device
    return correctedUrl
  }

  // In production (or when not using proxy), use the full API base URL
  const apiBaseUrl = configStore.getApiBaseUrl()

  if (!apiBaseUrl) {
    console.error('API base URL not configured')
    return correctedUrl // Fallback if API base URL unavailable
  }

  // Safely replace /api/ prefix with full API base URL
  // Only replace if correctedUrl still starts with /api/
  if (correctedUrl.startsWith('/api/')) {
    return correctedUrl.replace('/api/', `${apiBaseUrl}/`)
  }

  return correctedUrl
}

/**
 * Legacy alias for backward compatibility.
 * @deprecated Use rewriteAudiocontrolApiUrl instead
 * @see rewriteAudiocontrolApiUrl
 */
export const rewrite_audiocontrol_api_url = rewriteAudiocontrolApiUrl

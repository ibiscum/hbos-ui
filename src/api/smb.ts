import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

// Types for SMB/CIFS API

/**
 * Represents a discovered SMB server on the network
 * @note services array can be empty for manually added servers or servers with unknown services
 */
export interface SmbServer {
  ip: string
  name: string
  hostname: string
  is_file_server: boolean
  /** Services array can be empty - use defensive rendering */
  services: string[]
  local_network: string
  interface: string
}

export interface SmbServersResponse {
  status: 'success' | 'error'
  data: {
    servers: SmbServer[]
    count: number
  }
  message?: string
}

/**
 * Represents a share on an SMB server
 * @note type can be empty string if API cannot determine share type
 * @note comment may be empty string or undefined
 */
export interface SmbShare {
  name: string
  type: string
  /** Comment can be empty or undefined */
  comment?: string
}

export interface SmbSharesResponse {
  status: 'success' | 'error'
  data: {
    server: string
    shares: SmbShare[]
    count: number
  }
  message?: string
}

export interface SmbMount {
  id: number
  server: string
  share: string
  mountpoint: string
  user: string
  version: string
  options: string
  mounted: boolean
}

export interface SmbMountsResponse {
  status: 'success' | 'error'
  data: {
    mounts: SmbMount[]
    count: number
    summary: {
      total: number
      mounted: number
      unmounted: number
    }
  }
  message?: string
}

export interface SmbTestResponse {
  status: 'success' | 'error'
  data: {
    server: string
    connected: boolean
    message?: string
    error?: string
  }
  message?: string
}

export interface SmbMountRequest {
  action?: 'add' | 'remove' // Optional since it's added by the API functions
  server: string            // Required: target server IP
  share: string             // Required: share name
  mountpoint?: string       // Optional mount point (API provides default if not set)
  /** User/username - required if not using anonymous auth */
  user?: string
  /** Password - required if not using anonymous auth */
  password?: string
  version?: string          // SMB version (3.0, 2.1, 2.0, 1.0)
  options?: string
  uid?: number
  gid?: number
  file_mode?: string
  dir_mode?: string
}

export interface SmbMountResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    id?: number
    server: string
    share: string
    mountpoint: string
    mounted?: boolean
    unmounted?: boolean
    command?: string
    output?: string
    error_details?: string
    // New fields for mount-all response
    service?: string
    action?: string
    configurations?: Array<{
      server: string
      share: string
      mountpoint: string
      id: number
    }>
    count?: number
    note?: string
    warning?: string
    mpd_reconcile?: {
      service: string
      status: 'success' | 'error'
      message: string
      details?: string
      return_code?: number
    }
  }
  error?: string
}

export interface SmbDiagnosticsResponse {
  status: 'success' | 'error'
  data: {
    mount_id: number
    server: string
    share: string
    mountpoint: string
    mounted: boolean
    mount_command: string
    mount_output: string
    mount_error?: string
    system_info: {
      cifs_available: boolean
      mount_capabilities: string[]
      user_id: number
      group_id: number
    }
  }
  message?: string
}

export interface SmbCapabilitiesResponse {
  status: 'success' | 'error'
  data: {
    cifs_utils_installed: boolean
    mount_cifs_available: boolean
    supported_versions: string[]
    required_capabilities: string[]
    current_user: {
      uid: number
      gid: number
      groups: string[]
    }
    recommendations: string[]
  }
  message?: string
}

/**
 * Parse SMB API error response and return user-friendly error message
 *
 * Searches for error details in this priority order:
 * 1. response.data.error_details (most specific backend error)
 * 2. response.error (generic error field)
 * 3. response.message (main message field)
 * 4. defaultMessage (fallback)
 *
 * @param response - The API error response object
 * @param defaultMessage - Fallback message if no error details found
 * @returns User-friendly error message string
 */
const parseSmbError = (response: Record<string, unknown>, defaultMessage: string): string => {
  // If the response has a detailed error message, use it
  if (response.data && typeof response.data === 'object' && response.data !== null) {
    const data = response.data as Record<string, unknown>
    if (data.error_details && typeof data.error_details === 'string') {
      return data.error_details
    }
  }

  // If the response has an error field, use it
  if (response.error && typeof response.error === 'string') {
    return response.error
  }

  // Use the main message field
  if (response.message && typeof response.message === 'string') {
    return response.message
  }

  return defaultMessage
}

/**
 * Handle HTTP error responses and return meaningful error messages
 *
 * Maps HTTP status codes to user-friendly messages and extracts error details
 * from the response body. Always throws an error with the constructed message.
 *
 * @param response - The failed HTTP response object
 * @param operation - Description of the operation that failed (used in error message)
 * @throws Error with formatted error message including status code and details
 * @returns Never (always throws)
 */
const handleHttpError = async (response: Response, operation: string): Promise<never> => {
  let errorMessage = `${operation} failed`

  try {
    const errorData = await response.json()

    switch (response.status) {
      case 400:
        errorMessage = `Bad request: ${parseSmbError(errorData, 'Missing or invalid parameters')}`
        break
      case 403:
        errorMessage = `Access denied: ${parseSmbError(errorData, 'Operation not permitted')}`
        break
      case 404:
        errorMessage = `Not found: ${parseSmbError(errorData, 'Resource not found')}`
        break
      case 500:
        errorMessage = `Server error: ${parseSmbError(errorData, 'Internal server error occurred')}`
        break
      default:
        errorMessage = `${operation} failed: ${parseSmbError(errorData, `HTTP ${response.status}`)}`
    }
  } catch {
    // If we can't parse the error response, use the status code
    errorMessage = `${operation} failed with HTTP ${response.status}`
  }

  throw new Error(errorMessage)
}

/**
 * Create safe mount options for SMB/CIFS mounting
 *
 * Generates mount options that help avoid capability issues by using
 * appropriate defaults and settings. Returns a comma-separated string
 * of mount options suitable for CIFS mount command.
 *
 * Default options applied:
 * - rw: Read-write access
 * - file_mode, dir_mode: Permissions (0644, 0755 default)
 * - uid, gid: User/group mapping (1000 default)
 * - nobrl: Disable byte range locking
 * - cache: loose caching mode
 * - iocharset: UTF-8 character set
 * - vers: SMB protocol version (3.0 default, can be 1.0, 2.0, 2.1, 3.0, 3.1.1)
 *
 * @param username - Optional SMB username/account for authentication
 * @param uid - Optional Unix user ID to map SMB files to (default 1000)
 * @param gid - Optional Unix group ID to map SMB files to (default 1000)
 * @param fileMode - Optional file permissions in octal (default 0644)
 * @param dirMode - Optional directory permissions in octal (default 0755)
 * @param smbVersion - Optional SMB protocol version (default 3.0)
 * @returns Comma-separated string of mount options for CIFS mount
 *
 * @example
 * // Create options with username for credentials auth
 * const opts = createSafeMountOptions('domain\\username', 1000, 1000, '0644', '0755', '3.0')
 * // Result: "rw,file_mode=0644,dir_mode=0755,uid=1000,gid=1000,username=domain\\username,nobrl,cache=loose,iocharset=utf8,vers=3.0"
 */
export const createSafeMountOptions = (
  username?: string,
  uid?: number,
  gid?: number,
  fileMode?: string,
  dirMode?: string,
  smbVersion?: string
): string => {
  const options = []

  // Basic options to avoid capability issues
  options.push('rw') // Read-write access
  options.push('file_mode=' + (fileMode || '0644')) // File permissions
  options.push('dir_mode=' + (dirMode || '0755')) // Directory permissions

  // User and group mapping
  if (uid !== undefined) {
    options.push(`uid=${uid}`)
  } else {
    options.push('uid=1000') // Default to user 1000 (usually first user)
  }

  if (gid !== undefined) {
    options.push(`gid=${gid}`)
  } else {
    options.push('gid=1000') // Default to group 1000
  }

  // Username if provided
  if (username) {
    options.push(`username=${username}`)
  }

  // Additional options to prevent capability issues
  options.push('nobrl') // Disable byte range locking
  options.push('cache=loose') // Use loose caching
  options.push('iocharset=utf8') // UTF-8 character set
  options.push(`vers=${smbVersion || '3.0'}`) // Use specified SMB version or default to 3.0

  return options.join(',')
}

/**
 * Discover SMB/CIFS file servers on the local network
 *
 * Performs network scanning to find available SMB servers. This is a read-only
 * operation that doesn't require authentication but should be called through
 * apiFetch for proper session handling.
 *
 * @returns Promise resolving to server discovery response with list of available servers
 * @throws Error if the HTTP request fails or response parsing fails
 *
 * @example
 * const result = await getSmbServers()
 * if (result.status === 'success') {
 *   console.log('Found servers:', result.data.servers)
 * }
 */
export const getSmbServers = async (): Promise<SmbServersResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await apiFetch(`${baseUrl}/smb/servers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB servers')
  }

  return await response.json()
}

/**
 * Test connection to a specific SMB server
 *
 * Verifies that a server is reachable and optionally validates credentials.
 * Note: This function may return HTTP 200 with status='error' in the response
 * body for graceful error handling of connection failures. This is intentional
 * design to allow UI to display connection errors without throwing.
 *
 * @param server - Server IP address or hostname to test
 * @param username - Optional username for authentication (SMB username or DOMAIN\username)
 * @param password - Optional password for authentication
 * @returns Promise resolving to test response with connection status
 * @throws Error if HTTP request fails (not if connection fails - see note above)
 *
 * @example
 * const result = await testSmbServer('192.168.1.27', 'user@domain', 'password')
 * if (result.status === 'success') {
 *   console.log('Server is reachable')
 * } else {
 *   console.log('Connection failed:', result.message)
 * }
 */
export const testSmbServer = async (
  server: string,
  username?: string,
  password?: string
): Promise<SmbTestResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestBody: {
    server: string
    username?: string
    password?: string
  } = {
    server: server
  }

  if (username) {
    requestBody.username = username
  }

  if (password) {
    requestBody.password = password
  }

  const response = await apiFetch(`${baseUrl}/smb/test/${encodeURIComponent(server)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Test SMB server connection')
  }

  const result = await response.json()

  // The API can return HTTP 200 with status: "error" in the response body
  if (result.status === 'error') {
    // Return the error response so the UI can display the error message
    return result
  }

  return result
}

/**
 * List available shares on a specific SMB server
 *
 * Retrieves the list of shares (volumes) available on a target SMB server.
 * Requires appropriate credentials if the server requires authentication.
 *
 * @param server - Target server IP address or hostname
 * @param username - Optional username for authentication (required if server has auth)
 * @param password - Optional password for authentication (required if server has auth)
 * @param detailed - Optional flag to request detailed share information (not all backends support)
 * @returns Promise resolving to shares response with available shares list
 * @throws Error if HTTP request fails or response parsing fails
 *
 * @example
 * const shares = await getSmbShares('192.168.1.27', 'user', 'pass')
 * shares.data.shares.forEach(share => {
 *   console.log(`Share: ${share.name} (${share.type})`)
 * })
 */
export const getSmbShares = async (
  server: string,
  username?: string,
  password?: string,
  detailed?: boolean
): Promise<SmbSharesResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestBody: {
    server: string
    username?: string
    password?: string
    detailed?: boolean
  } = {
    server: server
  }

  if (username) {
    requestBody.username = username
  }

  if (password) {
    requestBody.password = password
  }

  if (detailed) {
    requestBody.detailed = detailed
  }

  const response = await apiFetch(`${baseUrl}/smb/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB shares')
  }

  return await response.json()
}

/**
 * List all configured SMB mount points for music access
 *
 * Retrieves all currently configured SMB mount configurations and their
 * status (mounted/unmounted). Includes summary statistics.
 *
 * @returns Promise resolving to mounts response with all configurations and summary
 * @throws Error if HTTP request fails or response parsing fails
 *
 * @example
 * const result = await getSmbMounts()
 * console.log(`Total: ${result.data.summary.total}, Mounted: ${result.data.summary.mounted}`)
 * result.data.mounts.forEach(mount => {
 *   console.log(`${mount.server}:${mount.share} -> ${mount.mountpoint} (${mount.mounted ? 'mounted' : 'unmounted'})`)
 * })
 */
export const getSmbMounts = async (): Promise<SmbMountsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await apiFetch(`${baseUrl}/smb/mounts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB mounts')
  }

  return await response.json()
}

/**
 * Add an SMB share configuration (does not mount it)
 *
 * Creates a configuration entry for an SMB share. This stores the mount
 * configuration but does NOT immediately mount the share. To actually mount
 * the configured shares, call mountAllSmbShares() afterward.
 *
 * Note: This function adds the action='add' field automatically.
 * Use mountSmbShareWithRetry() for automatic mounting with retry logic.
 *
 * @param mountRequest - Configuration for the share to add
 * @returns Promise resolving to mount response indicating configuration was added
 * @throws Error if HTTP request fails
 *
 * @see mountSmbShareWithRetry For automatic mounting with retry logic
 * @see mountAllSmbShares To actually mount the configured shares
 */
export const mountSmbShare = async (mountRequest: SmbMountRequest): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestWithAction = {
    action: 'add',
    ...mountRequest
  }

  const response = await apiFetch(`${baseUrl}/smb/mount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestWithAction),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Add SMB share configuration')
  }

  return await response.json()
}

/**
 * Mount SMB share with retry logic and different option sets
 *
 * High-level mount operation that:
 * 1. Adds the share configuration with safe mount options
 * 2. Automatically calls mountAllSmbShares() to apply mounting
 * 3. Retries with minimal options if first attempt fails
 * 4. Handles capability issues gracefully
 *
 * This is the preferred way to mount shares as it handles the complete
 * workflow automatically. The function will try multiple mount configurations
 * to handle capability issues and ensures the share is actually mounted.
 *
 * @param mountRequest - Configuration for the share to mount
 * @returns Promise resolving to mount response showing service status
 * @throws Error if HTTP request fails (not if mounting fails - checks response.status)
 *
 * @example
 * try {
 *   const result = await mountSmbShareWithRetry({
 *     server: '192.168.1.27',
 *     share: 'music',
 *     user: 'admin',
 *     password: 'secret'
 *   })
 *   if (result.status === 'success') {
 *     console.log('Share mounted successfully')
 *   }
 * } catch (error) {
 *   console.error('Mount operation failed:', error)
 * }
 */
export const mountSmbShareWithRetry = async (mountRequest: SmbMountRequest): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  // Try with safe mount options first
  const safeOptions = createSafeMountOptions(
    mountRequest.user,
    mountRequest.uid,
    mountRequest.gid,
    mountRequest.file_mode,
    mountRequest.dir_mode,
    mountRequest.version
  )

  const requestWithSafeOptions = {
    action: 'add',
    ...mountRequest,
    options: safeOptions
  }

  try {
    const response = await apiFetch(`${baseUrl}/smb/mount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestWithSafeOptions),
    })

    if (!response.ok) {
      await handleHttpError(response, 'Mount SMB share')
    }

    const result = await response.json()
    if (result.status === 'success') {
      // Configuration created successfully, now mount all shares
      try {
        const mountResult = await mountAllSmbShares()
        // Return the mount-all result which shows service status
        return mountResult
      } catch (mountError) {
        console.warn('Configuration created but mount-all failed:', mountError)
        // Return the original configuration result even if mounting failed
        return result
      }
    }

    // If the first attempt failed, try with minimal options
    console.warn('First mount attempt failed, trying with minimal options:', result.message)

    const minimalOptions = 'rw,uid=1000,gid=1000,file_mode=0644,dir_mode=0755'
    const minimalRequest = {
      action: 'add',
      ...mountRequest,
      options: minimalOptions
    }

    const retryResponse = await apiFetch(`${baseUrl}/smb/mount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalRequest),
    })

    if (!retryResponse.ok) {
      await handleHttpError(retryResponse, 'Mount SMB share with minimal options')
    }

    const retryResult = await retryResponse.json()

    // If retry was successful, mount all shares
    if (retryResult.status === 'success') {
      try {
        const mountResult = await mountAllSmbShares()
        return mountResult
      } catch (mountError) {
        console.warn('Configuration created but mount-all failed:', mountError)
        // Return the original result even if mounting failed
        return retryResult
      }
    }

    return retryResult
  } catch (error) {
    console.error('SMB mount failed:', error)
    throw error
  }
}

/**
 * Remove an SMB share configuration and trigger mount-all to apply changes
 *
 * Removes a share configuration and immediately triggers mountAllSmbShares()
 * to apply the changes system-wide. This will:
 * 1. Remove the configuration entry
 * 2. Unmount the share if it's currently mounted
 * 3. Update the systemd service
 *
 * @param server - SMB server IP or hostname of the share to remove
 * @param share - Share name to remove
 * @returns Promise resolving to mount response showing service status
 * @throws Error if HTTP request fails
 *
 * @example
 * const result = await unmountSmbShare('192.168.1.27', 'music')
 * if (result.status === 'success') {
 *   console.log('Share removed and system updated')
 * }
 */
export const unmountSmbShare = async (server: string, share: string): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestBody = {
    action: 'remove',
    server: server,
    share: share
  }

  const response = await apiFetch(`${baseUrl}/smb/mount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Remove SMB share configuration')
  }

  const result = await response.json()

  if (result.status === 'success') {
    // Configuration removed successfully, now trigger mount-all to apply changes
    try {
      const mountAllResult = await mountAllSmbShares()
      // Return the mount-all result which shows the updated service status
      return mountAllResult
    } catch (mountError) {
      console.warn('Configuration removed but mount-all failed:', mountError)
      // Return the original removal result even if mount-all failed
      return result
    }
  }

  return result
}

/**
 * Mount all configured SMB shares using the systemd service
 *
 * Triggers the SMB mount service to mount all currently configured shares.
 * This replaces individual mount operations and ensures proper system-wide
 * mounting via systemd. This should be called after adding/removing share
 * configurations to apply the changes.
 *
 * @returns Promise resolving to mount response with service status
 * @throws Error if HTTP request fails or response parsing fails
 *
 * @example
 * // After adding a share configuration with mountSmbShare()
 * const result = await mountAllSmbShares()
 * console.log(result.data.mpd_reconcile) // Optional MPD status update
 */
export const mountAllSmbShares = async (): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await apiFetch(`${baseUrl}/smb/mount-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Mount all SMB shares')
  }

  return await response.json()
}

/**
 * Get detailed mount diagnostics for troubleshooting
 *
 * Retrieves comprehensive diagnostic information for a specific mount,
 * including system capabilities, mount command output, and error details.
 * Useful for debugging mount failures.
 *
 * @param id - Mount configuration ID to get diagnostics for
 * @returns Promise resolving to diagnostics response with detailed information
 * @throws Error if HTTP request fails or response parsing fails
 *
 * @example
 * const diags = await getSmbMountDiagnostics(1)
 * console.log('CIFS available:', diags.data.system_info.cifs_available)
 * console.log('Mount command:', diags.data.mount_command)
 * console.log('Mount error:', diags.data.mount_error)
 */
export const getSmbMountDiagnostics = async (id: number): Promise<SmbDiagnosticsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await apiFetch(`${baseUrl}/smb/mounts/${id}/diagnostics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB mount diagnostics')
  }

  return await response.json()
}

/**
 * Check if SMB mount capabilities are available on the system
 *
 * Verifies system prerequisites for SMB mounting, including:
 * - CIFS utilities installation
 * - mount.cifs availability
 * - Current user capabilities (uid/gid)
 * - Supported SMB protocol versions
 *
 * Use this before attempting mount operations to check system readiness.
 *
 * @returns Promise resolving to capabilities response with system status
 * @throws Error if HTTP request fails or response parsing fails
 *
 * @example
 * const caps = await checkSmbCapabilities()
 * if (!caps.data.cifs_utils_installed) {
 *   console.warn('CIFS utils not installed')
 * }
 * console.log('Supported versions:', caps.data.supported_versions)
 */
export const checkSmbCapabilities = async (): Promise<SmbCapabilitiesResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await apiFetch(`${baseUrl}/smb/capabilities`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Check SMB capabilities')
  }

  return await response.json()
}

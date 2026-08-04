import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

/**
 * Discriminated union type for FilterChain API responses.
 * Success responses contain the DOT format filtergraph.
 * Error responses contain a descriptive error message.
 */
export type FilterChainResponse =
  | { status: 'success'; data: string; message?: never }
  | { status: 'error'; data?: never; message: string }

/**
 * Retrieves the current PipeWire filtergraph in DOT (Graphviz) format.
 *
 * The backend serves the filtergraph as either:
 * - `text/plain`: Contains the raw DOT format content (success case)
 * - Other content-types (e.g., `application/json`): Treated as error responses
 *
 * ## Authentication
 * This function uses `apiFetch` which automatically handles CSRF protection
 * and authentication via session cookies.
 *
 * ## Errors
 * - HTTP errors (4xx, 5xx): Throws with status and statusText
 * - JSON parse errors: Throws with parse error message
 * - Response body read errors: Throws with read error message
 *
 * @returns Promise resolving to FilterChainResponse with success or error status
 *
 * @example
 * const response = await getFilterChain()
 * if (response.status === 'success') {
 *   console.log('DOT format:', response.data)
 * } else {
 *   console.error('Error:', response.message)
 * }
 */
export const getFilterChain = async (): Promise<FilterChainResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/pipewire/filtergraph`

  const response = await apiFetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get filtergraph: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type')

  if (contentType?.includes('text/plain')) {
    // Success case - raw DOT format content
    const dotContent = await response.text()
    return {
      status: 'success',
      data: dotContent
    }
  } else {
    // Error case - JSON response with error details
    const errorData = await response.json()
    const message = typeof errorData?.message === 'string'
      ? errorData.message
      : 'Failed to get filtergraph'

    return {
      status: 'error',
      message
    }
  }
}

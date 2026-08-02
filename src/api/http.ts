import { useAuthStore, type AuthHint } from '@/stores/auth'

const BODY_LESS_METHODS = new Set(['GET', 'HEAD'])

/**
 * Determines if the given HTTP method requires CSRF token protection.
 * Methods that don't have a request body (GET, HEAD) don't need CSRF protection.
 *
 * @param method - The HTTP method (case-insensitive). Defaults to 'GET' if undefined.
 * @returns true if the method requires CSRF protection, false otherwise
 */
const needsCsrf = (method?: string): boolean =>
  !BODY_LESS_METHODS.has((method ?? 'GET').toUpperCase())

/**
 * Parses the WWW-Authenticate-Hint header to determine the authentication flow.
 *
 * @param response - The HTTP response object
 * @returns 'set-password' if a new password must be set, 'login' for normal authentication
 */
const parseHint = (response: Response): AuthHint => {
  const hint = response.headers.get('WWW-Authenticate-Hint')
  return hint === 'set-password' ? 'set-password' : 'login'
}

/**
 * Central fetch wrapper for every API call that requires CSRF protection.
 *
 * ## Request Handling
 * - Sends `credentials: 'same-origin'` to include auth session cookies
 * - Attaches `X-CSRF-Token` header (from auth store) on write methods
 *   (any method except GET/HEAD which don't have request bodies)
 * - Merges and preserves any headers provided in the init parameter
 *
 * ## 401 Unauthorized Handling
 * When a 401 response is received on the first attempt:
 *
 * 1. **login-hinted 401 on write methods**: Attempts silent CSRF token recovery via
 *    `authStore.ensureCsrf()`. This handles the case where an in-memory CSRF token
 *    was lost (e.g., page reload) but the session cookie is still valid. If recovery
 *    succeeds, retries the request automatically without user interaction.
 *
 * 2. **set-password-hinted 401**: Skips CSRF recovery (not applicable) and goes
 *    directly to auth prompt, which will handle password reset flow.
 *
 * 3. **login-hinted 401 on GET/HEAD**: Skips CSRF recovery (no CSRF needed for
 *    body-less methods) and goes directly to auth prompt. This indicates the session
 *    itself is invalid.
 *
 * 4. **Auth prompt**: If recovery fails or the hint indicates a new login/password is
 *    needed, opens the auth prompt via `authStore.promptForAuth()`. If the user
 *    successfully authenticates, retries the request once more. If the prompt is
 *    cancelled, throws an 'Authentication required' error.
 *
 * ## Response Handling
 * - Non-401 responses are passed through unchanged (including errors like 403, 500)
 * - A second 401 (after retry) is also passed through unchanged
 * - Callers retain full control over response handling (`.ok`, `.json()`, etc.)
 *
 * @param url - The request URL
 * @param init - Optional fetch RequestInit (method, headers, body, etc.)
 * @param isRetry - Internal flag: true if this is a retry after 401 (prevents infinite loops)
 * @returns The Response object from fetch (callers handle status checking and body parsing)
 * @throws Error with message 'Authentication required' if the auth prompt is cancelled
 *
 * @example
 * // Simple GET with automatic credentials
 * const data = await apiFetch('/api/data').then(r => r.json())
 *
 * @example
 * // POST with CSRF protection and error handling
 * const response = await apiFetch('/api/config/restart', { method: 'POST' })
 * if (!response.ok) {
 *   console.error('Request failed:', response.status)
 * }
 *
 * @example
 * // PUT with custom headers (merged with CSRF token)
 * const response = await apiFetch('/api/profile', {
 *   method: 'PUT',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'John' })
 * })
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<Response> {
  const authStore = useAuthStore()

  // Build headers: preserve existing ones from init and add CSRF if needed
  const headers = new Headers(init.headers)
  if (needsCsrf(init.method) && authStore.csrf) {
    headers.set('X-CSRF-Token', authStore.csrf)
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers,
  })

  // If successful or not a 401, or if this is a retry attempt, return as-is
  if (response.status !== 401 || isRetry) {
    return response
  }

  const hint = parseHint(response)

  // For login-hinted 401 on write methods, try silent CSRF token recovery first.
  // This handles the common case where the in-memory CSRF token was lost (e.g.
  // page reload) but the session cookie is still valid.
  if (hint === 'login' && needsCsrf(init.method) && (await authStore.ensureCsrf())) {
    return apiFetch(url, init, true)
  }

  // Recovery didn't work or wasn't applicable; prompt the user for auth
  const authenticated = await authStore.promptForAuth(hint)
  if (!authenticated) {
    throw new Error('Authentication required')
  }

  // User authenticated; retry the original request once
  return apiFetch(url, init, true)
}

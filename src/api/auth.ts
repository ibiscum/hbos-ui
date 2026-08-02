// Auth gateway client. Unlike the other api/*.ts modules this one does NOT
// go through the config/audiocontrol proxy machinery in stores/appconfig:
// the session is an HttpOnly cookie, so the auth endpoints must always be
// called same-origin (the UI is served same-origin behind nginx in prod).
//
// This module is intentionally a "leaf" — it does not import
// `@/api/http` (apiFetch) or `@/stores/auth`. apiFetch's 401 handling
// calls into the auth store, which calls the functions here; if this file
// routed its own requests back through apiFetch we'd have a dependency
// cycle (and a 401 from e.g. `login` would try to prompt-for-auth again).

/** Protection levels for the authentication system */
export type ProtectionLevel = 'unset' | 'off' | 'risky' | 'all'

/** Current authentication status and protection configuration */
export interface AuthStatus {
  /** Current protection level: 'unset' (no password), 'off' (disabled), 'risky' (basic), or 'all' (full protection) */
  protection: ProtectionLevel
  /** Whether a password has been set */
  has_password: boolean
  /** Whether user is currently authenticated */
  authenticated: boolean
}

/** Response from auth endpoints that provide CSRF tokens */
export interface AuthTokenResponse {
  /** CSRF token for subsequent authenticated requests */
  csrf: string
}

/**
 * Custom error class for authentication API failures.
 * Carries the HTTP status so callers can distinguish between different error types:
 * - 401: Authentication failed (wrong password, session expired)
 * - 429: Rate limited (too many failed attempts)
 * - Other: Server errors or unexpected responses
 */
export class AuthApiError extends Error {
  /** HTTP status code from the failed response */
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

const authBaseUrl = () => `${window.location.origin}/api/auth`

/**
 * Low-level fetch wrapper for auth endpoints.
 * Handles common request setup (credentials, headers) and error parsing.
 * @param path - API endpoint path (e.g., '/login')
 * @param init - Optional fetch RequestInit overrides
 * @returns Parsed response body, or undefined for 204 No Content
 * @throws AuthApiError on any non-2xx response
 */
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${authBaseUrl()}${path}`, {
    // The session cookie is HttpOnly and same-origin; this must be set on
    // every auth call (including GETs) so the cookie rides both ways.
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `${response.status}`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch {
      // no JSON body; the status code is all we have
    }
    throw new AuthApiError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

/**
 * Conditionally creates a CSRF header object.
 * Non-GET requests need CSRF protection; login/setPassword create initial sessions so have no token yet;
 * logout/setPolicy are called after auth so need the token from their cache.
 * @param csrf - CSRF token, or undefined to omit the header
 * @returns Header object with X-CSRF-Token, or undefined to omit headers
 */
const csrfHeaders = (csrf?: string): HeadersInit | undefined =>
  csrf ? { 'X-CSRF-Token': csrf } : undefined

/**
 * Fetch the current authentication status without requiring authentication.
 * Includes protection level, password existence, and auth state.
 * @returns Current auth status
 * @throws AuthApiError on server errors
 */
export const getAuthStatus = (): Promise<AuthStatus> => request<AuthStatus>('/status')

/**
 * Authenticate with a password to establish a session.
 * Returns a CSRF token for subsequent authenticated requests.
 * @param password - User's password
 * @param remember - If true, sets a longer-lasting session cookie. Defaults to false for single-session auth.
 * @returns CSRF token for authenticated requests
 * @throws AuthApiError with status 401 for wrong password
 * @throws AuthApiError with status 429 for rate limiting (too many failed attempts)
 */
export const login = (password: string, remember = false): Promise<AuthTokenResponse> =>
  request<AuthTokenResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ password, remember }),
  })

/**
 * Set or change the password.
 * When changing an existing password, must provide the current password.
 * When setting the initial password (no previous session), current is omitted.
 * Returns a CSRF token for subsequent authenticated requests.
 * @param password - New password to set
 * @param current - Current password (required when changing, omitted for initial set)
 * @param remember - If true, sets a longer-lasting session cookie. Defaults to false.
 * @returns CSRF token for authenticated requests
 * @throws AuthApiError with status 401 if current password is incorrect
 */
export const setPassword = (
  password: string,
  current?: string,
  remember = false,
): Promise<AuthTokenResponse> =>
  request<AuthTokenResponse>('/set-password', {
    method: 'POST',
    body: JSON.stringify({ password, ...(current ? { current } : {}), remember }),
  })

/**
 * End the current authenticated session.
 * Clears the HttpOnly session cookie and invalidates the CSRF token.
 * @param csrf - CSRF token from the current session (required to prevent CSRF attacks)
 * @throws AuthApiError on server errors
 */
export const logout = (csrf?: string): Promise<void> =>
  request<void>('/logout', {
    method: 'POST',
    headers: csrfHeaders(csrf),
  })

/**
 * Update the protection/security policy.
 * Changes how aggressive the authentication system protects against brute-force attacks.
 * @param protection - New protection level: 'unset' (no password set), 'off' (disabled), 'risky' (basic), 'all' (full)
 * @param csrf - CSRF token from the current session (required to prevent CSRF attacks)
 * @throws AuthApiError on server errors
 */
export const setPolicy = (protection: ProtectionLevel, csrf?: string): Promise<void> =>
  request<void>('/policy', {
    method: 'POST',
    headers: csrfHeaders(csrf),
    body: JSON.stringify({ protection }),
  })

/**
 * Fetch a fresh CSRF token without re-authenticating.
 * Used to refresh tokens that may be expiring or to get a token for unauthenticated initial requests.
 * @returns Fresh CSRF token
 * @throws AuthApiError on server errors
 */
export const getCsrf = (): Promise<AuthTokenResponse> => request<AuthTokenResponse>('/csrf')

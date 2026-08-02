# Authentication API Documentation

## Overview

The authentication API module (`src/api/auth.ts`) provides a gateway client for managing user authentication in the HiFiBerry WebUI. It handles session management, password management, and security policy configuration.

### Key Design Principles

1. **Same-Origin Only**: All auth endpoints must be called from the same origin where the UI is served. The session is stored in an HttpOnly cookie, making it inaccessible to JavaScript but automatically sent with same-origin requests.

2. **No Circular Dependencies**: This module intentionally does NOT import from `@/api/http` or `@/stores/auth` to prevent circular dependency issues. The auth store calls these functions, so if this module imported back through the store, it would create a cycle.

3. **CSRF Protection**: Non-GET requests (logout, setPolicy) require CSRF tokens to prevent cross-site request forgery attacks.

## Core Types

### `ProtectionLevel`

```typescript
type ProtectionLevel = 'unset' | 'off' | 'risky' | 'all'
```

Represents the authentication protection/brute-force defense level:
- **`unset`**: No password has been set yet; authentication is not possible
- **`off`**: Password-based authentication is disabled
- **`risky`**: Basic brute-force protection (basic rate limiting)
- **`all`**: Full brute-force protection and security measures

### `AuthStatus`

```typescript
interface AuthStatus {
  protection: ProtectionLevel
  has_password: boolean
  authenticated: boolean
}
```

Current authentication state and configuration:
- `protection`: Current protection level
- `has_password`: Whether a password has been configured
- `authenticated`: Whether the current user is logged in

### `AuthTokenResponse`

```typescript
interface AuthTokenResponse {
  csrf: string
}
```

Response from endpoints that establish or refresh sessions, providing:
- `csrf`: CSRF token for use in subsequent authenticated requests

### `AuthApiError`

```typescript
class AuthApiError extends Error {
  status: number
}
```

Custom error thrown on non-2xx responses with:
- `status`: HTTP status code (used to distinguish different error types)
- `message`: Error description from server or status code

**Common Status Codes:**
- `401`: Authentication failed (wrong password, session expired)
- `429`: Rate limited (too many failed attempts)
- `400`: Bad request (invalid parameters)
- `500`: Server error

## API Functions

### `getAuthStatus(): Promise<AuthStatus>`

Fetch the current authentication status without requiring authentication.

**Use Case:** Check if a password is set, current protection level, and authentication state.

**Example:**
```typescript
import { getAuthStatus } from '@/api/auth'

const status = await getAuthStatus()
console.log(status.authenticated) // true/false
console.log(status.has_password)  // true/false
console.log(status.protection)    // 'unset' | 'off' | 'risky' | 'all'
```

### `login(password: string, remember?: boolean): Promise<AuthTokenResponse>`

Authenticate with a password to establish a session.

**Parameters:**
- `password`: User's password
- `remember` (default: `false`): If true, sets a longer-lasting session cookie for persistent login

**Returns:** CSRF token for authenticated requests

**Throws:** `AuthApiError`
- Status `401`: Wrong password
- Status `429`: Rate limited (too many failed attempts)

**Example:**
```typescript
import { login, AuthApiError } from '@/api/auth'

try {
  const result = await login('mypassword', true)
  console.log(result.csrf) // Use for logout, setPolicy
} catch (error) {
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      console.error('Wrong password')
    } else if (error.status === 429) {
      console.error('Too many failed attempts, please try again later')
    }
  }
}
```

### `setPassword(password: string, current?: string, remember?: boolean): Promise<AuthTokenResponse>`

Set or change the password.

**Parameters:**
- `password`: New password to set
- `current`: Current password (required when changing an existing password; omitted for initial password setup)
- `remember` (default: `false`): If true, sets a longer-lasting session cookie

**Returns:** CSRF token for authenticated requests

**Throws:** `AuthApiError`
- Status `401`: Current password is incorrect (when changing password)

**Example:**
```typescript
import { setPassword } from '@/api/auth'

// Initial password setup (no current password)
await setPassword('newpassword')

// Change existing password
await setPassword('newpassword', 'oldpassword')

// With remember me
await setPassword('newpassword', 'oldpassword', true)
```

### `logout(csrf?: string): Promise<void>`

End the current authenticated session.

**Parameters:**
- `csrf`: CSRF token from the current session (optional but recommended for CSRF protection)

**Returns:** `undefined`

**Throws:** `AuthApiError` on server errors

**Example:**
```typescript
import { logout } from '@/api/auth'

// Logout with CSRF protection
await logout(csrfToken)

// Logout without explicit CSRF (still protected by HttpOnly cookie)
await logout()
```

### `setPolicy(protection: ProtectionLevel, csrf?: string): Promise<void>`

Update the authentication security policy/brute-force protection level.

**Parameters:**
- `protection`: New protection level ('unset', 'off', 'risky', 'all')
- `csrf`: CSRF token from the current session (optional but recommended)

**Returns:** `undefined`

**Throws:** `AuthApiError` on server errors

**Example:**
```typescript
import { setPolicy, type ProtectionLevel } from '@/api/auth'

const levels: ProtectionLevel[] = ['unset', 'off', 'risky', 'all']

// Update protection level
await setPolicy('all', csrfToken)
```

### `getCsrf(): Promise<AuthTokenResponse>`

Fetch a fresh CSRF token without re-authenticating.

**Use Cases:**
- Refresh an expiring token
- Get an initial token for the login/setPassword flow
- Re-establish token after it expires

**Returns:** Fresh CSRF token

**Throws:** `AuthApiError` on server errors

**Example:**
```typescript
import { getCsrf } from '@/api/auth'

const freshToken = await getCsrf()
console.log(freshToken.csrf)
```

## Error Handling

The module distinguishes between different error types through HTTP status codes:

```typescript
import { login, AuthApiError } from '@/api/auth'

try {
  await login('password')
} catch (error) {
  if (error instanceof AuthApiError) {
    switch (error.status) {
      case 401:
        // Wrong password or session expired
        console.error('Authentication failed:', error.message)
        break
      case 429:
        // Rate limited
        console.error('Too many attempts. Please try again later.')
        break
      default:
        // Other server errors
        console.error('Server error:', error.status, error.message)
    }
  }
}
```

## Request/Response Details

### HttpOnly Cookies

The session cookie is:
- **HttpOnly**: Cannot be accessed by JavaScript, only sent with requests
- **Same-Origin Only**: Automatically sent for requests to the same origin
- Set by the server during `login` or `setPassword`
- Cleared by the server during `logout`

### CSRF Protection

CSRF tokens are required for state-changing operations (POST requests that modify data):
- `login` and `setPassword` don't send CSRF tokens (no session yet)
- `logout` and `setPolicy` send the CSRF token in the `X-CSRF-Token` header
- The token is cached in the auth store and passed to these functions

### Content-Type

All requests automatically include `Content-Type: application/json` header.

## Dependency Graph

```
auth.ts (leaf module)
├── No imports from @/api/http (apiFetch)
├── No imports from @/stores/auth
└── Internal only: request(), csrfHeaders()

Callers:
├── @/stores/auth → calls all public functions
├── @/components → calls via auth store
└── Server returns HttpOnly cookie
```

This design prevents circular dependencies that would occur if auth functions had to route requests back through apiFetch, which itself calls the auth store on 401 errors.

## Session Flow Example

```typescript
import { 
  getAuthStatus, 
  login, 
  setPassword, 
  logout, 
  setPolicy,
  getCsrf 
} from '@/api/auth'

// 1. Check if password is set
const status = await getAuthStatus()
if (!status.has_password) {
  // 2. Initial setup: set password
  const { csrf: token1 } = await setPassword('mypassword')
  // Server sets HttpOnly session cookie
}

// 3. Later login
const { csrf: token2 } = await login('mypassword', true)
// Server sets HttpOnly session cookie with remember me

// 4. Change protection policy
await setPolicy('all', token2)

// 5. Get fresh token if needed
const { csrf: token3 } = await getCsrf()

// 6. Logout
await logout(token3)
// Server clears HttpOnly session cookie
```

## Testing

The module includes comprehensive unit and regression tests in `src/api/__tests__/auth.test.ts`:

- **33 test cases** covering all functions
- Happy path scenarios for each function
- Error handling with various HTTP status codes
- Header and option validation
- CSRF token handling edge cases
- 204 No Content response handling
- JSON parsing failure scenarios

Run tests with:
```bash
pnpm run test src/api/__tests__/auth.test.ts
```

## Integration with Auth Store

While this module itself has no dependencies, it's designed to be called by `src/stores/auth.ts`:

1. Auth store provides a reactive layer on top of these functions
2. Auth store caches the CSRF token
3. Auth store provides the token to `logout` and `setPolicy`
4. Auth store handles 401 responses from other API calls

See `docs/auth-store.md` for auth store integration details.

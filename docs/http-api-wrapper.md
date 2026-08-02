# HTTP API Wrapper (`http.ts`)

## Overview

The HTTP API wrapper (`apiFetch`) provides a centralized, secure fetch mechanism for all API calls in the application. It handles:

- **CSRF Protection**: Automatically attaches CSRF tokens to write methods (POST, PUT, PATCH, DELETE)
- **Session Management**: Preserves authentication cookies via `credentials: 'same-origin'`
- **401 Unauthorized Recovery**: Implements intelligent recovery strategies based on the type of 401
- **Silent CSRF Token Rehydration**: Recovers lost in-memory CSRF tokens from valid session cookies
- **Authentication Prompts**: Triggers user login/password reset when necessary
- **Transparent Retry Logic**: Retries failed requests exactly once after recovery attempts

## Architecture

### Core Functions

#### `needsCsrf(method?: string): boolean`

Determines if an HTTP method requires CSRF token protection.

- **Logic**: Returns `false` for GET and HEAD (body-less methods); `true` for all others
- **Default**: Assumes GET if method is undefined
- **Case Handling**: Converts method to uppercase for comparison (e.g., `post` → `POST`)

```typescript
needsCsrf() // true (defaults to GET, but actually checks as GET)
needsCsrf('GET') // false
needsCsrf('get') // false (case-insensitive)
needsCsrf('POST') // true
needsCsrf('post') // true
needsCsrf('PATCH') // true
needsCsrf('DELETE') // true
```

#### `parseHint(response: Response): AuthHint`

Extracts the authentication hint from the `WWW-Authenticate-Hint` response header.

- **Purpose**: Determines the type of authentication needed
- **Values**:
  - `'set-password'`: First-time setup; user must set an initial password
  - `'login'`: Normal authentication; user must provide credentials
- **Default**: Assumes `'login'` if header is missing or invalid

```typescript
// When server returns 401 with specific hint
const hint = parseHint(response) // 'set-password' | 'login'
```

#### `apiFetch(url: string, init?: RequestInit, isRetry?: boolean): Promise<Response>`

Central fetch wrapper with CSRF protection and intelligent 401 handling.

### Request Phase

1. **Header Merging**: Preserves custom headers from `init.headers`
2. **CSRF Token Injection**: Adds `X-CSRF-Token` header for write methods if token exists in auth store
3. **Credentials Setting**: Sets `credentials: 'same-origin'` to include auth cookies
4. **Fetch Execution**: Calls native `fetch()` with merged configuration

### Response Phase

#### Successful Responses (200-299, 3xx, 4xx/5xx except 401)

- Passed through unchanged
- Caller is responsible for checking `response.ok` and parsing body

#### 401 Unauthorized (First Attempt)

The response flow depends on the hint and HTTP method:

```
401 Response
    ↓
Parse WWW-Authenticate-Hint Header
    ↓
    ├─ hint: 'set-password'
    │  └─ Go to Step D (Auth Prompt)
    │
    └─ hint: 'login'
       ├─ Is this a write method? (needsCsrf() = true)
       │  ├─ Yes → Step B (CSRF Recovery)
       │  └─ No (GET/HEAD) → Step D (Auth Prompt)
       │
       Step B: CSRF Recovery
       └─ Call authStore.ensureCsrf()
          ├─ Success (token recovered) → Retry Request (Step E)
          └─ Failure (session invalid) → Step D (Auth Prompt)
       │
       Step D: Auth Prompt
       └─ Call authStore.promptForAuth(hint)
          ├─ User authenticated → Retry Request (Step E)
          └─ User cancelled → Throw 'Authentication required'
       │
       Step E: Retry Request
       └─ Call apiFetch(url, init, true) with isRetry=true
          └─ Return response (no more retries)
```

#### 401 Unauthorized (Second Attempt / isRetry=true)

- Passed through without retry logic (prevents infinite loops)
- Caller can inspect and handle

### Recovery Strategies

#### 1. Silent CSRF Token Recovery (login hint + write method)

**Scenario**: Page reload causes loss of in-memory CSRF token, but session cookie is valid

```typescript
// First request fails with 401
POST /api/config { body: {...} }
// Returns 401 with hint='login'

// Handler calls ensureCsrf() to recover token from session
GET /api/auth/csrf (with credentials)
// Returns fresh CSRF token if session is valid
// CSRF token is stored in auth store

// Automatic retry with recovered token
POST /api/config { body: {...}, headers: { X-CSRF-Token: recoveredToken } }
// Succeeds (200)
```

**Success Condition**: `authStore.ensureCsrf()` returns `true`
**Failure Condition**: Session is invalid/expired; CSRF recovery fails

#### 2. User Authentication (fallback)

**Scenario**: CSRF recovery fails or hint is 'set-password'

```typescript
// CSRF recovery failed or not applicable
// Handler calls authStore.promptForAuth(hint)

// UI displays SecurityPrompt modal
// User enters password (or sets new password if hint='set-password')

// User clicks "Submit"
// Auth store makes authentication API call
// CSRF token is refreshed in auth store

// Automatic retry with new token
POST /api/config { body: {...}, headers: { X-CSRF-Token: newToken } }
// Succeeds (200)
```

**Success Condition**: `authStore.promptForAuth()` returns `true`
**Cancellation**: User closes modal → throws `'Authentication required'` error

### Error Handling

#### Non-401 HTTP Errors

- Passed through unchanged (e.g., 403, 404, 500)
- Caller handles errors via `response.ok` check or status codes

```typescript
const response = await apiFetch('/api/data')
if (!response.ok) {
  // Handle error status (403, 404, 500, etc.)
  console.error(response.status)
}
```

#### Network Errors

- Network failures throw naturally from `fetch()`
- Not caught by `apiFetch()`; propagate to caller

```typescript
try {
  const response = await apiFetch('/api/data')
} catch (error) {
  // Network error, CORS error, or 'Authentication required'
}
```

#### Authentication Errors

```typescript
try {
  const response = await apiFetch('/api/config', { method: 'POST' })
} catch (error) {
  if (error.message === 'Authentication required') {
    // User cancelled auth prompt
  }
}
```

## Usage Examples

### Simple GET Request

```typescript
import { apiFetch } from '@/api/http'

const response = await apiFetch('/api/status')
if (response.ok) {
  const data = await response.json()
  console.log(data)
}
```

### POST Request with JSON Body

```typescript
const response = await apiFetch('/api/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
})

if (!response.ok) {
  console.error('Request failed:', response.status)
}
```

### PUT Request with Custom Headers

```typescript
const response = await apiFetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Version': '2.0'
  },
  body: JSON.stringify({ name: 'New Name' })
})
```

### DELETE Request

```typescript
const response = await apiFetch('/api/resource/123', { method: 'DELETE' })

if (response.status === 204) {
  console.log('Deleted successfully')
}
```

### Handling Authentication Errors

```typescript
try {
  const response = await apiFetch('/api/admin', { method: 'POST' })
  if (!response.ok) {
    // Status error (4xx, 5xx)
  }
} catch (error) {
  if (error.message === 'Authentication required') {
    // User cancelled login
  } else {
    // Network error
  }
}
```

### With Async/Await

```typescript
async function fetchUserData() {
  try {
    const response = await apiFetch('/api/user')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch user:', error)
  }
}
```

## Design Decisions

### Why CSRF Tokens for Write Methods?

The application uses CSRF protection to prevent cross-site request forgery attacks. Only write methods (POST, PUT, PATCH, DELETE) need tokens because:

- **GET/HEAD** are read-only; servers should not accept them for sensitive state changes
- **Write methods** can modify server state and require explicit authorization

### Why Silent CSRF Recovery?

In-memory CSRF tokens are lost on page reload, but HttpOnly session cookies survive (typically 12 hours, or 30 days with "remember"). Attempting silent recovery before prompting reduces friction:

- Avoids unnecessary login prompts
- Maintains the user's session automatically
- Only falls back to full authentication if session is truly expired

### Why Retry Only Once?

Retrying only on the first 401 prevents infinite loops:

- If retry fails (second 401), the error is passed to the caller
- Caller can implement application-specific error handling
- Prevents unbounded retry loops from misconfigured servers

## Thread Safety & Concurrency

### Prompt Sharing

Multiple concurrent requests can trigger 401s simultaneously. The auth store's `promptForAuth()` implementation:

- Returns the same promise for concurrent calls (first caller opens prompt, others wait)
- Settles all pending requests once user authenticates or cancels
- Prevents multiple login modals from appearing

```typescript
// Request A triggers 401
apiFetch('/api/a', { method: 'POST' })

// Request B also triggers 401 before A's prompt is resolved
apiFetch('/api/b', { method: 'POST' })

// Both share the same prompt; one login authenticates both
```

## Testing

Comprehensive test coverage includes:

- **Unit Tests**: Individual function behavior
- **Integration Tests**: Multi-step flows (401 → recovery → retry)
- **Edge Cases**: Missing headers, null tokens, malformed responses
- **Regression Tests**: Prevents regressions in critical paths

See [src/__tests__/api/http.test.ts](../../src/__tests__/api/http.test.ts) for full test suite.

## Common Pitfalls

### 1. Checking `response.ok` is Required

`apiFetch()` does **not** throw on HTTP errors. Always check status:

```typescript
// ❌ Wrong: doesn't catch HTTP errors
const data = await apiFetch('/api/data').then(r => r.json())

// ✅ Correct: checks status first
const response = await apiFetch('/api/data')
if (!response.ok) throw new Error(`HTTP ${response.status}`)
const data = await response.json()
```

### 2. CSRF Recovery Only Works for Write Methods

GET/HEAD requests that receive 401 skip CSRF recovery and go straight to auth prompt:

```typescript
// ❌ 401 on GET skips CSRF recovery (not applicable)
GET /api/data → 401 → prompt for auth (not CSRF recovery)

// ✅ 401 on POST attempts CSRF recovery first
POST /api/data → 401 → try ensureCsrf() → retry or prompt
```

### 3. Second 401 is Passed Through

If a request fails 401, is retried, and fails 401 again, it's passed through:

```typescript
POST /api/data → 401 → ensureCsrf() → POST /api/data (retry)
→ 401 (again!) → Passed through (not retried again)
```

## Related APIs

- [Auth API](./auth-api.md): Password login, logout, CSRF token retrieval
- [Auth Store](./auth-store.md): Session state, token management, auth prompts
- [App Config Store](./appconfig-store.md): API base URLs, configuration

## Future Improvements

1. **Timeout Support**: Add configurable request timeouts
2. **Retry Backoff**: Implement exponential backoff for transient failures
3. **Request Caching**: Cache GET responses with cache invalidation
4. **Request Logging**: Enhanced debugging with request/response logging
5. **Circuit Breaker**: Prevent cascading failures in high-error scenarios

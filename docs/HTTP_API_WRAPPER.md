# HTTP API Wrapper (`src/api/http.ts`)

## Overview

The `apiFetch` function is a centralized fetch wrapper that handles:
- **CSRF token protection** on write requests
- **Session cookie management** via credentials
- **Automatic retry logic** for 401 responses with intelligent recovery
- **Auth prompting** with support for login and password-reset flows

This module ensures secure, consistent API communication across the entire application.

## Architecture

### Core Functions

#### `needsCsrf(method?: string): boolean`

Determines if a given HTTP method requires CSRF token protection.

- **Methods requiring CSRF**: POST, PUT, PATCH, DELETE (anything with a request body)
- **Methods NOT requiring CSRF**: GET, HEAD (body-less methods)
- **Default**: Assumes GET if method is undefined
- **Case handling**: Methods are normalized to uppercase for comparison

```typescript
needsCsrf('POST')   // → true
needsCsrf('post')   // → true (case-insensitive)
needsCsrf('GET')    // → false
needsCsrf()         // → false (defaults to GET)
```

#### `parseHint(response: Response): AuthHint`

Extracts and interprets the `WWW-Authenticate-Hint` response header.

| Header Value | Result | Meaning |
|---|---|---|
| `'set-password'` | `'set-password'` | User must set a new password before proceeding |
| `anything else` | `'login'` | Standard login/re-authentication required |
| `missing` | `'login'` | Defaults to login flow |

#### `apiFetch(url, init?, isRetry?): Promise<Response>`

The main exported function that wraps the native `fetch` API.

**Parameters:**
- `url: string` - Request URL
- `init?: RequestInit` - Standard fetch options (method, headers, body, etc.)
- `isRetry?: boolean` - Internal flag to prevent infinite retry loops (not meant for external use)

**Returns:** `Promise<Response>` - Standard fetch Response object

**Throws:**
- `Error('Authentication required')` - If the user cancels the auth prompt

## Request Flow

```
apiFetch(url, init)
    ↓
[Merge headers + add CSRF token if needed]
    ↓
fetch(url, { credentials: 'same-origin', headers, ...init })
    ↓
    ├─ Status 401? ──→ [isRetry=true] ──→ Return response (no retry)
    │                 [isRetry=false] ↓
    │   └─ login hint + write method ──→ Try ensureCsrf() recovery
    │                                     ├─ Success ──→ Retry once
    │                                     └─ Fail ──→ Prompt for auth
    │   └─ login hint + GET/HEAD ──────→ Prompt for auth (no recovery)
    │   └─ set-password hint ──────────→ Prompt for auth (no recovery)
    │
    └─ Other status ──→ Return response (no auth handling)
```

## CSRF Token Handling

### Attack Vector
CSRF (Cross-Site Request Forgery) attacks trick authenticated users into making unintended requests. The server prevents this by requiring write requests to include a token it issued.

### Implementation

1. **Token Source**: Cached in `authStore.csrf`
2. **Attachment**: Included as `X-CSRF-Token` header on write methods
3. **Reset on 401**: When a 401 occurs on a write request, the in-memory token may be stale
   - The server can issue a new token if the session cookie is still valid
   - `ensureCsrf()` silently recovers and retries without user interaction

### Example
```typescript
// CSRF token is automatically attached to write requests
const response = await apiFetch('/api/config/restart', { method: 'POST' })

// No CSRF needed for GET
const data = await apiFetch('/api/config/status', { method: 'GET' })
```

## 401 Authorization Response Handling

### Scenario 1: Lost CSRF Token, Valid Session (Most Common)

**Trigger**: `WWW-Authenticate-Hint: login` + write method + 401

**Flow**:
1. In-memory CSRF token is stale (e.g., page reload)
2. `ensureCsrf()` calls the backend to recover a fresh token
3. Backend validates session cookie → returns new token
4. Request is retried automatically **without prompting the user**

**Code Path**:
```typescript
if (hint === 'login' && needsCsrf(init.method) && await authStore.ensureCsrf()) {
  return apiFetch(url, init, true)  // Retry with fresh token
}
```

### Scenario 2: Invalid Session

**Trigger**: `WWW-Authenticate-Hint: login` + failed `ensureCsrf()` + any method

**Flow**:
1. Session cookie is invalid/expired
2. `ensureCsrf()` fails (no valid session)
3. **User is prompted to log in** via `promptForAuth(hint)`
4. If user authenticates, request is retried once
5. If user cancels, throws error

**Code Path**:
```typescript
const authenticated = await authStore.promptForAuth(hint)
if (!authenticated) {
  throw new Error('Authentication required')
}
return apiFetch(url, init, true)  // Retry after authentication
```

### Scenario 3: Password Reset Required

**Trigger**: `WWW-Authenticate-Hint: set-password` + 401

**Flow**:
1. Server requires password change (e.g., expired password policy)
2. **CSRF recovery is skipped** (not applicable to password reset)
3. **User is prompted with password-reset flow** via `promptForAuth('set-password')`
4. If successful, request is retried
5. If cancelled, throws error

**Code Path**:
```typescript
// CSRF recovery is skipped for set-password hint
const authenticated = await authStore.promptForAuth('set-password')
```

### Scenario 4: GET/HEAD Request Fails Authorization

**Trigger**: 401 on body-less method (GET/HEAD)

**Flow**:
1. CSRF recovery is skipped (body-less methods don't use CSRF)
2. 401 means the **session itself is invalid**
3. **User is prompted to log in**
4. If successful, request is retried
5. If cancelled, throws error

**Code Path**:
```typescript
// CSRF recovery never runs for body-less methods
if (hint === 'login' && needsCsrf(init.method) && ...) {
  // needsCsrf returns false for GET/HEAD, so recovery is skipped
}
```

### Scenario 5: Second 401 After Retry

**Trigger**: 401 on initial request → recovery/retry → second 401 → 401 again

**Flow**:
1. First 401 triggers recovery or auth prompt
2. Request is retried with `isRetry=true`
3. **If retry also returns 401, it's returned as-is** (no further retry)
4. Caller handles the final 401 response

**Code Path**:
```typescript
if (response.status !== 401 || isRetry) {
  return response  // No further retries after first attempt
}
```

## Credentials & Session Cookies

### SOP (Same-Origin Policy)

All requests use `credentials: 'same-origin'`, which means:
- **Same-origin requests**: Include auth session cookies in request headers
- **Cross-origin requests**: Cookies are **NOT** included (browser security)

This is why `apiFetch` can only be used for same-origin API endpoints.

### Example
```typescript
// ✓ Session cookie is automatically included
await apiFetch('/api/config/status')

// ✗ Cannot use for cross-origin (credentials won't be sent anyway due to browser CORS)
// await apiFetch('https://other-domain.com/api/data')
```

## Header Merging

Custom headers in `init.headers` are preserved and merged with the CSRF token:

```typescript
const response = await apiFetch('/api/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value'
  },
  body: JSON.stringify({ data: 'test' })
})

// Result headers include:
// - Content-Type: application/json
// - X-Custom-Header: value
// - X-CSRF-Token: <token from authStore>
// - cookies via credentials: 'same-origin'
```

## Error Handling

### Network Errors

Network failures (DNS lookup failed, connection timeout, etc.) propagate directly:

```typescript
try {
  await apiFetch('/api/data')
} catch (error) {
  // TypeError: fetch failed (network error)
  // Not caught by apiFetch, propagates to caller
}
```

### Authentication Errors

Only auth-related errors are caught and handled by `apiFetch`:

```typescript
try {
  await apiFetch('/api/admin', { method: 'POST' })
} catch (error) {
  if (error.message === 'Authentication required') {
    // User cancelled the auth prompt
    // Redirect to login or show error
  }
}
```

### Response Status Codes

All HTTP status codes (including errors) are returned to the caller:

```typescript
const response = await apiFetch('/api/data')

if (!response.ok) {
  // Handle any error: 403 Forbidden, 404 Not Found, 500 Server Error, etc.
  const error = await response.json()
  console.error(`API Error (${response.status}): ${error.message}`)
}
```

## Concurrency & Race Conditions

### Deduplication of Auth Prompts

If multiple requests hit 401 simultaneously and recovery fails, they share a single auth prompt:

```typescript
// These are concurrent:
const [r1, r2] = await Promise.all([
  apiFetch('/api/a', { method: 'POST' }),
  apiFetch('/api/b', { method: 'POST' })
])

// Both may hit 401, but only ONE auth prompt is shown to the user
// Both requests reuse the same authentication result
```

This is handled by `authStore.promptForAuth()` which deduplicates concurrent prompts internally.

### Why This Matters

Without deduplication, 10 concurrent requests hitting 401 would prompt 10 times, annoying the user. The store ensures only one prompt per auth event.

## Best Practices

### ✓ DO

```typescript
// Use for all risky (write) API operations
await apiFetch('/api/config/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
})

// Chain response handling
const response = await apiFetch('/api/data')
if (response.ok) {
  const data = await response.json()
  // Use data
} else if (response.status === 403) {
  // Handle permission denied
} else {
  // Handle other errors
}

// Use for same-origin endpoints only
await apiFetch('/api/local/endpoint')

// Handle auth errors gracefully
try {
  await apiFetch('/api/admin/action', { method: 'POST' })
} catch (error) {
  if (error.message === 'Authentication required') {
    // Redirect to login page or show message
  }
}
```

### ✗ DON'T

```typescript
// Don't use raw fetch for protected endpoints
const response = await fetch('/api/config/save', {
  method: 'POST',
  body: JSON.stringify(config)
})
// ✗ No CSRF token! Vulnerable to CSRF attacks
// ✗ No automatic retry logic for 401

// Don't use for cross-origin APIs
await apiFetch('https://external-api.com/data')
// ✗ Session cookies won't be sent to other origins

// Don't ignore auth errors
try {
  await apiFetch('/api/admin', { method: 'POST' })
} catch {
  // ✗ Silently ignoring auth failure
}

// Don't retry manually on 401
while (true) {
  const response = await apiFetch('/api/data')
  if (response.status === 401) {
    // ✗ apiFetch already handles 401 retries
  }
}
```

## Common Scenarios

### Scenario A: Simple Read
```typescript
const response = await apiFetch('/api/status')
const data = await response.json()
console.log(data)
```

### Scenario B: Write with Validation
```typescript
const response = await apiFetch('/api/config/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newConfig)
})

if (response.ok) {
  console.log('Config updated')
} else if (response.status === 400) {
  const error = await response.json()
  console.error('Invalid config:', error)
}
```

### Scenario C: Handle Auth Prompt
```typescript
try {
  const response = await apiFetch('/api/admin/users', { method: 'POST' })
  if (response.ok) {
    // Success
  }
} catch (error) {
  if (error.message === 'Authentication required') {
    showNotification('Please log in to continue')
    redirectToLogin()
  }
}
```

### Scenario D: Concurrent Requests (Auto-Deduplication)
```typescript
// These may hit 401 concurrently:
const [configRes, statusRes] = await Promise.all([
  apiFetch('/api/config/list'),
  apiFetch('/api/status/check')
])

// If both get 401 and recovery fails:
// - Only ONE auth prompt shown
// - User authenticates once
// - Both requests retry with new auth
```

## Testing

The module has comprehensive test coverage in `src/api/__tests__/http.test.ts`:

- **CSRF Logic**: Token attachment, case-insensitivity, header merging
- **Auth Retry**: Silent recovery, prompt handling, second 401 handling
- **Concurrency**: Deduplication of auth prompts
- **Error Handling**: Network errors, auth failures, status codes
- **Edge Cases**: Missing hints, null tokens, various HTTP methods

Run tests:
```bash
pnpm test src/api/__tests__/http.test.ts
```

## TypeScript Types

### AuthHint
```typescript
type AuthHint = 'login' | 'set-password'
```

Indicates which authentication flow to follow:
- `'login'`: Standard login/re-authentication
- `'set-password'`: Password reset/change required

### RequestInit
Standard Fetch API type. Common properties:
- `method`: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'
- `headers`: Record of header names to values
- `body`: Request body (string, Blob, BufferSource, FormData, URLSearchParams, ReadableStream)

### Response
Standard Fetch API type returned by `apiFetch`. Properties:
- `ok`: boolean (true if status 200-299)
- `status`: number
- `headers`: Headers object
- `json()`: Promise resolving to parsed JSON
- `text()`: Promise resolving to text
- `blob()`: Promise resolving to blob
- And more...

## Implementation Details

### Why `isRetry` Parameter?

The `isRetry` parameter prevents infinite loops:

```
Initial request (isRetry=false)
    ↓ [401 received]
Retry request (isRetry=true)
    ↓ [If another 401 received]
Return response (no further retries)
```

Without this guard, pathological scenarios could cause infinite retries.

### Why Both Headers AND Credentials?

Headers are used for the CSRF token (app-level protection), while credentials are used for session cookies (browser-level auth):

- **X-CSRF-Token header**: Prevents CSRF attacks on write requests
- **Session cookies (via credentials)**: Maintains authentication state

Both are needed for complete security.

## Troubleshooting

### Issue: "Authentication required" error thrown

**Causes:**
- User doesn't have valid session
- User cancelled the auth prompt
- Session expired during request

**Solution:**
```typescript
try {
  await apiFetch('/api/admin', { method: 'POST' })
} catch (error) {
  if (error.message === 'Authentication required') {
    // Redirect to login page
    window.location.href = '/login'
  }
}
```

### Issue: CSRF token missing from request

**Causes:**
- `authStore.csrf` is null/empty
- Using GET/HEAD method (no CSRF needed)
- Server hasn't issued a token yet

**Solution:**
```typescript
// First request after login may not have CSRF token, that's OK
// Server will issue token on response
// Next request will use the token

// Force CSRF recovery if needed:
await authStore.ensureCsrf()
const response = await apiFetch('/api/config/save', { method: 'POST' })
```

### Issue: Request hangs on 401

**Causes:**
- Auth prompt is stuck (UI issue)
- Concurrent requests all waiting on shared prompt

**Solution:**
The request shouldn't hang. If it does:
1. Check browser DevTools → Network tab
2. Check browser console for errors
3. Verify auth store is properly initialized
4. Restart the app if necessary

## Related Files

- **Source**: `src/api/http.ts`
- **Tests**: `src/api/__tests__/http.test.ts`
- **Auth Store**: `src/stores/auth.ts`
- **Configuration**: `src/stores/auth.ts` for CSRF and prompt configuration

# Last.FM API Reference

## Overview

The Last.FM API module provides authentication and integration with Last.FM service. It handles the OAuth-like authentication flow, status checking, and disconnection.

**Module**: `src/api/lastfm.ts`  
**Dependencies**: 
- `useAppConfigStore()` - For API base URL
- `apiFetch()` - HTTP wrapper with CSRF/auth handling

**API Server**: Requires backend audiocontrol service with Last.FM integration

---

## Architecture

### Authentication Flow

```
┌─────────────┐
│   Status    │  Check if authenticated
└──────┬──────┘
       │
       ├─────→ [Yes] Done
       │
       └─────→ [No]
              │
              ├─ startLastFMAuth()
              │   ├─ Get auth URL
              │   ├─ Get request token
              │   └─ Redirect user
              │
              ├─ User authorizes at Last.FM
              │
              ├─ prepareLastFMAuthCompletion(token)
              │   ├─ Send token to backend
              │   └─ Backend exchanges for access token
              │
              └─ completeLastFMAuth()
                 ├─ Backend completes handshake
                 └─ User is now authenticated
```

### Error Handling

All functions throw `Error` on HTTP errors (non-2xx responses):

```typescript
try {
  const status = await getLastFMStatus()
} catch (error) {
  console.error(error.message)
  // "Failed to get Last.FM status: 500 Internal Server Error"
}
```

API-level errors are returned in the response (not thrown):

```typescript
const status = await getLastFMStatus()
if (status.error) {
  console.error(status.error, status.error_description)
}
```

---

## Type Definitions

### LastFMStatusResponse

```typescript
interface LastFMStatusResponse {
  authenticated: boolean      // Whether user is authenticated
  username?: string           // Last.FM username if authenticated
  error?: string              // Error code (if any)
  error_description?: string  // Error description (if any)
}
```

**Example - Authenticated**:
```typescript
{
  authenticated: true,
  username: "john_doe"
}
```

**Example - Not Authenticated**:
```typescript
{
  authenticated: false
}
```

**Example - API Error**:
```typescript
{
  authenticated: false,
  error: "SERVICE_ERROR",
  error_description: "Last.FM service is temporarily unavailable"
}
```

---

### LastFMAuthResponse

```typescript
interface LastFMAuthResponse {
  url: string              // URL for user to authorize
  request_token: string    // Token to use in completion
  error?: string           // Error code (if any)
}
```

**Example - Success**:
```typescript
{
  url: "https://www.last.fm/api/auth/?token=abc123def456&cb=http://localhost:3000",
  request_token: "abc123def456"
}
```

**Example - Rate Limited**:
```typescript
{
  url: "",
  request_token: "",
  error: "RATE_LIMIT"
}
```

---

### LastFMPrepareAuthResponse

```typescript
interface LastFMPrepareAuthResponse {
  success: boolean     // Whether preparation succeeded
  error?: string       // Error code (if any)
}
```

**Example - Success**:
```typescript
{
  success: true
}
```

**Example - Invalid Token**:
```typescript
{
  success: false,
  error: "INVALID_TOKEN"
}
```

---

### LastFMCompleteAuthResponse

```typescript
interface LastFMCompleteAuthResponse {
  authenticated: boolean      // Whether completion succeeded
  username?: string           // New username
  error?: string              // Error code (if any)
  error_description?: string  // Error description (if any)
}
```

**Example - Success**:
```typescript
{
  authenticated: true,
  username: "jane_smith"
}
```

**Example - Expired Token**:
```typescript
{
  authenticated: false,
  error: "TOKEN_EXPIRED",
  error_description: "Token expired before authorization"
}
```

---

### LastFMDisconnectResponse

```typescript
interface LastFMDisconnectResponse {
  authenticated: boolean      // Whether still authenticated (should be false)
  error?: string              // Error code (if any)
  error_description?: string  // Error description (if any)
}
```

**Example - Success**:
```typescript
{
  authenticated: false
}
```

**Example - Still Connected**:
```typescript
{
  authenticated: true,
  error: "DISCONNECT_FAILED",
  error_description: "Could not revoke Last.FM access"
}
```

---

## Functions

### getLastFMStatus()

Get the current Last.FM authentication status.

```typescript
async getLastFMStatus(): Promise<LastFMStatusResponse>
```

**Returns**: Status response with authentication state

**Throws**: `Error` on HTTP error

**Endpoint**: `GET /lastfm/status`

**Example**:
```typescript
const status = await getLastFMStatus()

if (status.authenticated) {
  console.log(`Logged in as ${status.username}`)
} else if (status.error) {
  console.error(`Error: ${status.error_description}`)
} else {
  console.log('Not authenticated')
}
```

**Error Handling**:
```typescript
try {
  const status = await getLastFMStatus()
  // Process status
} catch (error) {
  // HTTP error (500, 503, etc.)
  console.error('Failed to check status:', error.message)
}
```

---

### startLastFMAuth()

Start the Last.FM OAuth authentication process.

```typescript
async startLastFMAuth(): Promise<LastFMAuthResponse>
```

**Returns**: Auth response with URL and token

**Throws**: `Error` on HTTP error

**Endpoint**: `GET /lastfm/auth`

**Flow**:
1. Get auth URL and request token from backend
2. Redirect user to Last.FM URL
3. User authorizes the application
4. Continue with `prepareLastFMAuthCompletion()` and `completeLastFMAuth()`

**Example**:
```typescript
const auth = await startLastFMAuth()

if (auth.error) {
  console.error(`Failed to start auth: ${auth.error}`)
  return
}

// Redirect user to authorize
window.open(auth.url, '_blank')

// User will authorize, then:
// 1. Call prepareLastFMAuthCompletion(auth.request_token)
// 2. Call completeLastFMAuth()
```

**Error Handling**:
```typescript
try {
  const auth = await startLastFMAuth()
  if (auth.request_token) {
    window.open(auth.url, '_blank')
  }
} catch (error) {
  console.error('Failed to start auth:', error.message)
}
```

---

### prepareLastFMAuthCompletion(token)

Prepare the backend for authentication completion.

```typescript
async prepareLastFMAuthCompletion(
  token: string
): Promise<LastFMPrepareAuthResponse>
```

**Parameters**:
- `token` (string, required): Request token from `startLastFMAuth()`

**Returns**: Preparation response with success status

**Throws**: `Error` on HTTP error

**Endpoint**: `POST /lastfm/prepare_complete_auth`

**Body**:
```json
{
  "token": "abc123"
}
```

**Purpose**: Exchange the request token for an access token with Last.FM

**Example**:
```typescript
const auth = await startLastFMAuth()
window.open(auth.url, '_blank')

// Wait for user to authorize...

const prepare = await prepareLastFMAuthCompletion(auth.request_token)

if (prepare.success) {
  const complete = await completeLastFMAuth()
  if (complete.authenticated) {
    console.log(`Logged in as ${complete.username}`)
  }
} else {
  console.error(`Token validation failed: ${prepare.error}`)
}
```

**Error Cases**:
```typescript
// Token already used
{ success: false, error: "TOKEN_ALREADY_USED" }

// Token expired
{ success: false, error: "TOKEN_EXPIRED" }

// Token invalid format
{ success: false, error: "INVALID_TOKEN" }

// Backend error
// Throws Error("Failed to prepare Last.FM auth completion: 500 ...")
```

---

### completeLastFMAuth()

Complete the Last.FM authentication.

```typescript
async completeLastFMAuth(): Promise<LastFMCompleteAuthResponse>
```

**Returns**: Completion response with authenticated state and username

**Throws**: `Error` on HTTP error

**Endpoint**: `GET /lastfm/complete_auth`

**Prerequisites**:
1. `startLastFMAuth()` must be called first
2. User must authorize at Last.FM
3. `prepareLastFMAuthCompletion()` must be called with the token

**Example - Full Auth Flow**:
```typescript
// Step 1: Get auth URL
const auth = await startLastFMAuth()
if (auth.error) throw new Error(auth.error)

// Step 2: Redirect user
window.open(auth.url, '_blank')

// Step 3: Wait for user to authorize
// (Typically done via callback or user clicking a button)

// Step 4: Prepare backend
const prepare = await prepareLastFMAuthCompletion(auth.request_token)
if (!prepare.success) throw new Error(prepare.error)

// Step 5: Complete authentication
const complete = await completeLastFMAuth()
if (complete.authenticated) {
  console.log(`Successfully logged in as ${complete.username}`)
  // Update UI, store session, etc.
} else {
  console.error(`Authentication failed: ${complete.error}`)
}
```

**Error Handling**:
```typescript
try {
  const complete = await completeLastFMAuth()
  if (complete.authenticated) {
    // Success
  } else {
    // API error returned
    console.error(complete.error_description)
  }
} catch (error) {
  // HTTP error
  console.error('Request failed:', error.message)
}
```

---

### disconnectLastFM()

Disconnect from Last.FM and revoke access token.

```typescript
async disconnectLastFM(): Promise<LastFMDisconnectResponse>
```

**Returns**: Disconnect response with authenticated state

**Throws**: `Error` on HTTP error

**Endpoint**: `POST /lastfm/disconnect`

**Body**: Empty JSON object `{}`

**Effect**: 
- Revokes Last.FM access token
- Clears Last.FM session from backend
- User is no longer authenticated

**Example**:
```typescript
const disconnect = await disconnectLastFM()

if (!disconnect.authenticated) {
  console.log('Successfully logged out')
  // Update UI, clear session, etc.
} else {
  console.error('Failed to disconnect:', disconnect.error)
}
```

**Error Handling**:
```typescript
try {
  const disconnect = await disconnectLastFM()
  if (disconnect.authenticated) {
    // Still connected, error occurred
    console.error(disconnect.error_description)
  }
} catch (error) {
  // HTTP error during disconnect attempt
  console.error('Disconnect failed:', error.message)
}
```

---

## Usage Patterns

### Check Status

Simple check without side effects:

```typescript
import { getLastFMStatus } from '@/api/lastfm'

const status = await getLastFMStatus()
console.log(status.authenticated ? `Logged in as ${status.username}` : 'Not logged in')
```

### Complete Authentication Flow

Full OAuth-like flow:

```typescript
import { 
  startLastFMAuth,
  prepareLastFMAuthCompletion,
  completeLastFMAuth,
  getLastFMStatus 
} from '@/api/lastfm'

export async function authenticateWithLastFM() {
  // 1. Start authentication
  const auth = await startLastFMAuth()
  if (auth.error) {
    throw new Error(`Auth error: ${auth.error}`)
  }

  // 2. Open authorization URL in popup
  const popup = window.open(auth.url, 'lastfm_auth', 'width=500,height=400')
  
  // 3. Wait for user authorization (this is application-specific)
  // Could be via message passing, polling, or callback
  await waitForUserAuthorization()

  // 4. Prepare completion with token
  const prepare = await prepareLastFMAuthCompletion(auth.request_token)
  if (!prepare.success) {
    throw new Error(`Token error: ${prepare.error}`)
  }

  // 5. Complete authentication
  const complete = await completeLastFMAuth()
  if (!complete.authenticated) {
    throw new Error(`Completion error: ${complete.error}`)
  }

  return complete
}
```

### Handle Logout

Simple disconnect:

```typescript
import { disconnectLastFM } from '@/api/lastfm'

export async function logoutFromLastFM() {
  const result = await disconnectLastFM()
  
  if (!result.authenticated) {
    console.log('Successfully logged out')
  } else {
    throw new Error(result.error_description)
  }
}
```

### In Vue Component

Reactive status management:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLastFMStatus, startLastFMAuth, disconnectLastFM } from '@/api/lastfm'

const status = ref<string>('checking')
const username = ref<string>('')
const error = ref<string>('')

onMounted(async () => {
  try {
    const result = await getLastFMStatus()
    if (result.authenticated) {
      status.value = 'authenticated'
      username.value = result.username || ''
    } else if (result.error) {
      status.value = 'error'
      error.value = result.error_description || result.error
    } else {
      status.value = 'unauthenticated'
    }
  } catch (err) {
    status.value = 'error'
    error.value = err.message
  }
})

const login = async () => {
  try {
    const auth = await startLastFMAuth()
    if (auth.error) {
      error.value = auth.error
      return
    }
    window.open(auth.url, '_blank')
    // Handle completion in separate flow
  } catch (err) {
    error.value = err.message
  }
}

const logout = async () => {
  try {
    await disconnectLastFM()
    status.value = 'unauthenticated'
    username.value = ''
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <div class="lastfm-status">
    <div v-if="status === 'checking'">Checking Last.FM status...</div>
    <div v-else-if="status === 'authenticated'">
      <p>Logged in as: {{ username }}</p>
      <button @click="logout">Logout from Last.FM</button>
    </div>
    <div v-else-if="status === 'unauthenticated'">
      <p>Not connected to Last.FM</p>
      <button @click="login">Connect to Last.FM</button>
    </div>
    <div v-else-if="status === 'error'">
      <p>Error: {{ error }}</p>
    </div>
  </div>
</template>
```

---

## Error Handling

### HTTP Errors

Functions throw `Error` on HTTP status errors:

```typescript
try {
  const status = await getLastFMStatus()
} catch (error) {
  // error.message = "Failed to get Last.FM status: 500 Internal Server Error"
  // This is an HTTP-level error
}
```

**Common HTTP Errors**:

| Status | Meaning | Handling |
|--------|---------|----------|
| 401 | Unauthorized | Retry with current auth (http.ts handles) |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Endpoint missing or backend service down |
| 500 | Server Error | Backend error, could be temporary |
| 503 | Service Unavailable | Service down or maintenance |

### API Errors

Responses may contain error codes (not thrown):

```typescript
const auth = await startLastFMAuth()
if (auth.error) {
  // Handle: "RATE_LIMIT", "SERVICE_ERROR", etc.
  console.error(auth.error)
}
```

**Error Response Format**:
```typescript
{
  // Normal fields
  authenticated?: boolean,
  success?: boolean,
  
  // Error fields (if error occurred)
  error: string,
  error_description?: string
}
```

### Retry Strategy

For idempotent operations:

```typescript
async function getStatusWithRetry(maxAttempts = 3): Promise<LastFMStatusResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getLastFMStatus()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000))
    }
  }
}
```

---

## Version Compatibility

**Backend Required**: Last.FM integration support in audiocontrol backend

**Minimum Version**: audiocontrol 0.8.0+

**Changes**:
- 0.8.0: Initial Last.FM API support
- Later versions may add features (check backend changelog)

---

## Security Considerations

### Token Handling

- **Request tokens** are short-lived (typically 10 minutes)
- **Access tokens** should be stored securely (HTTP-only cookies recommended)
- Never expose access tokens in client-side code

### CSRF Protection

All requests go through `apiFetch()` which handles:
- CSRF token injection
- Session management
- Authentication prompts

### Session Management

- Backend manages Last.FM session
- Access tokens stored server-side
- Client receives only authentication status

---

## Troubleshooting

### User stuck at authorization screen

**Symptom**: `prepareLastFMAuthCompletion()` says token is invalid/expired

**Causes**:
- User took too long to authorize (tokens expire in ~10 minutes)
- User closed authorization window
- Browser lost session

**Solution**:
- Restart auth flow: call `startLastFMAuth()` again
- Implement polling or callback mechanism to detect completion

### "Already authenticated" but authorization fails

**Symptom**: `getLastFMStatus()` returns authenticated, but `startLastFMAuth()` fails

**Causes**:
- Session already exists from previous attempt
- Last.FM rate limiting

**Solution**:
- Call `disconnectLastFM()` first
- Wait before retrying
- Check Last.FM API rate limits

### "Failed to connect" with 404

**Symptom**: All requests return 404

**Causes**:
- Backend Last.FM service not available
- Wrong API endpoint
- Routing issue

**Solution**:
- Verify backend is running
- Check API base URL in config
- Review backend logs for Last.FM integration

### Constant "Service Error"

**Symptom**: `error: "SERVICE_ERROR"`, `error_description: "Last.FM service is down"`

**Causes**:
- Last.FM API down
- Network connectivity issue
- Proxy/firewall blocking

**Solution**:
- Check Last.FM status page
- Verify network connectivity
- Check proxy settings

---

## Best Practices

1. **Always check for errors** in responses:
   ```typescript
   const result = await getLastFMStatus()
   if (result.error) {
     // Handle API error
   }
   ```

2. **Catch HTTP errors** in try-catch blocks:
   ```typescript
   try {
     const result = await startLastFMAuth()
   } catch (error) {
     // Handle HTTP error
   }
   ```

3. **Implement proper flow** for authentication:
   - Check status first
   - Start auth if needed
   - Open auth URL
   - Wait for completion
   - Complete auth
   - Verify success

4. **Handle token expiration** in the auth flow:
   ```typescript
   const prepare = await prepareLastFMAuthCompletion(token)
   if (!prepare.success && prepare.error === 'TOKEN_EXPIRED') {
     // Restart auth flow
   }
   ```

5. **Store username** after successful auth:
   ```typescript
   const complete = await completeLastFMAuth()
   if (complete.authenticated) {
     localStorage.setItem('lastfm_username', complete.username)
   }
   ```

---

## Testing

The module includes 51 comprehensive tests covering:

- Type definitions (9 tests)
- Status checking (5 tests)
- Authentication flow (4 tests)
- Preparation (5 tests)
- Completion (5 tests)
- Disconnection (7 tests)
- Error handling (8 tests)
- Config store integration (3 tests)
- Regression tests (8 tests)

See `docs/lastfm-api-tests.md` for detailed test documentation.

---

## See Also

- [Last.FM API Tests](lastfm-api-tests.md) - Test documentation
- [Last.FM Code Review](lastfm-api-review.md) - Code quality analysis
- [HTTP API Wrapper](http-api-wrapper.md) - Underlying fetch implementation
- [Config Store](../stores/appconfig.ts) - API base URL source


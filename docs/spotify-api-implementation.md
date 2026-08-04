# Spotify API Implementation

## Overview

The Spotify API module provides a complete interface for managing Spotify authentication and session lifecycle in the HiFiBerry UI. It implements a three-step OAuth flow: session creation, user authentication, and token handling.

## Architecture

### API Endpoints

| Function | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| `getSpotifyStatus` | `/spotify/status` | GET | Check authentication status |
| `createSpotifySession` | `/spotify/create_session` | POST | Initiate OAuth flow |
| `getSpotifyLoginUrl` | `/spotify/login/{sessionId}` | GET | Get authorization URL |
| `pollSpotifyAuth` | `/spotify/poll/{sessionId}` | GET | Check authentication completion |
| `storeSpotifyTokens` | `/spotify/tokens` | POST | Save tokens for later use |
| `logoutSpotify` | `/spotify/logout` | POST | Disconnect and clear session |

### Response Type Hierarchy

All responses follow a consistent error pattern with optional error fields:

```typescript
// Session creation responses
SpotifySessionResponse {
  session_id: string      // Unique session identifier
  status: string          // Status message from server
  message?: string        // Optional status message
  error?: string          // Optional error code
}

// Status checks
SpotifyStatusResponse {
  authenticated: boolean  // Current auth state
  expires_at?: number     // Token expiration timestamp
  username?: string       // Spotify username if authenticated
  error?: string          // Error code if present
  error_description?: string // Detailed error message
}

// Token operations
SpotifyTokensResponse {
  authenticated?: boolean
  status?: string
  message?: string
  error?: string
}

// Logout
SpotifyLogoutResponse {
  authenticated: boolean
  status?: string
  message?: string
  error?: string
}

// Poll responses
SpotifyPollResponse {
  status: 'completed' | 'error' | 'pending'
  token_data?: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  error?: string
}
```

## Error Handling

### Standardized Error Processing

All API calls use a centralized error handler that:
- Formats HTTP errors with status code and status text
- Logs unexpected errors for debugging
- Preserves the original error information
- Throws typed errors for consistent error handling

```typescript
// Error format example
const error = new Error('getSpotifyStatus: 503 Service Unavailable')
```

### Error Scenarios

| Scenario | HTTP Status | Handling | Example |
|----------|------------|----------|---------|
| Service unavailable | 503 | Throw with status text | "createSpotifySession: 503 Service Unavailable" |
| Invalid session | 404 | Throw not found error | "getSpotifyLoginUrl: 404 Not Found" |
| Bad request | 400 | Throw validation error | "storeSpotifyTokens: 400 Bad Request" |
| Server error | 500 | Throw with details | "logoutSpotify: 500 Internal Server Error" |
| Network failure | N/A | Throw network error | TypeError: Failed to fetch |
| Malformed JSON | N/A | Throw parse error | SyntaxError: Unexpected token |

## Implementation Details

### Session Flow Diagram

```
User App                    Backend API
   |                            |
   |--createSpotifySession----->|
   |<-----session_id, url--------|
   |                            |
   |--getSpotifyLoginUrl------->|  (with session_id)
   |<-----auth_url--------------|
   |                            |
   +[User visits auth_url]      |
   +[Spotify redirects back]    |
   |                            |
   |--pollSpotifyAuth---------->|  (poll until complete)
   |<-----status: pending-------|
   |--pollSpotifyAuth---------->|
   |<-----token_data------------|  (status: completed)
   |                            |
   |--storeSpotifyTokens------->|
   |<-----confirmation---------|
```

### Key Design Decisions

1. **Centralized Error Handling**: All functions use `callSpotifyApi` helper to reduce duplication and ensure consistent error messages.

2. **Consistent Response Types**: All responses use optional error fields instead of different error structures, reducing conditional logic.

3. **Backwards Compatibility**: `disconnectSpotify()` delegates to `logoutSpotify()` to maintain API compatibility while using the correct endpoint name.

4. **Configuration Isolation**: API base URL is retrieved from `AppConfigStore` at call time, not during module initialization, allowing for configuration changes.

## Usage Examples

### Complete Authentication Flow

```typescript
import {
  createSpotifySession,
  getSpotifyLoginUrl,
  pollSpotifyAuth,
  storeSpotifyTokens,
} from '@/api/spotify'

// Step 1: Create a session
const sessionRes = await createSpotifySession()
const sessionId = sessionRes.session_id

// Step 2: Get the login URL
const loginRes = await getSpotifyLoginUrl(sessionId)
// Redirect user to loginRes.message or response URL

// Step 3: Poll for completion
let pollResult
let attempts = 0
while (attempts < 60) { // Poll for up to 60 seconds
  pollResult = await pollSpotifyAuth(sessionId)
  if (pollResult.status === 'completed') break
  if (pollResult.status === 'error') throw new Error(pollResult.error)
  await new Promise(r => setTimeout(r, 1000)) // Wait 1 second
  attempts++
}

// Step 4: Store the tokens
if (pollResult?.token_data) {
  await storeSpotifyTokens({
    access_token: pollResult.token_data.access_token,
    refresh_token: pollResult.token_data.refresh_token,
    expires_in: pollResult.token_data.expires_in,
  })
}
```

### Check Current Status

```typescript
import { getSpotifyStatus } from '@/api/spotify'

const status = await getSpotifyStatus()
if (status.authenticated) {
  console.log(`Authenticated as: ${status.username}`)
  if (status.expires_at) {
    const expiresDate = new Date(status.expires_at * 1000)
    console.log(`Token expires at: ${expiresDate}`)
  }
} else {
  console.log('Not authenticated with Spotify')
}
```

### Logout

```typescript
import { logoutSpotify } from '@/api/spotify'

const result = await logoutSpotify()
if (!result.authenticated) {
  console.log('Successfully logged out')
}
```

## Security Considerations

### CSRF Protection

Write operations (`storeSpotifyTokens`, `logoutSpotify`) include CSRF tokens via `apiFetch`, which handles token injection automatically.

### Session Security

- Session IDs are short-lived and generated server-side
- Tokens are never stored in localStorage; they're held server-side only
- Connection uses HTTPS in production
- Credentials are sent via `same-origin` policy

### Token Handling

- Access tokens are transmitted only over secure HTTPS connections
- Refresh tokens are stored server-side, never sent to the client
- Token expiration is tracked and enforced by the backend

## Testing Strategy

### Test Coverage

The test suite includes 41+ tests covering:

1. **Auth Flow Tests** (8 tests)
   - CSRF token injection
   - Session cookie handling
   - Auth prompt flow on 401

2. **Error Handling** (15+ tests)
   - HTTP error status codes (400, 403, 404, 500, 503)
   - Malformed JSON responses
   - Network failures
   - Timeout scenarios

3. **Response Validation** (8+ tests)
   - Missing optional fields
   - Poll status variations (pending, completed, error)
   - Response data structure correctness

4. **API Contract** (10+ tests)
   - Correct endpoints called
   - Correct HTTP methods used
   - Correct headers sent
   - Request body structure

### Running Tests

```bash
# Run all Spotify tests
pnpm test src/api/__tests__/spotify.test.ts

# Run specific test suite
pnpm test src/api/__tests__/spotify.test.ts -t "auth handling"

# Run with coverage
pnpm test -- --coverage src/api/__tests__/spotify.test.ts
```

## Migration Guide

### From disconnectSpotify to logoutSpotify

The `disconnectSpotify` function is deprecated but still functional for backwards compatibility:

```typescript
// Old (still works)
await disconnectSpotify()

// New (preferred)
await logoutSpotify()

// Both are equivalent - disconnectSpotify delegates to logoutSpotify
```

### Response Type Updates

If updating existing code using old `SpotifyAuthResponse`:

```typescript
// Old
const res: SpotifyAuthResponse = await createSpotifySession()

// New
const res: SpotifySessionResponse = await createSpotifySession()
```

The shape is identical, only the type name has changed for consistency.

## Troubleshooting

### Common Issues

**401 Unauthorized on risky endpoints**
- This is expected behavior. The `apiFetch` function handles the auth prompt automatically
- Ensure `useAuthStore` is properly initialized
- Check that CSRF token is being sent (look for `X-CSRF-Token` header)

**404 on session operations**
- Verify session ID is valid and hasn't expired (sessions expire after 15 minutes)
- Create a new session with `createSpotifySession()`

**Malformed JSON errors**
- Check backend logs for API response issues
- Verify the `/spotify/*` endpoints are properly configured
- Ensure the backend service is running and responding

**Network timeouts**
- Check network connectivity
- Verify CORS headers are correctly configured
- Increase timeout if polling (default is connection timeout)

## Future Improvements

1. **Response Schema Validation**: Add Zod schemas to validate all responses at runtime
2. **Retry Logic**: Implement exponential backoff for transient errors
3. **Request Cancellation**: Support AbortController for in-flight request cancellation
4. **Caching**: Add response caching with TTL for status checks
5. **Event Emitters**: Emit events on auth state changes for reactive UI updates

## Related Files

- [Type Definitions](../src/api/spotify.ts) - Implementation and types
- [Tests](../src/api/__tests__/spotify.test.ts) - Comprehensive test coverage
- [HTTP API Wrapper](./HTTP_API_WRAPPER.md) - apiFetch implementation details
- [Auth Store](../src/stores/auth.ts) - Authentication state management
- [App Config Store](../src/stores/appconfig.ts) - API configuration

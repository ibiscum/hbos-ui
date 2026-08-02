# Spotify API Review & Regression Tests

## Review Date
2026-08-02

## Inconsistencies Found

### 1. **Response Interface Type Inconsistencies**
Multiple response types use inconsistent field naming patterns:

| Interface | Key Fields | Pattern |
|-----------|-----------|---------|
| `SpotifyAuthResponse` | `session_id`, `status`, optional `message` | Uses `session_id` + `status` string |
| `SpotifyStatusResponse` | `authenticated`, optional `expires_at`, `username`, `error`, `error_description` | Uses boolean + error fields |
| `SpotifyTokensResponse` | `status`, optional `message`, `error` | Uses `status` string |
| `SpotifyDisconnectResponse` | `authenticated`, `status`, optional `message`, `error` | Mixed boolean + status |

**Recommendation**: Standardize to a common response envelope with consistent field naming across all endpoints.

### 2. **Endpoint-Function Naming Mismatch**
- Function: `disconnectSpotify()`
- Endpoint: `/spotify/logout`
- Issue: Function name doesn't reflect the actual endpoint being called

**Recommendation**: Either rename to `logoutSpotify()` or change endpoint documentation.

### 3. **Boilerplate Error Handling**
All API functions duplicate identical try-catch pattern:
```typescript
try {
  const response = await apiFetch(...)
  if (!response.ok) throw new Error(...)
  return await response.json()
} catch (error) {
  console.error('Error:', error)
  throw error
}
```

**Recommendation**: Extract to a shared error handler function to reduce repetition.

### 4. **Missing Response Validation**
- No validation that API responses match expected types
- Functions don't verify required fields exist
- No type guards for optional fields

**Recommendation**: Add runtime validation using Zod or similar schema validator.

### 5. **Missing Null Checks**
- `getApiBaseUrl()` return value never validated
- Could fail silently if config store is misconfigured

**Recommendation**: Add assertions or validation for `baseUrl` before using.

---

## Regression Tests Added

### Test Coverage: 39 Tests (14 original + 25 new)

#### New Test Suites

**1. Error Responses (6 tests)**
- 500 errors on status read
- 503 errors on session creation
- 400 errors on login URL retrieval
- 404 errors on poll
- 400 errors on token storage
- 500 errors on disconnect

**2. Invalid JSON Responses (2 tests)**
- Malformed JSON on status read
- Malformed JSON on poll

**3. Network Errors (3 tests)**
- Network failures on status read
- Network failures on session creation
- Network failures on token storage

**4. Edge Cases with Response Data (4 tests)**
- Missing optional fields in status response
- Pending poll status
- Completed poll status with token data
- Error poll status with error message

**5. HTTP Status Text Edge Cases (2 tests)**
- Includes status text in error messages (503)
- Includes status code in error messages (400)

**6. Behavior Assertions (8 tests)**
- Status endpoint returns parsed response
- Session creation includes session ID
- Disconnect calls logout endpoint
- Token storage sends correct endpoint and method
- Status calls correct URL
- Login URL calls correct endpoint with session ID
- Poll uses correct endpoint with session ID
- Disconnect uses POST method

---

## Test Results

```
✅ Test Files: 1 passed (1)
✅ Tests: 39 passed (39)
   - Original tests: 14 (auth handling scenarios)
   - New regression tests: 25
Duration: 206ms
```

---

## Verification

All regression tests verify:
1. ✅ Error responses are properly thrown
2. ✅ Malformed JSON responses are caught
3. ✅ Network errors bubble up correctly
4. ✅ Success responses are returned correctly
5. ✅ Correct endpoints and methods are called
6. ✅ Response structure is handled (optional fields)
7. ✅ Error messages include status code + text

---

## Recommendations for Future Work

### High Priority
1. Standardize response interfaces
2. Add response schema validation
3. Extract error handling to utility function

### Medium Priority
1. Rename `disconnectSpotify` → `logoutSpotify`
2. Add validation for `getApiBaseUrl()` result
3. Add JSDoc comments with return type examples

### Low Priority
1. Consider adding response interceptor for consistent error formatting
2. Add retry logic for transient errors (5xx)
3. Add request/response logging in debug mode

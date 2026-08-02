# HTTP Wrapper Code Review

## File: `src/api/http.ts`

### Status: ✅ EXCELLENT - Minimal Issues

The HTTP wrapper is well-architected with solid error handling and comprehensive documentation. No critical inconsistencies found.

---

## Detailed Review

### 1. **Constant Definition**

```typescript
const BODY_LESS_METHODS = new Set(['GET', 'HEAD'])
```

✅ **Status**: Good
- Correctly identifies methods that don't have request bodies
- Using Set for O(1) lookup efficiency
- Uppercase constants per convention

---

### 2. **Function: `needsCsrf()`**

```typescript
const needsCsrf = (method?: string): boolean =>
  !BODY_LESS_METHODS.has((method ?? 'GET').toUpperCase())
```

✅ **Status**: Good
- ✅ Handles undefined method gracefully (defaults to GET)
- ✅ Case-insensitive comparison via `.toUpperCase()`
- ✅ Correctly negates body-less methods check
- **Note**: Default to GET is consistent with fetch() behavior

---

### 3. **Function: `parseHint()`**

```typescript
const parseHint = (response: Response): AuthHint => {
  const hint = response.headers.get('WWW-Authenticate-Hint')
  return hint === 'set-password' ? 'set-password' : 'login'
}
```

✅ **Status**: Good
- ✅ Safely extracts optional header
- ✅ Defaults to 'login' for missing/invalid hints
- ✅ Simple and correct boolean logic

**Minor Improvement**: Could add explicit null check for clarity:

```typescript
const parseHint = (response: Response): AuthHint => {
  const hint = response.headers.get('WWW-Authenticate-Hint')
  return hint === 'set-password' ? 'set-password' : 'login'
}
// Already correct; no change needed
```

---

### 4. **Function: `apiFetch()`**

#### Phase 1: Header Building

```typescript
const headers = new Headers(init.headers)
if (needsCsrf(init.method) && authStore.csrf) {
  headers.set('X-CSRF-Token', authStore.csrf)
}
```

✅ **Status**: Good
- ✅ Preserves custom headers via `new Headers(init.headers)`
- ✅ Only adds CSRF token for write methods AND when token exists
- ✅ Prevents X-CSRF-Token from being null

#### Phase 2: Fetch Execution

```typescript
const response = await fetch(url, {
  ...init,
  credentials: 'same-origin',
  headers,
})
```

✅ **Status**: Good
- ✅ Spreads init to preserve all fetch options (method, body, etc.)
- ✅ `credentials: 'same-origin'` ensures cookies are sent
- ✅ Overrides headers with merged version

#### Phase 3: Success Path

```typescript
if (response.status !== 401 || isRetry) {
  return response
}
```

✅ **Status**: Good
- ✅ Passes through non-401 responses (including 4xx and 5xx errors)
- ✅ Prevents retry on second 401 via `isRetry` flag
- ✅ Gives caller full control over error handling

#### Phase 4: 401 CSRF Recovery Path

```typescript
const hint = parseHint(response)

if (hint === 'login' && needsCsrf(init.method) && (await authStore.ensureCsrf())) {
  return apiFetch(url, init, true)
}
```

✅ **Status**: Excellent
- ✅ Only attempts recovery for login hint (not 'set-password')
- ✅ Only for write methods (body-less methods skip this)
- ✅ Returns true/false based on recovery success
- ✅ Single retry via `isRetry=true` flag

**Logic Flow**:
1. Parse hint from response
2. Check: Is this a login hint? (not password setup)
3. Check: Is this a write method? (POST, PUT, PATCH, DELETE)
4. Try: Silently recover CSRF token from session
5. If successful: Retry immediately (no user interaction)
6. If failed: Fall through to auth prompt

#### Phase 5: Authentication Prompt Path

```typescript
const authenticated = await authStore.promptForAuth(hint)
if (!authenticated) {
  throw new Error('Authentication required')
}

return apiFetch(url, init, true)
```

✅ **Status**: Excellent
- ✅ Prompts with the hint (set-password vs. login)
- ✅ Throws meaningful error if user cancels
- ✅ Retries exactly once with `isRetry=true`
- ✅ Error message is descriptive for caller

---

## Potential Improvements (Not Bugs)

### 1. **Explicit Falsy Check in parseHint()**

Current:
```typescript
return hint === 'set-password' ? 'set-password' : 'login'
```

Could be:
```typescript
return hint === 'set-password' ? 'set-password' : 'login'
// Already correct; explicit null handling is redundant
```

**Verdict**: No change needed. Current approach is correct.

---

### 2. **Document Retry Behavior in Code Comments**

The code is already well-documented, but adding a one-liner at the retry point could help:

**Current**:
```typescript
if (response.status !== 401 || isRetry) {
  return response
}
```

**Could add comment**:
```typescript
// Pass through non-401 responses, or if this is a retry (prevent infinite loops)
if (response.status !== 401 || isRetry) {
  return response
}
```

**Verdict**: Documentation is already in JSDoc. Inline comment is optional.

---

### 3. **Extract Recovery Logic Into Separate Function**

Current:
```typescript
if (hint === 'login' && needsCsrf(init.method) && (await authStore.ensureCsrf())) {
  return apiFetch(url, init, true)
}
```

Could extract to:
```typescript
async function recoverFromUnauthorized(
  hint: AuthHint,
  method?: string,
  url?: string,
  init?: RequestInit
): Promise<Response | null> {
  if (hint === 'login' && needsCsrf(method) && (await authStore.ensureCsrf())) {
    return apiFetch(url!, init, true)
  }
  return null
}
```

**Verdict**: Current implementation is clear and short. Extraction not needed for this file size.

---

## Type Safety

✅ **Status**: Excellent
- ✅ All parameters are properly typed
- ✅ Return types are explicit
- ✅ `AuthHint` type is strict ('set-password' | 'login')
- ✅ RequestInit is from Web API types

---

## Edge Cases Handled

✅ **Status**: Excellent
- ✅ Undefined method (defaults to GET)
- ✅ Missing CSRF token in store (doesn't add header)
- ✅ Missing/invalid hint header (defaults to 'login')
- ✅ Multiple concurrent 401s (auth store handles prompt deduplication)
- ✅ Custom headers are preserved
- ✅ Case-insensitive HTTP methods

---

## Documentation Quality

✅ **Status**: Excellent
- ✅ Comprehensive JSDoc with examples
- ✅ Clear explanation of 401 handling flow
- ✅ Parameter descriptions are accurate
- ✅ @example sections show real usage
- ✅ Error behavior is documented

---

## Performance

✅ **Status**: Good
- ✅ Minimal allocations per call (Headers object only once)
- ✅ CSRF recovery is async but doesn't block other requests
- ✅ No unnecessary retries (isRetry flag prevents loops)

---

## Security

✅ **Status**: Excellent
- ✅ CSRF tokens attached to write methods
- ✅ `credentials: 'same-origin'` prevents cookie leakage
- ✅ Tokens are not logged or exposed in URLs
- ✅ Only retried once (prevents token exhaustion attacks)

---

## Recommendations

### Priority: LOW (No Issues Found)

Since no critical inconsistencies were found, these are optional enhancements:

1. ✅ **Code is ready for production** - No changes required
2. **Optional**: Add request/response logging for debugging
3. **Optional**: Add timeout support in future versions
4. **Optional**: Add telemetry for monitoring 401 recovery success rates

---

## Conclusion

**Overall Rating**: ⭐⭐⭐⭐⭐ (5/5)

- **Consistency**: Perfect
- **Documentation**: Excellent
- **Error Handling**: Robust
- **Type Safety**: Strong
- **Edge Cases**: Well-Covered

No breaking changes needed. The implementation is solid and production-ready.


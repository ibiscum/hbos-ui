# URL Rewriting Utilities API

## Overview

The `src/api/utils.ts` module provides URL rewriting functions for the HiFiBerry OS web UI. These functions ensure that API and image URLs are correctly routed through either a development proxy (in proxy mode) or directly to the device (in production mode).

The module exports two primary functions:
- `rewriteImageUrl(url: string)` - Rewrites image URLs for image-serving endpoints
- `rewriteAudiocontrolApiUrl(url: string)` - Rewrites general API URLs with the `/api/audiocontrol/` prefix

## Configuration

The URL rewriting behavior depends on the application configuration stored in the app config store (`useAppConfigStore`).

### Required Configuration

#### In Proxy Mode (Development)
```typescript
{
  apiConfig: {
    useProxy: true  // Enable proxy mode
  }
}
```

When `useProxy` is `true`, URLs are rewritten to include `/api/audiocontrol/` prefix but are **not** converted to full URLs. The development Vite proxy server handles routing these requests to the actual device.

#### In Production Mode (Direct Device Connection)
```typescript
{
  apiConfig: {
    useProxy: false  // Use direct device connection
  },
  config: {
    audiocontrol_api: {
      deviceIP: '192.168.1.67',      // Device IP address (required for images)
      devicePort: 8080               // Device port (required for images, 1-65535)
    }
  },
  // Implicitly available via getApiBaseUrl() method
}
```

When `useProxy` is `false`, URLs are converted to full URLs using:
1. Device IP/port for image URLs (via `rewriteImageUrl`)
2. API base URL for general API URLs (via `rewriteAudiocontrolApiUrl`)

## API Reference

### `rewriteImageUrl(url: string): string`

Rewrites image URLs to be accessible through the proxy or production API.

**Purpose**: Handle image URLs returned by the audiocontrol API endpoints.

**Supported Prefixes** (defined in `IMAGE_PROXY_PREFIXES`):
- `/api/library/` - MPD/library images (e.g., artist/album art)
- `/api/coverart/` - Cover art API images

**Note**: The `/api/lyrics/` prefix is intentionally NOT rewritten by this function (use `rewriteAudiocontrolApiUrl` instead).

#### Parameters
- `url: string` - The image URL to rewrite (can be empty string, relative path, or external URL)

#### Returns
- `string` - The rewritten URL that can be accessed from the browser

#### Behavior

##### Input Validation
- **Empty string**: Returns empty string unchanged
- **External URLs** (http:// or https://): Returns unchanged
- **Already rewritten URLs** (/api/audiocontrol/): Returns unchanged (guards against double rewriting)

##### Proxy Mode (`useProxy: true`)
- Rewrites supported prefixes (library, coverart) to include `/api/audiocontrol/`
- Returns relative path (no protocol or host)
- Example: `/api/library/test.jpg` → `/api/audiocontrol/library/test.jpg`

##### Production Mode (`useProxy: false`)
- Adds `/api/audiocontrol/` prefix to supported prefixes
- Prepends device IP and port as full URL
- Omits port 80 (standard HTTP port)
- Port number must be integer in range 1-65535
- Returns full URL starting with `http://`
- Example: `/api/library/test.jpg` → `http://192.168.1.67:8080/api/audiocontrol/library/test.jpg`

##### Fallback Behavior
If required configuration is unavailable in production mode, returns corrected path without full URL:
- Missing or invalid device IP: Returns `/api/audiocontrol/library/...` and logs error
- Invalid device port (non-integer, out of range, missing): Returns `/api/audiocontrol/library/...` and logs error

#### Examples

**Proxy Mode**:
```typescript
// Setup
useAppConfigStore().apiConfig = { useProxy: true }

// Library image
rewriteImageUrl('/api/library/mpd/image/test.jpg')
// → '/api/audiocontrol/library/mpd/image/test.jpg'

// Cover art
rewriteImageUrl('/api/coverart/metadata/cover.jpg')
// → '/api/audiocontrol/coverart/metadata/cover.jpg'

// Lyrics (not rewritten)
rewriteImageUrl('/api/lyrics/song.txt')
// → '/api/lyrics/song.txt'

// External URL (passed through)
rewriteImageUrl('https://example.com/image.jpg')
// → 'https://example.com/image.jpg'
```

**Production Mode**:
```typescript
// Setup
const store = useAppConfigStore()
store.apiConfig = { useProxy: false }
store.config.audiocontrol_api = { deviceIP: '192.168.1.67', devicePort: 80 }

// Library image
rewriteImageUrl('/api/library/test.jpg')
// → 'http://192.168.1.67/api/audiocontrol/library/test.jpg'

// With non-standard port
rewriteImageUrl('/api/library/test.jpg')  // with devicePort: 8080
// → 'http://192.168.1.67:8080/api/audiocontrol/library/test.jpg'

// Port 80 is omitted
rewriteImageUrl('/api/library/test.jpg')  // with devicePort: 80
// → 'http://192.168.1.67/api/audiocontrol/library/test.jpg' (no :80)
```

---

### `rewriteAudiocontrolApiUrl(url: string): string`

Rewrites audiocontrol API URLs with proper `/api/audiocontrol/` prefix.

**Purpose**: Handle general API endpoint URLs returned by the audiocontrol API.

**Supported Prefixes**:
- `/api/library/` - Library/MPD API
- `/api/lyrics/` - Lyrics API (differs from `rewriteImageUrl`)
- `/api/coverart/` - Cover art API

#### Parameters
- `url: string` - The API URL to rewrite (can be empty string, relative path, or external URL)

#### Returns
- `string` - The rewritten URL with full `/api/audiocontrol/` prefix

#### Behavior

##### Input Validation
- **Empty string**: Returns empty string unchanged
- **External URLs** (http:// or https://): Returns unchanged
- **Already rewritten URLs** (/api/audiocontrol/): Returns unchanged (guards against double rewriting)
- **Non-API URLs** (don't start with /api/): Returns unchanged

##### Proxy Mode (`useProxy: true`)
- Rewrites all supported prefixes to include `/api/audiocontrol/`
- Does NOT call `getApiBaseUrl()` (performance optimization)
- Returns relative path (no protocol or host)
- Example: `/api/lyrics/song` → `/api/audiocontrol/lyrics/song`

##### Production Mode (`useProxy: false`)
- Rewrites all supported prefixes to include `/api/audiocontrol/`
- Calls `getApiBaseUrl()` to get full API endpoint
- Prepends API base URL to create full absolute URL
- Normalizes double slashes that may occur from URL concatenation
- Example: `/api/lyrics/song` → `http://192.168.1.67/api/audiocontrol/lyrics/song`

##### Fallback Behavior
If API base URL is not configured in production mode:
- Returns corrected path without full URL
- Logs error to console
- Example: `/api/library/test` → `/api/audiocontrol/library/test`

#### Examples

**Proxy Mode**:
```typescript
// Setup
useAppConfigStore().apiConfig = { useProxy: true }

// Library API
rewriteAudiocontrolApiUrl('/api/library/artists')
// → '/api/audiocontrol/library/artists'

// Lyrics API
rewriteAudiocontrolApiUrl('/api/lyrics/song123')
// → '/api/audiocontrol/lyrics/song123'

// Cover art API
rewriteAudiocontrolApiUrl('/api/coverart/metadata')
// → '/api/audiocontrol/coverart/metadata'

// Non-API URL
rewriteAudiocontrolApiUrl('/other/path')
// → '/other/path'
```

**Production Mode**:
```typescript
// Setup
const store = useAppConfigStore()
store.apiConfig = { useProxy: false }
// getApiBaseUrl() returns 'http://192.168.1.67/api/audiocontrol'

// Library API
rewriteAudiocontrolApiUrl('/api/library/artists')
// → 'http://192.168.1.67/api/audiocontrol/library/artists'

// Lyrics API
rewriteAudiocontrolApiUrl('/api/lyrics/song123')
// → 'http://192.168.1.67/api/audiocontrol/lyrics/song123'

// With trailing slash in base URL (normalized)
// getApiBaseUrl() returns 'http://192.168.1.67/api/audiocontrol/'
rewriteAudiocontrolApiUrl('/api/library/test')
// → 'http://192.168.1.67/api/audiocontrol/library/test' (no double slash)
```

---

### `rewrite_audiocontrol_api_url(url: string): string` (DEPRECATED)

**Status**: DEPRECATED - Use `rewriteAudiocontrolApiUrl` instead

This is a legacy alias function that directly references `rewriteAudiocontrolApiUrl`.

```typescript
// These are equivalent
rewrite_audiocontrol_api_url(url)
rewriteAudiocontrolApiUrl(url)
```

Migration from old to new:
```typescript
// Old (still works)
const url = rewrite_audiocontrol_api_url('/api/library/test')

// New (preferred)
const url = rewriteAudiocontrolApiUrl('/api/library/test')
```

---

## Prefix Handling Differences

The two functions handle `/api/lyrics/` differently:

| Prefix | `rewriteImageUrl` | `rewriteAudiocontrolApiUrl` |
|--------|-------------------|---------------------------|
| `/api/library/` | ✅ Rewrites | ✅ Rewrites |
| `/api/coverart/` | ✅ Rewrites | ✅ Rewrites |
| `/api/lyrics/` | ❌ NOT rewritten | ✅ Rewrites |

**Rationale**: 
- `rewriteImageUrl` is specifically for image data (library and cover art)
- Lyrics are text data, not images, so they're not processed by `rewriteImageUrl`
- `rewriteAudiocontrolApiUrl` handles all API endpoints regardless of data type

## Port Number Validation

The `rewriteImageUrl` function validates device port numbers strictly:

### Valid Ports
- Minimum: 1
- Maximum: 65535
- Type: Must be integer (no floats)
- Special handling: Port 80 is omitted from URLs (standard HTTP port)

### Invalid Ports (Return Corrected Path)
- Port 0 or negative numbers
- Ports > 65535
- Non-integer values (e.g., 8080.5)
- Non-number types (e.g., "80" string)

When port validation fails:
1. Error is logged to console: `[IMG] Missing or invalid device configuration: {...}`
2. Function returns corrected path without full URL
3. Example: `/api/library/test.jpg` (instead of full `http://` URL)

```typescript
// Valid port 80
rewriteImageUrl('/api/library/test.jpg')  // devicePort: 80
// → 'http://192.168.1.67/api/audiocontrol/library/test.jpg'

// Valid port 8080
rewriteImageUrl('/api/library/test.jpg')  // devicePort: 8080
// → 'http://192.168.1.67:8080/api/audiocontrol/library/test.jpg'

// Invalid port (out of range)
rewriteImageUrl('/api/library/test.jpg')  // devicePort: 65536
// Logs error, returns: '/api/audiocontrol/library/test.jpg'
```

## Double Rewrite Prevention

Both functions include guards to prevent double rewriting when called multiple times on the same URL:

```typescript
const url = '/api/library/test.jpg'

// First call
const rewritten1 = rewriteImageUrl(url)
// → '/api/audiocontrol/library/test.jpg' (proxy mode)
// → 'http://192.168.1.67/api/audiocontrol/library/test.jpg' (production mode)

// Second call on already-rewritten URL
const rewritten2 = rewriteImageUrl(rewritten1)
// → Same as rewritten1 (not double-rewritten)

// Verification: No /api/audiocontrol/api/audiocontrol/ pattern
expect(rewritten2).not.toContain('/api/audiocontrol/api/audiocontrol/')
```

This is implemented by checking if the URL already starts with `/api/audiocontrol/` and returning it unchanged.

## URL Normalization

The `rewriteAudiocontrolApiUrl` function normalizes double slashes in resulting URLs:

```typescript
// If base URL has trailing slash and we append /
// Regex: /([^:]\/)\/+/g replaces non-protocol double slashes
rewriteAudiocontrolApiUrl('/api/library/test')
// With base URL: 'http://192.168.1.67/api/audiocontrol/'
// Result: 'http://192.168.1.67/api/audiocontrol/library/test' (normalized)
// NOT: 'http://192.168.1.67/api/audiocontrol//library/test' (no double slash)
```

The regex pattern `([^:]\/)\/+` matches:
- Non-colon character followed by slash: `([^:]\/)`
- Followed by one or more slashes: `\/+`

This preserves the `://` in HTTP(S) protocols while normalizing path slashes.

## Error Handling and Logging

### Error Conditions

#### `rewriteImageUrl` Errors

| Condition | Log Level | Message | Fallback |
|-----------|-----------|---------|----------|
| Missing device IP | error | `[IMG] Missing or invalid device configuration: {...}` | Corrected path |
| Invalid device port type | error | `[IMG] Missing or invalid device configuration: {...}` | Corrected path |
| Port out of range | error | `[IMG] Missing or invalid device configuration: {...}` | Corrected path |
| Port is not integer | error | `[IMG] Missing or invalid device configuration: {...}` | Corrected path |
| Missing apiConfig | silent | N/A | Original URL |

#### `rewriteAudiocontrolApiUrl` Errors

| Condition | Log Level | Message | Fallback |
|-----------|-----------|---------|----------|
| Missing API base URL | error | `API base URL not configured` | Corrected path |
| Missing apiConfig | silent | N/A | Original URL |

### No Debug Logging

Both functions do NOT produce debug/info level logs during normal operation. They only log errors when configuration is missing or invalid. This ensures production performance and clean console output.

## Testing

The module includes comprehensive test coverage in `src/api/__tests__/utils.test.ts`:

### Test Coverage (71 tests)
1. **Core Functionality** (45 tests)
   - Proxy mode behavior
   - Production mode behavior
   - Input validation
   - Double rewrite guards

2. **Regression Tests** (26 tests)
   - Port number validation edge cases
   - Device configuration edge cases
   - URL rewriting consistency
   - API base URL string manipulation
   - Config availability checks

### Running Tests

```bash
# Run all tests
pnpm test

# Run only utils tests
pnpm test src/api/__tests__/utils.test.ts

# Run with coverage
pnpm test --coverage src/api/__tests__/utils.test.ts
```

### Test Structure

Tests are organized by:
1. Function (rewriteImageUrl vs rewriteAudiocontrolApiUrl)
2. Mode (Proxy vs Production)
3. Scenario (Guards, Validation, Edge Cases)
4. Regression areas (Port validation, config handling, etc.)

## Best Practices

### 1. Always Check Configuration

Before using URL rewriting functions, ensure the app config store is properly initialized:

```typescript
import { useAppConfigStore } from '@/stores/appconfig'

export function useImageUrl(imagePath: string) {
  const store = useAppConfigStore()
  
  // Ensure config is available
  if (!store.apiConfig) {
    console.warn('API config not initialized')
    return imagePath  // Return original path
  }
  
  return rewriteImageUrl(imagePath)
}
```

### 2. Use Correct Function for Your Data Type

- Images (artists, albums, covers) → `rewriteImageUrl`
- API endpoints (any type) → `rewriteAudiocontrolApiUrl`
- Lyrics specifically → `rewriteAudiocontrolApiUrl` (NOT `rewriteImageUrl`)

```typescript
// Correct
const imageUrl = rewriteImageUrl('/api/library/artist.jpg')
const lyricsUrl = rewriteAudiocontrolApiUrl('/api/lyrics/song')

// Incorrect (lyrics won't be rewritten)
const lyricsUrl = rewriteImageUrl('/api/lyrics/song')
```

### 3. Handle Fallback Scenarios

Be prepared for cases where production configuration might be incomplete:

```typescript
function useApiUrl(endpoint: string) {
  const url = rewriteAudiocontrolApiUrl(endpoint)
  
  // Check if URL is absolute (contains protocol)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Fallback handling for incomplete config
    console.warn('Using relative URL, API config may be incomplete', url)
  }
  
  return url
}
```

### 4. Cache Rewritten URLs When Possible

For performance, cache rewritten URLs rather than rewriting on every access:

```typescript
// Bad: Rewrites every render
function ImageComponent({ imagePath }: Props) {
  const url = rewriteImageUrl(imagePath)  // Called every render
  return <img src={url} />
}

// Good: Cache the result
function ImageComponent({ imagePath }: Props) {
  const url = useMemo(() => rewriteImageUrl(imagePath), [imagePath])
  return <img src={url} />
}
```

### 5. Log Configuration Issues

When URLs aren't rewritten as expected, check configuration:

```typescript
function debugUrlRewriting(url: string) {
  const store = useAppConfigStore()
  
  console.log('Original URL:', url)
  console.log('useProxy:', store.apiConfig?.useProxy)
  console.log('deviceIP:', store.config?.audiocontrol_api?.deviceIP)
  console.log('devicePort:', store.config?.audiocontrol_api?.devicePort)
  console.log('apiBaseUrl:', store.getApiBaseUrl())
  
  const rewritten = rewriteImageUrl(url)
  console.log('Rewritten URL:', rewritten)
}
```

## Migration Guide

### Migrating from Old Codebase

If you have older code using direct URL manipulation:

**Before**:
```typescript
// Old approach: Manual URL construction
const url = useProxy 
  ? `/api/audiocontrol/library/${path}`
  : `http://${deviceIP}:${devicePort}/api/audiocontrol/library/${path}`
```

**After**:
```typescript
// New approach: Using rewriteImageUrl
const url = rewriteImageUrl(`/api/library/${path}`)
```

**Benefits**:
- Centralized URL logic
- Consistent validation and error handling
- Port 80 optimization automatically handled
- Double rewrite guards included
- Easier to test and maintain

### Deprecated Function Aliases

The following deprecated names are still available but should not be used in new code:

```typescript
// DEPRECATED: Don't use in new code
rewrite_audiocontrol_api_url(url)

// CORRECT: Use this instead
rewriteAudiocontrolApiUrl(url)
```

## Troubleshooting

### URLs Not Being Rewritten

**Symptom**: URLs remain unchanged after calling rewrite functions

**Possible Causes**:

1. **Proxy mode with external URL**
   - External URLs (http://, https://) are never rewritten
   - This is correct behavior - they're already complete URLs

2. **Missing configuration**
   - Verify `apiConfig.useProxy` is set
   - Check store initialization timing

3. **Wrong prefix**
   - `/api/lyrics/` not processed by `rewriteImageUrl`
   - Use `rewriteAudiocontrolApiUrl` instead

4. **Already rewritten**
   - URL already contains `/api/audiocontrol/`
   - Guard prevents double rewriting

**Debug Steps**:
```typescript
import { useAppConfigStore } from '@/stores/appconfig'

const store = useAppConfigStore()
console.log('apiConfig:', store.apiConfig)
console.log('useProxy:', store.apiConfig?.useProxy)
console.log('deviceIP:', store.config?.audiocontrol_api?.deviceIP)

// Check if URL is in wrong format
const url = '/api/library/test.jpg'
console.log('Starts with correct prefix:', url.startsWith('/api/library/'))
```

### Production URLs Not Working (404 errors)

**Symptom**: Image loads fine in proxy mode, but returns 404 in production

**Possible Causes**:

1. **Incorrect device IP or port**
   - Verify device is reachable at configured IP/port
   - Test with browser: `http://192.168.1.67:8080/api/audiocontrol/library/...`

2. **API base URL misconfigured**
   - `getApiBaseUrl()` returns null or incorrect value
   - Should return `http://<deviceIP>:<port>/api/audiocontrol`

3. **Device port validation failed**
   - Check console for error: `[IMG] Missing or invalid device configuration`
   - Port must be integer 1-65535

4. **Path doesn't exist on device**
   - Verify the library/artwork actually exists on device
   - Check device API logs for 404 errors

**Debug Steps**:
```typescript
// 1. Check generated URL format
const store = useAppConfigStore()
const testUrl = rewriteImageUrl('/api/library/test.jpg')
console.log('Generated URL:', testUrl)

// 2. Verify network connectivity
// In browser console, test direct fetch:
fetch('http://192.168.1.67:8080/api/audiocontrol/library/test.jpg')

// 3. Check device API logs on the device itself
ssh root@192.168.1.67
tail -f /var/log/audiocontrol.log
```

## Performance Considerations

### Function Call Overhead

URL rewriting functions are lightweight:
- No network requests
- No file I/O
- Simple string operations and configuration lookups

**Benchmark** (approximate):
- `rewriteImageUrl`: ~0.1ms per call
- `rewriteAudiocontrolApiUrl`: ~0.1ms per call (proxy mode), ~0.2ms (production mode)

### Optimization Tips

1. **Memoize results** in React components
   ```typescript
   const url = useMemo(() => rewriteImageUrl(path), [path])
   ```

2. **Batch rewriting** in loops
   ```typescript
   // Good: Pre-rewrite once
   const baseUrl = useAppConfigStore().getApiBaseUrl()
   const urls = paths.map(p => rewriteImageUrl(`/api/library/${p}`))
   ```

3. **Lazy rewriting** for non-visible images
   ```typescript
   // Only rewrite URLs when images become visible
   const imageUrl = useIntersectionObserver() ? rewriteImageUrl(path) : path
   ```

## Related Documentation

- [API Integration Architecture](./HTTP_API_WRAPPER.md)
- [App Config Store](./appconfig-store.md)
- [Test Coverage Report](../coverage/)

## Version History

### Current Version
- Full double-rewrite guard implementation
- Port number range validation (1-65535)
- Double slash normalization in production URLs
- Consistent error logging for missing configuration

### Recent Changes
- Fixed double `/api/audiocontrol/` bug in production URL building
- Added comprehensive regression tests (71 total tests)
- Improved error messages for configuration issues
- Added port validation edge case handling

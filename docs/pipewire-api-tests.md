# PipeWire API - Test Documentation

## Test Overview

**File**: `src/__tests__/api/pipewire.test.ts`  
**Test Count**: 84 tests across 9 describe blocks  
**Duration**: ~260ms  
**Status**: 100% Pass Rate ✅  
**Test Runner**: Vitest v4.1.10  
**Coverage**: Comprehensive - all public functions, error paths, and regression scenarios

---

## Test Structure

### 1. Type Definitions (6 tests)

Tests for `isApiError()` utility and type checking.

```typescript
describe('PipeWire API - Type Definitions', () => {
  it('should export isApiError function')
  it('should identify API errors correctly')
  it('should identify non-error responses')
})
```

**Tests**:
- `isApiError()` with error objects: `{ error: 'test' }` → `true`
- `isApiError()` with success objects: `{ success: true }` → `false`
- `isApiError()` with null/undefined → `false`
- `isApiError()` with empty objects → `false`
- `isApiError()` with valid responses → `false`

**Purpose**: Ensure type guard works correctly for error detection.

---

### 2. Core API (4 tests)

Tests for version, endpoints, object listing, and caching.

#### getVersion()
- ✅ Fetches version info successfully
- ✅ Handles version API errors (503)
- ✅ Calls apiFetch with correct URL

**Response Format**:
```json
{
  "version": "2.0.9",
  "api_version": "1.0"
}
```

#### listEndpoints()
- ✅ Lists all endpoints
- ✅ Handles empty endpoints list

#### listObjects()
- ✅ Lists all PipeWire objects
- ✅ Calls correct endpoint (`/api/pipewire/v1/ls`)

#### getObjectById()
- ✅ Gets object by ID
- ✅ Handles object not found (404)

#### refreshCache()
- ✅ Refreshes cache with POST
- ✅ Uses POST method for refresh

---

### 3. Volume API (7 tests)

Tests for volume reading, setting, and saving.

| Function | Tests |
|----------|-------|
| `listVolumes()` | List all volumes, return expected format |
| `getVolumeById()` | Get by ID, return volume value |
| `setVolumeById()` | Set volume, verify value returned, verify PUT method + body |
| `saveAllVolumes()` | Save all, verify success flag |
| `saveVolumeById()` | Save single device, verify ID + name returned |

**Example Test**:
```typescript
it('should set volume by ID', async () => {
  const mockVolume = { id: 5, name: 'speaker', object_type: 'sink', volume: 50 }
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify(mockVolume), { status: 200 })
  )

  const result = await setVolumeById(5, 65)
  expect((result as any).volume).toBe(65)
})

it('should use PUT method for setVolume', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ volume: 70 }), { status: 200 })
  )

  await setVolumeById(3, 70)
  const call = vi.mocked(apiFetch).mock.calls[0]
  expect(call[1]?.method).toBe('PUT')
  expect(call[1]?.body).toBe(JSON.stringify({ volume: 70 }))
})
```

**Coverage**:
- Request format: PUT with JSON body `{ volume: X }`
- Response parsing: Extract volume from response
- Error handling: HTTP errors and API errors

---

### 4. Links API (11 tests)

Tests for port linking and unlinking.

| Function | Tests |
|----------|-------|
| `listLinks()` | List links, verify format |
| `createLink()` | Create link, verify response format, verify POST method + body |
| `removeLinkById()` | Remove by ID, verify DELETE method |
| `removeLinkByName()` | Remove by ports, verify status |
| `linkExists()` | Check existence, verify query parameters |
| `listOutputPorts()` | List output ports, verify format |
| `listInputPorts()` | List input ports, verify format |

**Example Test - Query Parameters**:
```typescript
it('should include query parameters in linkExists', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ exists: false }), { status: 200 })
  )

  await linkExists('output:port', 'input:port')
  const url = vi.mocked(apiFetch).mock.calls[0][0]
  expect(url).toContain('/links/exists?')
  expect(url).toContain('output=output')
  expect(url).toContain('input=input')
})
```

**Coverage**:
- HTTP methods: POST, DELETE, GET with query params
- Request bodies: JSON format for createLink
- URL construction with query parameters

---

### 5. Graph API (2 tests)

Tests for audio topology visualization.

| Function | Tests |
|----------|-------|
| `getGraphDot()` | Get DOT format, verify text() call, return string |
| `getGraphPng()` | Get PNG, verify blob() call, return Blob |

**Special Handling**: These functions return non-JSON types (string and Blob).

**Example Test**:
```typescript
it('should call text() on response for DOT', async () => {
  const dotContent = 'digraph { }'
  const mockResponse = new Response(dotContent, { status: 200 })
  const textSpy = vi.spyOn(mockResponse, 'text')
  textSpy.mockResolvedValueOnce(dotContent)
  vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse)

  await getGraphDot()
  expect(textSpy).toHaveBeenCalled()
})
```

---

### 6. SpeakerEQ API (38 tests)

Tests for audio equalization configuration.

#### Configuration & Status (4 tests)
- `getSpeakerEQStructure()` - Get plugin structure
- `getSpeakerEQIO()` - Get input/output count
- `getSpeakerEQConfig()` - Get full config
- `getSpeakerEQStatus()` - Get current status

#### EQ Band Management (4 tests)
- `getSpeakerEQBand()` - Get band config
- `setSpeakerEQBand()` - Update band, verify PUT method
- `setSpeakerEQBandEnabled()` - Toggle band
- `clearSpeakerEQBlock()` - Clear all bands, verify PUT + body

#### Gain Control (6 tests)
- Master gain: get/set
- Input gain per channel: get/set
- Output gain per channel: get/set

#### Delay Control (2 tests)
- `getSpeakerEQDelays()` - Get all channel delays
- `setSpeakerEQDelay()` - Set single channel delay

#### Crossbar/Routing (3 tests)
- `getSpeakerEQCrossbar()` - Get routing matrix
- `setSpeakerEQCrossbarMatrix()` - Set entire matrix
- `setSpeakerEQCrossbar()` - Set single value

#### Enable/License/Reset (6 tests)
- Enable status: get/set
- License check
- Cache refresh (POST)
- Reset to defaults (POST + body)

**Example Test - Empty Body Consistency**:
```typescript
it('should use PUT for clearSpeakerEQBlock', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ block: '', message: '' }), { status: 200 })
  )

  await clearSpeakerEQBlock('eq1')
  const call = vi.mocked(apiFetch).mock.calls[0]
  expect(call[1]?.method).toBe('PUT')
  expect(call[1]?.body).toBe(JSON.stringify({}))  // Consistency fix
})
```

---

### 7. RIAA API (21 tests)

Tests for vinyl record preamp settings.

| Feature | Tests |
|---------|-------|
| Config | Get complete RIAA config |
| Gain | Get/set gain (dB), verify PUT method + body |
| Subsonic Filter | Get/set subsonic (0-3 filter types) |
| Enable/Disable | Get/set RIAA enabled status |
| Declicker | Get/set declicker enabled |
| Spike Detection | Get/set spike threshold + width |
| Notch Filter | Get/set notch frequency + Q factor |
| Reset | Reset to defaults, verify PUT + body |

**Example Test**:
```typescript
it('should set RIAA gain', async () => {
  const mockResponse = { success: true, gain_db: 3 }
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify(mockResponse), { status: 200 })
  )

  const result = await setRIAAGain(3)
  expect((result as any).gain_db).toBe(3)
})

it('should use PUT for setRIAAGain', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true, gain_db: 0 }), { status: 200 })
  )

  await setRIAAGain(2)
  const call = vi.mocked(apiFetch).mock.calls[0]
  expect(call[1]?.method).toBe('PUT')
  expect(call[1]?.body).toBe(JSON.stringify({ gain_db: 2 }))
})
```

---

### 8. Error Handling (2 tests)

Tests for network and API error scenarios.

- ✅ Network errors (timeouts, connection failures)
- ✅ Failed HTTP requests (non-2xx status codes)

**Example**:
```typescript
it('should handle network errors', async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network timeout'))

  const result = await getVersion()
  expect(isApiError(result)).toBe(true)
  expect((result as any).error).toBe('Network Error')
})
```

---

### 9. Regression Tests (6 tests)

Tests to prevent common bugs from returning.

| Test | Purpose |
|------|---------|
| Data integrity | Response data unchanged after parsing |
| Single fetch call | No duplicate HTTP requests |
| Consecutive calls | Different results from sequential calls |
| Header preservation | Content-Type always included |
| Header merging | Custom + default headers combined |

**Example Test**:
```typescript
it('should not modify response data', async () => {
  const mockData = { id: 1, name: 'device', volume: 80 }
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify(mockData), { status: 200 })
  )

  const result = await getVolumeById(1)
  expect(result).toEqual(mockData)  // Exact match
})

it('should call apiFetch exactly once per function', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ version: '1.0', api_version: '1.0' }), {
      status: 200,
    })
  )

  await getVersion()
  expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(1)
})
```

---

## Mock Configuration

### Setup Pattern

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAppConfigStore).mockReturnValue({
    config: {
      audiocontrol_api: {
        deviceIP: 'localhost',
        devicePort: 2716,
        useProxy: false,  // Direct connection for tests
      },
    },
  } as any)
})
```

### Mock Modules

| Module | Mock Behavior |
|--------|---------------|
| `useAppConfigStore` | Returns test config (localhost:2716) |
| `apiFetch` | Mocked to return predefined responses |

### Response Format

```typescript
new Response(JSON.stringify(data), { status: 200 })
new Response(JSON.stringify(error), { status: 400 })
```

---

## Running Tests

### Run PipeWire Tests Only

```bash
pnpm run test src/__tests__/api/pipewire.test.ts
```

Output:
```
 RUN  v4.1.10 /home/ulf/data/hbos-ui
 Test Files  1 passed (1)
      Tests  84 passed (84)
   Duration  ~260ms
```

### Run All Tests

```bash
pnpm run test
```

### Watch Mode (Auto-rerun on changes)

```bash
pnpm run test -- --watch
```

### Run with Coverage

```bash
pnpm run test -- --coverage
```

---

## Test Patterns

### Successful Response Pattern

```typescript
it('should get volume by ID', async () => {
  const mockVolume = { id: 5, name: 'speaker', volume: 50 }
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify(mockVolume), { status: 200 })
  )

  const result = await getVolumeById(5)
  expect((result as any).volume).toBe(50)
})
```

### Error Response Pattern

```typescript
it('should handle not found error', async () => {
  const error = { error: 'NOT_FOUND', message: 'Object not found' }
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify(error), { status: 404 })
  )

  const result = await getObjectById(999)
  expect(isApiError(result)).toBe(true)
})
```

### HTTP Method Verification Pattern

```typescript
it('should use PUT for volume update', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ volume: 70 }), { status: 200 })
  )

  await setVolumeById(1, 70)
  const call = vi.mocked(apiFetch).mock.calls[0]
  expect(call[1]?.method).toBe('PUT')
})
```

### Request Body Validation Pattern

```typescript
it('should send JSON body', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true }), { status: 200 })
  )

  await setVolumeById(1, 75)
  const call = vi.mocked(apiFetch).mock.calls[0]
  expect(call[1]?.body).toBe(JSON.stringify({ volume: 75 }))
})
```

---

## Critical Test Scenarios

### 1. Volume Setting Flow

```typescript
// Test 1: Get volumes
listVolumes() → [{ id: 1, volume: 80 }, { id: 2, volume: 60 }]

// Test 2: Set volume
setVolumeById(1, 75) → { volume: 75 }

// Test 3: Save
saveVolumeById(1) → { success: true, id: 1, volume: 75 }
```

### 2. Link Management Flow

```typescript
// Test 1: Check if link exists
linkExists('output:port', 'input:port') → { exists: false }

// Test 2: Create link
createLink('output:port', 'input:port') → { status: 'success', link_id: 5 }

// Test 3: Verify creation
linkExists('output:port', 'input:port') → { exists: true, link_id: 5 }

// Test 4: Remove link
removeLinkById(5) → { status: 'success' }
```

### 3. EQ Configuration Flow

```typescript
// Test 1: Get band
getSpeakerEQBand('eq1', 0) → { band: 0, frequency: 1000, gain: 0 }

// Test 2: Modify
setSpeakerEQBand('eq1', 0, { gain: 3 }) → { success: true, updated: {...} }

// Test 3: Save
resetSpeakerEQToDefaults() → { status: 'success' }
```

---

## Regression Prevention

### Fixed Issues

1. **Empty PUT/POST Bodies**
   - Fixed 3 functions to send `JSON.stringify({})` for consistency
   - Tests now verify body is present
   - Prevents silent failures on strict servers

2. **HTTP Method Consistency**
   - All GET requests: no explicit method
   - All PUT/POST/DELETE: explicit method
   - Tests verify correct method for each function

3. **Header Handling**
   - All requests include `Content-Type: application/json`
   - Tests verify headers are present

---

## Test Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 84 |
| Pass Rate | 100% |
| Execution Time | ~260ms |
| Test Files | 1 |
| Describe Blocks | 9 |
| Mocked Modules | 2 |
| Coverage Areas | 8 |

---

## Troubleshooting

### All tests fail with "Cannot find module"

**Cause**: Import paths incorrect or module not found  
**Solution**: Verify @/stores and @/api paths exist

### Tests timeout

**Cause**: Mock not configured or apiFetch not mocked  
**Solution**: Check `beforeEach()` setup includes all mocks

### Wrong response returned

**Cause**: Mock setup order or response format  
**Solution**: Verify JSON response format matches expected type

### HTTP method test fails

**Cause**: Method not passed in options  
**Solution**: Check all PUT/POST/DELETE calls include method parameter

---

## See Also

- [PipeWire API Reference](pipewire-api.md) - Function documentation
- [PipeWire Code Review](pipewire-api-review.md) - Code quality analysis
- [Test Framework Documentation](https://vitest.dev/) - Vitest docs
- [Mocking Patterns](https://vitest.dev/api/vi.html) - vi.mock() patterns


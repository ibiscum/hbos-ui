# BluetoothDevices.vue - Comprehensive API Documentation

**Location**: [src/components/BluetoothDevices.vue](src/components/BluetoothDevices.vue)  
**Type**: Vue 3 Composition API Component (`<script setup>`)  
**Language**: TypeScript  
**Statistics**: 122 lines | Template: 23 lines | Script: 75 lines | Styles: 24 lines

**Test File**: [src/components/__tests__/BluetoothDevices.test.ts](src/components/__tests__/BluetoothDevices.test.ts)  
**Test Coverage**: 40+ comprehensive unit and regression tests

---

## Table of Contents

1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Props & Interfaces](#props--interfaces)
4. [Template Structure](#template-structure)
5. [Reactive State](#reactive-state)
6. [Functions & Methods](#functions--methods)
7. [Store Integration](#store-integration)
8. [API Integration](#api-integration)
9. [Validation & Type Guards](#validation--type-guards)
10. [Retry Logic](#retry-logic)
11. [Error Handling](#error-handling)
12. [CSS Classes & Styling](#css-classes--styling)
13. [Data Flow](#data-flow)
14. [Edge Cases & Limitations](#edge-cases--limitations)
15. [Best Practices](#best-practices)
16. [Testing](#testing)
17. [Troubleshooting](#troubleshooting)
18. [Usage Examples](#usage-examples)

---

## Overview

**Purpose**: BluetoothDevices.vue is a Vue 3 component that displays a list of paired Bluetooth devices on a HifiBerry audio player system. It provides real-time device status visualization with connection and trust information.

**Key Features**:
- Automatic device list fetching on component mount
- Real-time device status display (connected/disconnected, trusted/untrusted)
- Comprehensive data validation with type guards
- Automatic retry mechanism (up to 3 retries with 1s delay)
- Loading and error state management
- Empty state messaging
- Integration with BluetoothDeviceEntry child component for individual device management
- Full TypeScript support with type safety

**Dependencies**:
- Vue 3 Composition API with `<script setup>`
- Pinia store (`useAppConfigStore`)
- HTTP utility (`apiFetch`)
- Child components: `BluetoothDeviceEntry`, `ContentBox`

---

## Component Architecture

```
BluetoothDevices.vue
├── Template (ContentBox wrapper)
│   ├── Header (h2)
│   └── Device List Container
│       ├── Loading State
│       ├── Error State
│       ├── Device List (v-if no error/loading)
│       │   ├── BluetoothDeviceEntry (v-for each device)
│       │   └── Empty State Fallback
│       └── Styling (SCSS scoped)
└── Script Setup
    ├── Stores
    │   └── useAppConfigStore
    ├── HTTP API
    │   └── apiFetch
    ├── Imports
    │   ├── BluetoothDeviceEntry
    │   └── ContentBox
    ├── Type Definitions
    │   └── BluetoothDevice interface
    ├── Reactive State
    │   ├── devices
    │   ├── loading
    │   ├── error
    │   └── retryCount
    ├── Type Guards
    │   └── isValidDevice()
    ├── Async Functions
    │   └── fetchDevices()
    └── Lifecycle
        └── onMounted(fetchDevices)
```

---

## Props & Interfaces

### BluetoothDevice Interface

```typescript
interface BluetoothDevice {
  address: string      // Bluetooth MAC address (e.g., "00:11:22:33:44:55")
  connected: boolean   // Current connection status
  name: string         // User-friendly device name
  trusted: boolean     // Trust status with the system
}
```

**Requirements**:
- All fields are mandatory
- `address` must be a valid string (not null, not empty per validation logic)
- `name` can be empty string (edge case: device without display name)
- `connected` and `trusted` are strict booleans
- No additional fields are filtered or used

### Component Props

This component accepts **no props**. All configuration comes from:
1. Pinia store (`useAppConfigStore`)
2. Backend API responses

---

## Template Structure

### Template Hierarchy

```html
<ContentBox class="card-content">
  <h2>Devices</h2>
  <div class="bluetooth-devices-div">
    <!-- Loading State -->
    <p v-if="loading">Loading devices...</p>
    
    <!-- Error State -->
    <p v-if="error" class="error">{{ error }}</p>
    
    <!-- Main Content (hidden when loading or error) -->
    <div v-if="!loading && !error" class="bluetooth-device-list">
      <template v-if="devices.length > 0">
        <!-- Device List -->
        <BluetoothDeviceEntry
          v-for="device in devices"
          :key="device.address"
          :name="device.name"
          :address="device.address"
          :connected="device.connected"
          :trusted="device.trusted"
          :onUpdate="fetchDevices"
        />
      </template>
      
      <!-- Empty State -->
      <p v-else>No paired devices found.</p>
    </div>
  </div>
</ContentBox>
```

### States & Display Logic

| State | Display | Conditions |
|-------|---------|-----------|
| Loading | "Loading devices..." | `loading === true` (any state) |
| Error | Error message (red) | `error !== null` (takes precedence over devices) |
| Has Devices | Device list | `!loading && !error && devices.length > 0` |
| Empty | "No paired devices found." | `!loading && !error && devices.length === 0` |

**Display Priority**:
1. Loading state (always shown if loading)
2. Error state (if present and not loading)
3. Device list or empty message (only when not loading and no error)

---

## Reactive State

### Ref<T> Variables

```typescript
const devices = ref<BluetoothDevice[]>([])  // List of validated devices
const loading = ref(true)                    // Fetch in progress flag
const error = ref<string | null>(null)       // Error message or null
const retryCount = ref(0)                    // Current retry attempt count
const MAX_RETRIES = 3                        // Maximum retry attempts (const)
```

**State Lifecycle**:

1. **Initial Mount**:
   - `loading = true`
   - `error = null`
   - `devices = []`
   - `retryCount = 0`

2. **Fetch Starting**:
   - `loading = true`
   - `error = null` (cleared)

3. **Fetch Success**:
   - `devices = validated data`
   - `error = null`
   - `retryCount = 0` (reset)
   - `loading = false`

4. **Fetch Failure (without retry)**:
   - `error = "Failed to load Bluetooth devices."`
   - `devices` unchanged
   - `retryCount` incremented
   - `loading = false` (in finally)

---

## Functions & Methods

### isValidDevice(device: unknown): device is BluetoothDevice

**Type Guard Function**

Validates that an unknown value conforms to the BluetoothDevice interface.

**Signature**:
```typescript
function isValidDevice(device: unknown): device is BluetoothDevice
```

**Parameters**:
- `device: unknown` - Value to validate

**Returns**:
- `true` if device is a valid BluetoothDevice object
- `false` otherwise

**Implementation Details**:
```typescript
// Step 1: Check if device is an object and not null
if (typeof device !== 'object' || device === null) return false

// Step 2: Type assertion for safe property access
const obj = device as Record<string, unknown>

// Step 3: Validate each required field
return (
  typeof obj.address === 'string' &&       // Must be string
  typeof obj.name === 'string' &&          // Must be string
  typeof obj.connected === 'boolean' &&    // Must be boolean
  typeof obj.trusted === 'boolean'         // Must be boolean
)
```

**Edge Cases**:
- Rejects objects with missing fields
- Rejects objects with incorrect field types
- Accepts empty string for `name` (valid structure, just empty value)
- Rejects numeric strings for `address` (must be actual string type)
- Rejects null/undefined values for any field

**Example Usage**:
```typescript
const device = JSON.parse(jsonString)
if (isValidDevice(device)) {
  // Type is guaranteed to be BluetoothDevice
  devices.value.push(device)
} else {
  console.warn('Invalid device structure:', device)
}
```

---

### fetchDevices(): Promise<void>

**Main Async Data Fetching Function**

Fetches Bluetooth paired devices from backend API, validates response structure and individual devices, and implements automatic retry logic.

**Signature**:
```typescript
const fetchDevices = async () => void
```

**Flow**:
```
1. Set loading = true, error = null
2. Call apiFetch(apiBaseUrl/bluetooth/paired-devices)
3. Check response.ok
   ├─ If false: throw HttpError
   └─ If true: continue
4. Parse JSON response
5. Validate response.data is array
   ├─ If not: throw StructureError
   └─ If yes: continue
6. Filter devices using isValidDevice()
7. Update devices.value = validatedDevices
8. Reset retryCount = 0
9. Catch any error:
   ├─ Log error to console
   ├─ Set error message
   ├─ If retryCount < MAX_RETRIES:
   │  ├─ Increment retryCount
   │  ├─ Log retry attempt
   │  └─ Schedule fetchDevices() after 1000ms
   └─ Finally: Set loading = false
```

**Error Handling**:
- HTTP errors (non-2xx status)
- Network errors (connection failures)
- JSON parsing failures
- Invalid response structure (missing `data` field)
- Invalid response type (data is not array)
- Null/undefined responses

**Retry Mechanism**:
- **Trigger**: Any error during fetch
- **Max Attempts**: 3 retries (+ 1 initial = 4 total attempts)
- **Delay**: 1 second between retries
- **Reset**: Counter resets on successful fetch
- **Logging**: Each retry attempt logged with count

**Example Retry Sequence**:
```
Time 0ms:    Initial attempt → Error
Time 1000ms: Retry 1/3 → Error
Time 2000ms: Retry 2/3 → Error
Time 3000ms: Retry 3/3 → Error (no more retries)
Time 3000ms: Error message displayed
```

---

## Store Integration

### useAppConfigStore()

**Purpose**: Provides centralized configuration for API endpoints

**Usage**:
```typescript
const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()
// Returns: "http://localhost:8080" or configured API base URL
```

**Method Used**: `getConfigApiBaseUrl(): string`

**API Endpoint Constructed**:
- Base URL from store
- Endpoint: `/bluetooth/paired-devices`
- **Full URL**: `${apiBaseUrl}/bluetooth/paired-devices`

---

## API Integration

### Backend API Contract

**Endpoint**: `GET {apiBaseUrl}/bluetooth/paired-devices`

**Request**:
```typescript
// No request body
// No headers (handled by apiFetch)
```

**Success Response** (HTTP 200 OK):
```json
{
  "data": [
    {
      "address": "00:11:22:33:44:55",
      "name": "Wireless Speaker",
      "connected": true,
      "trusted": true
    },
    {
      "address": "00:11:22:33:44:66",
      "name": "Mobile Phone",
      "connected": false,
      "trusted": true
    }
  ]
}
```

**Error Response** (HTTP 4xx/5xx):
```json
{
  "error": "Internal server error"
  // or any error structure
  // (error structure is not parsed, only status checked)
}
```

**Response Validation**:
1. Check HTTP status via `response.ok`
2. If not ok, throw error (status in error message)
3. Parse JSON response
4. Validate `response.data` is array
5. Filter each item through `isValidDevice()`

### apiFetch Wrapper

**Purpose**: Abstracted HTTP utility (mocked in tests)

**Usage**:
```typescript
const response = await apiFetch(url)
if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
const result = await response.json()
```

**Characteristics**:
- Returns standard Fetch API Response object
- Handles authentication/headers (managed by apiFetch)
- Throws on network errors
- Does not throw on non-2xx status (checks `response.ok`)

---

## Validation & Type Guards

### Validation Strategy

**Three-Layer Validation**:

1. **Response Structure Validation**
   - Check if response exists (not null)
   - Check if response.data is array
   - Throw error if validation fails

2. **Device Structure Validation**
   - Use `isValidDevice()` type guard
   - Filter out invalid devices (logged to console)
   - Only valid devices rendered

3. **Field Type Validation**
   - All fields strictly typed
   - No type coercion
   - Rejects mismatched types

### Validation Examples

**Valid Device**:
```typescript
{
  address: "00:11:22:33:44:55",  // ✓ string
  name: "Speaker",                 // ✓ string
  connected: true,                 // ✓ boolean
  trusted: false                   // ✓ boolean
}
```

**Invalid Devices** (filtered out):
```typescript
// Missing fields
{ address: "00:11:22:33:44:55", name: "Device" }

// Wrong types
{ address: 123, name: "Device", connected: true, trusted: false }
{ address: "00:11:22:33:44:55", name: "Device", connected: "yes", trusted: false }

// Null/undefined
{ address: null, name: "Device", connected: true, trusted: false }
{ address: "00:11:22:33:44:55", name: undefined, connected: true, trusted: false }

// Extra fields (still valid if required fields present)
{ address: "...", name: "...", connected: true, trusted: false, extra: "field" }
// ✓ Valid - extra fields ignored
```

---

## Retry Logic

### Retry Configuration

```typescript
const MAX_RETRIES = 3        // Total: 3 retries (+ 1 initial = 4 attempts)
const RETRY_DELAY = 1000     // 1 second between retries
```

### Retry Flow

**Condition for Retry**:
- Only on error (any error type)
- Never on success
- Never if `retryCount >= MAX_RETRIES`

**Retry Sequence**:

| Attempt | Count | When | Behavior |
|---------|-------|------|----------|
| 1 | 0 | onMounted | Fetch, if error → increment to 1 |
| 2 | 1 | +1000ms | Fetch, if error → increment to 2 |
| 3 | 2 | +1000ms | Fetch, if error → increment to 3 |
| 4 | 3 | +1000ms | Fetch, if error → no retry (count = max) |

**Error Message Display**:
- After 1st failure: Immediately display error
- After retries: Same error message shown throughout
- On retry success: Error message cleared, devices displayed

### Retry Counter Reset

**When Reset**: Only on successful fetch (`response.ok === true`)

**Timeline**:
```
Time 0s:   1st attempt (error) → retryCount = 1, error shown
Time 1s:   2nd attempt (error) → retryCount = 2, error still shown
Time 2s:   3rd attempt (success) → retryCount = 0 (reset!), error cleared
```

**Implication**: If first retry succeeds, retryCount resets to 0 for next fetch cycle.

---

## Error Handling

### Error Types & Handling

| Error Type | Cause | HTTP Status | Display Message | Retry |
|------------|-------|-------------|-----------------|-------|
| Network Error | Connection failed | - | "Failed to load Bluetooth devices." | Yes |
| HTTP Error | Bad status | 4xx, 5xx | "Failed to load Bluetooth devices." | Yes |
| Invalid Structure | Missing `data` field | 200 | "Failed to load Bluetooth devices." | Yes |
| Invalid Array | `data` not array | 200 | "Failed to load Bluetooth devices." | Yes |
| JSON Parse Error | Malformed JSON | 200 | "Failed to load Bluetooth devices." | Yes |

### Error Message

**Constant Message**: All errors display same message to user:
```
"Failed to load Bluetooth devices."
```

**Console Logging**: Detailed error logged to `console.error()` with full error object:
```typescript
console.error('Failed to fetch devices:', err)
```

### Edge Cases

1. **Backend returns null**
   ```json
   null
   ```
   → Caught as "not object or null" check
   → Error: "Invalid response structure: expected data array"

2. **Backend returns empty array**
   ```json
   { "data": [] }
   ```
   → Valid response
   → Displays "No paired devices found." (empty state)

3. **Backend returns array instead of object**
   ```json
   [{ address: "...", ... }]
   ```
   → Caught as "not object" check
   → Error: "Invalid response structure: expected data array"

4. **Some devices invalid, some valid**
   ```json
   {
     "data": [
       { address: "00:11:22:33:44:55", name: "Valid", connected: true, trusted: true },
       { address: "00:11:22:33:44:66", name: "Invalid" },
       { address: "00:11:22:33:44:77", name: "Valid 2", connected: false, trusted: false }
     ]
   }
   ```
   → Filters to valid devices
   → Displays: Valid, Valid 2
   → Logs warning for Invalid device

---

## CSS Classes & Styling

### Scoped Styles

All styles are scoped with `scoped lang="scss"` - no global style pollution.

### Class Reference

| Class | Purpose | Properties |
|-------|---------|-----------|
| `.card-content` | Wrapper box | Padding: 20px |
| `.bluetooth-devices-div` | Main container | Flex column, centered |
| `.bluetooth-device-list` | Device list container | 95% width, flex column, centered |
| `.error` | Error message styling | Color: red |

### Layout Structure

```
.card-content (padding: 20px)
└── .bluetooth-devices-div (flex col, centered)
    ├── <h2>Devices</h2>
    ├── <p>Loading...</p> OR
    ├── <p class="error">Error message</p> OR
    └── .bluetooth-device-list (95% width, flex col, centered)
        ├── <BluetoothDeviceEntry> ×N OR
        └── <p>No paired devices found.</p>
```

### Flexbox Configuration

**Containers** (`.bluetooth-devices-div`, `.bluetooth-device-list`):
```css
display: flex;
flex-direction: column;      /* Stack items vertically */
justify-content: center;     /* Center along main axis (top-to-bottom) */
align-items: center;         /* Center along cross axis (left-to-right) */
```

**Note**: Fixed inconsistency from `justify-items` (grid property) to `justify-content` (flexbox property).

---

## Data Flow

### Component Data Flow Diagram

```
Component Mount
    ↓
onMounted() hook
    ↓
fetchDevices() called
    ↓
[loading = true, error = null]
    ↓
apiFetch() API call
    ↓
    ├─→ Success
    │   ├─→ Parse JSON
    │   ├─→ Validate structure (is array)
    │   ├─→ Filter devices (isValidDevice)
    │   ├─→ Update devices.value
    │   ├─→ Reset retryCount = 0
    │   └─→ [loading = false, error = null]
    │
    └─→ Failure
        ├─→ Log error
        ├─→ Set error message
        ├─→ [loading = false]
        └─→ If retryCount < MAX_RETRIES
            ├─→ Increment retryCount
            └─→ Schedule retry (1000ms)
```

### State Transitions

```
[Initial]
  ↓
loading: true
  ↓ (onMounted)
Fetching...
  ├─→ [Success] → loading: false, devices: [...], error: null
  └─→ [Error] → loading: false, error: message, retryCount: 1
       ↓ (if retryCount < 3)
       Retry after 1s
       ├─→ [Success] → loading: false, devices: [...], error: null, retryCount: 0
       └─→ [Error] → retryCount: 2, schedule next retry
```

### Template Reactivity

The template updates automatically via Vue's reactivity system:

```vue
<!-- Updates when loading changes -->
<p v-if="loading">Loading devices...</p>

<!-- Updates when error changes -->
<p v-if="error" class="error">{{ error }}</p>

<!-- Updates when devices array changes -->
<template v-if="devices.length > 0">
  <BluetoothDeviceEntry v-for="device in devices" ... />
</template>

<!-- Shows when devices is empty -->
<p v-else>No paired devices found.</p>
```

---

## Edge Cases & Limitations

### Handled Edge Cases

✓ **Empty device list** → Displays "No paired devices found."

✓ **Null response** → Error: Invalid response structure

✓ **Missing data field** → Error: Invalid response structure

✓ **Array response instead of object** → Error: Invalid response structure

✓ **Some invalid devices** → Filters out, displays only valid ones

✓ **Empty string device name** → Accepted (valid structure)

✓ **Network timeout** → Retry mechanism (up to 3 times)

✓ **Transient failures** → Automatic retry with 1s delay

✓ **All retries exhausted** → Error message displayed (no further retries)

### Known Limitations

⚠ **API endpoint hardcoded** → Cannot be changed without code modification

⚠ **Error message not specific** → All errors show same generic message

⚠ **No exponential backoff** → All retries use fixed 1s delay

⚠ **Retry state not persisted** → Resets on component unmount/remount

⚠ **No manual refresh button** → Only fetches on mount

⚠ **One API call in-flight** → No concurrent requests prevented

⚠ **TypeScript strict mode** → Requires all properties to be present in BluetoothDevice

---

## Best Practices

### Usage

1. **Place in page layout**:
   ```vue
   <BluetoothDevices />
   <!-- Component fetches on mount, no props needed -->
   ```

2. **Ensure store is available**:
   - Place inside root component with Pinia provider
   - useAppConfigStore must be initialized

3. **Handle child component updates**:
   - BluetoothDeviceEntry receives `onUpdate={fetchDevices}`
   - When child updates device state, it calls fetchDevices()
   - Component automatically re-fetches device list

### Development

1. **Adding validation rules**:
   - Modify `isValidDevice()` type guard
   - Tests validate new rules automatically

2. **Changing retry behavior**:
   - Update `MAX_RETRIES` constant
   - Update `setTimeout` delay value
   - Tests verify retry logic

3. **Modifying API endpoint**:
   - Change `'/bluetooth/paired-devices'` endpoint
   - Update tests with new endpoint
   - Verify store provides correct base URL

### Testing

1. **Mock apiFetch in tests**:
   ```typescript
   vi.mock('@/api/http')
   const mockFetch = vi.mocked(apiFetch)
   mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(...) })
   ```

2. **Use fake timers for retries**:
   ```typescript
   vi.useFakeTimers()
   // ... test retry logic
   vi.advanceTimersByTime(1000)
   ```

3. **Test all validation paths**:
   - Valid device
   - Missing fields
   - Wrong types
   - Empty arrays
   - Null values

---

## Testing

### Test Coverage Summary

**File**: [src/components/__tests__/BluetoothDevices.test.ts](src/components/__tests__/BluetoothDevices.test.ts)

**Total Tests**: 40+

**Test Categories**:

1. **Lifecycle Tests** (3 tests)
   - Fetch on mount
   - Loading state initialization
   - Loading state cleared after fetch

2. **Display & Rendering Tests** (4 tests)
   - Display devices on success
   - Display empty state
   - Pass correct props to child components
   - Pass fetchDevices callback

3. **Error Handling Tests** (7 tests)
   - HTTP 500 error
   - HTTP 404 error
   - Network error
   - Missing data field
   - Non-array data field
   - Null response
   - JSON parse failure

4. **Data Validation Tests** (5 tests)
   - Filter invalid device structures
   - Accept correct types
   - Accept empty device name
   - Reject non-string address
   - Reject missing required fields

5. **Retry Logic Tests** (5 tests)
   - Retry on failure
   - Retry up to MAX_RETRIES (3)
   - Reset retry counter on success
   - Verify 1s delay between retries
   - Clear error on successful retry

6. **API Integration Tests** (3 tests)
   - Use correct API endpoint
   - Call with full URL
   - Handle response.json() rejection

### Running Tests

```bash
# Run all tests for this component
pnpm test BluetoothDevices.test.ts

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test --watch BluetoothDevices.test.ts

# Run specific test
pnpm test BluetoothDevices.test.ts -t "should retry on failure"
```

### Test Patterns Used

**Mocking Strategy**:
- Mock `apiFetch` for API calls
- Mock `useAppConfigStore` for configuration
- Mock child components (BluetoothDeviceEntry, ContentBox)

**Fake Timers**:
- Use `vi.useFakeTimers()` for retry logic testing
- Advance time with `vi.advanceTimersByTime(ms)`
- Real timers restored in afterEach

**Assertions**:
- Component rendering checks
- API call verification
- State value assertions
- Prop passing verification

---

## Troubleshooting

### Issue: Devices Not Loading

**Symptoms**: Component shows "Loading devices..." indefinitely or error persists

**Debugging Steps**:
1. Check browser console for errors logged by `console.error('Failed to fetch devices:', err)`
2. Check network tab - is API request being made to `/bluetooth/paired-devices`?
3. Verify API returns proper JSON structure: `{ data: [...] }`
4. Verify each device object has required fields: `address`, `name`, `connected`, `trusted`

**Common Causes**:
- API endpoint misconfigured in store
- Backend service not running
- Network connectivity issue
- API returning non-array `data` field

### Issue: Some Devices Missing From List

**Symptoms**: Fewer devices displayed than expected

**Debugging Steps**:
1. Check browser console for `console.warn('Invalid device structure:', device)` messages
2. Inspect network response in browser DevTools
3. Verify all devices have correct field types
4. Check if any devices have null/undefined values

**Common Causes**:
- Backend returning malformed device objects
- Missing required fields in API response
- Wrong data types (e.g., connected: "true" instead of boolean)
- Extra fields shouldn't cause issues but check anyway

### Issue: Retry Loop Not Working

**Symptoms**: Error displayed but no retries happening

**Debugging Steps**:
1. Check browser console for `'Retrying device fetch...'` messages
2. Verify API is actually failing (check Network tab)
3. Check if MAX_RETRIES has been exceeded
4. Verify timers are working (not mocked in production)

**Common Causes**:
- MAX_RETRIES exceeded (3 retries = 4 total attempts)
- First successful fetch resets counter
- Component unmounted before retry completes

### Issue: Props Not Passed to Child Component

**Symptoms**: BluetoothDeviceEntry not receiving data correctly

**Debugging Steps**:
1. Verify devices are in `devices.value` array (check React DevTools)
2. Check BluetoothDeviceEntry receives `:key`, `:name`, `:address`, `:connected`, `:trusted`, `:onUpdate`
3. Verify `fetchDevices` function is being passed as `onUpdate`

**Common Causes**:
- Device validation filtering too aggressively
- Empty devices array after validation
- Props syntax error in template

---

## Usage Examples

### Basic Integration

```vue
<template>
  <div class="page">
    <BluetoothDevices />
  </div>
</template>

<script setup lang="ts">
import BluetoothDevices from '@/components/BluetoothDevices.vue'
</script>
```

### In a Settings/Control Panel

```vue
<template>
  <main class="settings-panel">
    <section class="bluetooth-section">
      <BluetoothDevices />
    </section>
    <section class="audio-section">
      <AudioControls />
    </section>
  </main>
</template>

<script setup lang="ts">
import BluetoothDevices from '@/components/BluetoothDevices.vue'
import AudioControls from '@/components/AudioControls.vue'
</script>
```

### Styling Parent Container

```vue
<template>
  <div class="bluetooth-wrapper">
    <BluetoothDevices />
  </div>
</template>

<style scoped lang="scss">
.bluetooth-wrapper {
  max-width: 800px;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
</style>
```

### Testing Within Parent Component

```typescript
// In parent component test
it('should render BluetoothDevices component', () => {
  const wrapper = mount(ParentComponent)
  expect(wrapper.findComponent(BluetoothDevices).exists()).toBe(true)
})

it('should fetch devices when parent mounts', async () => {
  const wrapper = mount(ParentComponent)
  await flushPromises()
  
  // Verify apiFetch was called
  expect(mockFetch).toHaveBeenCalledWith('http://api.test/bluetooth/paired-devices')
})
```

---

## Version History

**Current Version**: 1.0.0  
**Last Updated**: 2026-08-03

### Changes

- Fixed SCSS flexbox properties: `justify-items` → `justify-content`
- Improved JSDoc comments with parameter and return type documentation
- Added comprehensive retry mechanism documentation
- Added extensive validation strategy documentation
- Enhanced error handling edge case documentation

---

## Related Documentation

- [BluetoothDeviceEntry.vue](bluetooth-device-entry.md) - Individual device component
- [HTTP API Wrapper](HTTP_API_WRAPPER.md) - apiFetch implementation
- [Config API](config-api.md) - useAppConfigStore documentation

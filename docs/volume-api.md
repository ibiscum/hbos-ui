# Volume API Documentation

Complete reference for the Volume Control API (`src/api/volume.ts`), providing audio volume management and headphone-specific volume control.

## Table of Contents

- [Overview](#overview)
- [API Architecture](#api-architecture)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [Volume Control API](#volume-control-api)
  - [Headphone Volume API](#headphone-volume-api)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)
- [Design Patterns](#design-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Overview

The Volume API provides unified access to audio volume control on HiFiBerry devices with two distinct API groups:

1. **Volume Control API**: Manages main system volume, including percentage-based volume adjustment, mute control, and volume state monitoring
2. **Headphone Volume API**: Manages per-control headphone volume settings with persistent storage and restoration

### Key Characteristics

- **Volume API**: Returns `null` on errors for graceful degradation
- **Headphone API**: Returns error status objects for detailed error information
- **Validation**: All functions validate input ranges and reject non-finite values
- **Error Handling**: Different patterns for recovery and diagnostics
- **Persistence**: Headphone volumes can be stored and restored across sessions

## API Architecture

The Volume API is organized into two URL bases managed by the configuration store:

### Base URLs

```typescript
// Volume Control API (main system volume)
Base: http://localhost:3000/api/volume
Endpoints: /info, /state, /set, /increase, /decrease, /mute

// Headphone Volume API (per-control headphone volume)
Base: http://localhost:3001/api/volume/headphone
Endpoints: '', /controls, /store, /restore
```

### Dependency Injection

Both APIs depend on:

```typescript
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

const configStore = useAppConfigStore()
const baseUrl = configStore.getApiBaseUrl()          // Volume API
const configBaseUrl = configStore.getConfigApiBaseUrl() // Headphone API
```

## Configuration

The Volume API requires proper configuration of base URLs through the application config store.

### Required Configuration

```typescript
// In appconfig.ts or configuration provider
{
  apiBaseUrl: 'http://localhost:3000/api',        // For volume control
  configApiBaseUrl: 'http://localhost:3001/api'   // For headphone volume
}
```

### URL Building

URLs are built dynamically using the configuration:

```typescript
// Volume API URL
buildVolumeApiUrl('/info')
// → http://localhost:3000/api/volume/info

// Headphone Volume API URL
buildHeadphoneVolumeApiUrl('/controls')
// → http://localhost:3001/api/volume/headphone/controls
```

## API Reference

### Volume Control API

These functions manage the main system volume and return `null` on failure.

#### getVolumeInfo()

Get current volume information including available controls and state.

```typescript
export const getVolumeInfo = async (): Promise<VolumeInfo | null>
```

**Returns**: `VolumeInfo | null`

**Example Response**:
```typescript
{
  available: true,
  control_info: {
    internal_name: "PCM",
    display_name: "Master Volume",
    decibel_range: { min_db: -96, max_db: 0 }
  },
  current_state: {
    percentage: 50,
    decibels: -6,
    raw_value: 128
  },
  supports_change_monitoring: true
}
```

**Error Handling**: Logs error to console and returns `null`

**Use Cases**:
- Initialize UI with current volume capability information
- Determine available volume controls
- Check if volume control is available before displaying controls

---

#### getVolumeState()

Get current volume state (percentage, decibels, raw value).

```typescript
export const getVolumeState = async (): Promise<VolumeState | null>
```

**Returns**: `VolumeState | null`

**Example Response**:
```typescript
{
  percentage: 75,
  decibels: -3,
  raw_value: 192
}
```

**Special Behavior**: 
- HTTP 503 status logs `console.warn('Volume control not available')` instead of error
- Other HTTP errors log console.error()

**Error Handling**: 
- Returns `null` on error
- 503 Service Unavailable treated as graceful unavailability (warning, not error)

**Use Cases**:
- Poll current volume for UI synchronization
- Verify volume changes after setVolumeLevel()
- Display current volume in volume slider component

---

#### setVolumeLevel(percentage)

Set volume to specific percentage (0-100).

```typescript
export const setVolumeLevel = async (percentage: number): Promise<VolumeResponse | null>
```

**Parameters**:
- `percentage`: Volume level (0-100)
  - Must be finite number
  - Outside range returns `null`
  - Rounded to 2 decimal places: `Math.round(percentage * 100) / 100`

**Returns**: `VolumeResponse | null`

**Example Usage**:
```typescript
const result = await volumeApi.setVolumeLevel(50)
if (result) {
  console.log(`Volume set to ${result.new_state?.percentage}%`)
} else {
  console.log('Failed to set volume')
}
```

**Validation**:
- Rejects: `percentage < 0` → returns `null`
- Rejects: `percentage > 100` → returns `null`
- Rejects: `Number.NaN` → returns `null`
- Rejects: `Infinity` → returns `null`

**Rounding Behavior**:
```typescript
setVolumeLevel(33.333) → sends percentage: 33.33
setVolumeLevel(99.999) → sends percentage: 100
setVolumeLevel(0.001) → sends percentage: 0
```

**Error Handling**:
- Validates input before API call
- Parses error response JSON for detailed error message
- Falls back to HTTP statusText if no message field
- Returns `null` and logs console.error()

---

#### increaseVolume(amount?)

Increase volume by specified amount (default 5%).

```typescript
export const increaseVolume = async (amount: number = 5.0): Promise<VolumeResponse | null>
```

**Parameters**:
- `amount`: Volume increase in percentage points (default: 5)
  - Must be positive: `amount > 0`
  - Must be ≤ 100
  - Must be finite
  - Negative/zero values return `null`

**Returns**: `VolumeResponse | null`

**Example Usage**:
```typescript
// Increase by default 5%
await volumeApi.increaseVolume()

// Increase by custom amount
await volumeApi.increaseVolume(10)

// Increase by small amount
await volumeApi.increaseVolume(0.5)
```

**URL Construction**:
```typescript
increaseVolume(5)  → /increase?amount=5
increaseVolume(10) → /increase?amount=10
increaseVolume(0.1) → /increase?amount=0.1
```

**Validation**:
- Rejects: `amount ≤ 0` → returns `null`
- Rejects: `amount > 100` → returns `null`
- Rejects: non-finite values → returns `null`

**Error Handling**: Same as setVolumeLevel (returns `null` on error)

---

#### decreaseVolume(amount?)

Decrease volume by specified amount (default 5%).

```typescript
export const decreaseVolume = async (amount: number = 5.0): Promise<VolumeResponse | null>
```

**Parameters**:
- `amount`: Volume decrease in percentage points (default: 5)
  - Must be positive: `amount > 0`
  - Must be ≤ 100
  - Must be finite

**Returns**: `VolumeResponse | null`

**Example Usage**:
```typescript
// Decrease by default 5%
await volumeApi.decreaseVolume()

// Decrease by custom amount
await volumeApi.decreaseVolume(15)
```

**Validation**: Same as increaseVolume()

**Error Handling**: Same as increaseVolume()

---

#### toggleMute()

Toggle mute state (switches between 0% and previous volume level).

```typescript
export const toggleMute = async (): Promise<VolumeResponse | null>
```

**Returns**: `VolumeResponse | null`

**Example Usage**:
```typescript
const result = await volumeApi.toggleMute()
if (result?.success) {
  console.log('Mute toggled')
} else {
  console.log('Failed to toggle mute')
}
```

**Error Handling**: Returns `null` on error

---

### Headphone Volume API

These functions manage headphone-specific volume and return error status objects on failure.

#### getHeadphoneControls()

Get list of available headphone volume controls.

```typescript
export const getHeadphoneControls = async (): Promise<HeadphoneControlsResponse>
```

**Returns**: `HeadphoneControlsResponse` (never null)

**Success Response**:
```typescript
{
  status: 'success',
  data: {
    controls: ['PCM', 'Mic', 'Speaker'],
    count: 3
  }
}
```

**Error Response**:
```typescript
{
  status: 'error',
  message: 'HTTP 500: Internal Server Error'
}
```

**Use Cases**:
- Populate dropdown of available controls
- Verify control availability before setting volume
- Display available options to user

---

#### getHeadphoneVolume()

Get current headphone volume.

```typescript
export const getHeadphoneVolume = async (): Promise<HeadphoneVolumeResponse>
```

**Returns**: `HeadphoneVolumeResponse` (never null)

**Success Response**:
```typescript
{
  status: 'success',
  data: {
    volume: 65,
    control: 'PCM'
  }
}
```

**Error Response**:
```typescript
{
  status: 'error',
  message: 'Device not found'
}
```

**Error Handling**:
- Parses JSON error response for message
- Falls back to HTTP status format if no message
- Returns error status, never null
- Handles both Error and non-Error exceptions

**Use Cases**:
- Initialize volume slider with current headphone volume
- Verify headphone volume after changes
- Poll for volume synchronization

---

#### setHeadphoneVolume(volume)

Set headphone volume to specific percentage (0-100).

```typescript
export const setHeadphoneVolume = async (volume: number): Promise<HeadphoneVolumeSetResponse>
```

**Parameters**:
- `volume`: Headphone volume level (0-100)
  - Must be finite number
  - Out of range returns error status (not null)
  - Rounded to integer: `Math.round(volume)`

**Returns**: `HeadphoneVolumeSetResponse` (never null)

**Rounding Behavior**:
```typescript
setHeadphoneVolume(66.7) → sends volume: 67
setHeadphoneVolume(50.4) → sends volume: 50
setHeadphoneVolume(100.6) → sends volume: 101 (backend will reject)
```

**Validation**:
- Rejects: `volume < 0` → returns `{status: 'error', message: 'Volume must be between 0 and 100...'}`
- Rejects: `volume > 100` → returns `{status: 'error', message: '...'}`
- Rejects: non-finite values → returns error status

**Example Usage**:
```typescript
const result = await volumeApi.setHeadphoneVolume(75)
if (result.status === 'success') {
  console.log('Headphone volume set to 75%')
} else {
  console.error('Failed:', result.message)
}
```

**Error Handling**:
- Input validation returns error status immediately
- API errors parse JSON for detailed message
- Returns error status, never null
- Always handles exceptions gracefully

---

#### storeHeadphoneVolume()

Store current headphone volume setting to persistent storage.

```typescript
export const storeHeadphoneVolume = async (): Promise<HeadphoneVolumeSetResponse>
```

**Returns**: `HeadphoneVolumeSetResponse` (never null)

**Purpose**: 
- Save current headphone volume setting
- Volume can be restored later with restoreHeadphoneVolume()
- Useful for preserving user preferences across reboots

**Example Usage**:
```typescript
const result = await volumeApi.storeHeadphoneVolume()
if (result.status === 'success') {
  console.log('Headphone volume stored')
} else {
  console.error('Failed to store:', result.message)
}
```

**Error Handling**: Returns error status, never null

---

#### restoreHeadphoneVolume()

Restore previously stored headphone volume setting.

```typescript
export const restoreHeadphoneVolume = async (): Promise<HeadphoneVolumeSetResponse>
```

**Returns**: `HeadphoneVolumeSetResponse` (never null)

**Purpose**:
- Restore headphone volume from persistent storage
- Complements storeHeadphoneVolume()
- Useful for initializing volume on app startup

**Workflow Example**:
```typescript
// On app startup
const restored = await volumeApi.restoreHeadphoneVolume()
if (restored.status === 'success') {
  // Volume has been restored to previous level
  const current = await volumeApi.getHeadphoneVolume()
  updateUI(current.data?.volume)
}
```

**Error Handling**: Returns error status, never null

---

## Error Handling

### Two Error Patterns

The Volume API intentionally uses two different error handling patterns:

#### Volume API Pattern: null Returns

Volume control functions return `null` on error for graceful degradation:

```typescript
const result = await volumeApi.setVolumeLevel(50)

if (result === null) {
  // Handle error - volume control unavailable
  // UI should disable controls, show message, or use fallback
} else {
  // Use result.new_state
  updateVolumeDisplay(result.new_state.percentage)
}
```

**Advantages**:
- Simple null-check in caller
- Forces caller to handle absence explicitly
- Clear signal that operation failed

**Disadvantages**:
- No error details available to caller
- Console logs required for debugging

#### Headphone API Pattern: Error Objects

Headphone functions return status objects with error information:

```typescript
const result = await volumeApi.getHeadphoneVolume()

if (result.status === 'success') {
  updateVolumeDisplay(result.data?.volume)
} else {
  // result.status === 'error'
  console.error('Error:', result.message)
  showErrorToUser(result.message)
}
```

**Advantages**:
- Detailed error message available
- Caller can provide specific error feedback
- Consistent API contract (never null)

**Disadvantages**:
- Requires status check in all callers
- More verbose error handling code

### HTTP Status Handling

#### Special: 503 Service Unavailable in getVolumeState()

```typescript
// Only getVolumeState() treats 503 specially
if (response.status === 503) {
  console.warn('Volume control not available')  // Warning, not error
  return null
}
```

This graceful degradation pattern allows the app to handle temporary volume control unavailability without alarming the user.

#### Other HTTP Errors

All other HTTP errors (400, 404, 500, etc.) are logged as errors:

```typescript
if (!response.ok) {
  console.error('Failed to set volume:', response.status, response.statusText)
  return null
}
```

### Error Message Construction

#### Volume API

For functions that attempt JSON parsing:

```typescript
const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
console.error('Failed to set volume:', response.status, errorData.message || response.statusText)
// Output: "Failed to set volume: 400 Custom error from API"
```

For functions without JSON parsing:

```typescript
console.error('Failed to increase volume:', response.status, response.statusText)
// Output: "Failed to increase volume: 400 Bad Request"
```

#### Headphone API

All headphone functions parse error response and format message:

```typescript
return {
  status: 'error',
  message: errorData.message || `HTTP ${response.status}: ${response.statusText}`
}
```

Result includes either:
- Parsed error message from API
- HTTP status format: "HTTP 400: Bad Request"
- Network error message: "Connection timeout"
- Unknown error fallback: "Unknown error occurred"

### Network Errors

Both API groups handle network exceptions:

```typescript
catch (error) {
  // Volume API
  console.error('Error getting volume info:', error)
  return null

  // Headphone API
  return {
    status: 'error',
    message: error instanceof Error ? error.message : 'Unknown error occurred'
  }
}
```

## Type Definitions

### VolumeInfo

```typescript
interface VolumeInfo {
  available: boolean
  control_info?: {
    internal_name: string
    display_name: string
    decibel_range?: {
      min_db: number
      max_db: number
    }
  }
  current_state?: {
    percentage: number
    decibels?: number
    raw_value?: number
  }
  supports_change_monitoring: boolean
}
```

### VolumeState

```typescript
interface VolumeState {
  percentage: number
  decibels?: number
  raw_value?: number
}
```

### VolumeResponse

```typescript
interface VolumeResponse {
  success: boolean
  message: string
  new_state: VolumeState | null
}
```

### HeadphoneControlsResponse

```typescript
interface HeadphoneControlsResponse {
  status: 'success' | 'error'
  data?: {
    controls: string[]
    count: number
  }
  message?: string
}
```

### HeadphoneVolumeResponse

```typescript
interface HeadphoneVolumeResponse {
  status: 'success' | 'error'
  data?: {
    volume: number
    control?: string
  }
  message?: string
}
```

### HeadphoneVolumeSetResponse

```typescript
interface HeadphoneVolumeSetResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    volume: number
  }
}
```

## Design Patterns

### Pattern 1: Null Return for Graceful Degradation

Volume API functions return `null` to simplify caller logic when feature unavailable:

```typescript
// Caller can simply check null
const state = await volumeApi.getVolumeState()
if (state) {
  updateUI(state.percentage)
} else {
  disableVolumeControls()
}
```

This pattern assumes volume control is optional or has fallbacks.

### Pattern 2: Status Objects for Detailed Error Information

Headphone API functions return status objects to provide error details:

```typescript
// Caller must check status and can access message
const result = await volumeApi.getHeadphoneVolume()
if (result.status === 'error') {
  showErrorDialog(result.message)
}
```

This pattern assumes headphone volume errors need user communication.

### Pattern 3: Input Validation Before API Call

All functions validate input locally before calling API:

```typescript
// Function returns immediately without API call
if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
  console.error('Volume validation failed:', ...)
  return null
}
```

**Benefits**:
- Fail fast without network latency
- Consistent error for invalid input
- Reduce API server load

### Pattern 4: Decimal Rounding Consistency

Different functions round differently (intentional):

```typescript
// Volume: 2 decimal places for precision
Math.round(percentage * 100) / 100  // 33.333 → 33.33

// Headphone: integer for simplicity
Math.round(volume)  // 66.7 → 67
```

This allows each API to match backend expectations.

## Best Practices

### 1. Check Return Values Properly

**Volume API (null checks)**:
```typescript
const result = await volumeApi.setVolumeLevel(50)
if (result !== null) {
  // Safe to use result
  console.log(result.new_state.percentage)
}
```

**Headphone API (status checks)**:
```typescript
const result = await volumeApi.setHeadphoneVolume(50)
if (result.status === 'success') {
  // Safe to use data
  console.log(result.data?.volume)
}
```

### 2. Handle 503 Gracefully

```typescript
const state = await volumeApi.getVolumeState()
if (state === null) {
  // Could be 503 (Service Unavailable)
  // Show "temporarily unavailable" vs "error"
  showStatusMessage('Volume control temporarily unavailable')
}
```

### 3. Validate Input Before Display

```typescript
// Only show controls if volume info is available
const info = await volumeApi.getVolumeInfo()
if (info?.available) {
  renderVolumeControls()
} else {
  renderDisabledState()
}
```

### 4. Round Values Consistently with API

```typescript
// Match API rounding when displaying
const rounded = Math.round(userInput * 100) / 100
const result = await volumeApi.setVolumeLevel(rounded)

// Match API rounding for headphone
const roundedHeadphone = Math.round(userInput)
const result2 = await volumeApi.setHeadphoneVolume(roundedHeadphone)
```

### 5. Provide User Feedback for Errors

```typescript
// Volume API: errors are logged, show generic message
const result = await volumeApi.setVolumeLevel(50)
if (!result) {
  showNotification('Unable to change volume. Please try again.')
}

// Headphone API: show specific error message
const result = await volumeApi.setHeadphoneVolume(50)
if (result.status === 'error') {
  showNotification(`Volume change failed: ${result.message}`)
}
```

### 6. Use Store/Restore for Persistence

```typescript
// Save current setting
await volumeApi.setHeadphoneVolume(75)
const stored = await volumeApi.storeHeadphoneVolume()
if (stored.status === 'error') {
  showWarning('Could not save headphone volume setting')
}

// Restore on startup
const restored = await volumeApi.restoreHeadphoneVolume()
if (restored.status === 'success') {
  const current = await volumeApi.getHeadphoneVolume()
  updateUI(current.data?.volume)
}
```

### 7. Debounce Volume Changes

```typescript
import { debounce } from '@vueuse/core'

const updateVolume = debounce(async (percentage: number) => {
  const result = await volumeApi.setVolumeLevel(percentage)
  if (result?.success) {
    // Update succeeded
  }
}, 300)

// In template: @input="updateVolume(percentage)"
```

### 8. Batch Volume Operations

```typescript
// Get current state and controls in parallel
const [info, state] = await Promise.all([
  volumeApi.getVolumeInfo(),
  volumeApi.getVolumeState()
])

if (info && state) {
  // Both succeeded
  updateUI(info, state)
}
```

## Troubleshooting

### Issue: Volume Commands Return null

**Symptoms**:
- `setVolumeLevel()` returns null
- `getVolumeState()` returns null
- App displays "Unable to change volume"

**Causes**:
1. Network connectivity issue → API server unreachable
2. API server not running → Check backend service status
3. Configuration error → Verify getApiBaseUrl() returns correct URL
4. Input validation failure → Check browser console for validation error
5. HTTP 503 → Volume control temporarily unavailable (getVolumeState only)

**Solutions**:
```typescript
// Check configuration
const store = useAppConfigStore()
console.log(store.getApiBaseUrl()) // Should show http://localhost:3000/api

// Test API connectivity
const info = await volumeApi.getVolumeInfo()
if (info === null) {
  // Check browser network tab for failed requests
  // Check backend logs for errors
}

// Check for 503 specifically
const state = await volumeApi.getVolumeState()
if (state === null) {
  console.warn('Volume control returned null - could be 503 Service Unavailable')
}
```

### Issue: Headphone Volume Operations Return error Status

**Symptoms**:
- `getHeadphoneVolume()` returns `{status: 'error', message: '...'}`
- Headphone volume controls show error message
- Store/restore operations fail

**Causes**:
1. No headphone controls connected
2. Headphone control device disconnected
3. API server configuration error
4. Backend database/storage issue
5. Network timeout

**Solutions**:
```typescript
// Check available controls
const controls = await volumeApi.getHeadphoneControls()
if (controls.status === 'error') {
  console.error('Cannot get controls:', controls.message)
  // Check if any headphone controls are configured
}

// Check specific error message
const result = await volumeApi.getHeadphoneVolume()
if (result.status === 'error') {
  console.error('Error:', result.message)
  // Message will indicate specific problem
}

// Try storing vs getting
const stored = await volumeApi.storeHeadphoneVolume()
if (stored.status === 'error') {
  console.error('Storage failed:', stored.message)
  // May indicate database issue vs connectivity
}
```

### Issue: Inconsistent Volume Readings After Changes

**Symptoms**:
- Set volume to 50%, but getVolumeState() returns different value
- Rounding issues (input 33.33, get back 33 or 34)

**Causes**:
1. Rounding differences (expected - API uses 2 decimals)
2. Delay in backend applying change
3. Other components changing volume simultaneously
4. Stale response data

**Solutions**:
```typescript
// Account for rounding
const targetPercentage = 33.33
const response = await volumeApi.setVolumeLevel(targetPercentage)
// Backend received: 33.33 (rounded to 2 decimals)

// Wait for backend to apply then verify
const setResult = await volumeApi.setVolumeLevel(50)
if (setResult?.success) {
  // Give backend time to update
  await new Promise(r => setTimeout(r, 100))
  
  // Verify the change
  const state = await volumeApi.getVolumeState()
  console.log('Current volume:', state?.percentage)
}

// Handle concurrent changes
// Only last change wins - other concurrent changes may be overwritten
```

### Issue: "Unknown error occurred" Message

**Symptoms**:
- Headphone API returns `{status: 'error', message: 'Unknown error occurred'}`
- No additional context about actual error

**Causes**:
1. Non-Error exception thrown (not an Error object)
2. JSON parse failed without Error object
3. Backend returned non-JSON response

**Solutions**:
```typescript
// Check browser console for actual error
// The error message is logged before returning

// Inspect network response
// In browser DevTools Network tab:
// - Check API endpoint responding
// - Check response Content-Type
// - Check response body is valid JSON

// If network issue, might see:
// - Network error: "Unknown error occurred"
// - Timeout: "Connection timeout"
// - Parse error: "Unexpected token..." (usually not shown)
```

### Issue: Input Validation Rejects Valid Input

**Symptoms**:
- `setVolumeLevel(50.5)` returns null
- `increaseVolume(0.1)` returns null
- Error messages about "out of range"

**Causes**:
1. Input value outside 0-100 range
2. Input is NaN or Infinity
3. Input is negative (for increase/decrease amount)

**Solutions**:
```typescript
// Check input before calling
function ensureValidVolume(percentage: number): boolean {
  if (!Number.isFinite(percentage)) {
    console.error('Invalid input: not a finite number')
    return false
  }
  if (percentage < 0 || percentage > 100) {
    console.error('Invalid input: out of range 0-100')
    return false
  }
  return true
}

// For increase/decrease, amount must be positive
function ensureValidAmount(amount: number): boolean {
  if (!Number.isFinite(amount)) {
    console.error('Invalid amount: not a finite number')
    return false
  }
  if (amount <= 0 || amount > 100) {
    console.error('Invalid amount: must be positive and ≤100')
    return false
  }
  return true
}

// Use before calling
if (ensureValidVolume(userInput)) {
  await volumeApi.setVolumeLevel(userInput)
}
```

## Examples

### Complete Volume Control Workflow

```typescript
import * as volumeApi from '@/api/volume'

async function initializeVolumeUI() {
  // 1. Check if volume control is available
  const info = await volumeApi.getVolumeInfo()
  if (!info?.available) {
    renderNoVolumeControls()
    return
  }

  // 2. Get current volume state
  const state = await volumeApi.getVolumeState()
  if (!state) {
    renderVolumeUnavailable()
    return
  }

  // 3. Initialize UI with current volume
  const currentPercentage = state.percentage
  renderVolumeSlider(currentPercentage)
  renderMuteButton(state.percentage === 0)
}

async function handleVolumeChange(newPercentage: number) {
  // Validate input
  if (newPercentage < 0 || newPercentage > 100) {
    showError('Volume must be 0-100')
    return
  }

  // Set volume
  const result = await volumeApi.setVolumeLevel(newPercentage)
  if (result === null) {
    showError('Failed to change volume. Please try again.')
    return
  }

  // Update UI
  updateVolumeDisplay(result.new_state?.percentage)
  showSuccess('Volume changed')
}

async function handleMuteClick() {
  const result = await volumeApi.toggleMute()
  if (result === null) {
    showError('Failed to toggle mute')
    return
  }

  updateMuteIcon(result.new_state?.percentage === 0)
  showSuccess('Mute toggled')
}

async function increaseVolumeByStep() {
  const result = await volumeApi.increaseVolume(5) // Increase by 5%
  if (result === null) {
    showError('Failed to increase volume')
    return
  }

  updateVolumeDisplay(result.new_state?.percentage)
}

async function decreaseVolumeByStep() {
  const result = await volumeApi.decreaseVolume(5) // Decrease by 5%
  if (result === null) {
    showError('Failed to decrease volume')
    return
  }

  updateVolumeDisplay(result.new_state?.percentage)
}
```

### Headphone Volume Management

```typescript
import * as volumeApi from '@/api/volume'

async function initializeHeadphoneVolume() {
  // 1. Get available controls
  const controls = await volumeApi.getHeadphoneControls()
  if (controls.status === 'error') {
    console.error('Cannot get controls:', controls.message)
    renderHeadphoneUnavailable()
    return
  }

  // 2. Restore previously saved volume
  const restored = await volumeApi.restoreHeadphoneVolume()
  if (restored.status === 'error') {
    console.warn('Could not restore volume:', restored.message)
  }

  // 3. Get current volume
  const current = await volumeApi.getHeadphoneVolume()
  if (current.status === 'success' && current.data) {
    renderHeadphoneVolumeSlider(current.data.volume)
  } else {
    renderHeadphoneError(current.message)
  }
}

async function setHeadphoneVolume(newVolume: number) {
  // Validate input
  if (!Number.isFinite(newVolume) || newVolume < 0 || newVolume > 100) {
    showError('Headphone volume must be 0-100')
    return
  }

  // Set volume
  const result = await volumeApi.setHeadphoneVolume(newVolume)
  if (result.status === 'error') {
    showError(`Failed to set headphone volume: ${result.message}`)
    return
  }

  // Store for next startup
  const stored = await volumeApi.storeHeadphoneVolume()
  if (stored.status === 'error') {
    showWarning(`Volume set but not saved: ${stored.message}`)
  } else {
    showSuccess('Headphone volume changed and saved')
  }

  // Update UI
  updateHeadphoneVolumeDisplay(newVolume)
}

async function handleHeadphoneVolumeChanged(newVolume: number) {
  // Debounced from slider
  await setHeadphoneVolume(newVolume)
}
```

### Error Recovery Patterns

```typescript
async function getVolumeWithFallback(): Promise<number> {
  // Try main volume
  const state = await volumeApi.getVolumeState()
  if (state !== null) {
    return state.percentage
  }

  // Try headphone volume as fallback
  const headphone = await volumeApi.getHeadphoneVolume()
  if (headphone.status === 'success' && headphone.data?.volume) {
    console.log('Using headphone volume as fallback')
    return headphone.data.volume
  }

  // No volume available
  console.error('Unable to read volume')
  return 50 // Default fallback
}

async function setVolumeWithFallback(percentage: number): Promise<boolean> {
  // Try main volume
  const result = await volumeApi.setVolumeLevel(percentage)
  if (result !== null) {
    return true
  }

  // Try headphone volume as fallback
  const headphoneResult = await volumeApi.setHeadphoneVolume(Math.round(percentage))
  if (headphoneResult.status === 'success') {
    console.log('Set volume via headphone control')
    return true
  }

  // Both failed
  return false
}

async function ensureHeadphoneVolumeSaved(): Promise<boolean> {
  // Try to store volume
  const result = await volumeApi.storeHeadphoneVolume()
  if (result.status === 'success') {
    return true
  }

  // Log error but don't fail
  console.warn('Could not save headphone volume:', result.message)
  return false
}
```

### API Testing Patterns

```typescript
// Test helper to validate volume is actually applied
async function testVolumeChange(targetPercentage: number): Promise<boolean> {
  const result = await volumeApi.setVolumeLevel(targetPercentage)
  if (result === null) {
    console.error('Failed to set volume')
    return false
  }

  // Give server time to update
  await new Promise(r => setTimeout(r, 100))

  // Verify volume was set
  const state = await volumeApi.getVolumeState()
  if (!state) {
    console.error('Cannot verify volume')
    return false
  }

  // Account for rounding (API uses 2 decimals)
  const expectedRounded = Math.round(targetPercentage * 100) / 100
  const difference = Math.abs(state.percentage - expectedRounded)
  
  if (difference < 0.01) {
    console.log(`✓ Volume correctly set to ${state.percentage}%`)
    return true
  } else {
    console.error(`✗ Volume mismatch: sent ${targetPercentage}, got ${state.percentage}`)
    return false
  }
}
```

---

## Summary

The Volume API provides two integrated control systems:

1. **Volume Control API** - Simple null-based error handling for graceful degradation
2. **Headphone Volume API** - Status objects with detailed error information

Both APIs include comprehensive input validation, proper HTTP status handling, and are designed to handle errors gracefully while providing useful diagnostic information for troubleshooting.

For detailed implementation examples and current test coverage, see `src/api/__tests__/volume.test.ts` (113 comprehensive tests).

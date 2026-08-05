# BluetoothSettings Component

**Location**: [src/components/BluetoothSettings.vue](src/components/BluetoothSettings.vue)  
**Test Files**: [src/components/__tests__/BluetoothSettings.test.ts](src/components/__tests__/BluetoothSettings.test.ts), [src/components/BluetoothSettings/__tests__/BluetoothSettingsModal.test.ts](src/components/BluetoothSettings/__tests__/BluetoothSettingsModal.test.ts)  
**Type**: Vue 3 Composition API Component (`<script setup>`)  
**Language**: TypeScript  
**Statistics**: 294 lines | Template: 24 lines | Script: 246 lines | Styles: 24 lines

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Component Architecture](#component-architecture)
4. [Props & Emits](#props--emits)
5. [Template Structure](#template-structure)
6. [Script Functions & Methods](#script-functions--methods)
7. [Store Integration](#store-integration)
8. [Reactive State](#reactive-state)
9. [API Integration](#api-integration)
10. [Countdown System](#countdown-system)
11. [Modal Integration](#modal-integration)
12. [Error Handling](#error-handling)
13. [Design Patterns](#design-patterns)
14. [Testing](#testing)
15. [Usage Examples](#usage-examples)
16. [Troubleshooting](#troubleshooting)

---

## Overview

**Purpose**: BluetoothSettings provides a comprehensive interface for managing Bluetooth pairing settings on the HifiBerry device. It enables users to toggle discovery mode (pairing mode) with automatic timeout management and configure pairing authentication methods.

**Key Features**:
- Enable/disable discoverable mode with countdown timer
- Automatic timeout after 60 seconds or manual reset
- Pairing authentication mode selection (KeyboardOnly vs NoInputNoOutput)
- Backend synchronization with error handling
- Modal integration for pairing feedback
- Responsive design with proper visual feedback

**Dependencies**:
- Vue 3 Composition API with `<script setup>`
- Pinia stores (`useAppConfigStore`, `useToastStore`)
- HTTP client (`apiFetch`)
- Child components: `ContentBox`, `BluetoothSettingsModal`, `ToggleSwitch`

---

## Features

### 1. Discoverable Mode Toggle
- Enables/disables Bluetooth discovery for pairing
- Starts automatic 60-second countdown when enabled
- Shows countdown timer that users can click to reset
- Automatically stops discovery when countdown reaches zero
- Persists state to backend API

### 2. Countdown Management
- 60-second countdown displayed when discovery is enabled
- Countdown decrements every second
- Click countdown to reset to 60 seconds (guard: only works when active)
- Automatically stops discovery and updates backend when countdown reaches zero
- Prevents multiple intervals from running concurrently

### 3. Pairing Authentication
- Toggle between two pairing modes:
  - **KeyboardOnly**: Enables PIN/passkey pairing
  - **NoInputNoOutput**: Disables PIN pairing (open pairing)
- Validates capability value before updating
- Provides user feedback on failures

### 4. Modal Integration
- Polls backend modal API every second during countdown
- Shows modal when backend returns `true` or `'true'`
- Handles both boolean and string responses
- Stops polling after modal is shown
- Continues polling even if API errors occur (silent failure)

### 5. Error Handling
- Graceful error handling on all API calls
- User feedback via toast notifications
- Prevents state updates on API failures
- Continues operation even on transient errors

---

## Component Architecture

### Template Structure

```
ContentBox
└── div.bluetooth-settings-div
    ├── div.bluetooth-settings-pairs-div (Enable pairing)
    │   ├── p "Enable pairing"
    │   └── div.toggle-container
    │       ├── span.countdown (conditional, when active)
    │       └── ToggleSwitch (discoverable)
    ├── div.bluetooth-settings-pairs-div (Pairing with password)
    │   ├── p "Pairing with password"
    │   └── div.toggle-container
    │       └── ToggleSwitch (capability)
    └── BluetoothSettingsModal (v-model:open)
```

---

## Props & Emits

### Props
This component does not accept any props. All configuration is derived from Pinia stores and backend API responses.

### Emits
This component does not emit any events. All state changes are managed through the component's internal state and store methods.

---

## Template Structure

### Discoverable Toggle Section
```vue
<div class="bluetooth-settings-pairs-div">
  <p>Enable pairing</p>
  <div class="toggle-container">
    <span v-if="discoverable && isCountdownActive" @click="resetCountdown" class="countdown" title="Click to reset timer">
      {{ discoverableCountdown }}s
    </span>
    <ToggleSwitch :model-value="discoverable" @update:model-value="toggleDiscoverable" />
  </div>
</div>
```

**Behavior**:
- Shows countdown timer only when both `discoverable` and `isCountdownActive` are true
- Countdown is clickable and shows "Click to reset timer" tooltip
- Toggle switch reflects current `discoverable` state
- Updates call `toggleDiscoverable()` function

### Pairing Password Toggle Section
```vue
<div class="bluetooth-settings-pairs-div">
  <p>Pairing with password</p>
  <div class="toggle-container">
    <ToggleSwitch :model-value="capability === 'KeyboardOnly'" @update:model-value="togglePairingWithPassword" />
  </div>
</div>
```

**Behavior**:
- Shows toggle state based on whether capability is 'KeyboardOnly'
- Updates call `togglePairingWithPassword()` function
- No visual countdown for this setting

---

## Script Functions & Methods

### Lifecycle Hooks

#### `onMounted()`
Fetches initial Bluetooth settings from backend on component mount.

**Behavior**:
- Calls `GET /bluetooth/settings` API
- Validates response structure (requires `data.capability` and `data.discoverable`)
- Sets `capability` and `discoverable` refs from response
- Starts countdown if `discoverable` is true
- Shows error toast on failure

**Error Handling**:
- Catches HTTP errors (non-200 status codes)
- Catches JSON parsing errors
- Catches invalid response structure errors
- Logs errors to console

```typescript
onMounted(async () => {
  try {
    const response = await apiFetch(`${apiBaseUrl}/bluetooth/settings`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    
    // Validate response structure
    if (!data || !data.data || typeof data.data.capability !== 'string' || typeof data.data.discoverable !== 'boolean') {
      throw new Error('Invalid response structure from bluetooth settings API')
    }
    
    capability.value = data.data.capability
    discoverable.value = data.data.discoverable
    
    if (discoverable.value) {
      startCountdown()
    }
  } catch (error) {
    console.error('Failed to fetch bluetooth config:', error)
    toastStore.showErrorToast('Failed to fetch bluetooth config.')
  }
})
```

#### `onUnmounted()`
Cleans up countdown interval when component is destroyed.

**Behavior**:
- Calls `stopCountdown()` to clear interval
- Prevents memory leaks from running intervals

---

### Core Functions

#### `updateSetting(key: string, newValue: boolean | number | string): Promise<boolean>`
Updates a Bluetooth setting via the backend API.

**Parameters**:
- `key` (string): Setting name (e.g., 'discoverable', 'capability', 'discoverable_timeout')
- `newValue` (boolean | number | string): New value to set

**Returns**:
- `Promise<boolean>`: `true` on success, `false` on failure

**Behavior**:
- Converts boolean values to lowercase strings ('true'/'false')
- Preserves string and number values as-is
- Makes POST request to `/bluetooth/settings?{key}={value}`
- Parses JSON response (but doesn't use it)
- Returns success status without throwing

**Error Handling**:
- Catches HTTP errors (logs to console)
- Catches network errors (logs to console)
- Never throws; always returns boolean

```typescript
async function updateSetting(key: string, newValue: boolean | number | string): Promise<boolean> {
  const valueString = typeof newValue === 'boolean' ? String(newValue).toLowerCase() : newValue
  const url = `${apiBaseUrl}/bluetooth/settings?${key}=${valueString}`

  try {
    const response = await apiFetch(url, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    await response.json()
    return true
  } catch (error) {
    console.error('Failed to update setting:', error)
    return false
  }
}
```

#### `startCountdown()`
Initiates the discoverable countdown and modal polling.

**Behavior**:
- Sets `isCountdownActive` to true
- Initializes countdown to 60 seconds
- Updates backend with `discoverable_timeout=60`
- Enables modal polling flag (`modalShouldRequest = true`)
- Clears any existing countdown interval
- Creates new interval that:
  - Decrements countdown every second
  - Polls modal API every second (if `modalShouldRequest` is true)
  - Stops discovery and updates backend when countdown reaches zero
  - Clears interval when complete

**Interval Logic**:
- Runs every 1000ms (1 second)
- While `discoverableCountdown > 0`:
  - Decrements counter
  - Calls `showModalIfTrue()` if polling enabled
- When countdown reaches 0:
  - Calls `stopCountdown()`
  - Sets `discoverable = false`
  - Updates backend
  - Closes modal

```typescript
function startCountdown() {
  isCountdownActive.value = true
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)
  modalShouldRequest.value = true

  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  countdownInterval.value = window.setInterval(() => {
    if (discoverableCountdown.value > 0) {
      discoverableCountdown.value--
      if (modalShouldRequest.value === true && isCountdownActive.value) {
        showModalIfTrue()
      }
    } else {
      stopCountdown()
      discoverable.value = false
      updateSetting('discoverable', false)
      modalOpen.value = false
    }
  }, 1000)
}
```

#### `stopCountdown()`
Stops the countdown interval and cleanup.

**Behavior**:
- Sets `isCountdownActive` to false
- Clears the interval if it exists
- Prevents interval from continuing after component unmount

```typescript
function stopCountdown() {
  isCountdownActive.value = false
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
}
```

#### `showModalIfTrue()`
Polls backend modal API and shows modal if backend indicates it should be shown.

**Behavior**:
- Calls `GET /bluetooth/modal` API
- Accepts both boolean `true` and string `'true'` responses
- Sets `modalOpen = true` and stops polling if modal should be shown
- Silently continues on errors (to avoid spam during countdown polling)

**Error Handling**:
- Catches HTTP errors
- Catches network errors
- Does NOT show error toast (intentional to avoid spam)
- Continues polling even on error

```typescript
async function showModalIfTrue() {
  try {
    const response = await apiFetch(`${apiBaseUrl}/bluetooth/modal`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()

    const shouldShowModal = data.modal === true || data.modal === 'true'
    if (shouldShowModal) {
      modalOpen.value = true
      modalShouldRequest.value = false
    }
  } catch (error) {
    console.error('Failed to fetch bluetooth modal:', error)
  }
}
```

#### `toggleDiscoverable()`
Toggles discoverable mode and synchronizes with backend.

**Behavior**:
- Inverts current `discoverable` state
- Attempts to update backend via `updateSetting()`
- Only updates UI state if backend update succeeds
- Starts countdown if new state is true
- Stops countdown if new state is false
- Shows error toast if update fails

**Error Handling**:
- Shows error toast if API fails
- Reverts UI state changes if backend fails
- Catches any unexpected exceptions

```typescript
async function toggleDiscoverable() {
  const newState = !discoverable.value

  try {
    const success = await updateSetting('discoverable', newState)
    if (!success) {
      toastStore.showErrorToast('Failed to toggle discoverable state.')
      return
    }

    discoverable.value = newState
    if (newState) startCountdown()
    else stopCountdown()
  } catch (error) {
    console.error('Failed to toggle discoverable state:', error)
  }
}
```

#### `togglePairingWithPassword()`
Toggles pairing authentication mode (KeyboardOnly ↔ NoInputNoOutput).

**Behavior**:
- Validates current capability is in allowed list
- Toggles between 'KeyboardOnly' and 'NoInputNoOutput'
- Attempts to update backend via `updateSetting()`
- Only updates UI state if backend update succeeds
- Shows error toast if validation or update fails

**Allowed Capabilities**:
- `'NoInputNoOutput'`: Open pairing without PIN
- `'KeyboardOnly'`: PIN/passkey pairing

**Error Handling**:
- Validates capability before attempting toggle
- Shows error toast on validation failure
- Shows error toast if API fails
- Prevents invalid capability values from being sent to backend

```typescript
async function togglePairingWithPassword() {
  try {
    const validCapabilities = ['NoInputNoOutput', 'KeyboardOnly']
    if (!validCapabilities.includes(capability.value)) {
      console.error(`Invalid capability value: ${capability.value}`)
      toastStore.showErrorToast('Invalid pairing capability setting.')
      return
    }

    const newCapability = capability.value === 'NoInputNoOutput' ? 'KeyboardOnly' : 'NoInputNoOutput'
    const success = await updateSetting('capability', newCapability)
    if (!success) {
      toastStore.showErrorToast('Failed to toggle pairing with password.')
      return
    }

    capability.value = newCapability
  } catch (error) {
    console.error('Failed to toggle pairing with password:', error)
  }
}
```

#### `resetCountdown()`
Manually resets the countdown timer back to 60 seconds.

**Behavior**:
- Only works if countdown is active AND discoverable is enabled (guard clause)
- Resets countdown value to 60
- Updates backend with new timeout value
- Does not restart the interval (continues from where it was)

**Guards**:
- Requires `isCountdownActive` to be true
- Requires `discoverable` to be true
- Returns silently if guards fail

```typescript
function resetCountdown() {
  if (!isCountdownActive.value || !discoverable.value) {
    return
  }
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)
}
```

---

## Store Integration

### useAppConfigStore
Used to retrieve the base API URL for all Bluetooth settings API calls.

**Methods Used**:
- `getConfigApiBaseUrl()`: Returns the configured API base URL (e.g., 'http://api.test')

### useToastStore
Used to display error messages to the user when API operations fail.

**Methods Used**:
- `showErrorToast(message: string)`: Shows an error notification with the provided message

---

## Reactive State

### Refs

| Name | Type | Initial Value | Purpose |
|------|------|---------------|---------|
| `discoverable` | `Ref<boolean>` | `false` | Current discoverable mode state |
| `discoverableCountdown` | `Ref<number>` | `60` | Current countdown value in seconds |
| `countdownInterval` | `Ref<number \| null>` | `null` | Interval ID for countdown timer |
| `isCountdownActive` | `Ref<boolean>` | `false` | Whether countdown is currently running |
| `modalOpen` | `Ref<boolean>` | `false` | Whether modal should be displayed |
| `modalShouldRequest` | `Ref<boolean>` | `false` | Whether to continue polling modal API |
| `capability` | `Ref<string>` | `'KeyboardOnly'` | Current pairing authentication mode |

---

## API Integration

### Backend Endpoints

#### Get Bluetooth Settings
```
GET /bluetooth/settings
```

**Response**:
```json
{
  "data": {
    "capability": "KeyboardOnly",
    "discoverable": false
  }
}
```

**Response Validation**:
- `data` object must exist
- `data.capability` must be a string
- `data.discoverable` must be a boolean

#### Update Bluetooth Settings
```
POST /bluetooth/settings?{key}={value}
```

**Parameters**:
- `key`: Setting name (e.g., 'discoverable', 'capability', 'discoverable_timeout')
- `value`: New value (URL-encoded)

**Supported Settings**:
- `discoverable`: boolean (sent as 'true'/'false')
- `capability`: string ('KeyboardOnly' or 'NoInputNoOutput')
- `discoverable_timeout`: number (seconds, typically 0-60)

**Response**:
```json
{}
```

#### Check Modal State
```
GET /bluetooth/modal
```

**Response**:
```json
{
  "modal": true
}
```

**Response Variations**:
- Boolean: `{"modal": true}` or `{"modal": false}`
- String: `{"modal": "true"}` or `{"modal": "false"}`

---

## Countdown System

### How It Works

1. **Activation**: When user toggles discoverable to true or component mounts with discoverable=true
2. **Initialization**: Sets countdown to 60, enables modal polling, clears existing interval
3. **Polling**: Every second, decrements countdown and polls modal API
4. **Reset**: User can click countdown display to reset to 60 seconds
5. **Timeout**: When countdown reaches 0, automatically disables discoverable
6. **Cleanup**: Stops interval when countdown ends or user disables discoverable

### Countdown Display
- Only visible when `discoverable && isCountdownActive`
- Shows remaining seconds as "Xs" (e.g., "45s")
- Clickable with hover effect
- Tooltip: "Click to reset timer"

### Modal Polling
- Runs every second during countdown
- Only runs if `modalShouldRequest` is true
- Stops after modal is shown (sets `modalShouldRequest = false`)
- Can resume if user resets countdown

---

## Modal Integration

### Modal Component
- Uses `BluetoothSettingsModal` component (v-model:open)
- Receives `modalOpen` ref for open/close state
- Modal content is defined in separate component

### Polling Behavior
- Starts polling when countdown starts
- Polls every second via `showModalIfTrue()`
- Stops polling once modal is shown
- Errors during polling are silent (don't show toast)
- Modal closes automatically when countdown reaches zero

---

## Error Handling

### API Error Patterns

#### Mount Errors
- **Type**: Failed to fetch initial settings
- **Handling**: Logs error, shows error toast, component continues with defaults
- **Default State**: `discoverable=false`, `capability='KeyboardOnly'`

#### Toggle Errors
- **Type**: Failed to update discoverable or capability
- **Handling**: Shows error toast, reverts UI state
- **Result**: User sees error and current state unchanged

#### Modal Polling Errors
- **Type**: Failed to fetch modal state
- **Handling**: Logs error, SILENT (no toast), continues polling
- **Reason**: Prevents error spam during 60-second countdown

### Error Messages

| Scenario | Message |
|----------|---------|
| Failed to fetch initial settings | "Failed to fetch bluetooth config." |
| Failed to toggle discoverable | "Failed to toggle discoverable state." |
| Failed to toggle capability | "Failed to toggle pairing with password." |
| Invalid capability value | "Invalid pairing capability setting." |

### Guard Clauses

#### resetCountdown Guard
```typescript
if (!isCountdownActive.value || !discoverable.value) {
  return // Silent return, no error
}
```

#### togglePairingWithPassword Validation
```typescript
const validCapabilities = ['NoInputNoOutput', 'KeyboardOnly']
if (!validCapabilities.includes(capability.value)) {
  // Shows error and returns
}
```

---

## Design Patterns

### 1. Optimistic vs Pessimistic Updates
**Pattern**: Pessimistic updates (wait for backend before updating UI)

```typescript
const success = await updateSetting('discoverable', newState)
if (!success) {
  // Show error, don't update UI
  return
}
// Only update UI on success
discoverable.value = newState
```

**Rationale**: Ensures UI always reflects actual backend state

### 2. Silent Error Handling
**Pattern**: Modal polling errors don't show toast

```typescript
// In showModalIfTrue()
catch (error) {
  console.error('Failed to fetch bluetooth modal:', error)
  // Don't show error toast - intentionally silent
}
```

**Rationale**: Prevents error spam during countdown

### 3. Guard Clauses
**Pattern**: Validate state before performing actions

```typescript
// In resetCountdown()
if (!isCountdownActive.value || !discoverable.value) {
  return
}
```

**Rationale**: Prevents invalid state transitions

### 4. Interval Cleanup
**Pattern**: Clear existing interval before creating new one

```typescript
if (countdownInterval.value) {
  clearInterval(countdownInterval.value)
}
countdownInterval.value = window.setInterval(...)
```

**Rationale**: Prevents multiple intervals from running simultaneously

### 5. Capability Toggle Logic
**Pattern**: Simple boolean-like toggle between two enum values

```typescript
const newCapability = capability.value === 'NoInputNoOutput' 
  ? 'KeyboardOnly' 
  : 'NoInputNoOutput'
```

**Rationale**: Simple, readable, symmetric toggle

---

## Testing

### Test File Location
[src/components/__tests__/BluetoothSettings.test.ts](src/components/__tests__/BluetoothSettings.test.ts)

### Related Modal Test File
[src/components/BluetoothSettings/__tests__/BluetoothSettingsModal.test.ts](src/components/BluetoothSettings/__tests__/BluetoothSettingsModal.test.ts)

### Test Coverage

#### Mount & Initialization (7 tests)
- Fetches initial settings on mount
- Sets state from API response
- Starts countdown if discoverable=true
- Handles invalid response structure
- Handles missing data fields
- Handles HTTP 500 errors
- Handles HTTP 404 errors

#### Rendering (4 tests)
- Renders two toggle switches
- Doesn't render countdown when disabled
- Renders countdown when active
- Has proper CSS classes

#### Countdown Functionality (4 tests)
- Starts at 60 seconds
- Decrements every second
- Stops at zero
- Sets discoverable=false at zero

#### Reset Countdown (2 tests)
- Resets to 60 when clicked
- Doesn't reset when inactive

#### Discoverable Toggle (5 tests)
- Toggles to true
- Toggles to false
- Starts countdown when enabled
- Stops countdown when disabled
- Shows error toast on API failure

#### Capability Toggle (3 tests)
- Toggles from KeyboardOnly to NoInputNoOutput
- Toggles from NoInputNoOutput to KeyboardOnly
- Shows error on invalid capability

#### Modal Polling Integration
- Modal polling endpoint calls are covered through countdown behavior tests in the parent component suite.
- Detailed modal behavior and submission flows are covered in the dedicated modal suite.

#### BluetoothSettingsModal Component (8 tests)
- Renders only when open
- Sanitizes passkey input to 6 numeric digits
- Disables enter until passkey is valid
- Clears passkey and emits close event
- Submits passkey payload on success
- Keeps modal open on non-ok response
- Keeps modal open on request rejection
- Prevents requests for invalid-length passkeys

#### Cleanup (1 test)
- Clears interval on unmount

#### API Tests (2 tests)
- Formats boolean as lowercase string
- Passes strings without modification

#### Edge Cases (3 tests)
- Handles rapid toggle clicks
- Handles network timeout
- Handles concurrent countdown and modal changes

### Mock Setup

```typescript
vi.mock('@/api/http')                                    // Mock HTTP client
vi.mock('@/stores/appconfig')                            // Mock config store
vi.mock('@/stores/toast')                                // Mock toast store
vi.mock('@/components/BluetoothSettings/BluetoothSettingsModal.vue') // Mock modal
vi.mock('@/components/ToggleSwitch.vue')                 // Mock toggles
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run this component's tests only
pnpm test src/components/__tests__/BluetoothSettings.test.ts

# Run the modal component tests only
pnpm test src/components/BluetoothSettings/__tests__/BluetoothSettingsModal.test.ts

# Run with coverage
pnpm test:coverage
```

---

## Usage Examples

### Basic Usage
The component requires no props and handles all its own state:

```vue
<template>
  <BluetoothSettings />
</template>

<script setup lang="ts">
import BluetoothSettings from '@/components/BluetoothSettings.vue'
</script>
```

### Within a Settings Page
```vue
<template>
  <div class="settings-page">
    <h1>Bluetooth Settings</h1>
    <BluetoothSettings />
    <OtherSettings />
  </div>
</template>

<script setup lang="ts">
import BluetoothSettings from '@/components/BluetoothSettings.vue'
import OtherSettings from '@/components/OtherSettings.vue'
</script>
```

### Expected User Workflow
1. User sees "Enable pairing" toggle (currently off)
2. User clicks toggle to enable pairing
3. 60-second countdown appears with "Click to reset timer" tooltip
4. Countdown decrements every second
5. User can click countdown to reset to 60 seconds
6. When countdown reaches 0, pairing is automatically disabled
7. User can toggle "Pairing with password" to switch authentication modes

---

## Troubleshooting

### Issue: Countdown not starting when discoverable is enabled

**Possible Causes**:
- Backend returned `discoverable=false` in response
- Mount error prevented initial settings load
- Interval not created properly

**Debug Steps**:
1. Check browser console for errors
2. Check `isCountdownActive` ref value
3. Verify backend returned `discoverable=true`
4. Check network tab for failed API calls

### Issue: Modal never appears during countdown

**Possible Causes**:
- Backend modal endpoint not responding
- Backend never returns `modal: true`
- `modalShouldRequest` set to false

**Debug Steps**:
1. Manually check `/bluetooth/modal` endpoint in browser
2. Verify backend is returning `{"modal": true}`
3. Check browser console for polling errors
4. Verify countdown is running (should show countdown display)

### Issue: Error toast spam during countdown

**This is intentional** - modal polling errors are silent to prevent spam. Other errors will show toasts.

### Issue: Countdown resets immediately after clicking

**Possible Causes**:
- Guard clause preventing reset (countdown not active or not discoverable)
- API call to update timeout failed

**Debug Steps**:
1. Verify `isCountdownActive` is true
2. Verify `discoverable` is true
3. Check network tab for `/bluetooth/settings?discoverable_timeout=60`

### Issue: Capability toggle shows error but backend state changed

**Possible Causes**:
- API succeeded but returned error response code
- Frontend and backend out of sync

**Recovery**:
1. Refresh the page to reload settings from backend
2. Check backend logs for actual setting state

### Issue: Component continues polling after unmount

**Possible Causes**:
- `onUnmounted()` hook not called
- Interval not properly cleared

**Debug Steps**:
1. Check browser DevTools to verify component unmounted
2. Verify no ongoing network requests
3. Check if modal polling requests continue

---

## Related Components

- [BluetoothDevices.vue](bluetooth-devices.md) - Device connection management
- [BluetoothDeviceEntry.vue](bluetooth-device-entry.md) - Individual device representation
- [Bluetooth Settings Modal](bluetooth-settings-modal.md) - Passkey modal behavior, API contract, and dedicated regression tests
- [ContentBox.vue](src/components/ContentBox.vue) - Container component
- [ToggleSwitch.vue](src/components/ToggleSwitch.vue) - Toggle input component

---

## Backend Integration Notes

This component integrates with the hbos-bluetooth-service via the config-server. For complete API details and available capabilities, see:

- [hbos-bluetooth-service GitHub](https://github.com/arcathrax/hbos-bluetooth-service)
- Backend API documentation in respective service repositories

### Common Capability Values

Refer to hbos-bluetooth-service documentation for complete list. Common values:
- `NoInputNoOutput`: No PIN/passkey required
- `KeyboardOnly`: PIN/passkey required (currently supported)
- Other values exist but are less common on this device


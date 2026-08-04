# BluetoothDeviceEntry Component

## Overview

The `BluetoothDeviceEntry` component is a Vue 3 Single File Component (SFC) that displays and manages individual Bluetooth device entries within the Bluetooth device management interface. It provides visual feedback about connection and trust status, and enables users to unpair devices from the system.

## Purpose

This component serves as a reusable list item for displaying Bluetooth device information and providing device management controls. It is typically used within a parent component (such as `BluetoothDevices`) that manages a collection of paired Bluetooth devices.

## Component Location

- **File**: `src/components/BluetoothDeviceEntry.vue`
- **Tests**: `src/components/__tests__/BluetoothDeviceEntry.test.ts`
- **Documentation**: `docs/bluetooth-device-entry.md`

## Props

### `name` (String, Required)
- **Type**: `string`
- **Description**: The display name of the Bluetooth device
- **Example**: `"My Bluetooth Speaker"`
- **Notes**: 
  - Supports special characters and long names
  - Names are rendered with underline styling in the header
  - Characters are automatically wrapped with `word-break: break-word`

### `address` (String, Required)
- **Type**: `string`
- **Description**: The MAC address of the Bluetooth device
- **Format**: Standard Bluetooth MAC address format (e.g., `00:11:22:33:44:55`)
- **Notes**:
  - Used as the unique identifier for unpair operations
  - Automatically URL-encoded when sent to the API to handle special characters

### `connected` (Boolean, Required)
- **Type**: `boolean`
- **Description**: Indicates whether the device is currently connected
- **Values**:
  - `true`: Device is connected, displays "Connected" badge with green styling
  - `false`: Device is disconnected, displays "Disconnected" badge with gray styling
- **Notes**: Reactive - updates the UI when the prop changes

### `trusted` (Boolean, Required)
- **Type**: `boolean`
- **Description**: Indicates whether the device is trusted by the system
- **Values**:
  - `true`: Device is trusted, displays "Trusted" badge with blue styling
  - `false`: Device is untrusted, displays "Untrusted" badge with red styling
- **Notes**:
  - Reactive - updates the UI when the prop changes
  - Previously unused; now displayed in the device metadata section

### `onUpdate` (Function, Optional)
- **Type**: `() => void`
- **Description**: Callback function invoked when an unpair operation completes successfully
- **Usage**: Used by parent components to refresh the device list after an unpair action
- **Notes**:
  - Optional - component works without it
  - Only called on successful unpair operations
  - Called using optional chaining (`?.()`) for safety

## Events & Behaviors

### Unpair Action

**Trigger**: User clicks the "Unpair" button

**Process**:
1. User clicks the "Unpair" button
2. Component makes POST request to `/bluetooth/unpair?address={encodedAddress}`
3. System processes the unpair request
4. On success: Shows success toast and calls `onUpdate` callback
5. On failure: Shows error toast with error message

**API Endpoint**:
- **URL**: `{apiBaseUrl}/bluetooth/unpair?address={address}`
- **Method**: `POST`
- **Address Encoding**: URL-encoded to safely handle special characters

**Response Handling**:
- **Success** (HTTP 200-299):
  - Toast message: `"Device {address} unpaired successfully."`
  - Callback: `onUpdate()` is invoked
- **Error** (HTTP 400+):
  - Attempts to read `data.error` from response
  - Toast message: `"Failed to unpair: {errorMessage}"`
  - No callback invocation
- **Network Error**:
  - Toast message: `"Failed to unpair: {error message}"`
  - No callback invocation

## UI Structure

### Visual Hierarchy

```
┌─ Bluetooth Device Entry Container
│  ├─ Device Info Section
│  │  ├─ Device Name (h3)
│  │  └─ Device Metadata
│  │     ├─ Connection Status Badge
│  │     └─ Trust Status Badge
│  └─ Controls Section
│     └─ Unpair Button
```

### Status Badges

**Connection Status Badge** (`.status-badge`):
- **Connected State**:
  - Text: "Connected"
  - Color: Green (#22c55e)
  - Styling: Semi-transparent green background with border

- **Disconnected State**:
  - Text: "Disconnected"
  - Color: Gray (#6b7280)
  - Styling: Semi-transparent gray background with border

**Trust Status Badge** (`.trust-badge`):
- **Trusted State**:
  - Text: "TRUSTED" (uppercase)
  - Color: Blue (#3b82f6)
  - Styling: Semi-transparent blue background with border
  - Font size: 0.75rem (smaller than connection badge)

- **Untrusted State**:
  - Text: "UNTRUSTED" (uppercase)
  - Color: Red (#ef4444)
  - Styling: Semi-transparent red background with border
  - Font size: 0.75rem (smaller than connection badge)

### Unpair Button

- **Label**: "Unpair"
- **Style Classes**: `btn-action btn-disconnect`
- **Styling**: Uses `service-button-danger` mixin (red/danger styling)
- **Accessibility**: Includes `aria-label` attribute with device name
- **Interactivity**: Clickable to trigger unpair operation

## Styling Details

### Layout
- **Container**: Flexbox row with space-between alignment
- **Info Section**: Flex: 1 (takes available space)
- **Controls Section**: Flex: 0 (fixed width for button)
- **Gap**: 10px between sections

### Spacing
- **Padding**: 10px (increased from 5px for better visual breathing room)
- **Margin**: 5px
- **Border**: 2px solid secondary highlight color
- **Border Radius**: 5px

### Typography
- **Device Name**: Underlined heading (h3), supports word wrapping
- **Badges**: 
  - Connection badge: 0.875rem font size
  - Trust badge: 0.75rem font size (smaller)
  - All badges: font-weight 500-600

### Color Scheme
- Uses CSS custom properties for theme colors (`--highlight-color-secondary`)
- Badge colors use semantic color coding:
  - Green: Connected/Trusted
  - Gray: Disconnected
  - Blue: Trusted status
  - Red: Untrusted status

### Responsive Design
- **Flex Wrap**: Device metadata badges wrap on narrow screens
- **Word Break**: Device names break into multiple lines if too long
- **Gap Management**: 8px gap between metadata badges for proper spacing

## Integration Points

### Stores Used

**`appconfig` Store**:
- Method: `getConfigApiBaseUrl()`
- Purpose: Retrieves the API base URL for making unpair requests
- Example: `http://localhost:3000` or `https://api.example.com`

**`toast` Store**:
- Methods:
  - `showSuccessToast(message: string)`: Display success notification
  - `showErrorToast(message: string)`: Display error notification
- Purpose: Show user feedback for unpair operations

### API Integration

**HTTP API Fetch**:
- Function: `apiFetch(url, options)`
- Purpose: Make authenticated HTTP requests to the backend
- Usage: POST request to unpair endpoint

## Error Handling

### Error Types & Handling

1. **API Response Errors** (HTTP 400+):
   - Reads error message from `response.json().error`
   - Falls back to `"Unknown error occurred"` if error field missing
   - Displays in error toast

2. **Network Errors** (Connection failures, timeouts):
   - Caught by `catch` block
   - Error message extracted safely (instanceof check)
   - Displays in error toast

3. **JSON Parsing Errors**:
   - Handled by the `catch` block when `response.json()` fails
   - Error message displayed to user

### Safety Features

- **Optional Chaining**: `props.onUpdate?.()` safely calls callback only if provided
- **Type-Safe Error Extraction**: `err instanceof Error ? err.message : String(err)`
- **URL Encoding**: `encodeURIComponent()` for device address
- **Optional Property Access**: `data?.error || 'Unknown error occurred'`

## State Management

### Component State
- **No Internal State**: Component is stateless (presentational)
- **All Data**: Passed via props (reactive)
- **Side Effects**: Handled in `handleUnpair()` function

### Reactivity
- Updates occur when props change (via `setProps()`)
- Connection status reflects prop changes immediately
- Trust status reflects prop changes immediately
- Device name updates reactively

## Testing Coverage

### Test File Location
- `src/components/__tests__/BluetoothDeviceEntry.test.ts`

### Test Categories

1. **Rendering Tests** (7 tests):
   - Component mount and initialization
   - Device name display
   - Status badge styling (connected/disconnected)
   - Button presence and styling
   - CSS class structure

2. **Unpair Success Tests** (4 tests):
   - API endpoint called with correct address
   - Success toast displayed
   - `onUpdate` callback invoked
   - Callback optional handling

3. **Error Scenario Tests** (4 tests):
   - API error response handling
   - Network error handling
   - Failed unpair callback not invoked
   - Malformed JSON response handling

4. **Edge Cases** (6 tests):
   - Special characters in device address
   - Special characters in device name
   - Long device names
   - Trusted/untrusted states
   - Rapid multiple clicks

5. **Regression Tests** (4 tests):
   - State consistency across renders
   - Prop reactivity (connected status)
   - Prop reactivity (device name)
   - Component functionality after callback

6. **Integration Tests** (2 tests):
   - API base URL configuration
   - Complete unpair flow with callback

### Running Tests

```bash
# Run all tests
pnpm test

# Run BluetoothDeviceEntry tests only
pnpm test src/components/__tests__/BluetoothDeviceEntry.test.ts

# Run with coverage
pnpm run test:coverage
```

## Usage Examples

### Basic Usage
```vue
<BluetoothDeviceEntry
  name="My Speaker"
  address="00:11:22:33:44:55"
  :connected="true"
  :trusted="true"
/>
```

### With Callback
```vue
<BluetoothDeviceEntry
  name="My Speaker"
  address="00:11:22:33:44:55"
  :connected="true"
  :trusted="true"
  :on-update="refreshDeviceList"
/>
```

### In Parent Component (List)
```vue
<template>
  <div class="device-list">
    <BluetoothDeviceEntry
      v-for="device in devices"
      :key="device.address"
      :name="device.name"
      :address="device.address"
      :connected="device.connected"
      :trusted="device.trusted"
      :on-update="reloadDevices"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BluetoothDeviceEntry from '@/components/BluetoothDeviceEntry.vue'

interface BluetoothDevice {
  name: string
  address: string
  connected: boolean
  trusted: boolean
}

const devices = ref<BluetoothDevice[]>([])

const reloadDevices = async () => {
  // Fetch updated device list from API
}
</script>
```

## Key Improvements Made

### Version History

**Latest Version** (Current):
- Added `trusted` prop display with visual badge
- Renamed `handleDisconnect` to `handleUnpair` for semantic clarity
- Added URL encoding for device address in API calls
- Improved error message handling with fallback values
- Enhanced type-safe error extraction from errors
- Added accessibility improvements (aria-label on button)
- Improved styling:
  - Increased padding for better visual spacing
  - Added device metadata container with gap management
  - Enhanced badge styling with colors and borders
  - Improved responsive design with flex wrapping
  - Better typography hierarchy and spacing

**Fixes & Improvements**:
1. **Consistency**: Function naming now matches UI label ("handleUnpair" vs button "Unpair")
2. **Usability**: Trust status now visible at a glance for users
3. **Safety**: URL encoding prevents issues with special characters
4. **Robustness**: Better error handling with type-safe extraction
5. **Accessibility**: Added aria-label for screen readers
6. **Styling**: Improved visual hierarchy and spacing for better readability

## Related Components

- **Parent Component**: `BluetoothDevices.vue` - Lists all paired devices using this component
- **Related Settings**: `BluetoothSettings.vue` - Manages global Bluetooth settings
- **Toast Notifications**: `toast` store - Provides user feedback

## API Contract

### Backend Requirements

**Endpoint**: `POST /bluetooth/unpair`

**Query Parameters**:
- `address`: MAC address of device to unpair (URL-encoded)

**Success Response** (200-299):
```json
{
  "data": {}
}
```

**Error Response** (400+):
```json
{
  "error": "Error description"
}
```

## Performance Considerations

- **No Computed Properties**: All rendering is from props (very fast)
- **No Watchers**: No reactive side effects beyond prop updates
- **Single API Call**: One request per unpair action
- **Async Handling**: Uses async/await for clean promise handling

## Accessibility Features

- **Semantic HTML**: Uses appropriate heading levels (h3) and button elements
- **ARIA Labels**: Button includes `aria-label` with device name for screen readers
- **Color + Text**: Status badges use both color and text for indicator visibility
- **Keyboard Navigation**: Button is naturally keyboard-accessible via tab order

## Future Enhancement Ideas

1. **Confirmation Dialog**: Add confirmation before unpair with device name
2. **Loading State**: Show loading indicator on button during unpair request
3. **Disabled Button**: Disable button until unpair completes
4. **Device Details**: Expand to show additional device properties (battery, signal strength, etc.)
5. **Connect/Disconnect**: Add ability to connect/disconnect without unpairing
6. **Edit Name**: Allow editing custom device names
7. **Icon Support**: Add device type icons (speaker, headphone, etc.)
8. **Animations**: Add smooth transitions between connected/disconnected states

## Troubleshooting

### Common Issues

**Issue**: Unpair button not responding
- **Check**: Ensure `onUpdate` prop is optional and component handles both cases
- **Solution**: Verify API base URL is configured correctly

**Issue**: Device name not displaying
- **Check**: Verify `name` prop is passed and not empty
- **Solution**: Check component console for prop validation errors

**Issue**: Error toast shows generic error message
- **Check**: Backend API is returning error response without `error` field
- **Solution**: Ensure backend API follows response contract with error field

**Issue**: Device status not updating
- **Check**: Verify prop changes are triggering reactivity
- **Solution**: Use `setProps()` in parent component to update props

## See Also

- [BluetoothDevices Component](./bluetooth-devices.md)
- [BluetoothSettings Component](./bluetooth-settings.md)
- [Toast Store Documentation](./toast-store.md)
- [HTTP API Wrapper](./http-api-wrapper.md)

# Theaudiodb Component

## Overview

`Theaudiodb.vue` is a Vue 3 service status checker component that monitors the availability of the TheAudioDB API. TheAudioDB is an external service used to retrieve additional artist images and biographies. This component provides real-time status monitoring with a clean, accessible UI.

## Features

- **Automatic Health Checks**: Periodic service availability checks via API endpoint
- **Status Visualization**: Color-coded status badges (green = active, red = unavailable, yellow = checking)
- **Error Handling**: Comprehensive error reporting and user feedback
- **Loading States**: Clear visual indication of ongoing status checks
- **Accessibility**: ARIA labels, semantic HTML, and proper role attributes
- **Request Timeout**: Prevents indefinite hangs with configurable timeout (5 seconds default)
- **Abort Control**: Uses AbortController to clean up in-flight requests
- **Responsive Design**: Adapts to different screen sizes via parent ContentBox styling

## Props

### `title`
- **Type**: `string`
- **Default**: `'TheAudioDB'`
- **Description**: Display title for the service card

### `description`
- **Type**: `string`
- **Default**: `'TheAudioDB is used to retrieve additional artist images and biographies'`
- **Description**: Brief description of the service functionality

### `icon`
- **Type**: `string`
- **Default**: `'tabler/database'`
- **Description**: Icon identifier from the Icon component library

### `serviceKey`
- **Type**: `string`
- **Default**: `'theaudiodb'`
- **Description**: Key used for logging and error reporting purposes

## Component Data

### Reactive State

- **`isLoading`** (boolean): Whether a status check is currently in progress
- **`isAvailable`** (boolean): Current service availability status
- **`errorMessage`** (string | null): Error message if status check failed

### Computed Properties

#### `statusText`
Returns the status message displayed to users:
- `'Checking...'` when `isLoading` is true
- `'Active'` when service is available
- `'Unavailable'` when service is not available or failed

#### `statusBadgeClass`
Returns CSS class string for status badge styling:
- `'status-badge yellow'` while checking
- `'status-badge green'` when active
- `'status-badge red'` when unavailable

## Configuration Constants

```typescript
API_ENDPOINT: 'https://www.theaudiodb.com/api/v1/artist.php'
TEST_ARTIST_ID: '112024'  // Well-known artist ID for connectivity testing
REQUEST_TIMEOUT_MS: 5000   // 5 second timeout for requests
```

## Methods

### `checkServiceStatus()`
- **Type**: `async () => Promise<void>`
- **Purpose**: Checks TheAudioDB service availability
- **Behavior**:
  1. Sets `isLoading` to true
  2. Clears previous error messages
  3. Creates an AbortController with 5-second timeout
  4. Fetches test artist data from TheAudioDB API
  5. Validates response contains an artists array with at least one item
  6. Updates `isAvailable` based on validation
  7. Catches and logs any errors
  8. Cleans up timeout and abort controller

**Error Handling**:
- HTTP errors: `Failed to check status: HTTP {status}`
- Network errors: `Failed to check status: {error message}`
- Timeout errors: `Failed to check status: AbortError`
- JSON errors: `Failed to check status: {error message}`

## UI Structure

### Template Layout

```
ContentBox
  └── div.card
        └── div.service-item
              ├── div.service-main
              │     └── div.service-info
              │           ├── Icon (service-icon)
              │           └── div.service-details
              │                 ├── h3 (title)
              │                 ├── p.service-description (description)
              │                 └── div.service-status
              │                       ├── span[role="status"] (status-badge)
              │                       │     ├── span.status-icon (●)
              │                       │     └── status text
              │                       └── span[role="alert"] (error message - if exists)
              └── div.loading-section (if isLoading)
                    └── div.loading-content
                          └── p.loading-message
```

## Status Display

### Status Badges

**Green Badge (Active)**
- Background: `rgba(74, 188, 139, 0.1)` (#4abc8b with 10% opacity)
- Text Color: `#4abc8b`
- Indicates: Service is available and responding normally

**Red Badge (Unavailable)**
- Background: `rgba(239, 68, 68, 0.1)` (#ef4444 with 10% opacity)
- Text Color: `#ef4444`
- Indicates: Service is not responding or returned invalid data

**Yellow Badge (Checking)**
- Background: `rgba(234, 179, 8, 0.1)` (#eab308 with 10% opacity)
- Text Color: `#eab308`
- Indicates: Status check is in progress

### Loading State

When `isLoading` is true, a loading section appears below the service info:
- Message: "Checking service status..."
- Gray text with reduced opacity
- Bordered separator from service info

### Error Messages

When status check fails:
- Displayed in small red text below status badge
- Role="alert" for accessibility
- Format: `Failed to check status: {detailed error}`

## Styling

### CSS Variables Used

The component respects these parent theme variables:
- `--background-card`: Background color of ContentBox
- `--color-body`: Text color

### SCSS Variables (Customizable)

Core dimensions and spacing:
- `$status-badge-padding`: `4px 12px`
- `$status-badge-radius`: `12px`
- `$status-gap`: `6px`
- `$loading-section-padding`: `12px 16px`

Color scheme:
- `$status-color-green`: `#4abc8b`
- `$status-color-red`: `#ef4444`
- `$status-color-yellow`: `#eab308`
- `$status-bg-opacity`: `0.1`

Font sizes:
- `$status-badge-font-size`: `0.875rem`
- `$loading-message-font-size`: `0.875rem`
- `$error-message-font-size`: `0.75rem`

## Accessibility

### ARIA Attributes

- **Status Badge**: `role="status"` with dynamic `aria-label`
  - Format: `"{title} service status: {statusText}"`
  - Example: "TheAudioDB service status: Active"
  - Announces status changes to screen readers

- **Status Icon**: `aria-hidden="true"`
  - Decorative bullet (●) excluded from accessibility tree

- **Error Message**: `role="alert"`
  - Automatically announced to screen readers
  - Critical for error communication

### Semantic HTML

- Proper heading hierarchy with `<h3>`
- Semantic status and alert roles
- Meaningful button/element structure

### Keyboard Accessibility

- Status information is readable without interaction
- No keyboard traps
- Logical tab order inherited from parent

## Usage Example

```vue
<template>
  <div class="service-monitor">
    <Theaudiodb />
    <Theaudiodb 
      title="Music Database"
      description="External artist metadata provider"
      icon="tabler/music"
      serviceKey="music-db"
    />
  </div>
</template>

<script setup lang="ts">
import Theaudiodb from '@/components/Theaudiodb.vue'
</script>
```

## Lifecycle

1. **Mount Phase**:
   - Component mounts and initializes reactive state
   - `onMounted()` hook triggers `checkServiceStatus()`

2. **Check Phase**:
   - Sets `isLoading = true`
   - Creates abort controller with 5-second timeout
   - Fetches test artist (ID: 112024) from TheAudioDB

3. **Result Phase**:
   - If successful: Sets `isAvailable` and displays status
   - If failed: Sets error message and logs to console
   - Clears loading state

4. **Display Phase**:
   - Status badge updates with appropriate color
   - Error message displays (if any)
   - Loading section hides

## Error Scenarios

### HTTP Errors
```
Failed to check status: HTTP 503
Failed to check status: HTTP 404
```

### Network Errors
```
Failed to check status: Failed to fetch
Failed to check status: network timeout
```

### Timeout
```
Failed to check status: AbortError
```

### Invalid Response
```
Failed to check status: Unexpected token < in JSON at position 0
```

### CORS Issues
**Note**: Direct cross-origin requests to TheAudioDB may fail due to CORS policies. The application should implement a proxy or API wrapper for production use.

## Performance Considerations

### Request Optimization
- Single test request on mount (no polling by default)
- 5-second timeout prevents resource exhaustion
- AbortController prevents dangling requests

### Memory Management
- Timeout cleared in finally block
- AbortController properly disposed
- No circular references or leaks

### Rendering Efficiency
- Computed properties memoized
- Conditional rendering with `v-if` prevents unnecessary DOM
- CSS transitions for smooth state changes

## Testing

The component includes comprehensive test coverage:
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component with mocked API
- **Error Handling Tests**: Various failure scenarios
- **Accessibility Tests**: ARIA and semantic HTML validation
- **Regression Tests**: State management and timing issues

See `src/__tests__/components/Theaudiodb.test.ts` for full test suite.

## Common Integration Patterns

### In Service Dashboard
```vue
<template>
  <div class="services">
    <Theaudiodb />
    <SpotifyService />
    <LastFmService />
  </div>
</template>
```

### With Custom Configuration
```vue
<template>
  <Theaudiodb
    :title="config.title"
    :description="config.description"
    :icon="config.icon"
    :service-key="config.key"
  />
</template>

<script setup lang="ts">
const config = {
  title: 'Music Metadata',
  description: 'TheAudioDB provides artist information',
  icon: 'tabler/database',
  key: 'theaudio-metadata'
}
</script>
```

## API Details

### TheAudioDB Test Endpoint
- **URL**: `https://www.theaudiodb.com/api/v1/artist.php?i=112024`
- **Method**: GET
- **Response Format**: JSON
- **Test Artist**: Brian May (ID: 112024)

### Response Validation
The component validates:
1. Response status is 2xx (success)
2. Response JSON parses without errors
3. Response contains `artists` property
4. `artists` property is an array
5. `artists` array contains at least one item

## Troubleshooting

### Status Always Shows "Unavailable"
- Check network connectivity
- Verify TheAudioDB service is operational
- Check browser console for CORS errors
- Ensure test artist (112024) is still valid

### Status Never Updates
- Check browser console for JavaScript errors
- Verify onMounted hook is being called
- Check request timeout is not triggering
- Verify fetch API is available in environment

### Error Messages Not Showing
- Check if errorMessage ref is properly bound
- Verify error occurred during checkServiceStatus
- Check Vue DevTools for reactive state updates

## Browser Support

- Modern browsers with ES2015+ support
- Vue 3.0+
- Fetch API support
- AbortController support (all modern browsers)

## Future Enhancements

Potential improvements for future versions:
- Add polling capability for periodic checks
- Implement manual retry button
- Add detailed error logs view
- Support for multiple endpoint testing
- Caching of last known status
- Integration with service status webhook

## Version History

- **1.0.0** (2026-08-02): Initial release with comprehensive test coverage and documentation
  - Service availability monitoring
  - Status badge visualization
  - Error handling and user feedback
  - Full accessibility support
  - Request timeout and abort control

## Related Components

- **ContentBox**: Container component for card styling
- **Icon**: Icon renderer for service icon display
- **SpotifyService**: Similar service status component
- **LastFmService**: Similar service status component

## Dependencies

- Vue 3.0+
- Tabler Icons (for icon rendering)
- No external API libraries required

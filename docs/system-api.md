# System API Documentation

The System API (`src/api/system.ts`) provides core system management functions for the HiFiBerry WebUI, including system information retrieval, device management, hardware detection, and configuration control.

## Overview

This module exports async functions for:
- **System Information**: Retrieve Pi model, HAT details, soundcard information
- **Hostname Management**: Update system hostname and pretty hostname
- **Soundcard Management**: Get available soundcards, detect connected hardware, manage device tree overlays
- **Soundcard Detection**: Enable/disable automatic detection, configure fixed soundcards
- **System Control**: Reboot system with optional delay, execute scripts, reset configuration
- **System Monitoring**: Cache statistics, background jobs tracking, file existence checks
- **Setup Wizard**: Initial setup status, completion tracking, reset capability

All functions use `apiFetch()` for HTTP communication and retrieve the base URL from the `AppConfigStore` using `getConfigApiBaseUrl()`.

## Core Types

### SystemInfo
Complete system information including hardware details.

```typescript
interface SystemInfo {
  pi_model: {
    name: string
    version: string
    memory?: {
      total_kb: number
      total_mb: number
      total_gb: number
    }
  }
  hat_info: {
    vendor: string
    product: string
    uuid: string
    vendor_card: string
  }
  soundcard: {
    name: string
    volume_control: string
    headphone_volume_control: string | null
    hardware_index: number
    output_channels: number
    input_channels: number
    features: string[]
    hat_name: string
    supports_dsp: boolean
    card_type: string[]
  }
  system: {
    uuid: string
    hostname: string
    pretty_hostname: string | null
  }
  status: 'success' | 'error'
  message?: string
  error?: string
}
```

### SoundCard
Individual soundcard configuration details.

```typescript
interface SoundCard {
  name: string
  dtoverlay: string
  volume_control: string | null
  headphone_volume_control: string | null
  output_channels: number
  input_channels: number
  features: string[]
  supports_dsp: boolean
  card_type: string[]
  is_pro: boolean
}
```

### Response Types
- `SoundCardsResponse`: Contains `status`, `data.soundcards[]`, `data.count`
- `SetDtoverlayResponse`: Contains `status`, `message`, optional `data` with `dtoverlay`, `changes_made`, `reboot_required`, and `valid_overlays[]`
- `SoundCardDetectionResponse`: Contains `status`, `message`, optional `data`, optional `error`
- `RebootResponse`: Contains `status`, `message`, optional `data.delay`, `data.scheduled`
- `ScriptExecutionResponse`: Contains `status`, `message`, optional `data.script`, `data.exit_code`, `data.output`, `data.error`
- `CacheStatsResponse`: Contains `success`, `stats`, `image_cache_stats`, `message`
- `BackgroundJobsResponse`: Contains `success`, `jobs[]`, `message`

## API Functions

### System Information

#### `getSystemInfo(): Promise<SystemInfo>`
Retrieves comprehensive system information including Raspberry Pi model, HAT details, soundcard info, and system identifiers.

**Endpoint**: `GET /config/api/systeminfo`

**Returns**: `SystemInfo` object with all hardware details

**Error Handling**: Throws with `HTTP error! status: {status}` on failure

**Example**:
```typescript
const info = await getSystemInfo()
console.log(`Connected to ${info.pi_model.name}`)
console.log(`Soundcard: ${info.soundcard.name}`)
```

---

### Hostname Management

#### `updateHostname(request: HostnameUpdateRequest): Promise<HostnameUpdateResponse>`
Updates the system hostname and/or pretty hostname (display name).

**Endpoint**: `POST /config/api/hostname`

**Parameters**:
- `request.hostname?`: string - New hostname (system name, no spaces)
- `request.pretty_hostname?`: string - Display name (can contain spaces)

**Validation**:
- ✅ At least one field (hostname or pretty_hostname) must be provided
- ❌ Throws: `At least one of hostname or pretty_hostname must be provided`

**Returns**: Response with `status` and `message`, optional `data` containing updated values

**Example**:
```typescript
// Update hostname only
await updateHostname({ hostname: 'my-device' })

// Update pretty hostname only
await updateHostname({ pretty_hostname: 'My HiFiBerry DAC' })

// Update both
await updateHostname({ 
  hostname: 'hifiberry', 
  pretty_hostname: 'Living Room DAC' 
})
```

---

### Soundcard Management

#### `getSoundCards(): Promise<SoundCardsResponse>`
Retrieves list of all available/compatible soundcards.

**Endpoint**: `GET /config/api/soundcards`

**Returns**: Response with `data.soundcards[]` and `data.count`

**Example**:
```typescript
const response = await getSoundCards()
response.data.soundcards.forEach(card => {
  console.log(`${card.name} - Outputs: ${card.output_channels}`)
})
```

---

#### `setSoundCardDtoverlay(request: SetDtoverlayRequest): Promise<SetDtoverlayResponse>`
Sets the device tree overlay for soundcard configuration.

**Endpoint**: `POST /config/api/soundcard/dtoverlay`

**Parameters**:
- `request.dtoverlay`: string (required, non-empty) - Device tree overlay name
- `request.remove_existing?`: boolean - Remove existing overlay before setting new one

**Validation**:
- ✅ `dtoverlay` must not be empty or whitespace-only
- ❌ Throws: `Device tree overlay name cannot be empty`

**Returns**: Response with `status`, `message`, optional `data` containing outcome and reboot requirement

**Error Response**: Includes detailed API error message or HTTP status

**Example**:
```typescript
const response = await setSoundCardDtoverlay({ 
  dtoverlay: 'hifiberry-dacplus',
  remove_existing: true 
})

if (response.data.reboot_required) {
  console.log('System reboot required to apply changes')
}
```

---

#### `detectSoundCard(): Promise<SoundCardDetectionResponse>`
Detects the currently connected soundcard using cached hardware detection results.

**Endpoint**: `GET /config/api/soundcard/detect`

**Returns**: Response with `data` containing `card_name`, `dtoverlay`, `card_detected`, `definition_found`

**Note**: Uses cached results; for fresh detection, use `detectSoundCardLive()`

**Example**:
```typescript
const detection = await detectSoundCard()
if (detection.data.card_detected) {
  console.log(`Detected: ${detection.data.card_name}`)
}
```

---

#### `detectSoundCardLive(): Promise<SoundCardDetectionResponse>`
Performs fresh hardware detection pass, ignoring cached pin from ConfigDB or config.txt comment.

**Endpoint**: `GET /config/api/soundcard/detect-live`

**Description**: Used by setup wizard to show what's actually plugged in, not stale configuration

**Returns**: Same as `detectSoundCard()` but with real-time hardware detection

**Note**: DSP checksum refinement is still applied

**Example**:
```typescript
// Use during setup wizard to show real hardware
const liveDetection = await detectSoundCardLive()
displayDetectedCard(liveDetection.data)
```

---

### Soundcard Detection Control

#### `setSoundCardDetection(enabled: boolean): Promise<{ status: string; message: string }>`
Enable or disable automatic soundcard detection.

**Endpoints**:
- `POST /config/api/soundcard/detection/enable` (if enabled=true)
- `POST /config/api/soundcard/detection/disable` (if enabled=false)

**Parameters**:
- `enabled`: boolean - true to enable auto-detection, false to disable

**Returns**: Response with `status` and `message`

**Example**:
```typescript
// Enable automatic detection
await setSoundCardDetection(true)

// Disable and use fixed card
await setSoundCardDetection(false)
```

---

#### `getSoundCardDetectionStatus(): Promise<DetectionStatusResponse>`
Retrieves current soundcard detection configuration and status.

**Endpoint**: `GET /config/api/soundcard/detection`

**Returns**: Response with `data` containing:
- `detection_enabled`: boolean
- `detection_disabled`: boolean
- `configured_card_name`: string | null
- `configured_dtoverlay`: string | null

**Example**:
```typescript
const status = await getSoundCardDetectionStatus()
if (status.data.detection_enabled) {
  console.log('Auto-detection is active')
} else {
  console.log(`Using fixed card: ${status.data.configured_card_name}`)
}
```

---

#### `disableSoundCardDetection(card_name: string): Promise<SetDtoverlayResponse>`
Disable automatic detection and configure a specific fixed soundcard.

**Endpoint**: `POST /config/api/soundcard/detection/disable`

**Parameters**:
- `card_name`: string (required, non-empty) - Name of card to lock to

**Validation**:
- ✅ `card_name` must not be empty or whitespace-only
- ❌ Throws: `Card name cannot be empty`

**Returns**: Response confirming configuration change and reboot requirement

**Example**:
```typescript
await disableSoundCardDetection('DAC+ Pro')
console.log('Detection disabled, using DAC+ Pro')
```

---

### System Control

#### `rebootSystem(request?: RebootRequest): Promise<RebootResponse>`
Reboot the system after an optional delay.

**Endpoint**: `POST /config/api/system/reboot`

**Parameters**:
- `request.delay?`: number (non-negative) - Delay in seconds before reboot

**Validation**:
- ✅ `delay` must be a finite number (or omitted)
- ✅ `delay` must be >= 0
- ✅ `delay` can be floating point (10.5 is valid)
- ❌ Throws: `Reboot delay must be a non-negative number` for negative, Infinity, or NaN values

**Returns**: Response with scheduled reboot details

**Example**:
```typescript
// Reboot immediately
await rebootSystem()

// Reboot after 60 seconds
await rebootSystem({ delay: 60 })

// Reboot after delay with validation
try {
  await rebootSystem({ delay: -5 })  // Throws error
} catch (e) {
  console.error(e.message)
}
```

---

#### `executeScript(request: ScriptExecutionRequest): Promise<ScriptExecutionResponse>`
Execute a system script by name.

**Endpoint**: `POST /config/api/scripts/{script}/execute`

**Parameters**:
- `request.script`: string (required, non-empty) - Script name to execute

**Validation**:
- ✅ `script` must not be empty or whitespace-only
- ❌ Throws: `Script name cannot be empty`

**Returns**: Response with `status`, `message`, optional execution results

**Security Note**: Script names are validated for non-emptiness. Path traversal and special characters are not currently blocked - these should be prevented server-side or via sandboxing

**Example**:
```typescript
const result = await executeScript({ script: 'system-update' })
console.log(`Exit code: ${result.data.exit_code}`)
if (result.data.output) {
  console.log(result.data.output)
}
```

---

### System Monitoring

#### `getCacheStats(): Promise<CacheStatsResponse>`
Retrieves cache statistics including disk cache, memory cache, and image cache information.

**Endpoint**: `GET /config/api/cache/stats`

**Returns**: Response with `stats` object:
- `disk_entries`: number of cached items on disk
- `memory_entries`: number of cached items in memory
- `memory_bytes`: total memory used by cache
- `memory_limit_bytes`: memory limit or null if unlimited

And `image_cache_stats`:
- `total_images`: number of cached images
- `total_size`: total size in bytes
- `last_updated`: timestamp of last update

**Example**:
```typescript
const cache = await getCacheStats()
console.log(`Memory cache: ${cache.stats.memory_entries} items`)
console.log(`Cache size: ${(cache.stats.memory_bytes / 1024 / 1024).toFixed(2)} MB`)
```

---

#### `getBackgroundJobs(): Promise<BackgroundJobsResponse>`
Retrieves list of currently running background jobs.

**Endpoint**: `GET /config/api/background/jobs`

**Returns**: Response with `jobs[]` array containing:
- `id`: unique job identifier
- `name`: job name/type
- `status`: 'running' | 'finished' | 'completed' | 'failed'
- `progress`: current progress text
- `total_items`: total items to process
- `completed_items`: items completed
- `completion_percentage`: 0-100 completion
- `duration_seconds`: how long job has run
- `time_since_last_update`: seconds since last status update

**Example**:
```typescript
const jobs = await getBackgroundJobs()
jobs.jobs.forEach(job => {
  console.log(`${job.name}: ${job.completion_percentage}%`)
})
```

---

#### `checkFileExistence(filePaths: string[]): Promise<FileExistence[]>`
Check if specific files exist on the system (sequential, per-file checks).

**Endpoint**: `POST /config/api/filesystem/file-exists` (called per file)

**Parameters**:
- `filePaths`: string[] (required, non-empty, all items non-empty)

**Validation**:
- ✅ Array must not be empty
- ✅ All paths must be non-empty strings
- ✅ Paths must not be whitespace-only
- ❌ Throws: `File paths array cannot be empty` if array is empty
- ❌ Throws: `File paths cannot be empty strings` if any path is empty/whitespace

**Returns**: Array of `FileExistence` objects with:
- `path`: requested file path
- `exists`: boolean - whether file exists
- `filename`: extracted filename from path

**Note**: Makes sequential API calls (one per file). On error, partially processed results are not returned; function throws immediately on first error.

**Example**:
```typescript
try {
  const files = await checkFileExistence([
    '/etc/config',
    '/boot/config.txt'
  ])
  files.forEach(f => {
    console.log(`${f.path}: ${f.exists ? 'exists' : 'not found'}`)
  })
} catch (e) {
  console.error('File check failed:', e.message)
}
```

---

### Setup Management

#### `getSetupStatus(): Promise<SetupStatusResponse>`
Retrieve initial setup wizard completion status.

**Endpoint**: `GET /config/api/setup/status`

**Returns**: Response with `data.setup_completed` boolean

**Example**:
```typescript
const status = await getSetupStatus()
if (!status.data.setup_completed) {
  showSetupWizard()
}
```

---

#### `completeSetup(): Promise<{ status: string; message: string }>`
Mark initial setup as completed (allows bypassing wizard on future boots).

**Endpoint**: `POST /config/api/setup/complete`

**Returns**: Response with `status` and `message`

**Example**:
```typescript
// After completing setup steps
await completeSetup()
console.log('Setup complete, wizard will not show again')
```

---

#### `resetSetup(): Promise<{ status: string; message: string }>`
Reset setup status to incomplete, allowing re-running the wizard.

**Endpoint**: `POST /config/api/setup/reset`

**Returns**: Response with `status` and `message`

**Example**:
```typescript
// Allow user to run setup wizard again
await resetSetup()
reloadApplication()
```

---

#### `resetConfigDB(): Promise<{ status: string; message: string }>`
Reset entire configuration database (clear all keys).

**Endpoint**: `POST /config/api/config/reset`

**⚠️ WARNING**: This is destructive - clears ALL configuration. Use with caution.

**Returns**: Response with `status` and `message`

**Example**:
```typescript
// Dangerous operation - should have confirmation
const confirmed = await showDestructiveConfirmation(
  'This will clear all configuration. Proceed?'
)
if (confirmed) {
  await resetConfigDB()
  rebootSystem()
}
```

---

## Error Handling Patterns

### Consistent Error Handling
All functions follow this pattern:
1. Validate input parameters before making API call
2. Call API endpoint
3. Check `response.ok` first (before parsing JSON)
4. Throw error with appropriate message

### Error Message Priority
Functions that parse error responses follow this priority:
1. Use `response.message` from API if available
2. Fall back to `HTTP error! status: {status}`

### Validation Errors
Input validation errors throw immediately without calling the API:
```typescript
await rebootSystem({ delay: -10 })
// Throws: "Reboot delay must be a non-negative number"
// No API call made
```

### HTTP Errors
Network/HTTP errors throw with descriptive messages:
```typescript
// Server returned 503
await getSoundCards()
// Throws: "HTTP error! status: 503"
```

---

## Best Practices

### 1. **Validate User Input Before Calling**
```typescript
// ✅ Good: Check user input first
if (hostname.length === 0) {
  showError('Hostname cannot be empty')
  return
}
await updateHostname({ hostname })

// ❌ Avoid: Let validation throw
await updateHostname({ hostname: '' })  // Will throw
```

### 2. **Handle Errors Gracefully**
```typescript
try {
  const info = await getSystemInfo()
  displaySystemInfo(info)
} catch (error) {
  console.error('Failed to load system info:', error.message)
  showErrorToUser('Unable to retrieve system information')
}
```

### 3. **Check Response Status**
```typescript
const response = await updateHostname({ hostname: 'newhost' })
if (response.status === 'success') {
  showSuccess('Hostname updated')
} else {
  showError(response.message || 'Update failed')
}
```

### 4. **For Reboot, Use Appropriate Delay**
```typescript
// Give UI time to show message
await rebootSystem({ delay: 3 })  // 3 seconds

// For immediate reboot (dangerous - no UI feedback)
await rebootSystem()
```

### 5. **Validate File Paths**
```typescript
const paths = userInput.split(',').map(p => p.trim()).filter(p => p)
if (paths.length === 0) {
  showError('No valid file paths provided')
  return
}
const results = await checkFileExistence(paths)
```

### 6. **Confirm Destructive Operations**
```typescript
const confirmed = await showConfirmation(
  'Reset configuration database?\nAll settings will be lost.'
)
if (confirmed) {
  await resetConfigDB()
  // Optionally reboot to apply
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Config API](./config-api.md) - Configuration API details
- [HTTP API Wrapper](./http-api-wrapper.md) - HTTP communication layer

## Testing

Comprehensive test suite in [src/api/__tests__/system.test.ts](../src/api/__tests__/system.test.ts) includes:
- 89 test cases covering all functions
- Input validation tests
- Error handling verification
- Response structure validation
- API endpoint verification
- Regression tests for known issues

Run tests with: `pnpm test src/api/__tests__/system.test.ts`

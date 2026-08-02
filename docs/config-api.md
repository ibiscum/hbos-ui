# Config API Documentation

## Overview

The Config API (`src/api/config.ts`) provides a comprehensive client-side interface for managing system configuration, service orchestration, network settings, and hardware device discovery. It wraps the backend Configurator service with TypeScript types and convenience functions.

### Key Responsibilities

- **Configuration Management**: Get, set, update, and delete configuration key-value pairs with optional encryption support
- **Service Orchestration**: Enable, disable, restart, and manage systemd services
- **Network Management**: Retrieve and manage network configuration
- **Hardware Discovery**: Scan I2C bus for connected devices
- **External Player Management**: Registry and settings persistence for external player plugins

## Type Definitions

### Core Response Types

```typescript
export interface ConfigApiResponse<T = unknown> {
  status: 'success' | 'error'
  data?: T
  message?: string
  count?: number
}
```

All API responses follow this standard format with optional data payload and error messaging.

### Configuration Types

```typescript
export interface ConfigKeyValue {
  key: string
  value: string
}

export interface ConfigSetRequest {
  value: string
  secure?: boolean  // Store as encrypted/secured value
}
```

### Service Types

```typescript
export interface SystemdService {
  service: string
  permission_level: string
  allowed_operations: string[]
  active: 'active' | 'inactive' | 'failed'
  enabled: 'enabled' | 'disabled'
}

export interface SystemdServiceDetails {
  service: string
  active: 'active' | 'inactive' | 'failed'
  enabled: 'enabled' | 'disabled'
  status_output: string
  status_returncode: number
  allowed_operations: string[]
}

export interface SystemdServiceExists {
  service: string
  exists: boolean
}

export interface SystemdOperationResult {
  service: string
  operation: string
  output: string
  returncode: number
}
```

### Network Types

```typescript
export interface NetworkInterface {
  name: string
  mac: string
  ipv4: string | null
  netmask: string | null
  state: 'up' | 'down' | 'unknown'
  type: 'wired' | 'wireless'
}

export interface NetworkConfiguration {
  hostname: string
  default_gateway: string | null
  dns_servers: string[]
  interfaces: NetworkInterface[]
}
```

### Hardware Types

```typescript
export interface I2CDeviceInfo {
  bus_number: number
  bus_path: string
  bus_exists: boolean
  smbus2_available: boolean
  detected_devices: string[]
  kernel_used: string[]
  scan_range: string
  error?: string
}

export interface ExternalPlayer {
  name: string
  provided_by: string
  systemd_service: string
  icon_url: string
  allow_change: boolean
  maintainer_name: string
  maintainer_url: string
  settings?: PlayerSetting[]
}

export interface PlayerSetting {
  key: string
  type: 'toggle' | 'select'
  label: string
  description?: string
  default: boolean | string
  value: boolean | string
  options?: { value: string; label: string }[]
}
```

## Core Configuration Functions

### `getAllConfig(prefix?: string)`

Retrieves all configuration key-value pairs, optionally filtered by prefix.

**Parameters:**
- `prefix` (optional): Filter results to keys starting with this prefix

**Returns:** `Promise<ConfigApiResponse<Record<string, string>>>`

**Example:**
```typescript
// Get all configuration
const allConfig = await getAllConfig()

// Get all keys starting with 'audio.'
const audioConfig = await getAllConfig('audio')
```

**Throws:**
- Error if HTTP request fails

---

### `getConfigKeys(prefix?: string)`

Retrieves only configuration key names without their values.

**Parameters:**
- `prefix` (optional): Filter results to keys starting with this prefix

**Returns:** `Promise<ConfigApiResponse<string[]>>`

**Example:**
```typescript
const keys = await getConfigKeys('service.')
// Returns: ['service.mpd', 'service.shairport', ...]
```

---

### `getConfigValue(key, secure?, defaultValue?)`

Retrieves a single configuration value by key.

**Parameters:**
- `key` (required): Configuration key name (URL-encoded automatically)
- `secure` (optional): If true, retrieves decrypted/secured value (requires authentication)
- `defaultValue` (optional): Value returned if key not found; empty string is preserved

**Returns:** `Promise<ConfigApiResponse<ConfigKeyValue>>`

**Important Security Note:**
- Plain reads (secure=false) return null for encrypted values
- Decrypted reads (secure=true) require authenticated session
- Decorator pattern: The route `/key/{key}/secure` is classified as risky by the auth gateway

**Example:**
```typescript
// Get plain configuration value
const volume = await getConfigValue('volume')

// Get encrypted value (requires auth)
const secret = await getConfigValue('spotify_secret', true)

// With default value
const theme = await getConfigValue('ui.theme', false, 'dark')
```

---

### `setConfigValue(key, value, secure?)`

Creates or updates a configuration value (POST method).

**Parameters:**
- `key` (required): Configuration key name
- `value` (required): Value to store
- `secure` (optional): If true, stores as encrypted/secured value

**Returns:** `Promise<ConfigApiResponse<ConfigKeyValue>>`

**Example:**
```typescript
// Set plain value
await setConfigValue('volume', '75')

// Set encrypted value
await setConfigValue('spotify_secret', 'my-secret-key', true)
```

---

### `updateConfigValue(key, value, secure?)`

Updates an existing configuration value (PUT method).

**Parameters:**
- `key` (required): Configuration key name
- `value` (required): New value
- `secure` (optional): If true, stores as encrypted/secured value

**Returns:** `Promise<ConfigApiResponse<ConfigKeyValue>>`

**Difference from setConfigValue:**
- PUT vs POST HTTP method (may have different backend semantics)

---

### `deleteConfigValue(key)`

Deletes a configuration key and its value.

**Parameters:**
- `key` (required): Configuration key name

**Returns:** `Promise<ConfigApiResponse>`

**Example:**
```typescript
await deleteConfigValue('temp_setting')
```

---

## Convenience Functions

Convenience functions provide simplified interfaces for common operations with built-in error handling.

### Volume Management

#### `getVolume(): Promise<string | null>`
Returns current volume setting or null on error.

#### `setVolume(volume: string): Promise<boolean>`
Sets volume, returns true on success, false on failure.

### Soundcard Management

#### `getSoundcard(): Promise<string | null>`
Returns current soundcard setting or null on error.

#### `setSoundcard(soundcard: string): Promise<boolean>`
Sets soundcard, returns true on success, false on failure.

**Error Behavior:**
- Errors are logged to console but not thrown
- Returns `null`/`false` instead of throwing
- Safe for fire-and-forget scenarios

**Example:**
```typescript
const volume = await getVolume()
if (volume) {
  console.log(`Current volume: ${volume}`)
}

const success = await setVolume('50')
if (!success) {
  console.log('Failed to set volume')
}
```

---

## Systemd Service Management

### `getSystemdServices()`

Fetches all registered systemd services and their status.

**Returns:** `Promise<ConfigApiResponse<SystemdServicesList>>`

**Example:**
```typescript
const response = await getSystemdServices()
const services = response.data?.services || []

services.forEach(svc => {
  console.log(`${svc.service}: ${svc.active}`)
})
```

---

### `getSystemdServiceStatus(service)`

Retrieves detailed status of a specific systemd service.

**Parameters:**
- `service` (required): Service name (e.g., 'mpd', 'shairport', 'librespot')

**Returns:** `Promise<ConfigApiResponse<SystemdServiceDetails>>`

---

### `checkSystemdServiceExists(service)`

Checks if a systemd service exists.

**Parameters:**
- `service` (required): Service name

**Returns:** `Promise<ConfigApiResponse<SystemdServiceExists>>`

---

### `executeSystemdOperation(service, operation)`

Executes an operation on a systemd service.

**Parameters:**
- `service` (required): Service name
- `operation` (required): One of: 'start', 'stop', 'restart', 'enable', 'disable', 'enable-now', 'disable-now', 'status'

**Returns:** `Promise<ConfigApiResponse<SystemdOperationResult>>`

**Throws:**
- Error if HTTP request fails

---

## Service Orchestration Convenience Functions

These functions combine multiple operations for common workflows.

### `enableService(service): Promise<boolean>`

Atomically enables and starts a service.

**Workflow:**
1. Enable service for auto-startup via 'enable'
2. Start service immediately via 'start'

**Returns:**
- `true` if both operations succeeded
- `false` if either operation returned error status in response

**Throws:**
- Error if HTTP request fails (network/auth issues)

**Error Handling Pattern:**
```typescript
try {
  const success = await enableService('mpd')
  if (!success) {
    console.log('Service operation failed (returned error status)')
  }
} catch (error) {
  console.log('Service operation failed (network/auth error)')
}
```

---

### `disableService(service): Promise<boolean>`

Atomically stops and disables a service.

**Workflow:**
1. Stop service via 'stop'
2. Disable service from auto-startup via 'disable'

**Returns:**
- `true` if both operations succeeded
- `false` if either operation returned error status in response

**Throws:**
- Error if HTTP request fails

---

### `enableNowService(service): Promise<boolean>`

Enable and start a service in a single atomic operation.

**Returns:**
- `true` if operation succeeded
- `false` if API returned error status

**Throws:**
- Error if HTTP request fails

---

### `disableNowService(service): Promise<boolean>`

Disable and stop a service in a single atomic operation.

**Returns:**
- `true` if operation succeeded
- `false` if API returned error status

**Throws:**
- Error if HTTP request fails

---

### `restartService(service): Promise<boolean>`

Restart a systemd service.

**Returns:**
- `true` if operation succeeded
- `false` if API returned error status

**Throws:**
- Error if HTTP request fails

---

### `getMultipleServiceStatus(services[]): Promise<Map<string, SystemdServiceDetails | null>>`

Fetch status for multiple services in parallel.

**Parameters:**
- `services`: Array of service names

**Returns:**
- Map where keys are service names and values are service details or null if fetch failed
- Errors are logged but not thrown

**Example:**
```typescript
const statusMap = await getMultipleServiceStatus(['mpd', 'shairport', 'librespot'])

statusMap.forEach((status, service) => {
  if (status) {
    console.log(`${service}: ${status.active}`)
  } else {
    console.log(`${service}: Failed to fetch status`)
  }
})
```

---

## Network Management

### `getNetworkConfiguration()`

Retrieves complete network configuration including interfaces, DNS, and gateway.

**Returns:** `Promise<ConfigApiResponse<NetworkConfiguration>>`

**Example:**
```typescript
const config = await getNetworkConfiguration()

console.log(`Hostname: ${config.data?.hostname}`)
console.log(`Gateway: ${config.data?.default_gateway}`)

config.data?.interfaces.forEach(iface => {
  console.log(`${iface.name}: ${iface.state} (${iface.type})`)
})
```

---

## Hardware Discovery

### `scanI2CDevices(busNumber?): Promise<ConfigApiResponse<I2CDeviceInfo>>`

Scans an I2C bus for connected devices.

**Parameters:**
- `busNumber` (optional): I2C bus number (0-10, default: auto-detect)

**Returns:** `Promise<ConfigApiResponse<I2CDeviceInfo>>`

**Input Validation:**
- Bus number must be integer
- Range: 0-10 inclusive
- Throws Error for invalid values

**Example:**
```typescript
// Scan default I2C bus
const devices = await scanI2CDevices()

// Scan specific bus
const bus1Devices = await scanI2CDevices(1)

console.log(`Detected devices: ${devices.data?.detected_devices.join(', ')}`)
console.log(`Kernel using: ${devices.data?.kernel_used.join(', ')}`)
```

---

## External Player Management

### `getExternalPlayers(): Promise<ExternalPlayer[]>`

Retrieves external players registered via drop-in descriptors.

**Returns:**
- Array of external player configurations
- Empty array if request fails or no players available

**Features:**
- Icon URLs are automatically rewritten to use config API proxy
- Does not throw errors; returns empty array on failure

**Example:**
```typescript
const players = await getExternalPlayers()

players.forEach(player => {
  console.log(`${player.name} (${player.provided_by})`)
  console.log(`  Service: ${player.systemd_service}`)
  console.log(`  Icon: ${player.icon_url}`)
  
  if (player.settings) {
    player.settings.forEach(setting => {
      console.log(`  Setting: ${setting.label} = ${setting.value}`)
    })
  }
})
```

---

### `saveExternalPlayerSettings(systemdService, values): Promise<void>`

Persists settings for an external player plugin.

**Parameters:**
- `systemdService` (required): Systemd service name (URL-encoded automatically)
- `values` (required): Settings dictionary with boolean or string values

**Returns:** `Promise<void>`

**Throws:**
- Error if HTTP request fails

**Example:**
```typescript
await saveExternalPlayerSettings('librespot', {
  enabled: true,
  bitrate: '320',
  device_name: 'My HiFiBerry'
})
```

---

## Error Handling Patterns

### Pattern 1: Functions That Throw

Core functions and operations that throw errors:

```typescript
// These throw errors on HTTP/network failures
try {
  await getAllConfig()
  await setConfigValue('key', 'value')
  await executeSystemdOperation('mpd', 'start')
} catch (error) {
  console.error('HTTP or authentication error:', error)
  // Handle network error
}
```

### Pattern 2: Functions That Return False

Convenience functions return false for errors:

```typescript
// These return false on failure, don't throw
const success = await setVolume('50')
if (!success) {
  console.log('Failed to set volume')
}

// But they DO throw on network errors
try {
  const success = await setVolume('50')
} catch (error) {
  console.error('Network error:', error)
}
```

### Pattern 3: Fire-and-Forget Convenience

Getter functions that never throw:

```typescript
// Always safe to call without error handling
const volume = await getVolume()
const soundcard = await getSoundcard()
// Returns null if fails, no exceptions
```

---

## Test Coverage

Comprehensive test suite in `src/api/__tests__/config.test.ts` covers:

- URL construction and query parameter encoding
- Secure vs. plain value retrieval
- HTTP error responses
- Service operation orchestration
- Input validation (e.g., I2C bus range)
- Multi-service parallel fetching
- Console error logging
- Response parsing and data transformation

**Test Categories:**
- Unit tests: Individual function behavior
- Regression tests: Known edge cases and bug fixes
- Integration tests: Multi-step workflows

**Running Tests:**
```bash
pnpm run test -- src/api/__tests__/config.test.ts
```

---

## Best Practices

### 1. Always Handle Both Error Modes

```typescript
try {
  const success = await enableService('mpd')
  if (!success) {
    // Handle API error (service operation failed)
    showNotification('Service operation failed')
  }
} catch (error) {
  // Handle network/auth error
  showNotification('Network error, please try again')
}
```

### 2. URL Encoding

The API automatically URL-encodes all path parameters:

```typescript
// These are equivalent:
await getConfigValue('audio/output')
await getConfigValue('audio%2Foutput')  // Calling code doesn't need to encode

// Service names with special characters
await enableService('my-service/instance')  // Automatically encoded
```

### 3. Secure Values

Always use secure mode for sensitive data:

```typescript
// Wrong: Credentials sent in plain
await setConfigValue('spotify_password', password)

// Right: Encrypted storage and transmission
await setConfigValue('spotify_password', password, true)

// Retrieving: Must use secure=true to get decrypted value
const secret = await getConfigValue('spotify_password', true)
```

### 4. Parallel Service Operations

Use `getMultipleServiceStatus` instead of calling in loop:

```typescript
// Inefficient: Sequential calls
for (const service of ['mpd', 'shairport']) {
  await getSystemdServiceStatus(service)
}

// Efficient: Parallel requests
const statusMap = await getMultipleServiceStatus(['mpd', 'shairport'])
```

### 5. Service Orchestration Primitives

Choose the right operation for your use case:

```typescript
// Single atomic operation
await executeSystemdOperation('mpd', 'restart')

// Combined workflow (enable + start)
await enableService('mpd')

// Atomic enable-start (single API call)
await enableNowService('mpd')
```

---

## Related Documentation

- [AppConfig Store](./appconfig-store.md) - Configuration store consumer
- [HTTP API Wrapper](./HTTP_API_WRAPPER.md) - Underlying fetch implementation
- [Auth API](./auth-api.md) - Authentication flow

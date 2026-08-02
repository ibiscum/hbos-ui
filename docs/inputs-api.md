# Inputs API (`inputs.ts`)

## Overview

The Inputs API module provides TypeScript interfaces and functions for interacting with the audiocontrol input device management service. It retrieves information about:

- **Bound input devices**: Devices successfully bound at startup with mapped keys
- **Unbound input devices**: Devices detected but not bound, with reasons
- **Last key press**: The most recent key press captured by the system
- **Configuration status**: Enable state, volume steps, grab mode, filters, etc.

**Version Compatibility**: audiocontrol 0.8.0+  
**Module Size**: ~80 lines  
**Dependencies**: 2 (apiFetch, useAppConfigStore)

---

## Architecture

### Type Hierarchy

```
InputsResponse
└── inputs: InputSource[]
    └── status: KeyboardInputStatus
        ├── devices: BoundInputDevice[]
        ├── unbound_devices?: UnboundInputDevice[]
        └── last_key: InputLastKey | null
```

### Data Structures

#### BoundInputDevice

Device that audiocontrol successfully bound at startup.

```typescript
interface BoundInputDevice {
  path: string           // Device path (e.g., "/dev/input/event0")
  name: string           // Human-readable device name
  matched_keys: string[] // Array of mapped key codes (e.g., ["KEY_VOLUMEUP"])
}
```

**Example**:
```json
{
  "path": "/dev/input/event0",
  "name": "USB Audio Controller",
  "matched_keys": ["KEY_VOLUMEUP", "KEY_VOLUMEDOWN", "KEY_PLAYPAUSE"]
}
```

**When This Occurs**:
- Device is present at startup
- Device has readable key events
- At least one key is mapped
- No permission issues

---

#### UnboundInputDevice

Device detected but not bound by audiocontrol.

```typescript
interface UnboundInputDevice {
  path: string                              // Device path (always present)
  name: string | null                       // Device name or null if unopenable
  reason: 'no_mapped_keys'                  // No mapped keys for this device
         | 'filtered_out'                   // Device filtered by configuration
         | 'permission_denied'              // No read permission on device
}
```

**Examples**:

```json
{
  "path": "/dev/input/event1",
  "name": "USB Mouse",
  "reason": "no_mapped_keys"
}
```

```json
{
  "path": "/dev/input/event2",
  "name": null,
  "reason": "permission_denied"
}
```

**Reasons Explained**:

| Reason | Meaning | Resolution |
|--------|---------|-----------|
| `no_mapped_keys` | Device has no mapped keys in configuration | Add key mappings for this device |
| `filtered_out` | Device matches exclude filter in settings | Update device filter settings |
| `permission_denied` | Cannot read from device file | Run audiocontrol with proper permissions |

---

#### InputLastKey

The most recent key press captured from any input device.

```typescript
interface InputLastKey {
  code: number          // Linux key code (e.g., 115 for KEY_VOLUMEUP)
  name: string | null   // Key name string or null if unknown
  action: string | null // Mapped action or null if not mapped
  device: string        // Device path that generated the key press
}
```

**Example**:
```json
{
  "code": 115,
  "name": "KEY_VOLUMEUP",
  "action": "increase_volume",
  "device": "/dev/input/event0"
}
```

**When Null**:
```json
{
  "code": 0,
  "name": null,
  "action": null,
  "device": ""
}
```

---

#### KeyboardInputStatus

Complete status of keyboard input handling.

```typescript
interface KeyboardInputStatus {
  enabled: boolean                  // Input monitoring enabled/disabled
  volume_step: number               // Volume step size for mapped keys
  grab: boolean                     // Whether devices are grabbed (exclusive access)
  device_filter: string             // Filter pattern for devices (e.g., "usb", "hidraw")
  mapped_keys: number               // Total count of mapped keys
  devices: BoundInputDevice[]       // Successfully bound devices
  unbound_devices?: UnboundInputDevice[] // Unbound devices (added in 0.8.1)
  last_key: InputLastKey | null     // Last key press or null
}
```

**Field Descriptions**:

- **enabled**: Whether input handling is active
- **volume_step**: Increment size for volume changes (typically 1-10%)
- **grab**: If true, devices are grabbed (exclusive) by audiocontrol
- **device_filter**: Filter regex or type for device selection
- **mapped_keys**: Sum of all matched_keys across all bound devices
- **unbound_devices**: Optional (absent in audiocontrol < 0.8.1)
- **last_key**: Most recent key press; null if no key pressed yet

**Example**:
```json
{
  "enabled": true,
  "volume_step": 5,
  "grab": false,
  "device_filter": "usb",
  "mapped_keys": 3,
  "devices": [...],
  "unbound_devices": [...],
  "last_key": {...}
}
```

---

#### InputSource

Represents a single input source (typically "Audiocontrol").

```typescript
interface InputSource {
  name: string               // Source name (e.g., "Audiocontrol")
  status: KeyboardInputStatus // Full status information
}
```

---

#### InputsResponse

API response containing all input sources.

```typescript
interface InputsResponse {
  inputs: InputSource[]  // Array of input sources
}
```

**Example**:
```json
{
  "inputs": [
    {
      "name": "Audiocontrol",
      "status": {
        "enabled": true,
        "volume_step": 5,
        "grab": false,
        "device_filter": "usb",
        "mapped_keys": 2,
        "devices": [...],
        "last_key": {...}
      }
    }
  ]
}
```

---

## API Functions

### getInputs()

Fetch current input device status from audiocontrol.

**Signature**:
```typescript
export const getInputs = async (): Promise<InputsResponse | null>
```

**Returns**:
- `InputsResponse`: Complete status on success
- `null`: Endpoint unavailable or error occurred

**Endpoint**: `GET /inputs` (via apiFetch)

**HTTP Errors Handled**:
- All 4xx and 5xx errors return `null`
- No exceptions thrown to caller

**Network Errors Handled**:
- Fetch failures return `null`
- JSON parse errors return `null`

---

## Usage Examples

### Basic Usage

```typescript
import { getInputs } from '@/api/inputs'

const status = await getInputs()

if (status) {
  console.log('Input sources:', status.inputs.length)
  console.log('Mapped keys:', status.inputs[0].status.mapped_keys)
} else {
  console.log('Inputs endpoint not available')
}
```

### Check if Input Handling is Enabled

```typescript
const status = await getInputs()

if (status?.inputs[0]?.status.enabled) {
  console.log('Input handling is active')
} else {
  console.log('Input handling is disabled')
}
```

### Get List of Bound Devices

```typescript
const status = await getInputs()

const devices = status?.inputs[0]?.status.devices || []

devices.forEach(device => {
  console.log(`Device: ${device.name}`)
  console.log(`Path: ${device.path}`)
  console.log(`Mapped keys: ${device.matched_keys.join(', ')}`)
})
```

### Handle Unbound Devices (audiocontrol 0.8.1+)

```typescript
const status = await getInputs()
const unboundDevices = status?.inputs[0]?.status.unbound_devices || []

unboundDevices.forEach(device => {
  if (device.reason === 'no_mapped_keys') {
    console.log(`${device.name} has no mapped keys`)
  } else if (device.reason === 'permission_denied') {
    console.log(`Cannot read from ${device.path} (permission denied)`)
  }
})
```

### React to Last Key Press

```typescript
const status = await getInputs()
const lastKey = status?.inputs[0]?.status.last_key

if (lastKey) {
  console.log(`Last key: ${lastKey.name}`)
  console.log(`Action: ${lastKey.action}`)
  console.log(`From device: ${lastKey.device}`)
}
```

### Check Configuration

```typescript
const status = await getInputs()
const cfg = status?.inputs[0]?.status

if (cfg) {
  console.log(`Volume step: ${cfg.volume_step}%`)
  console.log(`Device grab mode: ${cfg.grab}`)
  console.log(`Filter: ${cfg.device_filter}`)
}
```

### Polling for Status Updates

```typescript
// Poll every 2 seconds for status changes
const interval = setInterval(async () => {
  const status = await getInputs()
  
  if (status) {
    updateUI(status)
  } else {
    console.error('Failed to fetch input status')
  }
}, 2000)

// Cleanup when done
clearInterval(interval)
```

---

## Error Handling

### Graceful Degradation

The function returns `null` instead of throwing errors:

```typescript
// ✅ Correct: Always check for null
const status = await getInputs()
if (status) {
  // Use status
}

// ❌ Wrong: Don't assume success
const data = await getInputs()
data.inputs[0].status.enabled // Potential crash
```

### Common Scenarios

**Scenario 1: Endpoint Not Found**
- Occurs on: audiocontrol < 0.8.0
- Result: 404 error → returns `null`
- Handle: Check for `null` before accessing properties

```typescript
const status = await getInputs()
if (!status) {
  console.log('This device likely has audiocontrol < 0.8.0')
}
```

**Scenario 2: Network Failure**
- Occurs when: Server is down, network issues
- Result: Fetch error → returns `null`
- Handle: Retry with backoff or fallback UI

```typescript
const status = await getInputs()
if (!status) {
  // Retry or show offline message
}
```

**Scenario 3: Invalid Response JSON**
- Occurs when: Server returns malformed JSON
- Result: Parse error → returns `null`
- Handle: Log and report to monitoring

```typescript
const status = await getInputs()
if (!status) {
  console.error('Server returned invalid response')
  // Report to error tracking
}
```

---

## Version Compatibility

### audiocontrol 0.8.0-0.8.0
- ✅ `/inputs` endpoint available
- ❌ `unbound_devices` field absent

**Using in this version**:
```typescript
const status = await getInputs()
const unbound = status?.inputs[0]?.status.unbound_devices // Always undefined

if (unbound) {
  // Never executes in 0.8.0
}
```

### audiocontrol 0.8.1+
- ✅ `/inputs` endpoint available
- ✅ `unbound_devices` field present

**Using in this version**:
```typescript
const status = await getInputs()
const unbound = status?.inputs[0]?.status.unbound_devices // Array or undefined

unbound?.forEach(device => {
  console.log(`Unbound: ${device.name} (${device.reason})`)
})
```

### audiocontrol < 0.8.0
- ❌ `/inputs` endpoint not available
- Result: 404 error → returns `null`

**Detecting old version**:
```typescript
const status = await getInputs()
if (!status) {
  console.log('Inputs endpoint not available (version < 0.8.0?)')
}
```

---

## Design Decisions

### Why Return null Instead of Throwing?

The function returns `null` instead of throwing for several reasons:

1. **Graceful degradation**: Old audiocontrol versions don't have this endpoint
2. **Caller flexibility**: App can check and handle absence elegantly
3. **No try-catch required**: Simpler calling code for common case
4. **Consistent pattern**: Other API functions follow same pattern

### Why Optional unbound_devices?

The field is optional because:

1. **Backward compatibility**: Added in 0.8.1
2. **Type accuracy**: Reflects actual absence in older versions
3. **Clear intent**: Signals "may not exist" to TypeScript users

### Why TypeScript Interfaces?

Strong typing provides:

1. **IDE autocomplete**: Better developer experience
2. **Type checking**: Catch errors at compile time
3. **Documentation**: Interfaces serve as API documentation
4. **Refactoring safety**: Rename changes caught everywhere

---

## Performance Considerations

### Caching
- No built-in caching in this module
- Caller is responsible for caching if needed
- Typical cache duration: 1-5 seconds

### Polling
- Safe to call repeatedly
- No throttling or rate limiting applied
- Consider adding backoff for error cases

### Payload Size
- Response is typically < 10KB
- Includes all device information
- Suitable for polling every 1-2 seconds

---

## Testing

See [inputs-api-tests.md](./inputs-api-tests.md) for comprehensive test documentation.

**Test Coverage**:
- ✅ 37 unit/regression tests
- ✅ Type definitions (6 interfaces)
- ✅ Success cases (6 tests)
- ✅ HTTP errors (5 tests)
- ✅ Network errors (4 tests)
- ✅ JSON parsing (3 tests)
- ✅ URL construction (3 tests)
- ✅ Regression scenarios (7 tests)

---

## Related APIs

- [HTTP API Wrapper](./http-api-wrapper.md): Underlying fetch wrapper with CSRF/auth
- [App Config Store](./appconfig-store.md): Configuration and base URL storage
- [Audiocontrol API](https://github.com/hifiberry/audiocontrol): Backend service

---

## Troubleshooting

### No Input Devices Showing

**Possible causes**:
1. Audiocontrol not running
2. No USB input devices connected
3. Permission issues on device files
4. Devices filtered out by configuration

**Check**:
```typescript
const status = await getInputs()
if (!status?.inputs[0]) {
  console.log('No input source available')
  return
}

const cfg = status.inputs[0].status
console.log('Bound devices:', cfg.devices.length)
console.log('Unbound devices:', cfg.unbound_devices?.length || 0)

cfg.unbound_devices?.forEach(d => {
  console.log(`  - ${d.path}: ${d.reason}`)
})
```

### Last Key Not Updating

**Possible causes**:
1. No keys pressed since last check
2. Key is not mapped
3. Input handling disabled

**Check**:
```typescript
const status = await getInputs()
const cfg = status?.inputs[0]?.status

if (!cfg?.enabled) {
  console.log('Input handling is disabled')
  return
}

if (!cfg.last_key) {
  console.log('No keys pressed yet')
  return
}

console.log('Last key:', cfg.last_key.name, '→', cfg.last_key.action)
```

### Endpoint Not Found (404)

**Possible causes**:
1. Audiocontrol version < 0.8.0
2. Wrong base URL configured
3. Audiocontrol service not running

**Check**:
```typescript
const status = await getInputs()
if (!status) {
  console.log('Endpoint not available')
  console.log('Check: audiocontrol version >= 0.8.0')
  console.log('Check: base URL is correct')
  console.log('Check: audiocontrol service is running')
}
```

---

## Future Improvements

1. **Polling helper**: Built-in polling with backoff
2. **Caching layer**: Optional response caching
3. **WebSocket support**: Real-time updates instead of polling
4. **Key mapping API**: Configure key mappings via API
5. **Device management**: Add/remove/filter devices via API

---

## Changelog

### v1.0 (Current)
- Initial API module
- Support for audiocontrol 0.8.0+
- Comprehensive type definitions
- Null-safe error handling
- Optional unbound_devices support


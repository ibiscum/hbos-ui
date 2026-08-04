# PipeWire REST API Client Reference

## Overview

The PipeWire API module provides a TypeScript client for the PipeWire REST API. It supports connecting to PipeWire audio systems and managing audio topology, volume, links, equalization, and RIAA settings.

**Module**: `src/api/pipewire.ts`  
**Dependencies**: 
- `useAppConfigStore()` - For device IP, port, and proxy settings
- `apiFetch()` - HTTP wrapper with CSRF/auth handling

**API Server**: PipeWire REST API (typically running on device IP:2716)  
**API Documentation**: https://github.com/hifiberry/pipewire-api/tree/master/docs

---

## Architecture

### Connection Modes

```
┌─────────────────────────────────────────┐
│         PipeWire API Client              │
├──────────────────┬──────────────────────┤
│   Development    │   Production         │
│   (useProxy)     │   (direct)           │
├──────────────────┼──────────────────────┤
│ /api/pipewire/   │ http://deviceIP:    │
│ v1 (proxy to     │ 2716/api/pipewire/  │
│ backend)         │ v1 (direct)         │
└──────────────────┴──────────────────────┘
```

### Request Flow

```
Client Function
    ↓
apiRequest<T>(endpoint, options)
    ↓
getApiBaseUrl() (from config store)
    ↓
apiFetch() (with Content-Type header)
    ↓
Parse JSON Response
    ↓
Check response.ok
    ├─→ OK → Return data as T
    ├─→ Error → Return data as ApiError
    └─→ Network Error → Return { error: 'Network Error', message: ... }
```

### Error Handling

PipeWire API supports two error types:

**HTTP Errors** (non-2xx status codes):
```typescript
const result = await getVersion()
if (isApiError(result)) {
  // HTTP error occurred
  console.error(result.error, result.message)
}
```

**API Errors** (2xx response with error field):
```typescript
const result = await setVolumeById(1, 100)
// Response: { error: 'INVALID_VOLUME', message: 'Volume out of range' }
// Status: 200 OK
if (isApiError(result)) {
  // API validation error
  console.error(result.message)
}
```

---

## Type Definitions

### ApiError & ApiResponse

```typescript
interface ApiError {
  error: string      // Error code
  message: string    // Human-readable error message
}

type ApiResponse<T> = T | ApiError

function isApiError(response: unknown): response is ApiError
```

### Core Types

#### ApiEndpoint
Describes an available API endpoint.

```typescript
interface ApiEndpoint {
  path: string       // Endpoint path (e.g., "/version")
  methods: string[]  // HTTP methods (e.g., ["GET"])
  description: string // Human-readable description
}
```

#### ApiInfo
Response from `/api/pipewire/v1` listing all endpoints.

```typescript
interface ApiInfo {
  version: string     // API version (e.g., "1.0")
  endpoints: ApiEndpoint[]
}
```

#### VersionInfo
Response from `/api/pipewire/v1/version`.

```typescript
interface VersionInfo {
  version: string     // PipeWire version (e.g., "2.0.9")
  api_version: string // API version (e.g., "1.0")
}
```

#### PipewireObject
Represents a PipeWire object (node, device, port, etc).

```typescript
interface PipewireObject {
  id: number
  name: string
  type: 'node' | 'device' | 'port' | 'link' | 'client' | 'module' | 'factory'
}

interface PipewireObjectWithProperties extends PipewireObject {
  properties: Record<string, unknown>
}
```

### Volume Types

```typescript
interface VolumeInfo {
  id: number
  name: string
  object_type: 'device' | 'sink' | 'source'
  volume: number     // 0-100 (percentage)
}

interface VolumeSetResponse {
  volume: number
}

interface VolumeSaveResponse {
  success: true
  message: string
}

interface VolumeSaveByIdResponse extends VolumeSaveResponse {
  id: number
  name: string
  volume: number
}
```

### Link Types

```typescript
interface LinkInfo {
  id: number
  output_port_id: number
  output_port_name: string
  input_port_id: number
  input_port_name: string
}

interface LinksList {
  links: LinkInfo[]
}

interface PortInfo {
  id: number
  name: string
  node_name: string
  port_name: string
}

interface PortsList {
  ports: PortInfo[]
}

interface CreateLinkResponse {
  status: string
  message: string
  link_id: number
}

interface LinkExistsResponse {
  exists: boolean
  link_id?: number
}
```

### SpeakerEQ Types

```typescript
type EQType = 'off' | 'low_shelf' | 'high_shelf' | 'peaking' | 'low_pass' | 'high_pass' | 'band_pass' | 'notch' | 'all_pass'

interface EQBand {
  band: number
  type: EQType | string
  frequency: number
  q: number
  gain: number
  enabled?: boolean
}

interface SpeakerEQStatus {
  enabled: boolean
  master_gain_db: number
  crossbar: Record<string, number>
  inputs: ChannelStatus[]
  outputs: ChannelStatus[]
}

interface EQBandUpdateRequest {
  type?: EQType | string
  frequency?: number
  q?: number
  gain?: number
  enabled?: boolean
}
```

### RIAA Types

```typescript
interface RIAAConfig {
  gain_db: number
  subsonic_filter: number
  riaa_enable: boolean
  declick_enable: boolean
  spike_threshold_db: number
  spike_width_ms: number
  notch_filter_enable: boolean
  notch_frequency_hz: number
  notch_q_factor: number
}

interface RIAAGainSetRequest {
  gain_db: number
}

interface RIAASubsonicSetRequest {
  filter: number  // 0=Off, 1=20Hz, 2=30Hz, 3=40Hz
}

interface RIAASpikeSetRequest {
  threshold_db: number
  width_ms: number
}

interface RIAANotchSetRequest {
  enabled: boolean
  frequency_hz: number
  q_factor: number
}
```

---

## Core API Functions

### getVersion()

Get PipeWire and API version information.

```typescript
async getVersion(): Promise<ApiResponse<VersionInfo>>
```

**Example**:
```typescript
const versionInfo = await getVersion()
if (!isApiError(versionInfo)) {
  console.log(`PipeWire ${versionInfo.version}, API ${versionInfo.api_version}`)
}
```

### listEndpoints()

List all available API endpoints.

```typescript
async listEndpoints(): Promise<ApiResponse<ApiInfo>>
```

### listObjects()

List all PipeWire objects (nodes, devices, ports, links, clients, modules, factories).

```typescript
async listObjects(): Promise<ApiResponse<PipewireObjectsList>>
```

### getObjectById(id)

Get a specific PipeWire object by ID.

```typescript
async getObjectById(id: number): Promise<ApiResponse<PipewireObject>>
```

### refreshCache()

Refresh the internal PipeWire object cache.

```typescript
async refreshCache(): Promise<ApiResponse<CacheRefreshResponse>>
```

### getAllProperties()

Get all objects with their complete property dictionaries.

```typescript
async getAllProperties(): Promise<ApiResponse<PipewirePropertiesList>>
```

### getObjectProperties(id)

Get properties for a specific object.

```typescript
async getObjectProperties(id: number): Promise<ApiResponse<PipewireObjectWithProperties>>
```

---

## Volume API Functions

### listVolumes()

List all devices and sinks with volume control.

```typescript
async listVolumes(): Promise<ApiResponse<VolumeInfo[]>>
```

**Example**:
```typescript
const volumes = await listVolumes()
if (!isApiError(volumes)) {
  volumes.forEach(v => console.log(`${v.name}: ${v.volume}%`))
}
```

### getVolumeById(id)

Get volume information for a specific device or sink.

```typescript
async getVolumeById(id: number): Promise<ApiResponse<VolumeInfo>>
```

### setVolumeById(id, volume)

Set the volume for a specific device or sink (0-100).

```typescript
async setVolumeById(
  id: number,
  volume: number
): Promise<ApiResponse<VolumeSetResponse>>
```

**Example**:
```typescript
const result = await setVolumeById(5, 75)
if (!isApiError(result)) {
  console.log(`Volume set to ${result.volume}%`)
}
```

### saveAllVolumes()

Save the current volumes of all devices and sinks to persistent storage.

```typescript
async saveAllVolumes(): Promise<ApiResponse<VolumeSaveResponse>>
```

### saveVolumeById(id)

Save the current volume of a specific device or sink.

```typescript
async saveVolumeById(id: number): Promise<ApiResponse<VolumeSaveByIdResponse>>
```

---

## Links API Functions

### listLinks()

List all active PipeWire links (connections between ports).

```typescript
async listLinks(): Promise<ApiResponse<LinksList>>
```

### createLink(output, input)

Create a link between two ports.

```typescript
async createLink(
  output: string,
  input: string
): Promise<ApiResponse<CreateLinkResponse>>
```

**Example**:
```typescript
const link = await createLink('speaker:output_FL', 'dac:input_L')
if (!isApiError(link)) {
  console.log(`Link created with ID ${link.link_id}`)
}
```

### removeLinkById(id)

Remove a link by its ID.

```typescript
async removeLinkById(id: number): Promise<ApiResponse<RemoveLinkResponse>>
```

### removeLinkByName(output, input)

Remove a link by specifying output and input ports.

```typescript
async removeLinkByName(
  output: string,
  input: string
): Promise<ApiResponse<RemoveLinkResponse>>
```

### linkExists(output, input)

Check if a link exists between two ports.

```typescript
async linkExists(
  output: string,
  input: string
): Promise<ApiResponse<LinkExistsResponse>>
```

### listOutputPorts()

List all available output (playback) ports.

```typescript
async listOutputPorts(): Promise<ApiResponse<PortsList>>
```

### listInputPorts()

List all available input (capture) ports.

```typescript
async listInputPorts(): Promise<ApiResponse<PortsList>>
```

---

## Graph API Functions

### getGraphDot()

Get audio topology in DOT format for visualization.

```typescript
async getGraphDot(): Promise<string>
```

**Returns**: Raw DOT format string (not JSON)

**Example**:
```typescript
const dot = await getGraphDot()
// Can be rendered with Graphviz
```

### getGraphPng()

Get audio topology as PNG image.

```typescript
async getGraphPng(): Promise<Blob>
```

**Returns**: Binary PNG blob (not JSON)

**Example**:
```typescript
const png = await getGraphPng()
const url = URL.createObjectURL(png)
const img = new Image()
img.src = url
document.body.appendChild(img)
```

---

## SpeakerEQ Module API

### getSpeakerEQStructure()

Get the overall structure of the SpeakerEQ plugin.

```typescript
async getSpeakerEQStructure(): Promise<ApiResponse<SpeakerEQStructure>>
```

### getSpeakerEQStatus()

Get the complete status of the SpeakerEQ plugin.

```typescript
async getSpeakerEQStatus(): Promise<ApiResponse<SpeakerEQStatus>>
```

### getSpeakerEQBand(block, band)

Get a specific EQ band configuration.

```typescript
async getSpeakerEQBand(
  block: string,
  band: number
): Promise<ApiResponse<EQBandResponse>>
```

### setSpeakerEQBand(block, band, config)

Update a specific EQ band.

```typescript
async setSpeakerEQBand(
  block: string,
  band: number,
  config: EQBandUpdateRequest
): Promise<ApiResponse<EQBandUpdateResponse>>
```

**Example**:
```typescript
const result = await setSpeakerEQBand('eq1', 0, {
  type: 'peaking',
  frequency: 1000,
  q: 1,
  gain: 3,
})
```

### setSpeakerEQBandEnabled(block, band, enabled)

Enable or disable a specific EQ band.

```typescript
async setSpeakerEQBandEnabled(
  block: string,
  band: number,
  enabled: boolean
): Promise<ApiResponse<EQBandEnabledResponse>>
```

### clearSpeakerEQBlock(block)

Clear all EQ bands in a block (reset to default).

```typescript
async clearSpeakerEQBlock(block: string): Promise<ApiResponse<EQClearResponse>>
```

### Gain Functions

```typescript
// Master gain
async getSpeakerEQMasterGain(): Promise<ApiResponse<GainResponse>>
async setSpeakerEQMasterGain(gain: number): Promise<ApiResponse<GainSetResponse>>

// Input gain per channel
async getSpeakerEQInputGain(channel: number): Promise<ApiResponse<GainResponse>>
async setSpeakerEQInputGain(channel: number, gain: number): Promise<ApiResponse<GainSetResponse>>

// Output gain per channel
async getSpeakerEQOutputGain(channel: number): Promise<ApiResponse<GainResponse>>
async setSpeakerEQOutputGain(channel: number, gain: number): Promise<ApiResponse<GainSetResponse>>
```

### Delay Functions

```typescript
// Get all delays
async getSpeakerEQDelays(): Promise<ApiResponse<DelaysResponse>>

// Set delay for a specific channel
async setSpeakerEQDelay(
  channel: number,
  ms: number
): Promise<ApiResponse<DelaySetResponse>>
```

### Crossbar Functions

```typescript
// Get routing matrix
async getSpeakerEQCrossbar(): Promise<ApiResponse<CrossbarMatrix>>

// Set entire matrix
async setSpeakerEQCrossbarMatrix(
  matrix: number[][]
): Promise<ApiResponse<CrossbarMatrix>>

// Set single value
async setSpeakerEQCrossbar(
  input: number,
  output: number,
  value: number
): Promise<ApiResponse<CrossbarSetResponse>>
```

### Enable/Disable & License

```typescript
// Enable status
async getSpeakerEQEnabled(): Promise<ApiResponse<EnableStatusResponse>>
async setSpeakerEQEnabled(enabled: boolean): Promise<ApiResponse<EnableSetResponse>>

// License status
async getSpeakerEQLicense(): Promise<ApiResponse<LicenseResponse>>

// Refresh cache & reset
async refreshSpeakerEQCache(): Promise<ApiResponse<RefreshResponse>>
async resetSpeakerEQToDefaults(): Promise<ApiResponse<DefaultResponse>>
```

---

## RIAA Module API

### Configuration

```typescript
async getRIAAConfig(): Promise<ApiResponse<RIAAConfig>>
```

### Gain

```typescript
async getRIAAGain(): Promise<ApiResponse<RIAAGainResponse>>
async setRIAAGain(gain_db: number): Promise<ApiResponse<RIAAGainSetResponse>>
```

### Subsonic Filter

```typescript
async getRIAASubsonic(): Promise<ApiResponse<RIAASubsonicResponse>>
async setRIAASubsonic(filter: number): Promise<ApiResponse<RIAASubsonicSetResponse>>
// filter: 0=Off, 1=20Hz, 2=30Hz, 3=40Hz
```

### RIAA Enable/Disable

```typescript
async getRIAAEnabled(): Promise<ApiResponse<RIAAEnableResponse>>
async setRIAAEnabled(enabled: boolean): Promise<ApiResponse<RIAAEnableSetResponse>>
```

### Declicker

```typescript
async getRIAADeclick(): Promise<ApiResponse<RIAAEnableResponse>>
async setRIAADeclick(enabled: boolean): Promise<ApiResponse<RIAAEnableSetResponse>>
```

### Spike Detection

```typescript
async getRIAASpike(): Promise<ApiResponse<RIAASpikeResponse>>
async setRIAASpike(
  threshold_db: number,
  width_ms: number
): Promise<ApiResponse<RIAASpikeSetResponse>>
```

### Notch Filter

```typescript
async getRIAANotch(): Promise<ApiResponse<RIAANotchResponse>>
async setRIAANotch(
  enabled: boolean,
  frequency_hz: number,
  q_factor: number
): Promise<ApiResponse<RIAANotchSetResponse>>
```

### Reset

```typescript
async resetRIAAToDefaults(): Promise<ApiResponse<DefaultResponse>>
```

---

## Usage Examples

### Complete Volume Control Flow

```typescript
import { 
  listVolumes, 
  setVolumeById, 
  saveVolumeById,
  isApiError 
} from '@/api/pipewire'

export async function adjustVolume(volumePercent: number) {
  // 1. Get current volumes
  const volumes = await listVolumes()
  if (isApiError(volumes)) {
    throw new Error(`Failed to list volumes: ${volumes.message}`)
  }

  // 2. Set volume for each device
  for (const vol of volumes) {
    const result = await setVolumeById(vol.id, volumePercent)
    if (isApiError(result)) {
      console.warn(`Failed to set volume for ${vol.name}: ${result.message}`)
    }
  }

  // 3. Save volumes
  const saved = await saveVolumeById(volumes[0].id)
  if (!isApiError(saved)) {
    console.log('Volumes saved')
  }
}
```

### EQ Configuration Example

```typescript
import { setSpeakerEQBand, isApiError } from '@/api/pipewire'

export async function applyBoost() {
  // Boost bass (EQ band 0, typically lowest frequencies)
  const result = await setSpeakerEQBand('eq1', 0, {
    frequency: 100,
    q: 0.7,
    gain: 3,
    enabled: true,
  })

  if (isApiError(result)) {
    console.error(`Failed to apply EQ: ${result.message}`)
  } else {
    console.log('Bass boosted')
  }
}
```

### Link Management Example

```typescript
import { createLink, linkExists, isApiError } from '@/api/pipewire'

export async function ensureLink(output: string, input: string) {
  // Check if link already exists
  const exists = await linkExists(output, input)
  if (!isApiError(exists) && exists.exists) {
    console.log(`Link already exists with ID ${exists.link_id}`)
    return exists.link_id
  }

  // Create new link
  const result = await createLink(output, input)
  if (isApiError(result)) {
    throw new Error(`Failed to create link: ${result.message}`)
  }

  return result.link_id
}
```

---

## Error Handling

### API Error Checking

```typescript
import { isApiError, getVersion } from '@/api/pipewire'

const result = await getVersion()

if (isApiError(result)) {
  // Type guard ensures result is ApiError
  console.error(`Error [${result.error}]: ${result.message}`)
} else {
  // Type guard ensures result is VersionInfo
  console.log(`Version: ${result.version}`)
}
```

### Common Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| INVALID_VOLUME | Volume out of range | Use 0-100 |
| NOT_FOUND | Object/link not found | Verify IDs |
| INVALID_REQUEST | Malformed request | Check parameters |
| SERVICE_ERROR | Backend error | Retry or check logs |
| Network Error | Connection failed | Check connection |

---

## Connection Configuration

### Development (with Proxy)

```typescript
// Config store setup
{
  audiocontrol_api: {
    deviceIP: 'localhost',
    devicePort: 9999,
    useProxy: true  // Use /api/pipewire/v1
  }
}
```

URL: `{window.location.origin}/api/pipewire/v1`

### Production (Direct)

```typescript
{
  audiocontrol_api: {
    deviceIP: '192.168.1.100',
    devicePort: 2716,
    useProxy: false  // Direct connection
  }
}
```

URL: `http://192.168.1.100:2716/api/pipewire/v1`

---

## Performance Considerations

### Caching

The PipeWire API does not cache responses. Each call makes a fresh HTTP request.

Use `refreshCache()` to clear the backend's internal object cache if needed.

### Batch Operations

For multiple volume changes:

```typescript
// Instead of calling setVolumeById in a loop
const devices = await listVolumes()
for (const dev of devices) {
  await setVolumeById(dev.id, 75)
}

// Better: batch-like pattern (API doesn't support true batch)
// The calls are still sequential but cleaner
```

### Timeout Handling

Requests use the `apiFetch` wrapper which has timeout and retry logic:
- CSRF token refresh on 401
- Silent retry for network errors
- Session management

---

## Testing

The module includes 84 comprehensive tests covering:
- All API functions
- Error scenarios
- Different HTTP methods
- Request format validation
- Response parsing
- Error detection

See `docs/pipewire-api-tests.md` for detailed test documentation.

---

## See Also

- [PipeWire Tests](pipewire-api-tests.md) - Test documentation
- [PipeWire Code Review](pipewire-api-review.md) - Code quality analysis
- [HTTP API Wrapper](http-api-wrapper.md) - Underlying fetch implementation
- [PipeWire GitHub](https://github.com/hifiberry/pipewire-api) - Official documentation


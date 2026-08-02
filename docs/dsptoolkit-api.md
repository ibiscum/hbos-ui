# DSP Toolkit API Documentation

## Overview

The DSP Toolkit API (`src/api/dsptoolkit.ts`) provides a comprehensive interface for interacting with the HiFiBerry DSP hardware and its configuration. It includes functions for hardware detection, memory access, filter configuration, register operations, and profile management.

## Architecture

### Core Request Handlers

The API is built on unified request handlers to ensure consistent error handling and timeout behavior across all operations:

#### `jsonRequest<T>(endpoint, options, timeout)`
- **Purpose**: Unified handler for all JSON API requests
- **Timeout**: Configurable (default: 10 seconds for standard operations, 90 seconds for long-running operations)
- **Error Handling**:
  - HTTP errors: Formatted as `HTTP {status}: {statusText}`
  - Timeouts: `Request timeout` or `Request timeout (exceeded {seconds} seconds)`
  - Service unavailable: Detects HTML error pages and throws `HiFiBerry DSP software not available`
  - JSON parsing errors: Also throws `HiFiBerry DSP software not available`

#### Legacy Aliases
- `apiRequest()` - Calls `jsonRequest()` with default timeout (10 seconds)
- `longApiRequest()` - Calls `jsonRequest()` with custom timeout (defaults to 90 seconds)

### Non-JSON Endpoints

#### `getDSPProfile()`
- **Returns**: DSP profile as XML text (not JSON)
- **Error Handling**: Same as JSON endpoints but for text responses
- **HTML Detection**: Validates response is not an error page
- **Backwards Compatible**: Error message format preserved for existing tests

## API Endpoints

### Hardware Detection

#### `getDetectedDSP(): Promise<DetectedDSP>`
Checks if a DSP is detected and available on the system.

```typescript
interface DetectedDSP {
  detected_dsp: string   // e.g., "ADAU1701"
  status: 'detected' | 'not_detected'
}
```

**Example**:
```typescript
const dsp = await getDetectedDSP()
if (dsp.status === 'detected') {
  console.log(`DSP found: ${dsp.detected_dsp}`)
}
```

### Metadata API

#### `getMetadata(params?): Promise<DSPMetadata>`
Retrieves DSP metadata and system information.

```typescript
interface DSPMetadata {
  checksum: string
  _system?: {
    profileName: string
    profileVersion: string
    sampleRate: number
  }
  [key: string]: unknown  // Additional dynamic metadata
}
```

**Parameters**:
- `start?: string` - Filter start address (e.g., '0x1000', 'IIR_')
- `filter?: 'biquad'` - Filter by filter type

**Example**:
```typescript
const metadata = await getMetadata({ filter: 'biquad' })
console.log(`Profile: ${metadata._system?.profileName}`)
```

### Memory Access API

#### `readMemory(address, length?, format?): Promise<MemoryReadResponse>`
Reads raw memory from DSP hardware.

**Parameters**:
- `address: string` - Memory address (e.g., '0x1000')
- `length?: number` - Number of values to read (default: 1)
- `format?: 'hex' | 'int' | 'float'` - Value format

**Returns**:
```typescript
interface MemoryReadResponse {
  address: string
  values: string[] | number[]
}
```

**Example**:
```typescript
const data = await readMemory('0x2000', 4, 'hex')
console.log(`Read ${data.values.length} values from ${data.address}`)
```

#### `writeMemory(request): Promise<MemoryWriteResponse>`
Writes raw memory to DSP hardware.

**Parameters**:
```typescript
interface MemoryWriteRequest {
  address: string
  value: string | number | (string | number)[]
  store?: boolean  // Persist to non-volatile memory
}
```

**Returns**:
```typescript
interface MemoryWriteResponse {
  address: string
  values: (string | number)[]
  status: 'success'
  stored?: boolean
}
```

**Example**:
```typescript
await writeMemory({
  address: '0x2000',
  value: [0xFF, 0xAA, 0xBB],
  store: true
})
```

### Biquad Filter API

#### `setBiquadFilter(request): Promise<BiquadResponse>`
Configures biquad IIR filters on the DSP.

**Supported Filter Types**:
- `PeakingEq` - Peaking EQ filter
- `LowPass` - Low-pass filter
- `HighPass` - High-pass filter
- `LowShelf` - Low-shelf filter
- `HighShelf` - High-shelf filter
- `Volume` - Volume adjustment
- `GenericBiquad` - Raw coefficient-based filter

**Example**:
```typescript
const response = await setBiquadFilter({
  address: '0x3000',
  sampleRate: 48000,
  filter: {
    type: 'PeakingEq',
    f: 1000,      // Frequency in Hz
    db: 6,        // Gain in dB
    q: 0.707      // Q factor
  }
})
```

**Coefficients**:
```typescript
interface FilterCoefficients {
  a0: number
  a1: number
  a2: number
  b0: number
  b1: number
  b2: number
}
```

### Register Access API

#### `readRegister(address, length?): Promise<RegisterReadResponse>`
Reads hardware registers.

```typescript
interface RegisterReadResponse {
  address: string
  values: string[]
}
```

#### `writeRegister(request): Promise<RegisterWriteResponse>`
Writes to hardware registers.

**Example**:
```typescript
await writeRegister({
  address: '0x1000',
  value: '0x12345678'
})
```

### Frequency Response API

#### `calculateFrequencyResponse(request): Promise<FrequencyResponseResponse>`
Calculates frequency response of configured filters.

**Parameters**:
```typescript
interface FrequencyResponseRequest {
  filters: DSPFilter[]
  frequencies?: number[]        // Custom frequency points
  pointsPerOctave?: number       // Resolution for auto-generated points
}
```

**Returns**:
```typescript
interface FrequencyResponseResponse {
  frequencies: number[]
  response: number[]  // Magnitude response in dB
}
```

**Example**:
```typescript
const response = await calculateFrequencyResponse({
  filters: [
    { type: 'LowPass', f: 5000, db: 0, q: 0.707 }
  ],
  pointsPerOctave: 12
})
```

### Cache Management API

#### `getCacheStatus(): Promise<CacheStatus>`
Returns the status of DSP profile and metadata caches.

#### `clearCache(): Promise<{ status: string }>`
Clears all cached profiles and metadata.

### DSP Profile Management

#### `getDSPProfile(): Promise<string>`
Retrieves the current DSP profile as XML text.

```typescript
const xml = await getDSPProfile()
console.log(xml)  // Raw XML content
```

#### `updateDSPProfile(request): Promise<DSPProfileUpdateResponse>`
Updates the DSP profile with a new configuration.

**Long-running operation**: 90-second timeout

**Parameters**:
```typescript
interface DSPProfileUpdateRequest {
  xml?: string      // Inline XML content
  file?: string     // File path
  url?: string      // Remote URL
}
```

**Returns**:
```typescript
interface DSPProfileUpdateResponse {
  status: 'success'
  message: string
  checksum: {
    memory: string    // Current memory checksum
    profile: string   // New profile checksum
    match: boolean    // Whether checksums match
  }
}
```

#### `getDSPProfilesMetadata(): Promise<DSPProfilesMetadataResponse>`
Lists available DSP profiles and their metadata.

```typescript
interface DSPProfile {
  sampleRate: string
  profileName: string
  profileVersion: string
  programID: string
  modelName: string
  checksum: string
  _system: {
    profileName: string
    profileVersion: string
    sampleRate: number
    filename: string
    filepath: string
  }
  [key: string]: unknown
}
```

### Program Info API

#### `getDSPProgramChecksum(): Promise<DSPProgramChecksumResponse>`
Gets the checksum of the current DSP program.

```typescript
interface DSPProgramChecksumResponse {
  checksum: string
  format: 'md5'
}
```

#### `getDSPProgramInfo(): Promise<DSPProgramInfo>`
Gets detailed program information.

```typescript
interface DSPProgramInfo {
  program_length: number
  checksums: {
    md5: string
    sha1: string
  }
}
```

### Filter Store API

#### `getStoredFilters(params?): Promise<FilterStoreResponse>`
Retrieves stored filter configurations.

**Parameters**:
- `checksum?: string` - Filter by checksum
- `current?: boolean` - Get current filters only

#### `storeFilters(request): Promise<FilterStoreDeleteResponse>`
Stores filter configurations.

**Parameters**:
```typescript
interface FilterStoreRequest {
  checksum?: string
  filters: Array<{
    address: string
    offset?: number
    filter: DSPFilter | FilterCoefficients
  }>
}
```

#### `deleteStoredFilters(params): Promise<FilterStoreDeleteResponse>`
Deletes stored filter configurations.

**Parameters**:
- `checksum?: string` - Delete by checksum
- `address?: string` - Delete by address
- `all?: boolean` - Delete all

### Filter Bypass API

#### `setFilterBypassState(request): Promise<FilterBypassSetResponse>`
Controls filter bypass state (individual or bank level).

**Parameters**:
```typescript
interface FilterBypassSetRequest {
  address: string
  bypassed: boolean
  offset?: number       // For individual filter bypass
  checksum?: string
  bank?: boolean        // For bank-level bypass
}
```

**Returns**:
```typescript
interface FilterBypassSetResponse {
  status: 'success'
  message: string
  checksum: string
  address: string
  offset?: number
  bypassed: boolean
  bank_mode?: boolean      // Set when bank bypass is used
  total_filters?: number   // Count of filters in bank
  successful?: number      // Number of successful operations
}
```

#### `setFilterBankBypassState(bankAddress, bypassed, checksum?): Promise<FilterBypassSetResponse>`
Convenience function to bypass an entire filter bank.

**Example**:
```typescript
await setFilterBankBypassState('0x1000', true, 'abc123')
```

#### `setIndividualFilterBypassState(bankAddress, filterOffset, bypassed, checksum?): Promise<FilterBypassSetResponse>`
Convenience function to bypass a single filter within a bank.

**Example**:
```typescript
await setIndividualFilterBypassState('0x1000', 2, false, 'abc123')
```

### Channel Settings API

Convenience wrappers for reading/writing per-channel DSP settings.

#### `readChannelDelay(address): Promise<number>`
Reads channel delay in samples.

#### `writeChannelDelay(address, samples): Promise<void>`
Writes channel delay (automatically rounded to integer samples).

#### `readChannelLevel(address): Promise<number>`
Reads channel gain level (linear scale).

#### `writeChannelLevel(address, linearGain): Promise<void>`
Writes channel gain level.

**Note**: Integer values are automatically nudged (e.g., `1` → `1.0000001`) to ensure proper JSON serialization as floats.

#### `readChannelInvert(address): Promise<boolean>`
Reads channel invert status.

#### `writeChannelInvert(address, inverted): Promise<void>`
Sets channel invert status.

#### `readChannelSelect(address): Promise<number>`
Reads channel select mode.

#### `writeChannelSelect(address, mode): Promise<void>`
Sets channel select mode.

### DSP Toolkit Status Check

#### `checkDSPToolkit(): Promise<DSPToolkitStatus>`
Checks if DSP toolkit is available and functional.

**Returns**: `'yes' | 'no' | 'backend_error'`

**Example**:
```typescript
const status = await checkDSPToolkit()
switch (status) {
  case 'yes':
    console.log('DSP is detected and available')
    break
  case 'no':
    console.log('DSP not detected')
    break
  case 'backend_error':
    console.log('Backend communication error')
    break
}
```

**Deprecated Alias**: `check_dsp_toolkit()` (use `checkDSPToolkit()` instead)

## Error Handling

All API functions throw errors on failure. Common error messages include:

- `HTTP {status}: {statusText}` - HTTP errors
- `Request timeout` - Standard timeout (10 seconds)
- `Request timeout (exceeded {seconds} seconds)` - Long-running operation timeout
- `HiFiBerry DSP software not available` - Backend unavailable or HTML error response
- `Invalid response format from DSP service` - Non-JSON response when JSON expected

**Example Error Handling**:
```typescript
try {
  const metadata = await getMetadata()
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Request timeout')) {
      console.log('Request took too long')
    } else if (error.message.includes('HTTP 5')) {
      console.log('Server error')
    } else {
      console.log('Other error:', error.message)
    }
  }
}
```

## Implementation Notes

### Query Parameter Building

Query parameters are built using `URLSearchParams` and only appended when parameters are provided:

```typescript
const queryParams = new URLSearchParams()
if (params?.checksum) queryParams.append('checksum', params.checksum)
const query = queryParams.toString()
const endpoint = query ? `/filters?${query}` : '/filters'
```

This ensures no trailing `?` when no parameters are present.

### Timeout Behavior

- **Standard Operations**: 10-second timeout (constants `API_TIMEOUT`)
- **Long-running Operations**: 90-second timeout (constant `DSP_PROFILE_DEPLOYMENT_TIMEOUT`)
- **Abort Handling**: Uses `AbortController` with proper cleanup in both success and error paths

### Integer Float Conversion

The `writeChannelLevel()` function handles a DSP toolkit quirk:
- JSON integers (e.g., `1`) are interpreted as raw memory words
- Floats (e.g., `1.0`) are interpreted correctly
- Solution: Exact integers are nudged by 1e-7 to force JSON serialization with decimal point

```typescript
const value = Number.isInteger(linearGain) ? linearGain + 1e-7 : linearGain
```

### Response Validation

All JSON endpoints validate:
1. HTTP status is successful (200-299)
2. Content-Type header includes 'application/json'
3. If content-type is missing or response is HTML, treat as service unavailable
4. JSON parsing errors are treated as service unavailable

This ensures robust error detection when the backend service is down.

## Testing

Comprehensive test coverage includes:
- **Unit Tests**: Each API function with success/failure scenarios
- **Regression Tests**: Edge cases like empty query parameters, HTML error responses
- **Timeout Tests**: Simulating timeout conditions
- **Error Handling**: Various error types and messages

Test file: `src/__tests__/api/dsptoolkit.test.ts`

## Configuration

The API base URL is obtained from `useAppConfigStore().getDSPToolkitApiBaseUrl()`.

This allows environment-specific configuration and can be overridden in application settings.

## Backwards Compatibility

- `check_dsp_toolkit()` is aliased to `checkDSPToolkit()` for backwards compatibility
- Error messages are preserved for existing tests and integrations
- Legacy function aliases (`apiRequest`, `longApiRequest`) are maintained

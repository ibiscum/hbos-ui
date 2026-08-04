# RoomEQ API Documentation

## Overview

The RoomEQ API (`src/api/roomeq.ts`) provides comprehensive TypeScript functions for room equalization measurement, analysis, and optimization. It handles:

- **Audio Device Management**: Microphone and audio input detection
- **Signal Generation**: Noise playback, sine sweep generation, and pre-recorded signal playback
- **Recording & Analysis**: Audio recording, FFT analysis, and room response measurements
- **EQ Optimization**: Target curve management, optimizer preset selection, and filter generation
- **Version Management**: API version checking and capability detection
- **Error Handling**: Consistent error responses with fallback strategies

**Module**: `src/api/roomeq.ts`  
**Type Support**: Full TypeScript with strict type checking  
**State Management**: Pinia (`useAppConfigStore`)  
**HTTP Client**: `apiFetch` wrapper with Content-Type application/json  
**Test Coverage**: `src/api/__tests__/roomeq.test.ts`, `src/api/__tests__/roomeq-comprehensive.test.ts`

---

## Key Constants

### ROOMEQ_MINIMUM_VERSION
```typescript
export const ROOMEQ_MINIMUM_VERSION = '0.6.0'
```
Minimum required version of the RoomEQ API server. Used for capability checking before optimization operations.

### PRERECORDED_SWEEP_SIGNAL
```typescript
export const PRERECORDED_SWEEP_SIGNAL = 'sweep_10hz_22000hz_10s.wav'
```
Filename of the pre-recorded logarithmic sine sweep signal for room measurements.

---

## Core Response Types

### RoomEQApiEnvelope<T>
Universal API response wrapper used by all functions:

```typescript
interface RoomEQApiEnvelope<T = unknown> {
  success?: boolean      // Operation success status
  detail?: string        // Error message (on failure)
  data?: T               // Response payload (on success)
}
```

**Usage Pattern**:
```typescript
const result = await getRoomEQVersion()
if (result.success) {
  console.log(result.data?.version)  // Safe data access
} else {
  console.error(result.detail)       // Error message
}
```

---

## API Functions by Category

### Info & Version Functions

#### getRoomEQInfo()
Fetches API information and available endpoints.

**Signature**:
```typescript
async getRoomEQInfo(): Promise<RoomEQApiEnvelope<RoomEQApiInfo>>
```

**Returns**:
- `success`: true if endpoint is available
- `data.endpoints`: Available REST endpoints grouped by category
- `data.version`: API version string
- `data.description`: API description

**Example**:
```typescript
const info = await getRoomEQInfo()
if (info.success && info.data?.endpoints) {
  console.log('Available endpoints:', info.data.endpoints.measurements)
}
```

#### getRoomEQVersion()
Fetches the RoomEQ API version and features.

**Signature**:
```typescript
async getRoomEQVersion(): Promise<RoomEQApiEnvelope<RoomEQVersionInfo>>
```

**Returns**:
- `data.version`: Semver version string (e.g., '1.0.0')
- `data.api_name`: API name identifier
- `data.features`: Array of supported features

**Error Handling**: Detects HTML responses (proxy configuration issues) and returns appropriate error.

#### isVersionAtLeast(version1, version2)
Compares semantic versions. Returns `true` if version1 >= version2.

**Signature**:
```typescript
function isVersionAtLeast(version1: string, version2: string): boolean
```

**Examples**:
```typescript
isVersionAtLeast('1.2.3', '1.2.3')  // true (equal)
isVersionAtLeast('1.2.4', '1.2.3')  // true (greater)
isVersionAtLeast('1.2.2', '1.2.3')  // false (less)
isVersionAtLeast('1.2', '1.2.0')    // true (missing component = 0)
```

**Note**: Handles missing version components gracefully (treats as 0).

#### checkRoomEQVersionRequirement()
Validates that the API version meets minimum requirements.

**Signature**:
```typescript
async checkRoomEQVersionRequirement(): Promise<{
  success: boolean
  error?: string
  currentVersion?: string
}>
```

**Behavior**:
- Passes if API version >= `ROOMEQ_MINIMUM_VERSION`
- In development mode, failures are warnings (allow proceeding)
- In production, version mismatch returns `success: false`

---

### Audio Devices & Microphones

#### getRoomEQMicrophones()
Fetches list of connected microphones with detailed properties.

**Signature**:
```typescript
async getRoomEQMicrophones(): Promise<RoomEQApiEnvelope<RoomEQMicrophone[]>>
```

**Returns Array of**:
```typescript
{
  card_index: number           // ALSA card index
  device_name: string          // Human-readable device name
  sensitivity: number          // Sensitivity in dBV/Pa
  sensitivity_str: string      // Formatted sensitivity string
  gain_db: number              // Current gain in dB
}
```

**Error Handling**: Detects non-JSON responses and returns appropriate error.

#### getRoomEQAudioInputs()
Fetches available audio input cards.

**Signature**:
```typescript
async getRoomEQAudioInputs(): Promise<RoomEQApiEnvelope<RoomEQAudioInputs>>
```

**Returns**:
```typescript
{
  input_cards: number[]  // Array of ALSA card indices
  count: number          // Total count
}
```

#### getRoomEQAudioCards()
Fetches all available ALSA audio cards.

**Signature**:
```typescript
async getRoomEQAudioCards(): Promise<RoomEQApiEnvelope<RoomEQAudioCards>>
```

**Returns**:
```typescript
{
  cards: string[]  // Array of ALSA device names (e.g., ['hw:0', 'hw:1'])
  count: number    // Total count
}
```

---

### Signal Generation & Playback

#### startRoomEQNoise(amplitude?, duration?)
Starts white noise playback for room measurement.

**Signature**:
```typescript
async startRoomEQNoise(
  amplitude: number = 0.5,    // Amplitude 0.0-1.0
  duration: number = 3.0      // Duration in seconds
): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>>
```

**Parameters**:
- `amplitude`: Playback volume (default 0.5)
- `duration`: Noise duration in seconds (default 3.0)

**Returns**:
```typescript
{
  message: string      // Status message
  status: string       // 'playing', 'stopped', etc.
  filename?: string    // Generated noise filename
  amplitude?: number   // Actual amplitude used
}
```

**Example**:
```typescript
const noise = await startRoomEQNoise(0.7, 10)
if (noise.success) {
  console.log(`Noise playing: ${noise.data?.filename}`)
}
```

#### stopRoomEQNoise()
Stops active noise playback.

**Signature**:
```typescript
async stopRoomEQNoise(): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>>
```

#### getRoomEQNoiseStatus()
Fetches current noise playback status.

**Signature**:
```typescript
async getRoomEQNoiseStatus(): Promise<RoomEQApiEnvelope<RoomEQNoiseStatus>>
```

**Returns**:
```typescript
{
  active: boolean              // Is noise currently playing
  signal_type?: 'noise' | 'sine_sweep'
  amplitude: number            // Current amplitude
  device: string              // Output device
  remaining_seconds: number   // Time until stop
  stop_time: string           // ISO timestamp when noise stops
  // Additional fields for sweep signals
  start_freq?: number         // For sweep signals
  end_freq?: number
  sweeps?: number
  duration?: number
}
```

#### keepRoomEQNoisePlaying(duration?)
Extends active noise playback duration.

**Signature**:
```typescript
async keepRoomEQNoisePlaying(duration: number = 3.0): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>>
```

---

### Sine Sweep Generation

#### startRoomEQSweep(options?)
Generates logarithmic sine sweep(s) from 10Hz to 22000Hz.

**Signature**:
```typescript
async startRoomEQSweep(options?: {
  startFreq?: number        // Start frequency (Hz)
  endFreq?: number          // End frequency (Hz)
  duration?: number         // Single sweep duration (seconds)
  sweeps?: number           // Number of sweeps
  amplitude?: number        // Amplitude (0.0-1.0)
  device?: string           // Output device
}): Promise<RoomEQApiEnvelope<RoomEQSweepStartResponse>>
```

**Example**:
```typescript
const sweep = await startRoomEQSweep({
  startFreq: 50,
  endFreq: 10000,
  duration: 10,
  sweeps: 2,
  amplitude: 0.8
})
```

#### startRoomEQSweepSox(options?)
Uses SoX-based sine generator (if supported by server).

**Signature**: Same as `startRoomEQSweep`, uses alternative generator backend.

---

### Recording Functions

#### startRoomEQRecording(options)
Begins recording audio from selected input device.

**Signature**:
```typescript
async startRoomEQRecording(options: {
  duration: number           // Recording duration (seconds)
  sampleRate?: number        // Sample rate (e.g., 48000)
  device?: string            // Input device
  filenameHint?: string      // Suggested filename
}): Promise<RoomEQApiEnvelope<RoomEQRecordingStartResponse>>
```

**Returns**:
```typescript
{
  status: string          // 'recording', 'completed', 'error'
  recording_id: string | number    // Unique recording identifier
  filename: string        // Generated filename
  duration: number        // Recording duration
  device?: string         // Actual device used
}
```

**Example**:
```typescript
const recording = await startRoomEQRecording({
  duration: 10,
  sampleRate: 48000,
  device: 'hw:0'
})
const recordingId = recording.data?.recording_id
```

#### getRoomEQRecordingStatus(recordingId)
Fetches status of an active or completed recording.

**Signature**:
```typescript
async getRoomEQRecordingStatus(
  recordingId: string | number
): Promise<RoomEQApiEnvelope<RoomEQRecordingStatusResponse>>
```

**Returns**:
```typescript
{
  status: string                           // API status
  recording_id: string | number            // Original recording ID
  state: 'idle' | 'recording' | 'completed' | 'error'
  remaining_seconds?: number               // Time until completion
  filename?: string                        // Output filename
}
```

---

### FFT Analysis

#### analyzeRoomEQFFTRecording(recordingId, normalize?, fftSize?, pointsPerOctave?)
Performs FFT analysis on a recorded audio file.

**Signature**:
```typescript
async analyzeRoomEQFFTRecording(
  recordingId: string | number,
  normalize?: number              // Normalization frequency (Hz)
  fftSize?: number                // FFT size (e.g., 2048, 4096)
  pointsPerOctave?: number        // Log-frequency resolution (e.g., 16, 24)
): Promise<RoomEQApiEnvelope<RoomEQFFTResponse>>
```

**Returns**:
```typescript
{
  status: string
  fft_analysis: {
    fft_size: number
    window_type: string            // 'hann', 'hamming', etc.
    sample_rate: number
    frequency_resolution: number   // Hz per FFT bin
    frequencies: number[]          // Frequency points
    magnitudes: number[]           // Magnitude in dB
    phases: number[]               // Phase in degrees
    peak_frequency: number         // Frequency with max magnitude
    peak_magnitude: number         // Maximum magnitude (dB)
    spectral_centroid: number      // Centroid frequency (Hz)
    frequency_bands: {             // 7 standard audio bands
      sub_bass: { range: string; avg_magnitude: number; peak_frequency: number }
      bass: { ... }
      low_midrange: { ... }
      midrange: { ... }
      upper_midrange: { ... }
      presence: { ... }
      brilliance: { ... }
    }
    log_frequency_summary?: {      // Log-scale summary (if pointsPerOctave set)
      frequencies: number[]
      magnitudes: number[]
      points_per_octave: number
      // ... detailed analysis
    }
    normalization?: {
      applied: boolean
      requested_freq?: number
      actual_freq?: number
      reference_level_db?: number
    }
  }
  analysis_timestamp: string
}
```

#### analyzeRoomEQFFTDifference(source1, source2, source1Type?, source2Type?, options?)
Compares FFT analysis of two audio sources to measure room response.

**Signature**:
```typescript
async analyzeRoomEQFFTDifference(
  source1: string,
  source2: string,
  source1Type: 'recording_id' | 'filename' | 'filepath' = 'recording_id',
  source2Type: 'recording_id' | 'filename' | 'filepath' = 'recording_id',
  options?: {
    pointsPerOctave?: number
    windowType?: 'hann' | 'hamming' | 'blackman' | 'rectangular'
    normalize?: number
    startAt?: number               // Analysis start time (seconds)
    duration?: number              // Analysis duration (seconds)
    fftSize?: number
  }
): Promise<RoomEQApiEnvelope<RoomEQFFTDifferenceResponse>>
```

**Usage Examples**:
```typescript
// Compare noise source with room recording
const diff = await analyzeRoomEQFFTDifference(
  'noise.wav',
  'rec-123',
  'filename',
  'recording_id',
  { pointsPerOctave: 16 }
)

// Compare two filepaths
await analyzeRoomEQFFTDifference(
  '/path/to/file1.wav',
  '/path/to/file2.wav',
  'filepath',
  'filepath'
)
```

---

### Room Measurement (Simplified)

#### startRoomMeasurementSession(measurementDuration?, amplitude?)
Simplified measurement: starts noise and recording simultaneously.

**Signature**:
```typescript
async startRoomMeasurementSession(
  measurementDuration: number = 10,  // Duration for both (seconds)
  amplitude: number = 0.5            // Noise amplitude
): Promise<RoomEQApiEnvelope<{
  noiseFilename: string
  recordingId: string
}>>
```

**Example Workflow**:
```typescript
// Start simultaneous noise and recording
const session = await startRoomMeasurementSession(10, 0.7)
if (session.success) {
  const { noiseFilename, recordingId } = session.data!
  
  // Wait for recording to complete
  await new Promise(r => setTimeout(r, 11000))
  
  // Analyze the difference
  const analysis = await analyzeRoomEQFFTDifference(
    noiseFilename,
    recordingId,
    'filename',
    'recording_id'
  )
}
```

#### completeRoomMeasurement(noiseFilename, recordingId, options?, recordingDuration)
Completes measurement by analyzing FFT difference.

**Signature**:
```typescript
async completeRoomMeasurement(
  noiseFilename: string,
  recordingId: string,
  options?: {
    pointsPerOctave?: number
    windowType?: 'hann' | 'hamming' | 'blackman' | 'rectangular'
    fftSize?: number
  },
  recordingDuration: number
): Promise<RoomEQApiEnvelope<{
  frequencyResponse: {
    frequencies: number[]
    magnitudes: number[]
  }
  analysisData: RoomEQFFTDifferenceResponse
}>>
```

#### startRoomMeasure(request?)
Direct room measurement with built-in sine sweep generation and averaging.

**Signature**:
```typescript
async startRoomMeasure(request?: {
  device?: string                // ALSA device (e.g., 'hw:0,0')
  channel?: 'left' | 'right' | 'both'  // Input channel
  count?: number                 // Number of measurements to average (1-20)
  timeout?: number               // Timeout in seconds
  normalize_frequency?: number | 'none'  // Normalization frequency (Hz)
  fft_points?: number           // FFT output points (8-512, default 64)
}): Promise<RoomEQApiEnvelope<RoomMeasureResponse>>
```

**Returns**:
```typescript
{
  status: 'success' | 'error'
  device: string
  channel: string
  count: number                 // Actual measurements averaged
  fft_points: number
  csv_path: string              // Path to CSV file with measurements
  fft: {
    frequencies: number[]       // Reduced FFT points
    magnitudes_db: number[]
    phase: number[]
    points: number
  }
  normalization?: {
    applied: boolean
    requested_frequency: number
    actual_frequency: number
    reference_level_db: number
  }
  message: string
}
```

---

### EQ Optimization Presets

#### getRoomEQTargetPresets()
Fetches equalization target presets.

**Signature**:
```typescript
async getRoomEQTargetPresets(): Promise<RoomEQApiEnvelope<RoomEQTargetPresets>>
```

**Returns**:
```typescript
{
  count: number
  target_curves: [
    {
      key: string                // 'flat', 'harman', etc.
      name: string               // Human-readable name
      description: string
      expert: boolean            // For advanced users only
      curve: [
        {
          frequency: number      // Frequency point (Hz)
          target_db: number      // Target level at this frequency
          weight: number | [number, number] | null  // Weighting factor
        }
      ]
    }
  ]
}
```

**Fallback**: Returns flat curve with 20Hz and 22000Hz if API unavailable.

#### getRoomEQOptimizerPresets()
Fetches optimizer algorithm presets.

**Signature**:
```typescript
async getRoomEQOptimizerPresets(): Promise<RoomEQApiEnvelope<RoomEQOptimizerPresets>>
```

**Returns**:
```typescript
{
  count: number
  optimizer_presets: [
    {
      key: string           // 'default', 'aggressive', etc.
      preset: string        // Internal preset name
      name: string          // Display name
      description: string
      qmax: number          // Maximum Q value for filters
      mindb: number         // Minimum gain adjustment
      maxdb: number         // Maximum gain adjustment
      add_highpass: boolean // Add high-pass filter
    }
  ]
}
```

**Fallback**: Returns default preset if API unavailable.

#### getRoomEQOptimizationTargetCurves()
Fetches list of available target curve names.

**Signature**:
```typescript
async getRoomEQOptimizationTargetCurves(): Promise<RoomEQApiEnvelope<string[]>>
```

**Returns**: Array of curve names like `['flat', 'harman', 'b_k_in_room']`

**Fallback**: Returns common curve names if endpoint not found.

---

### Usable Frequency Range Detection

#### detectUsableFrequencyRange(payload)
Analyzes measured curve to detect usable frequency range.

**Signature**:
```typescript
async detectUsableFrequencyRange(
  payload: {
    measured_curve: {
      frequencies: number[]      // Frequency points (Hz)
      magnitudes_db: number[]    // Magnitude at each frequency
    }
    optimizer_params?: {
      min_frequency?: number
      max_frequency?: number
    }
    sample_rate?: number
  }
): Promise<RoomEQApiEnvelope<RoomEQUsableRangeResult>>
```

**Returns**:
```typescript
{
  success: boolean
  usable_freq_low: number        // Recommended low frequency
  usable_freq_high: number       // Recommended high frequency
  recommended_min?: number
  recommended_max?: number
  analysis?: {
    low_frequency_rolloff?: number
    high_frequency_rolloff?: number
    noise_floor_estimate?: number
    dynamic_range?: number
  }
}
```

---

### New EQ Optimization API (Streaming)

#### startNewRoomEQOptimizationStream(payload, onEvent, onError, onComplete)
Performs EQ optimization using Server-Sent Events for real-time progress.

**Signature**:
```typescript
async startNewRoomEQOptimizationStream(
  payload: {
    measured_curve: {
      frequencies: number[]
      magnitudes_db: number[]
    }
    target_curve: {
      curve: [
        { frequency: number; target_db: number; weight: number | [number, number] | null }
      ]
    }
    optimizer_params: {
      qmax: number
      mindb: number
      maxdb: number
      add_highpass: boolean
      acceptable_error: number
      min_frequency?: number
      max_frequency?: number
      add_lowpass?: boolean
    }
    sample_rate: number
    filter_count: number
  },
  onEvent: (event: NewRoomEQOptimizationProgress) => void,
  onError: (error: string) => void,
  onComplete: (result?: NewRoomEQOptimizationResult) => void
): Promise<{ success: boolean; detail?: string }>
```

**Event Types**:
- `started`: Optimization beginning
- `output`: Progress update
- `completed`: Optimization finished

**Example**:
```typescript
await startNewRoomEQOptimizationStream(
  optimizationRequest,
  (event) => {
    if (event.type === 'started') {
      console.log('Optimization started')
    } else if (event.type === 'output') {
      console.log('Progress:', event.message)
    }
  },
  (error) => console.error('Error:', error),
  (result) => {
    if (result?.success) {
      console.log('Filters generated:', result.filters)
    }
  }
)
```

---

### Legacy EQ Optimization API

#### startRoomEQOptimization(payload)
Legacy: Start optimization and return optimization ID.

**Signature**:
```typescript
async startRoomEQOptimization(payload: {
  recording_id?: string
  frequencies?: number[]
  magnitudes?: number[]
  sample_rate?: number
  target_curve: string
  optimizer_preset?: string
  filter_count?: number
  // ... additional fields
}): Promise<RoomEQApiEnvelope<RoomEQOptimizationStartResponse>>
```

#### getRoomEQOptimizationStatus(optimizationId)
Polls optimization progress.

**Signature**:
```typescript
async getRoomEQOptimizationStatus(
  optimizationId: string
): Promise<RoomEQApiEnvelope<RoomEQOptimizationStatusResponse>>
```

#### getRoomEQOptimizationResult(optimizationId)
Fetches final optimization results.

**Signature**:
```typescript
async getRoomEQOptimizationResult(
  optimizationId: string
): Promise<RoomEQApiEnvelope<RoomEQOptimizationResult>>
```

#### cancelRoomEQOptimization(optimizationId)
Cancels an active optimization.

**Signature**:
```typescript
async cancelRoomEQOptimization(
  optimizationId: string
): Promise<RoomEQApiEnvelope<{ status: string; optimization_id: string; message: string }>>
```

#### startRoomEQOptimizationStream(payload, onEvent, onError, onComplete)
Legacy: Streaming optimization using Server-Sent Events.

Similar to new API but uses different event structure.

---

## Error Handling Patterns

### Consistent Error Response
All functions follow this pattern:

```typescript
// Success case
const result = await getRoomEQInfo()
if (result.success) {
  console.log('Data:', result.data)
}

// Failure case
if (!result.success) {
  console.error('Error:', result.detail)
}
```

### Fallback Strategies
Some functions provide fallback data on error:

```typescript
// Even on error, returns usable default
const presets = await getRoomEQTargetPresets()
// result.data contains default flat curve even if error
```

### Network Error Handling
```typescript
try {
  const result = await getRoomEQVersion()
  if (result.success) {
    // Handle success
  } else {
    // Handle API error
  }
} catch (error) {
  // Network/parsing error
  console.error('Network error:', error)
}
```

---

## Common Workflows

### Complete Room Measurement & Analysis
```typescript
// 1. Start simultaneous noise and recording
const session = await startRoomMeasurementSession(10, 0.7)
if (!session.success) throw new Error('Failed to start session')

const { noiseFilename, recordingId } = session.data!

// 2. Wait for recording completion
await new Promise(r => setTimeout(r, 11000))

// 3. Analyze FFT difference
const analysis = await analyzeRoomEQFFTDifference(
  noiseFilename,
  recordingId,
  'filename',
  'recording_id',
  { pointsPerOctave: 16 }
)

if (analysis.success) {
  const frequencies = analysis.data?.difference_analysis.frequencies
  const magnitudes = analysis.data?.difference_analysis.magnitudes
  console.log('Measured response:', frequencies, magnitudes)
}
```

### EQ Optimization with Streaming
```typescript
// 1. Get measurement data (from above workflow or direct measurement)
const measurementResult = await analyzeRoomEQFFTRecording('rec-123')

// 2. Get target curve and optimizer preset
const [targets, optimizers] = await Promise.all([
  getRoomEQTargetPresets(),
  getRoomEQOptimizerPresets()
])

// 3. Build optimization request
const optimRequest: NewRoomEQOptimizationRequest = {
  measured_curve: {
    frequencies: measurementResult.data?.fft_analysis.frequencies || [],
    magnitudes_db: measurementResult.data?.fft_analysis.magnitudes || []
  },
  target_curve: {
    curve: targets.data?.target_curves[0].curve || []
  },
  optimizer_params: {
    qmax: optimizers.data?.optimizer_presets[0].qmax || 10,
    mindb: optimizers.data?.optimizer_presets[0].mindb || -10,
    maxdb: optimizers.data?.optimizer_presets[0].maxdb || 3,
    add_highpass: true,
    acceptable_error: 0.1
  },
  sample_rate: 48000,
  filter_count: 10
}

// 4. Run optimization with progress tracking
await startNewRoomEQOptimizationStream(
  optimRequest,
  (event) => {
    console.log(`[${event.type}] ${event.message}`)
  },
  (error) => console.error('Optimization error:', error),
  (result) => {
    if (result?.success) {
      console.log('Generated filters:', result.filters)
      console.log('Improvement:', result.improvement_db, 'dB')
    }
  }
)
```

### Version Checking & Capability Detection
```typescript
const versionCheck = await checkRoomEQVersionRequirement()
if (!versionCheck.success) {
  // API version too old
  alert(`API ${versionCheck.currentVersion} is unsupported. ` +
        `Minimum required: ${roomeq.ROOMEQ_MINIMUM_VERSION}`)
} else {
  // API is compatible - proceed with optimization
  console.log('API version check passed:', versionCheck.currentVersion)
}
```

---

## Testing

### Unit Test Coverage
The comprehensive test suite (`roomeq-comprehensive.test.ts`) covers:
- All API functions with successful responses
- Error handling and fallback strategies
- Parameter encoding and special characters
- Version comparison edge cases
- Interface consistency between APIs
- Response envelope validation

### Regression Test Coverage
The regression tests (`roomeq.test.ts` extended section) cover:
- Multi-step measurement workflows
- FFT analysis edge cases
- Optimization API compatibility
- Parameter constraint validation
- Complex measurement scenarios
- Filter and curve validation

### Running Tests
```bash
# Run all RoomEQ tests
pnpm test src/api/__tests__/roomeq*.test.ts

# Run with coverage
pnpm test --coverage src/api/__tests__/roomeq*.test.ts

# Watch mode
pnpm test --watch src/api/__tests__/roomeq*.test.ts
```

---

## Architecture Notes

### API Layer Separation
- **Legacy API** (`startRoomEQOptimization`): Polling-based optimization
- **New API** (`startNewRoomEQOptimizationStream`): Event-driven streaming
- Both are maintained for backward compatibility

### Fallback Strategies
Functions like `getRoomEQTargetPresets` provide hardcoded fallbacks to ensure UI functionality even when API is unavailable.

### Error Consistency
All functions return `RoomEQApiEnvelope` with:
- `success`: Boolean status
- `data`: Payload on success (or fallback on error)
- `detail`: Error message on failure

### Type Safety
Full TypeScript support with:
- Strict type checking
- Comprehensive interface definitions
- Union types for variant APIs
- Optional fields for nullable responses

---

## Known Issues & Limitations

1. **Proxy Configuration**: Version endpoint may fail if nginx proxy is misconfigured
2. **FFT Streaming**: Large FFT responses may be chunked across multiple SSE events
3. **Recording State**: No automatic cleanup if recording process crashes
4. **Measurement Timing**: Client-side delays may affect measurement synchronization

---

## Related Documentation

- [Filter Chain API](filterchain-api.md)
- [DSP Toolkit API](dsptoolkit-api.md)
- [Player API](player-api.md)
- [Config API](config-api.md)

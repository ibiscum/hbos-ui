# roomeq.ts Inconsistencies Analysis

## Critical Inconsistencies Found

### 1. **Dual Optimization Response Interfaces (HIGH PRIORITY)**
**Files**: Lines 300-410
**Issue**: Two competing response interfaces for optimization results with different structures:
- `RoomEQOptimizationResult` (legacy, lines 647-661)
- `NewRoomEQOptimizationResult` (new, lines 356-365)

**Problem**: These interfaces are used interchangeably in different functions:
- `startNewRoomEQOptimizationStream()` returns `NewRoomEQOptimizationResult`
- `startRoomEQOptimization()` returns `RoomEQOptimizationStartResponse` (yet another type)
- Functions don't clearly indicate which format they expect/return

**Impact**: Consumers of these APIs are confused about response structure
**Fix**: Consolidate interfaces, create clear documentation of legacy vs new API

### 2. **Inconsistent Error Response Patterns (HIGH PRIORITY)**
**Files**: Multiple locations
**Issue**: Error responses return different structures:
```typescript
// Pattern 1: Only error info
{ success: false, detail: "error message" }

// Pattern 2: Error with fallback data (lines ~834)
{ success: false, data: {...defaultData...}, detail: "error message" }

// Pattern 3: Some functions always return data even on failure
```

**Examples**:
- `getRoomEQOptimizerPresets()` (lines 834-863): Returns data even when error occurs
- `getRoomEQTargetPresets()` (lines 1038-1098): Returns fallback data on error
- `detectUsableFrequencyRange()` (lines 357-385): Only returns error info

**Problem**: Caller cannot reliably distinguish between actual data and fallback/error data
**Impact**: Silent failures possible - caller might use default data thinking it's real data
**Fix**: 
- Option A: Never return data on error (recommend)
- Option B: Add `isError` flag to distinguish between real and fallback data
- Option C: Use separate return type for errors with distinct structure

### 3. **Fallback Data Masks Errors (MEDIUM PRIORITY)**
**Files**: Lines 834-863 (optimizer presets), 1038-1098 (target presets)
**Issue**: Functions return hardcoded fallback data on error, making it hard to detect failures
**Example**:
```typescript
// Caller thinks they got real data, but it's just fallback
const result = await getRoomEQOptimizerPresets()
if (result.success) {
  // This is true even if API failed - just got fallback data!
  usePresets(result.data.optimizer_presets)
}
```

**Fix**: Add metadata to indicate whether data is real or fallback:
```typescript
data: {
  ...
  isRealData: boolean,  // true if from API, false if fallback
  reason?: string       // why fallback was used
}
```

### 4. **Streaming API Duplication (MEDIUM PRIORITY)**
**Files**: Lines 655-788 (legacy) vs 461-557 (new)
**Issue**: Two nearly identical streaming implementations:
- `startRoomEQOptimizationStream()` (legacy)
- `startNewRoomEQOptimizationStream()` (new)

**Duplicated code**:
- Stream reader initialization (10+ lines)
- Buffer management (5+ lines)
- Line processing loop (15+ lines)

**Problem**: Maintenance nightmare - bug fixes need to be applied to both
**Impact**: Inconsistent behavior between legacy and new APIs
**Fix**: Extract common streaming logic into shared function:
```typescript
async function handleSSEStream<T>(
  response: Response,
  onEvent: (data: unknown) => void,
  onError: (msg: string) => void,
  onComplete: (finalResult?: T) => void
)
```

### 5. **Inconsistent Parameter Naming (LOW PRIORITY)**
**Files**: Multiple locations
**Issue**: Inconsistent naming conventions across similar functions:

**Noise parameters**:
```typescript
// Old style - positional params
startRoomEQNoise(amplitude: number, duration: number)

// New style - object params
startRoomEQSweep(options?: { startFreq, endFreq, duration, ... })
startRoomEQRecording(options: { duration, sampleRate, ... })
```

**Recording duration**:
```typescript
// In startRoomEQRecording()
options: { duration: number }

// In completeRoomMeasurement()
recordingDuration: number (last positional param)
```

**Fix**: Standardize on object-based parameters for all functions with multiple params

### 6. **URL Encoding Inconsistency (LOW PRIORITY)**
**Files**: Multiple locations
**Issue**: Inconsistent URL parameter encoding:

**Properly encoded** (lines 1024, 939, 967):
```typescript
const url = `${apiBaseUrl}/eq/optimize/status/${encodeURIComponent(optimizationId)}`
```

**Not encoded**:
```typescript
// Line 2273 - filename not encoded
let url = `${apiBaseUrl}/audio/play/file?filename=${encodeURIComponent(filename)}&...`
// Line 1712 - recording id should be encoded
const url = `${apiBaseUrl}/audio/record/status/${encodeURIComponent(String(recordingId))}`
```

**Fix**: Audit all URL building and ensure consistent encoding

### 7. **Incomplete Null/Structure Checks (MEDIUM PRIORITY)**
**Files**: `completeRoomMeasurement()` (lines 2114-2144)
**Issue**: Accesses nested properties without verifying structure:
```typescript
const fftDiffData = fftDifferenceResult.data
// No check that data exists before using it!
if (!fftDiffData.difference_analysis) { // Could throw if fftDiffData is undefined
  throw new Error(...)
}
```

**Fix**:
```typescript
if (!fftDifferenceResult.success || !fftDifferenceResult.data) {
  throw new Error('...')
}
const fftDiffData = fftDifferenceResult.data
if (!fftDiffData.difference_analysis) {
  throw new Error('...')
}
```

### 8. **Timestamp Field Naming Inconsistency (LOW PRIORITY)**
**Files**: Various response types
**Issue**: Different field names used for timestamps:
- `RoomEQOptimizationResult.timestamp` (line 661)
- `RoomEQFFTResponse.analysis_timestamp` (line 132)
- `RoomEQNoiseStatus.stop_time` (line 60)
- `RoomEQSweepStartResponse.stop_time` (line 97)

**Fix**: Standardize on single timestamp field name, deprecate others

### 9. **Type Inconsistency in Recording ID (LOW PRIORITY)**
**Files**: Multiple recording-related functions
**Issue**: `recordingId` sometimes string, sometimes number:
```typescript
// Recording functions use union type
recordingId: string | number

// But internally convert inconsistently
String(recordingId)  // line 1773
String(recordingId)  // line 1849
```

**Fix**: Pick one type (recommend `string`) throughout API

### 10. **Dev Mode Version Check Bypass (MEDIUM PRIORITY)**
**Files**: `checkRoomEQVersionRequirement()` (lines 1216-1244)
**Issue**: Allows any version in dev mode, could hide incompatibilities
```typescript
if (import.meta.env.DEV) {
  console.warn('Unable to verify RoomEQ API version in development mode - proceeding anyway')
  return { success: true, ... }  // Returns true even if version is incompatible
}
```

**Problem**: Developers might not notice when API version requirements change
**Fix**: Either enforce version check in dev mode or add more prominent warnings

### 11. **Streaming Function Calls onComplete() Twice (MEDIUM PRIORITY)**
**Files**: `startRoomEQOptimizationStream()` (lines 780-788)
**Issue**: Potential double-call to completion callback:
```typescript
if (eventData.type === 'completed') {
  console.log('🎯 Received completed event...')
  onComplete()  // First call
  return { success: true }
}
// Loop exits when reader.read() returns done
if (done) {
  onComplete()  // Second call - could happen
  break
}
```

**Impact**: May trigger completion handlers twice
**Fix**: Add flag to ensure `onComplete()` called exactly once

### 12. **Missing Parameter Validation (LOW PRIORITY)**
**Files**: All API functions
**Issue**: No validation of required parameters:
```typescript
// No check that recordingId is non-empty
analyzeRoomEQFFTRecording(recordingId: string | number, ...)
```

**Fix**: Add runtime validation for critical parameters

### 13. **Inconsistent Array Length Checks (LOW PRIORITY)**
**Files**: `RoomMeasureResponse` (lines 2324-2332)
**Issue**: Response validation incomplete:
```typescript
const response: RoomMeasureResponse = {
  fft: {
    frequencies: [...],
    magnitudes_db: [...],
    phase: [...],
    points: 3
  }
}
// No guarantee that points === frequencies.length
```

**Fix**: Add runtime validation in response handlers

## Recommended Refactoring Priority

1. **High Priority** (Implement soon):
   - Consolidate dual optimization response interfaces
   - Fix error response pattern inconsistency
   - Remove fallback data from error responses

2. **Medium Priority** (Implement in next sprint):
   - Extract shared streaming logic
   - Fix incomplete null checks
   - Fix double-completion issue in streaming
   - Remove version bypass in dev mode

3. **Low Priority** (Nice to have):
   - Standardize parameter naming
   - Standardize timestamp field names
   - Normalize recording ID type
   - Add parameter validation
   - Audit URL encoding

## Testing Recommendations

- Add tests for error response consistency
- Add tests for streaming callback execution count
- Add tests for version comparison edge cases
- Add integration tests for full measurement workflow
- Add tests that verify response structure matches interface definitions

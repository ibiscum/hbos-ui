# FilterChain API Documentation

## Overview

The FilterChain API provides access to the current PipeWire filtergraph in DOT (Graphviz) format. This allows clients to visualize and understand the audio routing configuration on the system.

## API Endpoint

```
GET /api/config/pipewire/filtergraph
```

## Authentication

All requests use the central `apiFetch` wrapper which automatically handles:
- CSRF token protection via `X-CSRF-Token` header
- Session authentication via cookies (`credentials: 'same-origin'`)
- Automatic CSRF token recovery on 401 responses

See `src/api/http.ts` for detailed authentication flow.

## Response Formats

The API responds with different content types depending on success or error:

### Success Response (HTTP 200)

**Content-Type:** `text/plain`

**Body:** Raw DOT format filtergraph content

```
digraph pipewire {
  rankdir=LR;
  node [shape=box];
  "PulseAudio Input" -> "ALSA Output";
  "Microphone" -> "Echo Cancellation Filter" -> "ALSA Output";
}
```

### Error Response (HTTP 200 with JSON)

**Content-Type:** `application/json`

**Body:**

```json
{
  "message": "PipeWire not available or not running",
  "code": "PIPEWIRE_UNAVAILABLE"
}
```

### HTTP Error Response (4xx, 5xx)

**Status:** 400, 403, 404, 500, etc.

**Thrown as Error:** The `getFilterChain()` function will throw an error with:

```
Error: Failed to get filtergraph: {status} {statusText}
```

Examples:
- `404 Not Found` - Endpoint not found
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Backend error

## Implementation Details

### Type Definition

The response uses a discriminated union type to ensure type safety:

```typescript
export type FilterChainResponse = 
  | { status: 'success'; data: string; message?: never }
  | { status: 'error'; data?: never; message: string }
```

This ensures:
- When `status === 'success'`, `data` is always present
- When `status === 'error'`, `message` is always present
- Mutually exclusive fields prevent accidental misuse

### Function Signature

```typescript
export const getFilterChain = async (): Promise<FilterChainResponse>
```

- **Parameters:** None - uses config store to determine base URL
- **Returns:** Promise resolving to `FilterChainResponse`
- **Throws:** 
  - `Error` if HTTP response is not ok (4xx, 5xx)
  - `Error` if response body cannot be read/parsed

### Content-Type Detection Logic

The function uses the `content-type` header to determine response type:

1. If header includes `text/plain`: Parse as success DOT content
2. Otherwise: Parse as error JSON response

This approach allows the backend to signal errors without requiring HTTP error status codes, which is useful for:
- Distinguishing "service unavailable" from "filtergraph unavailable"
- Providing detailed error messages without full HTTP error stack
- Graceful degradation when PipeWire is not running

## Usage Examples

### Basic Usage

```typescript
import { getFilterChain } from '@/api/filterchain'

const response = await getFilterChain()

if (response.status === 'success') {
  console.log('Filtergraph:', response.data)
  // Render as graph in UI
} else {
  console.error('Failed to get filtergraph:', response.message)
  // Show error message to user
}
```

### With Error Handling

```typescript
import { getFilterChain } from '@/api/filterchain'

try {
  const response = await getFilterChain()
  
  if (response.status === 'success') {
    // Process DOT format
    displayFiltergraph(response.data)
  } else {
    // Handle service-level error
    showErrorNotification(response.message)
  }
} catch (error) {
  // Handle HTTP or parsing errors
  showErrorNotification('Network error: ' + error.message)
}
```

### In Vue Component

```typescript
import { ref } from 'vue'
import { getFilterChain } from '@/api/filterchain'

const filtergraph = ref<string>('')
const error = ref<string>('')
const loading = ref(false)

async function fetchFiltergraph() {
  loading.value = true
  error.value = ''
  
  try {
    const response = await getFilterChain()
    
    if (response.status === 'success') {
      filtergraph.value = response.data
    } else {
      error.value = response.message
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}
```

## DOT Format

The response contains Graphviz DOT format which describes the PipeWire audio graph:

- **Nodes:** Represent audio devices, ports, and processing modules
- **Edges:** Represent audio connections (routing)
- **Attributes:** Define visual properties (colors, shapes, labels)

Example elements:
- Input devices: Microphones, line inputs
- Processing: Filters, mixers, echo cancellation
- Output devices: Speakers, line outputs
- Virtual ports: Software routing endpoints

Tools to visualize:
- Graphviz (command-line): `dot -Tpng filtergraph.dot -o output.png`
- Online viewers: [Graphviz Online](https://dreampuf.github.io/GraphvizOnline/)
- Browser libraries: [Viz.js](https://github.com/mdaines/viz.js)

## Error Scenarios

### Scenario: PipeWire Not Running

```json
{
  "status": "error",
  "message": "PipeWire daemon not running"
}
```

**User Message:** "Audio service is not available. Please ensure PipeWire is running."

### Scenario: Permission Denied

```
Error: Failed to get filtergraph: 403 Forbidden
```

**User Message:** "You don't have permission to access the audio configuration."

### Scenario: Network Error

```
Error: Network timeout
```

**User Message:** "Connection to the server failed. Please check your network."

### Scenario: Malformed Response

```
Error: Invalid JSON
```

**User Message:** "Received invalid response from server."

## Testing

Comprehensive test suite in `src/__tests__/api/filterchain.test.ts` covers:

- ✅ Success cases with various DOT content
- ✅ Error cases with JSON responses
- ✅ HTTP error handling (4xx, 5xx)
- ✅ Content-Type detection
- ✅ Large content handling
- ✅ Special characters in DOT format
- ✅ Network timeouts and body read errors
- ✅ Type consistency
- ✅ Response body parsing edge cases

Run tests:

```bash
pnpm run test -- filterchain.test.ts
```

## Related Files

- **Implementation:** [src/api/filterchain.ts](../src/api/filterchain.ts)
- **Tests:** [src/__tests__/api/filterchain.test.ts](../src/__tests__/api/filterchain.test.ts)
- **HTTP Wrapper:** [src/api/http.ts](../src/api/http.ts) - CSRF/Auth handling
- **Config Store:** [src/stores/appconfig.ts](../src/stores/appconfig.ts) - Base URL config
- **PipeWire API:** [src/api/pipewire.ts](../src/api/pipewire.ts) - Other PipeWire endpoints

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "PipeWire not available" | PipeWire daemon not running | Start PipeWire: `systemctl start wireplumber` |
| 403 Forbidden | Missing permissions | Ensure user is in audio group: `usermod -aG audio $USER` |
| Empty filtergraph | Audio graph has no active connections | Check PipeWire status: `pw-cli info default` |
| Parsing error | Server returned unexpected format | Check server logs and API compatibility |
| Timeout error | Network or server delay | Retry with exponential backoff |

## Design Decisions

### Why Discriminated Union Type?

Unlike the original interface with optional fields, discriminated unions enforce that:
- Success responses always contain data
- Error responses always contain a message
- No ambiguous states exist

This prevents bugs where code forgets to check `data` before using it.

### Why Content-Type Detection Instead of HTTP Status?

Using content-type detection allows:
1. Returning HTTP 200 for both success and service-level errors
2. Distinguishing "PipeWire unavailable" (200 JSON) from "server error" (500 HTML)
3. Simpler error handling without needing to parse HTML error pages

### Why Throw on HTTP Errors?

HTTP 4xx/5xx responses indicate infrastructure problems (not found, permission denied, server errors) that differ from service-level errors. Throwing allows:
1. Automatic retry handling by API wrapper
2. Clear distinction between availability issues and user-side problems
3. Consistent error handling across all API endpoints

## Future Enhancements

Potential improvements:
- Stream updates via WebSocket for real-time graph changes
- Graph filtering options (by device type, connection status)
- Export formats (SVG, PNG for direct embedding)
- Metadata about nodes/edges (latency, format)

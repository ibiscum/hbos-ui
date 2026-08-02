# Player API Documentation

## Overview

The Player API (`src/api/player.ts`) provides TypeScript functions to control audio players through REST endpoints. It handles:
- Track queue management (adding tracks)
- Player command execution (play, pause, stop, etc.)
- Bulk operations (pause/stop all players)
- Automatic fallback from bulk endpoints to per-player execution
- Error handling with user notifications

**Module**: `src/api/player.ts`  
**Type Support**: Full TypeScript with strict type checking  
**State Management**: Pinia (`useAppConfigStore`, `useToastStore`)  
**HTTP Client**: `apiFetch` wrapper with Content-Type application/json

---

## API Functions

### `addTrackToPlayer(playerName, trackUri, metadata?)`

Adds a track to a player's queue via the `/player/{name}/command/add_track` endpoint.

**Signature**:
```typescript
async addTrackToPlayer(
  playerName: string,
  trackUri: string,
  metadata?: {
    title?: string
    artist?: string
    album?: string
    coverart_url?: string
    duration?: number
    genre?: string
    year?: number
    [key: string]: string | number | boolean | null | undefined
  }
): Promise<boolean>
```

**Parameters**:
- `playerName` (string, required): Name of the player; URL-encoded
- `trackUri` (string, required): URI or URL of the track to add
- `metadata` (object, optional): Track metadata object with optional fields

**Returns**: `boolean` - true on success, throws Error on failure

**Request Details**:
- URL: `{apiBaseUrl}/player/{encodeURIComponent(playerName)}/command/add_track`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: JSON object with `uri` and optional `metadata` fields

**Example**:
```typescript
try {
  const result = await addTrackToPlayer('living-room', 'spotify:track:123', {
    title: 'Song Name',
    artist: 'Artist Name',
    album: 'Album Name'
  })
  // result is true on success
} catch (error) {
  console.error('Failed to add track:', error)
}
```

**Error Handling**:
- HTTP errors (response.ok === false) throw Error with status
- API response errors field throws Error with message
- Failed status responses throw Error
- Errors are logged to console

---

### `sendPlayerCommand(playerName, command)`

Sends a command to a specific player via the `/player/{name}/command/{cmd}` endpoint.

**Signature**:
```typescript
async sendPlayerCommand(
  playerName: string,
  command: string
): Promise<boolean>
```

**Parameters**:
- `playerName` (string, required): Name of the player; URL-encoded
- `command` (string, required): Command name (e.g., 'play', 'pause', 'stop', 'next', 'previous', 'clear_queue')

**Returns**: `boolean` - true on success, throws Error on failure

**Request Details**:
- URL: `{apiBaseUrl}/player/{encodeURIComponent(playerName)}/command/{encodeURIComponent(command)}`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: Empty JSON object `{}`

**Supported Commands**:
- `play` - Start playback
- `pause` - Pause playback
- `stop` - Stop playback
- `next` - Skip to next track
- `previous` - Go to previous track
- `clear_queue` - Clear the queue
- Any command supported by the backend

**Guard**:
- Commands starting with `add_track:` are rejected; use `addTrackToPlayer()` instead

**Example**:
```typescript
try {
  const result = await sendPlayerCommand('bedroom', 'play')
  console.log('Command sent successfully')
} catch (error) {
  console.error('Command failed:', error)
  // Error toast is shown automatically
}
```

**Error Handling**:
- HTTP errors throw Error
- API response errors throw Error
- Failed status responses throw Error
- User-facing error toast displayed: "Could not send player command."
- Errors are logged to console

---

### `pauseAllPlayers()`

Pauses all available players. If a player doesn't support pause, attempts to stop it instead.

**Signature**:
```typescript
async pauseAllPlayers(): Promise<boolean>
```

**Returns**: `boolean` - true if at least one player succeeded, false if all failed

**Execution Flow**:
1. Attempts bulk endpoint: POST `/players/pause-all` with empty body
2. On success: Returns true
3. On failure: Falls back to per-player execution
   - Lists players via GET `/players`
   - For each player, sends pause command: POST `/player/{name}/command/pause`
   - If pause fails, attempts stop command: POST `/player/{name}/command/stop`
   - Returns true if at least one player succeeded

**Request Details** (Bulk):
- URL: `{apiBaseUrl}/players/pause-all`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: Empty JSON object `{}`

**Request Details** (Per-Player Fallback):
- List URL: `{apiBaseUrl}/players`
- Command URL: `{apiBaseUrl}/player/{encodeURIComponent(name)}/command/pause` or `stop`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: Empty JSON object `{}`

**Example**:
```typescript
const result = await pauseAllPlayers()
if (result) {
  console.log('At least one player paused')
} else {
  console.log('All players failed or no players available')
}
```

**Error Handling**:
- Logs bulk endpoint failures
- Falls back automatically to per-player approach
- Partial success is treated as success (returns true)
- Console warnings for individual player failures
- Returns false only if no players available or all fail

---

### `stopAllPlayers()`

Stops all available players.

**Signature**:
```typescript
async stopAllPlayers(): Promise<boolean>
```

**Returns**: `boolean` - true if at least one player succeeded, false if all failed

**Execution Flow**:
1. Attempts bulk endpoint: POST `/players/stop-all` with empty body
2. On success: Returns true
3. On failure: Falls back to per-player execution
   - Lists players via GET `/players`
   - For each player, sends stop command: POST `/player/{name}/command/stop`
   - Returns true if at least one player succeeded

**Request Details** (Bulk):
- URL: `{apiBaseUrl}/players/stop-all`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: Empty JSON object `{}`

**Request Details** (Per-Player Fallback):
- List URL: `{apiBaseUrl}/players`
- Command URL: `{apiBaseUrl}/player/{encodeURIComponent(name)}/command/stop`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: Empty JSON object `{}`

**Example**:
```typescript
const result = await stopAllPlayers()
if (result) {
  console.log('At least one player stopped')
} else {
  console.log('All players failed or no players available')
}
```

**Error Handling**:
- Logs bulk endpoint failures
- Falls back automatically to per-player approach
- Partial success is treated as success (returns true)
- Console warnings for individual player failures
- Returns false only if no players available or all fail

---

### `rewrite_audiocontrol_api_url`

Re-exported for backward compatibility with older code.

**Type**: Function (re-export of `rewriteAudiocontrolApiUrl` from utils)

---

## Type Definitions

### Metadata Object Type

```typescript
{
  title?: string           // Track title
  artist?: string          // Artist name
  album?: string           // Album name
  coverart_url?: string    // URL to cover art
  duration?: number        // Duration in seconds
  genre?: string           // Genre classification
  year?: number            // Release year
  [key: string]: string | number | boolean | null | undefined  // Extensible
}
```

---

## Error Handling Patterns

### HTTP Error Detection
```typescript
if (!response.ok) {
  throw new Error(`Failed to ...: ${response.status} ${response.statusText}`)
}
```

### API Response Error Detection
```typescript
const result = await response.json()
if (result?.error) {
  throw new Error(`...: ${result.error}`)
}
if (result?.status === 'failed') {
  throw new Error(`... (status: failed)`)
}
```

### Error Recovery
- `addTrackToPlayer`: Throws immediately, no recovery
- `sendPlayerCommand`: Throws immediately after showing toast notification
- `pauseAllPlayers`: Attempts per-player fallback on bulk failure
- `stopAllPlayers`: Attempts per-player fallback on bulk failure

---

## Dependencies

### Stores
- `useAppConfigStore()` - For API base URL via `getApiBaseUrl()`
- `useToastStore()` - For user notifications via `showErrorToast(message)`

### HTTP Client
- `apiFetch(url, options)` - Wrapper around fetch with request/response handling

### Utilities
- `rewriteAudiocontrolApiUrl` - Re-exported for backward compatibility

---

## URL Encoding

Player names and commands are URL-encoded using `encodeURIComponent()`:
- Spaces → `%20`
- Slashes → `%2F`
- Other special characters properly encoded

**Example**:
```typescript
sendPlayerCommand('player/with-special chars', 'play')
// URL: /player/player%2Fwith-special%20chars/command/play
```

---

## Request/Response Patterns

### All Requests Use POST with Content-Type: application/json

**Simple commands** (pause, play, stop):
```
POST /api/player/{name}/command/{cmd}
Content-Type: application/json

{}
```

**Track additions**:
```
POST /api/player/{name}/command/add_track
Content-Type: application/json

{"uri": "...", "metadata": {...}}
```

**Bulk operations**:
```
POST /api/players/pause-all
Content-Type: application/json

{}
```

### Response Handling

**Success Response** (HTTP 200):
```json
{"status": "success"}
```
Function returns `true`

**Error Response** (HTTP 200 with error):
```json
{"error": "Error message"}
```
Function throws Error with the error message

**Failed Status Response** (HTTP 200 with status=failed):
```json
{"status": "failed"}
```
Function throws Error

**HTTP Error Response** (Non-200):
Function throws Error with status and statusText

---

## Logging

All functions log to console:
- `console.log()` for debugging information (requests, responses)
- `console.warn()` for fallback scenarios
- `console.error()` for errors and exceptions

These can be monitored via browser DevTools or server logs.

---

## Backward Compatibility

The module re-exports `rewrite_audiocontrol_api_url` for backward compatibility with code that may have imported this function from the player API module.

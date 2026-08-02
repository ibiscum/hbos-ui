# Vu Meter Store - Purpose, Flow & Inconsistencies

## Store Purpose

The vu-meter store in [src/stores/vu-meter.ts](src/stores/vu-meter.ts) maintains realtime audio level state from the backend VU meter WebSocket stream:
- left/right RMS and peak values,
- clipping flags,
- connection status,
- derived percentage values for UI rendering.

## Data Flow

### 1. Connection flow

connect()
→ create WebSocket to `/api/vu-meter/api/v1/levels`
→ set `binaryType = 'arraybuffer'`
→ on open: `connected = true`
→ on close: `connected = false`, clear socket, optionally schedule reconnect

### 2. Message parsing flow

onmessage(event)
→ validate binary frame
→ parse bytes into:
- byte0: left RMS
- byte1: left peak
- byte2: right RMS
- byte3: right peak
- byte4: clipping flags bitmask
→ update reactive state and computed percentages

### 3. Disconnect flow

disconnect()
→ clear pending reconnect timer
→ close socket
→ set `connected = false`
→ disable automatic reconnect for this manual disconnect path

## Inconsistencies Identified and Fixed

### 1. Frame length guard rejected valid payloads

Issue:
- Store required `byteLength >= 6` but parser only consumes 5 bytes.
- Valid 5-byte protocol frames were ignored.

Fix:
- Changed guard to `byteLength >= 5`.

### 2. Manual disconnect triggered unwanted reconnect

Issue:
- `disconnect()` closed socket, then `onclose` always scheduled reconnect.
- This caused reconnect loops even for intentional disconnects.

Fix:
- Added reconnect intent flag (`shouldReconnect`).
- `connect()` enables reconnect intent.
- `disconnect()` disables reconnect intent before closing.
- `onclose` schedules reconnect only when reconnect intent is true.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/vu-meter.regression.test.ts](src/stores/__tests__/vu-meter.regression.test.ts) cover:
- connection and connected-state transitions,
- parsing of valid 5-byte binary frames,
- reconnect scheduling after unexpected close,
- no reconnect after manual disconnect.

Status:
- Vu-meter regression suite passes.
- Full project suite passes after fixes.

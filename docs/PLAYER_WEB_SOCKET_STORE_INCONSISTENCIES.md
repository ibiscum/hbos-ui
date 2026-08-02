# Player Web Socket Store - Purpose, Flow & Inconsistencies

## Store Purpose

The player web socket store in [src/stores/player-web-socket.ts](src/stores/player-web-socket.ts) manages WebSocket connection lifecycle, event subscription, and event-driven player refresh behavior.

It provides:
- socket setup and reconnect behavior,
- player and volume event subscriptions,
- event routing into player-store refresh actions.

## Data Flow

setupWebSocket
→ disconnect any previous controller
→ parse configured websocket base URL
→ create websocket controller
→ connect socket

socket close/error
→ notify callbacks
→ optionally schedule reconnect

message event
→ parse payload
→ route event to handler
→ refresh player/volume state when relevant

## Inconsistencies Identified and Fixed

### 1. Manual disconnect still triggered auto-reconnect

Issue:
- `disconnect()` closed the socket, but the socket `onclose` handler always scheduled reconnect.
- Intentional disconnects could reopen sockets unexpectedly.

Fix:
- Added explicit reconnect intent tracking (`shouldReconnect`).
- `disconnect()` now sets reconnect intent to false before closing.
- `onclose` and connect-error paths only schedule reconnect when reconnect intent is true.
- `connect()` restores reconnect intent for normal runtime behavior.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/player-web-socket.regression.test.ts](src/stores/__tests__/player-web-socket.regression.test.ts) cover:
- no reconnect after manual disconnect,
- reconnect after unexpected close.

Status:
- Player-web-socket regression suite passes.
- Full project suite passes after fixes.

# Player WebSocket Store

This document describes the behavior of the `player-web-socket` Pinia store in [src/stores/player-web-socket.ts](src/stores/player-web-socket.ts).

## Purpose

The store owns a reconnecting WebSocket connection for player events and maps incoming events to high-level player store refresh actions.

Key responsibilities:
- Build and manage a WebSocket controller (`connect`, `disconnect`, `subscribe`).
- Subscribe to player-scoped events for the current player context.
- Subscribe to system-wide volume events.
- Route incoming events to either `fetchCurrentPlayer()` or `fetchVolumeState()`.

## Connection Lifecycle

### `setupWebSocket()`

Behavior:
- Disconnects an existing controller before creating a new one.
- Reads base WS URL from `appconfig` store via `getWsBaseUrl()`.
- Parses URL into protocol/hostname/port/path.
- Creates a controller via `createPlayerWebSocket(...)` and calls `connect()`.
- If URL parsing fails, no controller is created.

Notes:
- Protocol is preserved (`ws` vs `wss`).
- Port falls back to `config.audiocontrol_api.devicePort` when missing in the URL.

### `createPlayerWebSocket(options)`

Builds a controller around native `WebSocket`:
- Auto-reconnects after unexpected close or connection error.
- Does not reconnect after explicit `disconnect()`.
- Exposes:
  - `connect()`
  - `disconnect()`
  - `getSocket()`
  - `updateSubscription(subscription)`
  - `subscribe(playerName, eventTypes)`

Reconnect timing uses `PLAYER_CONFIG.wsReconnectInterval`.

## Subscription Strategy

### `subscribeToPlayerEvents()`

Preconditions:
- `wsController` exists.
- Current socket is open.

Player selection:
- If `playerStore.currentPlayerName` is set, subscribe to that player.
- Else try `playerStore.retrieveActivePlayer()`.
- If active player is unavailable, try `playerStore.fetchPlayers()` and use first player.
- If no player can be resolved, do not subscribe.

Event types subscribed for player scope:
- `state_changed`
- `song_changed`
- `position_changed`
- `loop_mode_changed`
- `shuffle_changed`
- `capabilities_changed`
- `metadata_changed`
- `song_information_update`

After player subscription, volume subscription is requested.

### `subscribeToVolumeEvents()`

Subscribes with wildcard player (`*`) to:
- `volume_changed`

## Incoming Event Routing

### `handlePlayerEvent(data)`

Supported payload shapes:
- `event_type` with optional `source` object.
- `type` with top-level player fields.

Routing rules:
- `volume_changed` triggers `playerStore.fetchVolumeState()` and returns.
- Other events trigger `playerStore.fetchCurrentPlayer()` when event is relevant to current selection.

Relevance logic:
- If a specific player is selected, event player must match selected player.
- If default selection is active (no specific player selected), events are accepted when:
  - active flags indicate active player, or
  - active state is missing (compatibility fallback).

## Test Coverage

Consolidated tests live in [src/stores/__tests__/player-web-socket.regression.test.ts](src/stores/__tests__/player-web-socket.regression.test.ts).

Covered scenarios include:
- Reconnect vs manual disconnect behavior.
- URL parsing, port fallback, and `wss` protocol handling.
- Controller replacement semantics.
- Player subscription selection and fallback paths.
- Volume subscription behavior.
- Event routing decisions for volume, selected-player events, default-selection fallback, and unknown payloads.

# Player Store

File: `src/stores/player.ts`

This store coordinates current playback state, player commands, queue actions, favourites, WebSocket updates, and hardware volume control.

## Recent Consistency Fixes

1. **Track queue input consistency**
- `addTrackToQueue` now accepts `Track | string`.
- This matches existing runtime behavior where callers can provide either a full track object or a direct URI/id string.
- Loading state now resets in a `finally` block so it is always cleared after failures.

2. **Command URL encoding**
- `sendCommand` now encodes both player names and command segments using `encodeURIComponent`.
- This prevents malformed URLs for names/commands containing spaces, slashes, or special characters.

3. **Polling interval lifecycle**
- `initPlayer` now clears any existing poller before creating a new one.
- This prevents duplicate `setInterval` loops when initialization runs multiple times.

4. **Active-player change resubscription behavior**
- `fetchCurrentPlayer` now resubscribes to player events whenever active player name changes.
- This keeps WebSocket subscriptions aligned after runtime player switches.

5. **Library command path consistency**
- `sendLibraryCommand` now URL-encodes the command segment before sending.

## Test Coverage (Consolidated)

Consolidated unit + regression tests live in:
- `src/stores/__tests__/player.test.ts`

Covered scenarios include:
- `initPlayer` lifecycle:
  - clears sending state on success and failure
  - clears existing poller before creating a new one
  - avoids duplicate polling loops after repeated init
- `sendCommand` behavior:
  - active-player endpoint fallback
  - non-OK response handling
  - encoded player-name and command URL segments
- queueing behavior:
  - accepts raw string track identifiers
  - resolves active library when missing
  - reports invalid identifiers and clears loading
- now-playing sync behavior:
  - notifies `player_changed`
  - resubscribes when active player changes
- player list fetch fallback for invalid payloads
- favourites behavior:
  - toggle success flow and toast feedback
  - empty-song metadata reset behavior

## Notes

- The store still includes verbose `console.log` diagnostics by design, which help track player event flow during development.
- Command execution remains guarded by `isSendingCommand` and post-command fast refresh (`PLAYER_CONFIG.fastUpdateAfterCommand`).

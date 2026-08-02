# Player Store - Purpose, Flow & Inconsistencies

## Store Purpose

The player store in [src/stores/player.ts](src/stores/player.ts) coordinates now-playing state, player commands, player capabilities, and volume/favourite integrations.

It is the primary orchestration point for:
- player initialization,
- command dispatch,
- periodic state refresh,
- current song favourite status,
- volume control state.

## Data Flow

initPlayer
→ initialize volume control
→ setup player websocket
→ fetch now-playing snapshot
→ start periodic polling

sendCommand/sendLibraryCommand
→ POST command to player endpoint
→ wait fast-update delay
→ refetch now-playing snapshot

## Inconsistencies Identified and Fixed

### 1. initPlayer left command state stuck on initialization failures

Issue:
- `initPlayer` set `isSendingCommand` to `true` before async setup.
- If websocket setup threw, execution aborted before reset, leaving `isSendingCommand` stuck `true`.

Fix:
- Wrapped `initPlayer` initialization path in `try/finally`.
- Guaranteed `isSendingCommand` resets to `false` even when setup fails.
- Kept polling interval creation only in successful flow.

### 2. sendCommand reported success even when command POST failed

Issue:
- `sendCommand` did not check `response.ok` after command POST.
- Non-OK HTTP responses could still continue into delayed refetch and report success if refetch returned data.

Fix:
- Added explicit `response.ok` check in `sendCommand`.
- On non-OK responses, function now logs HTTP status and returns `false` immediately.
- Prevented false-success path and unnecessary delayed refetch after failed command dispatch.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/player.regression.test.ts](src/stores/__tests__/player.regression.test.ts) cover:
- successful `initPlayer` resets `isSendingCommand` and sets polling interval,
- failing websocket setup in `initPlayer` still resets `isSendingCommand` and leaves polling interval unset,
- failed command POST in `sendCommand` returns `false` and does not proceed through a success path.

Status:
- Player regression suite passes.
- Full project suite passes after fixes.

# Player Changes Store - Purpose, Flow & Inconsistencies

## Store Purpose

The player-changes store in [src/stores/player-changes.ts](src/stores/player-changes.ts) is a lightweight transition hook for player changes.

It is invoked by the player store when the active backend player name changes and is intended to be the central location for future side effects tied to that transition.

## Data Flow

### 1. Transition notification flow

player store detects active player name transition
→ calls `player_changed(oldPlayerName, newPlayerName)`
→ store validates transition significance
→ emits transition handling side effects (currently logging)

## Inconsistencies Identified and Fixed

### 1. No-op transitions produced noisy logs

Issue:
- `player_changed` logged every invocation, even when old and new player names were identical or both null.
- This generated noisy logs without representing an actual state change.

Fix:
- Added early return guard:
  - if `oldPlayerName === newPlayerName`, do nothing.
- Logging now occurs only for real transitions.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/player-changes.regression.test.ts](src/stores/__tests__/player-changes.regression.test.ts) cover:
- no logging for unchanged player names,
- no logging for null→null no-op transitions,
- structured log payload when actual transition occurs.

Status:
- Player-changes regression suite passes.
- Full project test suite passes after fixes.

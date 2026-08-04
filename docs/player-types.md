# Player Type Contracts

This document describes the type contracts in [src/types/player.ts](../src/types/player.ts) and the consolidated test coverage in [src/types/__tests__/player.test.ts](../src/types/__tests__/player.test.ts).

## Overview

The player type module models three things:

- Player identity and runtime capabilities
- Now-playing payloads returned by the backend
- Song and stream metadata used by stores and UI

## Core Types

### Player

Represents one backend player instance.

Required fields:
- `name: string`
- `id: string`
- `state: PlayerState`
- `is_active: boolean`
- `has_library: boolean`
- `last_seen: string`

Optional capability fields:
- `metadata?: PlayerMetadata`
- `capabilities?: PlayerCapability[]`

Capability resolution in consumers should prefer `metadata.capabilities` and fall back to `capabilities`.

### PlayerState

Known runtime states:
- `stopped`
- `playing`
- `paused`

These values align with checks used in [src/stores/audio-controls.ts](../src/stores/audio-controls.ts) and [src/composables/usePlayerPosition.ts](../src/composables/usePlayerPosition.ts).

### PlayerCapability

Known capability names:
- `play`
- `pause`
- `stop`
- `previous`
- `next`
- `seek`
- `queue`
- `shuffle`
- `random`
- `loop`

Including both `shuffle` and `random` keeps compatibility with different backend capability naming.

### SongMetadata and LyricsMetadata

`SongMetadata.lyrics_metadata.duration` supports both `number` and `string`.

Reason:
- Consumer logic in [src/composables/usePlayerPosition.ts](../src/composables/usePlayerPosition.ts) already parses string durations defensively.
- The type now matches real payload variation instead of forcing only numeric values.

### CurrentPlayer

Represents the `/now-playing` response used by stores.

Notable fields:
- `player?: Player`
- `song?: Song | null`
- `state?: PlayerState`
- `shuffle?: boolean`
- `loop_mode?: LoopMode`
- `position?: number | null`
- `volume?: number`
- `stream_details?: StreamDetails | null`

`shuffle` is optional because API responses can omit it when unsupported.

## Consolidated Test Strategy

The test suite in [src/types/__tests__/player.test.ts](../src/types/__tests__/player.test.ts) combines unit and regression coverage in one file:

Unit coverage validates:
- Required field presence and expected value types
- Supported `PlayerState` values
- Capability container shapes
- `SongMetadata` duration compatibility (`number` and `string`)
- `CurrentPlayer` optional/nullable behavior
- `Capabilities` store-facing shape

Regression coverage validates:
- Loop-mode normalization patterns used by audio controls
- Capability extraction fallback order
- Defensive optional chaining and fallback defaults used by stores

This keeps player type tests in one place and avoids split, duplicated suites.

# Player Position Composable

## File

- `src/composables/usePlayerPosition.ts`

## Purpose

`usePlayerPosition` provides a shared, reactive playback position model for UI consumers.

It keeps position smooth during playback by combining backend position snapshots with local elapsed-time calculation, while also exposing player-state and song-duration helpers.

## Behavior Contract

1. Position initializes to `0` and updates immediately when player state data is available.
2. When state is `playing`, position is calculated as:
- `last known backend position + elapsed seconds since last sync`
3. Backend sync is refreshed when:
- playback state changes, or
- backend position delta is greater than `0.5` seconds.
4. When state is not `playing`, the composable returns the last synced position.
5. Duration is sourced from `song.metadata.lyrics_metadata.duration` and normalized to a non-negative finite number.

## Inconsistencies Fixed

1. Interval cleanup with timer id `0`.
- Before: auto-update stop logic checked truthiness, so timer id `0` was not cleared.
- Now: cleanup checks for `null` explicitly, so id `0` is correctly cleared.

2. Duration parsing robustness.
- Before: invalid string durations could surface `NaN`, and negative values were not normalized.
- Now: invalid, non-finite, or negative durations return `0`.

3. Nullish safety in position sync.
- Before: sync used `||`, which is broader than needed for fallback semantics.
- Now: sync uses `??` for precise nullish fallback.

## Tests Added

- `src/composables/__tests__/usePlayerPosition.test.ts`

Coverage includes:

1. Default state behavior when no player data is available.
2. Elapsed-time position progression while playing.
3. Re-sync behavior when backend reports a large position jump.
4. Duration parsing for valid numeric strings.
5. Regression coverage for invalid/negative duration normalization.
6. Regression coverage for timer id `0` cleanup in both manual stop and component unmount lifecycle.

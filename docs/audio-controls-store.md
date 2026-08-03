# Audio Controls Store

## Scope

The audio-controls store manages playback control behavior shared by UI components:
- play/pause, next/previous, shuffle, and loop commands
- seek percentage and seek command generation
- auto-progress interval lifecycle tied to playback state
- loop-mode normalization from backend payloads

## Consistency Fixes

### Loop getter naming consistency with backward compatibility

The store now exposes correctly cased getters:
- `isCurrentLoopModeNone`
- `isCurrentLoopModeTrack`
- `isCurrentLoopModePlaylist`

Legacy names are still exported as aliases for compatibility with existing components:
- `iscurrentLoopModeNone`
- `iscurrentLoopModeTrack`
- `iscurrentLoopModePlaylist`

### Duration source consistency for seek operations

`seekToPosition()` now resolves duration from both available sources:
1. `currentSong.duration`
2. `currentData.song.duration` fallback

This prevents false "No Song duration" errors when one source is temporarily missing.

### Interval lifecycle hardening

`progressIntervalID` handling now uses null-safe checks (`!= null`) instead of truthiness checks. This ensures interval cleanup also works for edge-case IDs like `0`.

### Debug-noise cleanup

Removed debug `console.log` calls from watch and action paths while preserving error logging for actual failures.

## Regression and Unit Tests

Implemented and consolidated in:
- `src/stores/__tests__/audio-controls.regression.test.ts`

Coverage includes:
- computed seek percentage
- loop-mode normalization and getter aliases
- play/pause behavior with pause-all fallback regression
- shuffle and next/previous command guards
- loop mode cycling
- seek clamping and missing-duration guards
- duration fallback regression (`currentSong` vs `currentData.song`)
- auto-progress end-of-track fetch behavior
- interval cleanup regression for `progressIntervalID = 0`

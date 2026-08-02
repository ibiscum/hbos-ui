# Audio Controls Store - Purpose, Flow & Inconsistencies

## Store Purpose

The audio-controls store in [src/stores/audio-controls.ts](src/stores/audio-controls.ts) coordinates transport controls for the active player:
- play/pause toggling,
- next/previous skip commands,
- shuffle and loop mode control,
- seek command generation from UI percentage,
- progress lifecycle tied to player state.

It reads reactive player state from the player store and position composable, then emits player commands.

## Data Flow

### 1. Playback state flow

watch(currentData.state)
→ if `playing`, start interval checks
→ if not `playing`, stop interval checks

### 2. Transport flow

togglePlayPause()
→ if currently playing: pause all players (fallback to active player pause)
→ else: send active player play command

playNextOrPrev(command)
→ validate command
→ send active player skip command

### 3. Loop/shuffle flow

toggleShuffle()
→ invert current shuffle state
→ send `set_random:{true|false}`

cycleLoopMode()
→ normalize current loop value
→ rotate none/no → track/song → playlist → none
→ send `set_loop:{mode}`

### 4. Seek flow

seekToPosition(percent)
→ require known duration
→ clamp percent to [0, 100]
→ convert to absolute seconds
→ send `seek:{seconds}` then `play`

## Inconsistencies Identified and Fixed

### 1. Unbounded seek percentage

Issue:
- `seekToPosition` accepted any numeric percent and could emit negative or out-of-range seek commands.

Fix:
- Added clamping to `[0, 100]` before converting to absolute seconds.

### 2. Unvalidated skip command passthrough

Issue:
- `playNextOrPrev` accepted arbitrary strings and forwarded them as player commands.

Fix:
- Added runtime guard to allow only `next` and `previous`.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/audio-controls.regression.test.ts](src/stores/__tests__/audio-controls.regression.test.ts) cover:
- computed seek position,
- play/pause command routing,
- loop mode rotation commands,
- seek clamping high/low bounds,
- invalid skip command rejection.

Status:
- Audio-controls regression suite passes.
- Full project test suite passes after fixes.

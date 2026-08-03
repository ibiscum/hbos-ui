# MetadataTooltip

## Overview

`MetadataTooltip` renders track and stream metadata in a compact hover tooltip used by now-playing surfaces.

Component file: `src/components/MetadataTooltip.vue`  
Tests file: `src/components/__tests__/MetadataTooltip.test.ts`

## Data Sources

- `song` prop (`Song | null`) for track metadata.
- `currentStreamDetails` from the player store for stream format metadata.

## Rendered Metadata

### Song metadata

- Title
- Artist
- Album
- Album Artist
- Track number (only when `track_number > 0`)
- Duration (`formatTime(duration)`)
- Source
- Lyrics availability (`Available` / `Not Available`)
- URI
- Stream URL
- Lyrics URL

### Stream metadata

- Codec
- Sample rate
- Bit depth
- Channels

Sample-rate formatting rules:

- `>= 1000` is rendered as kHz with one decimal place (for example `44100` -> `44.1 kHz`).
- `< 1000` is rendered as Hz (for example `960` -> `960 Hz`).

## Empty-State Contract

The fallback message `No metadata available for this track` is shown only when both are true:

- no meaningful song metadata is present
- no meaningful stream metadata is present

This ensures the fallback never appears together with displayed metadata rows.

## Styling Notes

- Root container uses card-like theming variables (`--background-card`, `--color-border`, `--color-body`).
- `source` values use a `capitalize` class for display normalization.
- URI/path-like values use monospace styles for readability.
- Lyrics status uses semantic classes:
  - `.status-available`
  - `.status-unavailable`

## Regression and Unit Coverage

`src/components/__tests__/MetadataTooltip.test.ts` covers:

- baseline rendering of common song fields
- duration formatting via `formatTime`
- track-number visibility guard (`> 0`)
- stream details rendering (codec/sample-rate/bit-depth/channels)
- sample-rate formatting for both kHz and Hz ranges
- lyrics status and lyrics URL rendering
- source capitalization class usage
- empty-state behavior with no metadata
- regression: no empty-state when only stream metadata is present
- regression: no empty-state when only lyrics URL metadata is present
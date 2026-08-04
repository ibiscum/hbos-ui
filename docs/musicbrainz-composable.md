# MusicBrainz Composable

## File

- src/composables/useMusicBrainz.ts

## Purpose

useMusicBrainz coordinates artist lookups by MBID and exposes presentation-ready artist details.

It provides:

- reactive request state (loading, error)
- fetched artist payload (artistData)
- derived values for UI rendering (formattedLifeSpan, primaryGenre, formattedLocation, topTags)

## API

- state:
- artistData
- loading
- error

- methods:
- fetchArtist(mbid: string): Promise<void>

- computed:
- formattedLifeSpan
- primaryGenre
- formattedLocation
- topTags

## Behavior Contract

1. fetchArtist trims MBID input before making a request.
2. Empty or whitespace-only MBIDs are ignored and do not trigger network calls.
3. On each valid fetch attempt, stale artistData is cleared before loading new data.
4. If the service returns null, error is set to Failed to fetch artist data.
5. Thrown Error instances propagate their message to error.
6. topTags returns at most five tags from artistData.tags.

## Inconsistencies Fixed

1. Whitespace MBIDs were previously treated as valid inputs.
- Before: fetchArtist('   ') still triggered the service call path.
- Now: MBID is trimmed and ignored when empty after normalization.

2. Null service responses produced silent UI failures.
- Before: service-level failures returning null left artistData and error both null.
- Now: null responses set error to Failed to fetch artist data, enabling the UI error branch.

## Tests

- src/composables/__tests__/useMusicBrainz.test.ts

Coverage includes:

1. Default state initialization.
2. Successful fetch flow and computed delegation.
3. Regression: topTags truncates to five entries without mutating source arrays.
4. Regression: whitespace MBID does not call service and preserves current state.
5. Regression: null service response clears stale data and sets fallback error.
6. Thrown Error and non-Error failure-message paths.

# MusicBrainz Service

## Scope

The service in [src/services/musicbrainz.ts](src/services/musicbrainz.ts) is responsible for:

- fetching artist data from MusicBrainz by MBID
- shaping raw MusicBrainz fields into the UI-friendly `MusicBrainzResponse`
- exposing small presentation helpers for life span, genre, and location

## API Request Contract

`getArtist(mbid)` sends a GET request to:

- `https://musicbrainz.org/ws/2/artist/{mbid}?fmt=json&inc=aliases+tags+area-rels`

Request headers:

- `Accept: application/json`
- `User-Agent: HBos-UI/1.0.0 ( https://github.com/hifiberry/hbos-ui )`

Behavior:

- MBID is trimmed before use
- empty/whitespace MBIDs return `null` and do not call `fetch`
- MBID path segment is URL-encoded
- non-2xx responses are logged with `console.warn` and return `null`
- thrown network/JSON errors are logged with `console.error` and return `null`

## Data Normalization

### Aliases

`aliases` are filtered to likely user-facing values:

- keep alias when `primary === true`
- keep alias when `locale === 'en'`

### Tags

`tags` are normalized as follows:

- copied before sorting (no source mutation)
- sorted by `count` descending
- capped to top 10

## Helper Semantics

### `formatLifeSpan(lifeSpan)`

- open-ended active artists: `"{beginYear} - present"`
- ended artists: `"{beginYearOr?} - {endYearOr?}"`
- invalid/missing begin date for non-ended entries returns `null`
- invalid dates never surface as `NaN`

### `getPrimaryGenre(tags)`

- returns the first non-empty `name`
- returns `null` for undefined/empty/all-blank input

### `getFormattedLocation(area, beginArea)`

- trims names before output
- treats case/whitespace-only differences as equal
- returns `"{beginArea} / {area}"` only when locations are materially different

## Regression + Unit Tests

Tests added in [src/services/__tests__/musicbrainz.test.ts](src/services/__tests__/musicbrainz.test.ts):

- empty MBID guard (no fetch)
- URL encoding and query/headers contract
- response transformation for aliases/tags/areas
- regression: tag sorting does not mutate source payload
- non-OK response path
- thrown fetch error path
- date edge cases in `formatLifeSpan`
- blank-tag handling in `getPrimaryGenre`
- case/whitespace normalization in `getFormattedLocation`

Run only this suite:

```bash
pnpm vitest src/services/__tests__/musicbrainz.test.ts
```

# Artist Interface Contracts

This document describes the interfaces defined in [src/types/library/artist.interface.ts](src/types/library/artist.interface.ts) and what is intentionally validated by tests in [src/types/__tests__/library.artist.test.ts](src/types/__tests__/library.artist.test.ts).

## Types

### ArtistBase

- Core artist identity fields used by multiple payload shapes.
- Required fields:
  - `id: string`
  - `name: string`
  - `is_multi: boolean`

Notes:
- `is_multi` represents grouped/multi-artist entries and should not be inferred from name formatting.

### Artist

- Extends `ArtistBase` and `PosterItem` for UI mapping support.
- Required fields:
  - `album_count: number`
  - `thumb_url: string[]`
- Inherited optional UI mapping fields from `PosterItem`:
  - `$id?`, `$title?`, `$subtitle?`, `$note?`, `$cover_src?`

Notes:
- `thumb_url` can be an empty array when no image is available.
- `album_count` is API/store metadata and is not type-coupled to `thumb_url.length`.

### ArtistMetadata

- Extends `ArtistBase` with a nested metadata payload:
  - `metadata: Metadata`

`Metadata` fields used here:
- `mbid: string[]`
- `thumb_url: string[]`
- `banner_url: string[]`
- `biography: string`
- `genres: string[]`

Notes:
- Metadata arrays can be empty when upstream providers have sparse records.

## Regression Coverage

The test suite verifies:

- `ArtistBase` keeps minimal identity contract stable.
- `Artist` accepts inherited `PosterItem` fields used by mapped UI cards.
- `Artist.thumb_url` supports empty arrays without weakening required typing.
- `Artist.album_count` remains independent from thumbnail count.
- `ArtistMetadata` consistently includes nested `Metadata`.
- Empty metadata arrays remain valid for sparse backend/provider responses.

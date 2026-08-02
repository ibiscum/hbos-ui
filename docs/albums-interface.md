# Album Interface Contracts

This document describes the interfaces defined in [src/types/library/albums.interface.ts](src/types/library/albums.interface.ts) and what is intentionally validated by tests in [src/types/__tests__/library.albums.test.ts](src/types/__tests__/library.albums.test.ts).

## Types

### Album

- Extends `PosterItem` to allow UI mapping fields such as `$id`, `$title`, and `$cover_src`.
- Required fields:
	- `id: string`
	- `name: string`
	- `tracks_count: number`
	- `cover_art: string`
	- `artists: string[]`
- Optional field:
	- `release_date?: string`

Notes:
- `artists` can be an empty array and consumers should handle `artists[0]` defensively.
- `release_date` is optional to match real API/store handling.

### AlbumDetails

- Extends `Album` with `tracks: Track[]`.
- `tracks_count` and `tracks.length` are not type-coupled and can differ.

### AlbumResponse

- Single album payload:
	- `player_name: string`
	- `album: AlbumDetails`

### AlbumsResponse

- Album collection payload:
	- `player_name: string`
	- `count: number`
	- `albums: Album[]`

Notes:
- `count` is authoritative API metadata and is not enforced to equal `albums.length` at type level.

### AlbumByArtistResponse

- Albums scoped to artist query:
	- `artists: Artist[]`
	- `count: number`
	- `player_name: string`
	- `albums: Album[]`

## Regression Coverage

The test suite verifies:

- `Album` works with omitted `release_date`.
- `Album` accepts inherited `PosterItem` mapping fields.
- `AlbumDetails` consistently carries `tracks`.
- `AlbumResponse` and `AlbumsResponse` keep distinct payload shapes.
- `AlbumsResponse.count` can intentionally differ from `albums.length`.
- `AlbumByArtistResponse` always includes both `artists` and `albums` collections.

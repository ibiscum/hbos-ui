# Library Player Interface Contracts

This document describes the interfaces defined in [src/types/library/library.interface.ts](../../src/types/library/library.interface.ts) and the validation patterns tested in:
- Unit tests: [src/types/__tests__/library.interface.test.ts](../../src/types/__tests__/library.interface.test.ts)
- Regression tests: [src/types/__tests__/library.interface.regression.test.ts](../../src/types/__tests__/library.interface.regression.test.ts)

## Types

### LibraryPlayer

Represents a single player instance and its library capabilities. This is the core type for identifying available music players on the system.

**Required fields:**
- `player_id: string` — Unique identifier for the player instance
- `player_name: string` — Display name of the player (e.g., 'mpd', 'lms', 'spotify')
- `has_library: boolean` — Whether this player has a music library capability
- `is_loaded: boolean` — Whether the library is currently loaded in memory

**Optional field:**
- `supports_delete?: boolean` — Whether the player supports library delete operations (only guaranteed true for loaded libraries with delete support)

#### Design Notes

- **has_library vs is_loaded**: These fields are independent:
  - `has_library: true, is_loaded: false` → Library exists but not yet initialized
  - `has_library: true, is_loaded: true` → Library is ready to use
  - `has_library: false` → Player has no library capability (e.g., pure streaming player)

- **supports_delete**: Is optional to maintain backward compatibility with API versions that don't report this capability. Consumers should default to `false` when this field is absent.

- **player_id vs player_name**: 
  - `player_id` is a stable unique identifier for the instance
  - `player_name` is a human-readable label and may not be unique

### LibraryPlayerResponse

Response wrapper for library player queries. Represents the complete list of available players and their library status.

**Structure:**
- `players: LibraryPlayer[]` — Array of all available players on the system

#### Design Notes

- The `players` array can be empty if no players are available
- Players in the response represent all known players, regardless of library capability
- This is the direct response format from the `/library` API endpoint

## API Integration

The types align with the REST API contract defined in [src/api/audiocontrol-library.ts](../../src/api/audiocontrol-library.ts):

```typescript
// GET /library
LibraryPlayerResponse = {
  players: LibraryPlayer[]
}
```

The API may return additional fields on `LibraryPlayer` that are not in the type definition. The `supports_delete` field is the primary example—it's optional because older API versions may not include it.

## Store Usage Patterns

The [useLibraryStore](../../src/stores/library.ts) implements these key patterns with these types:

### 1. Finding Available Library

```typescript
// Prefer a loaded library
const availableLibrary = players.find((p: LibraryPlayer) =>
  p.has_library && p.is_loaded
)

// Fallback: any player with library
if (!availableLibrary) {
  availableLibrary = players.find((p: LibraryPlayer) => p.has_library)
}
```

### 2. Safe Field Access

The `supports_delete` field must be accessed defensively:

```typescript
const supportsDelete = player.supports_delete ?? false
```

### 3. Status Refresh

The store tracks `isLibraryLoaded` and `supportsDelete` as separate reactive state that mirrors the current player's library status:

```typescript
activeLibrary.value = availableLibrary.player_name
isLibraryLoaded.value = availableLibrary.is_loaded
supportsDelete.value = availableLibrary.supports_delete ?? false
```

## Related Types

- **LibraryStatsResponse** (in [src/api/audiocontrol-library.ts](../../src/api/audiocontrol-library.ts)): Extends `LibraryPlayer` with album, artist, and track counts
  - Used by `fetchLibraryStats()` to retrieve detailed library statistics
  - Includes all `LibraryPlayer` fields plus counts

## Testing Strategy

### Unit Tests

[library.interface.test.ts](../../src/types/__tests__/library.interface.test.ts) validates:
- Required field presence and types
- Optional field handling (especially `supports_delete`)
- Distinction between `has_library` and `is_loaded` semantics
- Response structure and array handling
- Field consistency across multiple players

### Regression Tests

[library.interface.regression.test.ts](../../src/types/__tests__/library.interface.regression.test.ts) validates:
- Store usage patterns (find loaded/any player with library)
- Safe defaulting of `supports_delete`
- Backward compatibility when `supports_delete` is missing
- Type narrowing scenarios
- Edge cases (empty names, multiple players, boolean combinations)
- Defensive access patterns used by consumers

## Backward Compatibility

The types maintain backward compatibility through:

1. **Optional supports_delete**: Older APIs without this field will have it as `undefined`, and consumers should default to `false`
2. **Array-based response**: The `players` array can be empty, and the store handles this with proper null checks
3. **Independent boolean fields**: `has_library` and `is_loaded` are not coupled, allowing for unloaded libraries

## API Versioning Notes

- Older API versions may not include `supports_delete` → it will be `undefined`
- All versions should include the core fields: `player_id`, `player_name`, `has_library`, `is_loaded`
- If API changes introduce new fields, they should be optional to maintain type safety

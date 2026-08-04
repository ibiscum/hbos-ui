# Web Services View

Behavior contract and consolidated test coverage for the services view at `src/views/services/web-services.vue`.

## Scope

This view composes service-specific web integration cards:

- Last.fm integration
- Spotify integration
- MusicBrainz integration
- TheAudioDB integration
- Fanart.tv integration

The page itself is intentionally lightweight and delegates all service logic to child integration components.

## Consistency Fixes Applied

### 1. Added explicit section heading in the header block

The header now includes `Web Services` as an `<h2>` title.

Why this matters:

- aligns with the pattern used by other service views
- makes existing header styles semantically meaningful (the `h2` rule is now used)

### 2. Aligned description copy with the Services index contract

Header description now reads `Connect and manage web-based music services`.

Why this matters:

- keeps user-facing terminology consistent between Services index and the Web Services page
- avoids drift between card summary text and destination page copy

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/web-services.test.ts`

### Unit coverage

- renders page shell with title and back route contract
- renders expected header title and description copy
- renders all five integration sections exactly once

### Regression coverage

- preserves stable integration render order
- keeps integrations as direct page children for layout contract
- keeps integrations independent from header block structure

## Notes for Future Changes

- If additional integrations are added, update the order contract test explicitly.
- Keep this view as a composition shell; test business logic in component-level suites for each integration.
- Maintain wording consistency with [src/views/services/index.vue](src/views/services/index.vue) when updating user-facing copy.

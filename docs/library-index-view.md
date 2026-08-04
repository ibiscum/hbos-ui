# Library Index View

## Scope

src/views/library/index.vue is the Music Library landing page and orchestrates the Artists, Albums, and Radio preview sections.

## Inconsistencies Fixed

- Corrected misspelled CSS hook class names from libaryCard/libaryContentBox to libraryCard/libraryContentBox.
- Hardened mount flow to continue loading section data even when active library resolution fails.
- Added rejection logging for per-section async loading failures using Promise.allSettled.
- Added route id fallback handling for artist/album card clicks (`id` then `$id`) to match poster item contracts across stores.
- Normalized radio tag formatting by trimming and removing empty tokens before rendering the top three tags.

## Consolidated Tests

src/views/library/__tests__/index.test.ts combines unit and regression coverage for:

- Mount-time orchestration of library, artist, album, and radio initialization calls.
- Resilience when library resolution fails (section loaders still execute).
- Radio favorite mapping to poster display fields (`$title`, `$subtitle`, `$note`, `$cover_src`).
- Radio play action dispatch with original favorite payload.
- Radio empty-state rendering when no favorites are available.
- Corrected class name presence and regression guard against typo class names.
- Artist and album routing fallback behavior when only `$id` exists.
- Navigation no-op behavior when identifier fields are missing.

## Why This Matters

The index page is the main library entry point. Small regressions in mount orchestration or routing can break multiple sections at once. These changes and tests enforce deterministic loading behavior, resilient navigation, and stable rendering contracts across artist, album, and radio previews.

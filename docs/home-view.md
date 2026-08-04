# Home View

## Scope

`src/views/home.vue` is a simple shell view. It should render stable, semantic content and avoid placeholder output that can regress silently.

## Inconsistencies Fixed

- Replaced the legacy placeholder text (`HOME`) with semantic markup.
- Removed an empty `<script setup>` block that had no behavior.
- Added lightweight scoped styles for consistent spacing and typography.
- Added an accessible container label (`aria-label="Home"`).

## Consolidated Tests

`src/views/__tests__/home.test.ts` combines unit and regression checks for the view:

- Verifies semantic container and heading rendering.
- Verifies user-facing helper copy.
- Guards against reintroducing the legacy all-caps placeholder text.

## Why This Matters

Even minimal views should be explicit and testable. These checks keep the file aligned with the rest of the codebase and prevent accidental fallback to placeholder markup.

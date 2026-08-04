# Router View Wrapper

## Scope

src/views/router-view.vue is a thin route outlet component used as a parent shell for nested child routes.

## Inconsistencies Fixed

- Replaced implicit lowercase outlet usage with explicit RouterView component usage for consistency and readability.
- Added explicit RouterView import from vue-router in script setup.

## Consolidated Tests

src/views/__tests__/router-view.test.ts combines unit and regression coverage for:

- Rendering of nested default child route content through the outlet.
- Outlet updates when route changes to a sibling nested child route.

## Why This Matters

This wrapper is used across nested route trees. If the outlet behavior regresses, whole route sections can appear blank. These tests lock in core outlet rendering behavior and route-reactivity expectations.

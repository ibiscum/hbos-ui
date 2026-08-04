# Library Artists View

This document describes the behavior and validated contract for the artists library view in [src/views/library/artists.vue](src/views/library/artists.vue).

Consolidated tests for this view live in [src/views/library/__tests__/artists.test.ts](src/views/library/__tests__/artists.test.ts).

## Overview

The view renders:
- Search input for artist filtering
- Poster grid for artist cards
- Alphabet index for quick navigation

It coordinates with the artist store to load and filter artists while routing to the artist-album view.

## Behavior Contract

### Mount lifecycle

On mount, the view:
- Calls getArtists to load artist data
- Calls clearSearch to reset stale filter state
- Resets local search model to an empty string

### Search

Search updates are propagated to the store through setSearchQuery.

### Artist navigation

When an artist card is clicked, routing uses:
- id when available
- $id as fallback for mapped PosterItem-only entries

If neither id nor $id exists, navigation is skipped.

### Alphabet scrolling

Letter selection behavior:
- # scrolls to first artist whose name starts with a digit
- A-Z scrolls to first artist whose first letter matches

Scroll target selection uses data-id lookup with:
- $id first
- id fallback

If no target element is found for #, it scrolls to top as a safe fallback.

## Consistency fixes applied

The current implementation fixes several inconsistencies:
- Removed unused posterGrid template ref
- Added robust id/$id fallback for click navigation
- Consolidated duplicated scroll logic into shared helper functions
- Ensured scoped styles apply by introducing an artists wrapper element

## Consolidated test strategy

The suite in [src/views/library/__tests__/artists.test.ts](src/views/library/__tests__/artists.test.ts) combines unit and regression coverage:

Unit coverage validates:
- mount calls (getArtists, clearSearch)
- search forwarding (setSearchQuery)
- style wrapper presence
- click navigation semantics and guard behavior

Regression coverage validates:
- # index numeric scrolling behavior
- # index top-scroll fallback with no numeric artists
- letter-index scroll targeting and id resolution

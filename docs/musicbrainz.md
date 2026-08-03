# Musicbrainz

## Overview

Musicbrainz is a presentational web-service status card for the MusicBrainz metadata service.
It renders static/default service metadata and allows controlled customization via props.

Component file: `src/components/Musicbrainz.vue`
Tests file: `src/components/__tests__/Musicbrainz.test.ts`

## Props

- title: string, default MusicBrainz
- description: string, default MusicBrainz is used to retrieve additional artist, song and album metadata
- icon: string, default tabler/database
- statusText: string, default Active
- statusVariant: 'green' | 'red' | 'yellow' | 'gray', default green

## Template Contract

The component renders inside `ContentBox` and keeps the shared service card structure:

- `.service-item`
- `.service-main`
- `.service-info`
- `.service-details`
- `.service-status`

Status is rendered as a badge with dynamic variant class:

- `status-badge green`
- `status-badge red`
- `status-badge yellow`
- `status-badge gray`

## Accessibility

The status badge exposes screen-reader semantics:

- `role="status"`
- `aria-label="{title} service status: {statusText}"`

This allows accessible status announcements without relying only on visual color.

## Consistency Fixes Applied

The component was normalized to match sibling service cards and remove redundant internal indirection:

- status markup now uses a dedicated `.service-status` wrapper
- direct prop binding is used in the template for title/description/icon/status text
- only derived values remain computed (`statusBadgeClass`, `statusAriaLabel`)

These changes preserve behavior while improving readability and structural consistency.

## Regression and Unit Coverage

`src/components/__tests__/Musicbrainz.test.ts` covers:

- default rendering contract (title, description, icon)
- status semantics (`role`, `aria-label`, default green class)
- prop override regression for title/description/icon
- status regression for custom text and aria-label composition
- variant mapping regression for all supported status variants

Run only this suite:

```bash
pnpm vitest src/components/__tests__/Musicbrainz.test.ts
```

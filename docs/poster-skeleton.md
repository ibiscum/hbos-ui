# Poster Skeleton

## Overview

PosterSkeleton renders a fixed set of loading placeholders for poster-based views while data is pending.

Component file: src/components/skeletons/PosterSkeleton.vue
Tests file: src/components/skeletons/__tests__/PosterSkeleton.test.ts

## Props Contract

- posterForm?: 'circle' | 'square' controls image placeholder shape.
- isNote?: boolean adds an extra note placeholder line per skeleton card when true.

Defaults:

- posterForm: 'square'
- isNote: false

## Rendering Contract

- Always renders 8 skeleton cards.
- Each card always contains:
  - one image placeholder
  - two text-row placeholders
- When isNote is true, each card also renders one note-row placeholder.
- Image placeholder shape is sanitized to:
  - 'circle' when posterForm is exactly 'circle'
  - otherwise 'square' (runtime-safe fallback)

## Visual Contract

- Root card class: .poster-skeleton
- Image wrapper class: .poster-skeleton__img
- Text-row placeholder class: .poster-skeleton__row
- Image skeleton dimensions are defined in scoped styles:
  - desktop: 140px x 140px
  - <= lg breakpoint: 100px x 100px

## Regression Coverage

The suite in src/components/skeletons/__tests__/PosterSkeleton.test.ts validates:

- fixed item count and baseline placeholder counts
- note-row expansion behavior
- shape forwarding for square and circle modes
- runtime fallback for invalid posterForm values
- reactive updates for posterForm and isNote without remounting

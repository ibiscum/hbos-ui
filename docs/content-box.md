# ContentBox

## Overview

`ContentBox` is a lightweight container component used to provide consistent card styling and spacing for service and settings sections.

Component file: `src/components/ContentBox.vue`
Tests file: `src/components/__tests__/ContentBox.test.ts`

## Template Contract

`ContentBox` renders a single root `<div>` and passes through slot content unchanged.

### Root classes

- `content-box`: semantic, kebab-case class
- `contentBox`: legacy compatibility class retained for existing selectors

Keeping both classes preserves backward compatibility while standardizing naming.

## Behavior

- Renders default slot content.
- Supports multiple slot nodes.
- Forwards non-prop attributes to the root element (for example `id`, `data-*`, `aria-*`).
- Merges parent-provided `class` values with the component's base classes.

## Styling

The component applies:

- `background: var(--background-card)`
- `border-radius: 10px`
- `color: var(--color-body)`
- `stroke: var(--color-body)`
- `margin-bottom: 25px`

## Regression and Unit Coverage

`src/components/__tests__/ContentBox.test.ts` covers:

- Base rendering.
- Slot rendering.
- Multiple-slot-node rendering.
- Presence of semantic and legacy classes.
- Root attribute forwarding.
- Class merge behavior from parent usage.
- Legacy class compatibility regression check.

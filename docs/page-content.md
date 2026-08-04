# PageContent

## Overview

PageContent is a layout shell for top-level views. It renders one of three optional header modes and always renders a content container for page body markup.

Component file: src/components/PageContent.vue
Tests file: src/components/__tests__/PageContent.test.ts

## Props Contract

- title?: string page title text.
- backrouterLink?: RouteLocationRaw renders BackRouter header when present.
- hintLink?: RouteLocationRaw renders title-as-link header when backrouterLink is absent.
- hintString?: string optional hover hint text for hintLink header.
- headerHasContentBelow?: boolean removes default bottom padding for active header branch when true.

## Header Rendering Priority

Only one header branch is rendered at a time, in this order:

1. BackRouter branch when backrouterLink is provided.
2. Hint-link branch when hintLink and title are provided.
3. Plain h1 branch when title is provided.
4. No header when none of the above conditions match.

This priority avoids ambiguous UI when multiple navigation/title props are set.

## Class Compatibility Contract

For compatibility during naming standardization, the component keeps semantic and legacy class names:

- no-padding and noPadding
- back-router-header and backrouter
- title-hint-link and titleHintLink
- minimal-hint and minimalHint

## Behavior Notes

- The main body slot is always rendered inside .content, independent of header mode.
- hintString is optional and only renders a hint badge when a non-empty value is provided.
- hintLink supports any RouteLocationRaw accepted by router-link.

## Regression and Unit Coverage

The suite in src/components/__tests__/PageContent.test.ts validates:

- slot/content wrapper rendering
- each header branch and branch precedence
- no-header behavior when title is missing
- no-padding class application
- optional hint badge rendering
- branch switching across prop updates
- slot stability across header mode transitions

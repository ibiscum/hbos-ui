# PlayerCard

## Overview

PlayerCard renders one player/service entry in the Players view, including status, enable toggle, optional install affordance, and optional configuration controls.

Component file: `src/components/PlayerCard.vue`
Tests file:
- `src/components/__tests__/PlayerCard.test.ts`

## Props

- `player`: Player data object
- `isExpanded`: controls visibility of config content

## Events

- `toggle`: emitted when main enable/disable toggle is changed
- `toggle-config`: emitted when config caret is clicked
- `navigate-bluetooth`: emitted when Bluetooth action caret is clicked
- `update-airplay-version(version: number)`
- `update-toslink-sensitivity(sensitivity: string)`
- `update-external-setting(key: string, value: boolean | string)`
- `cancel-config`
- `save-config`

## Render and Behavior Contract

- Displays icon from `player.iconUrl` when available, otherwise falls back to Icon component using `player.icon`.
- Shows status badge using service state mapping:
  - `exists === false` -> text `Not installed`, class `gray`
  - `status === active` -> class `green`
  - `status === failed` -> class `red`
  - otherwise -> class `gray`
- Applies `not-installed` card style only when `exists === false`.
- Disables the main toggle when loading, explicitly non-changeable, or not installed.
- Uses config caret for:
  - Airplay with object config
  - TOSLink with object config
  - external players with non-empty settings
- Shows Bluetooth action caret when `player.name === Bluetooth`.

## Regression Guard

Install link visibility is intentionally strict:

- install link is shown only when `exists === false` and `extension_package` is available
- install link is not shown when `exists` is `undefined`

This avoids premature install suggestions before backend existence checks complete.

## Test Coverage Summary

`src/components/__tests__/PlayerCard.test.ts` covers:

- not-installed status text/class and card class
- strict install-link regression for `exists: undefined`
- main toggle event emission
- config caret and Bluetooth caret event emission
- Airplay version update emission with numeric payload
- TOSLink sensitivity update emission
- maintainer link rendering

Existing focused suites also cover:

- install-link presence/absence scenarios
- external settings rendering and `update-external-setting` emission

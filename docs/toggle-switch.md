# ToggleSwitch

## Overview

`ToggleSwitch` is a reusable boolean input component that wraps a native checkbox and presents it with the shared switch styling mixin.

Component file: `src/components/ToggleSwitch.vue`
Tests file: `src/components/__tests__/ToggleSwitch.test.ts`

## Props

- `modelValue` (`boolean`, required): Current checked state.
- `disabled` (`boolean`, optional, default `false`): Disables interaction.
- `loading` (`boolean`, optional, default `false`): Shows loading state and also disables interaction.

## Events

- `update:modelValue` with payload `boolean`: Emitted when the user toggles the switch.

## Attribute Forwarding Contract

The component keeps wrapper presentation attributes and forwards functional attributes to the native `<input>`:

- Wrapper (`<label>`): receives parent `class` and `style`.
- Input (`<input type="checkbox">`): receives non-presentation attrs like `aria-*`, `data-*`, `name`, and `id`.

This preserves expected accessibility behavior for usages that pass `aria-label` or `aria-describedby`.

## Behavior

- Checked state is controlled by `modelValue`.
- The switch is non-interactive when either `disabled` or `loading` is `true`.
- While non-interactive, change events are ignored to prevent accidental state updates.

## Styling

`ToggleSwitch` uses the `toggle-switch` mixin from:

- `src/assets/scss/_service-item.scss`

The slider receives a `loading` class to indicate in-progress state visually.

## Regression and Unit Coverage

`src/components/__tests__/ToggleSwitch.test.ts` covers:

- Base rendering and checked-state reflection.
- `update:modelValue` emission on user toggle.
- Disabled behavior and emission suppression.
- Loading behavior as non-interactive regression protection.
- Attribute forwarding regression protection (`aria-*` and `data-*` to input, `class/style` on wrapper).
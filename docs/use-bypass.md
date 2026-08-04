# useBypass Composable

## Overview

useBypass provides momentary A/B bypass for DSP filter banks. It is intended for press-and-hold interactions (mouse, touch, keyboard spacebar).

Location: src/composables/useBypass.ts

## API

```ts
function useBypass(
  getBanksToBypass: () => string[],
  isDragging: Ref<boolean>
): {
  isBypassed: Ref<boolean>
  startBypass: () => Promise<void>
  endBypass: () => Promise<void>
}
```

## Behavior Contract

- startBypass does nothing when bypass is already active.
- startBypass does nothing while drag mode is active.
- Bank list is sanitized before use:
- Empty/falsy addresses are removed.
- Duplicate addresses are removed.
- If no valid banks remain, bypass is not activated.
- On successful start, all resolved banks are set to bypassed=true.
- On end, all tracked banks are restored with bypassed=false.

## Error Handling and Recovery

- If startBypass fails after some banks were already bypassed, the composable rolls back those successful bank updates immediately.
- If rollback itself fails, the error is logged and local state is reset to non-bypassed.
- If endBypass fails, isBypassed remains true so the caller can retry restoration.
- After a successful endBypass, tracked bank state is cleared.

## Regression Notes

The current implementation explicitly protects against two failure modes:

1. Partial start failure leaving banks stuck in bypass mode.
2. Failed end operation falsely reporting that bypass is inactive.

These behaviors are covered by tests in src/composables/__tests__/useBypass.test.ts.

# App Skeleton

## Purpose

`AppSkeleton` is a small presentational loading placeholder used by cards and lists while async data is loading.

## Location

- Component: `src/components/skeletons/AppSkeleton.vue`
- Tests: `src/components/skeletons/__tests__/AppSkeleton.test.ts`

## Props

```ts
interface SkeletonProps {
  width?: string
  height?: string
  shape?: 'circle' | 'square'
}
```

Defaults:

- `width`: `"100%"`
- `height`: `"1em"`
- `shape`: `"square"`

## Rendering Contract

- Always renders a single root element with class `skeleton`.
- Adds `skeleton--circle` when `shape === 'circle'`.
- Uses CSS `v-bind(...)` variables to project `width` and `height` into scoped styles.
- Is intentionally non-semantic and hidden from assistive tech:
  - `aria-hidden="true"`
  - `role="presentation"`
- Does not render filler text content.

## Visual Behavior

- Animated shimmer background using `@keyframes shimmer`.
- Gradient colors come from CSS variables:
  - `--background-start-skeleton`
  - `--background-end-skeleton`
- Circle shape uses `border-radius: 50%`.

## Regression Coverage

`src/components/skeletons/__tests__/AppSkeleton.test.ts` validates:

- Base rendering and shape switching.
- Default and custom dimension bindings.
- Root class inheritance from parent usage.
- No text-node filler regressions.
- Presentational accessibility attributes.

## Notes for Consumers

- Use explicit `height` when the surrounding layout does not define vertical space.
- Prefer `shape="circle"` only when both width and height resolve to equal values in the final layout.

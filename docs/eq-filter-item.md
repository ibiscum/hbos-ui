# EQ Filter Item

## Scope

src/components/speaker-eq/EqFilterItem.vue renders a single editable EQ filter card and emits all per-filter control actions used by speaker equalizer and crossover views.

## Inconsistencies Fixed

- Corrected generic coefficient display fallbacks to use nullish checks so valid zero values render correctly (for example b0=0).
- Corrected Q display formatting to treat 0 as a valid value (shows 0.00 instead of N/A).
- Upgraded remove/action controls to explicit button semantics with accessible labels.
- Added explicit type="button" and aria labels on control steppers to prevent implicit submit regressions and improve accessibility.

## Consolidated Tests

src/components/speaker-eq/__tests__/EqFilterItem.test.ts combines unit and regression coverage for:

- active-state and standard summary rendering
- Q display behavior for undefined and zero values
- generic coefficient rendering with explicit and fallback values
- select/remove event contracts and click-propagation guard
- all six standard stepper event contracts with filter payloads
- generic coefficient input event contract (filter, coeff name, native event)
- button semantics and accessibility labels
- filter-display utility integration contracts

## Why This Matters

EqFilterItem is the highest-frequency interaction element in EQ editing. Small regressions in emitted payloads, coefficient display, or event propagation can silently corrupt user edits or misroute control actions. This suite locks interaction and rendering contracts at component level while keeping parent view tests focused on orchestration.

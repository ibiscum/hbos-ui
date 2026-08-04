# Crossover Design View

Behavior contract and consolidated test coverage for the sound view at `src/views/sound/crossover-design.vue`.

## Scope

This view provides crossover filter editing for dynamic channel banks:

- active channel tab selection and pair-link visibility
- graph-driven filter edits and filter-item actions
- add-filter flow with backend max-filter constraints
- per-channel settings controls (delay, level, invert, input source)
- keyboard/mouse bypass interaction and modal keyboard handling

## Consistency Fixes Applied

### 1. Normalized boolean prop binding syntax on PageContent

`headerHasContentBelow` is now bound as `:headerHasContentBelow="true"`.

Why this matters:

- keeps template bindings explicit and consistent with project style
- avoids ambiguous inline syntax that is harder to scan in reviews

## Consolidated Unit + Regression Tests

Test file: `src/views/sound/__tests__/crossover-design.test.ts`

### Unit coverage

- renders page shell with transformed active-channel title and sound back-route contract
- renders backend metadata, graph container, tabs, and filter items
- add-filter card enables/disables modal open based on capacity
- add-filter modal confirm delegates to addFilterOfType and closes modal

### Regression coverage

- space-key bypass shortcut is blocked while a modal is open
- escape closes add-filter modal first, then backend-info modal
- reset channel settings uses parity-based default input routing
- delay and level steppers clamp values to safe configured limits
- active-channel watcher reloads backend capabilities
- unmount removes keyboard listeners to avoid duplicate bypass behavior

## Notes for Future Changes

- If channel naming changes, keep title and tab-display normalization tests updated (`iir_*` prefix stripping).
- Preserve modal-priority keyboard behavior so `Escape` does not accidentally trigger unrelated actions.
- Keep range clamps in sync with backend constraints if delay/level limits evolve.

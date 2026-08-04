# Crossover Filters Composable

## Scope

The `useCrossoverFilters` composable coordinates crossover-designer channels, linked channel-pairs, filter edits, and per-channel hardware settings.

## Consistency Fixes

### Pair-key linking now targets the requested pair

`togglePairLink(pairKey)` now performs filter copy based on the selected pair key itself, instead of always using the currently active channel. This prevents accidental cross-pair copies when a non-active pair is toggled.

`togglePairLink(pairKey)` also normalizes the provided channel to a pair key, so passing a partner channel (for example `D`) still links and copies from the correct pair source (`C`).

### Channel level linking uses the passed channel context

`setChannelLevel(channel, dB)` now checks link state for the provided channel pair, not the active channel pair. This ensures linked level updates are applied correctly even when the active tab is different.

The channel settings write path now lazily initializes missing per-channel settings, which avoids runtime errors when level, delay, invert, or select are updated before a channel settings object has been populated.

### Drag state cleanup is guaranteed

`onGraphDragEnd(id)` now clears `isDragging` in a `finally` block. If persistence fails, the UI no longer gets stuck in drag state.

### Remove-filter failures are handled consistently

`removeFilter(filterId)` now catches backend failures, logs a scoped error, and shows a user toast (`Failed to remove filter.`), matching the composable's existing error handling style.

## Regression and Unit Tests

Coverage is implemented in `src/composables/__tests__/useCrossoverFilters.test.ts`:

- Pair-key regression: toggling a non-active pair copies from that pair source channel to its partner.
- Pair normalization regression: toggling with a partner channel still resolves and copies from the pair key.
- Channel-level regression: linked level updates follow the provided channel pair, independent of active channel.
- Lazy settings unit test: linked level writes create missing channel settings entries before updating values.
- Drag-end unit test: drag state resets even if filter property persistence rejects.
- Remove-filter unit test: failures emit toast + log and do not throw to callers.
- Active-channel guard regression: unknown channel names are ignored and do not mutate active state.
- Pair-toggle guard regression: unknown pair keys are ignored and do not mutate link state.
- Delay conversion unit test: `setChannelDelay(channel, ms)` converts milliseconds to samples using backend sample rate and updates local settings consistently.
- Capability-gating unit tests: delay/invert/channel-select writes execute only when corresponding channel feature addresses are present.
- Helper fallback unit tests: delay/level display helpers return safe defaults for missing channels and non-positive gain values.

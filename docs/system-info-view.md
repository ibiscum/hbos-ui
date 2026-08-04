# System Info View

Behavior contract and consolidated test coverage for the services view at `src/views/services/system-info.vue`.

## Scope

This view aggregates system diagnostics and service metadata into cards:

- core system details (Pi model, hostname, HAT, sound card)
- network, I2C, input-device, and file-existence diagnostics
- cache statistics, background services, and background jobs
- volume and DSP program status
- favourites, cover-art providers, and library statistics
- optional auto-update refresh cycles with pause/resume while editing hostname

## Consistency Fix Applied

### Auto-update now refreshes library statistics

`refreshData()` now includes `fetchLibraryStats()` in its parallel refresh set.

Why this matters:

- before this fix, auto-update refreshed most cards but left Music Library data stale
- the refresh indicator implied a full dashboard refresh, creating inconsistent behavior
- scheduled refresh now updates library counts alongside other cards

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/system-info.test.ts`

### Unit coverage

- renders page shell and service back-route contract
- renders core cards and default auto-update indicator state
- transforms long sound-card names and shows pin-source label link
- shows informational input-device notice when endpoint is unavailable
- surfaces initial fetch error with retry action and recovers on retry

### Regression coverage

- maps DSP connectivity/backend outages to `No DSP hardware detected`
- pauses auto-update while hostname editing is active and resumes on cancel
- keeps background jobs ordered newest-first by latest timestamp
- verifies scheduled auto-update includes library statistics refresh

## Notes for Future Changes

- If additional cards are added, keep `refreshData()` and its logging labels in sync.
- Prefer informational notices (not hard errors) for expected feature/version skew states.
- Keep auto-update pause semantics tied to active edits to prevent accidental in-progress overwrite.

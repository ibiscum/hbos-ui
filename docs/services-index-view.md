# Services Index View

Behavior contract and consolidated tests for the services landing page at `src/views/services/index.vue`.

## Scope

The view is a static navigation surface for service-related settings.

It renders:

- a page shell with title `Settings`
- a fixed set of service navigation cards
- route targets via `ContentBoxLink`
- descriptive copy for each card
- a caution note for System Tools

## Consistency Fixes Applied

### 1. Consistent template/style formatting

The view now uses consistent spacing and import quoting patterns across template, script, and style sections.

### 2. Safer caution copy style semantics

The System Tools caution copy now uses ASCII warning text (`Warning:`) and warning emphasis uses `--color-error` with fallback, keeping it semantically aligned with warning/error affordances.

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/index.test.ts`

### Unit coverage

- page shell title is rendered
- all service cards are rendered
- every card keeps the expected fixed height contract (`150`)
- card titles appear in stable expected order
- route names are mapped in stable expected order
- one icon is rendered per card with expected icon bindings

### Regression coverage

- System Tools warning copy remains present and emphasized
- all cards preserve non-empty descriptive copy

## Card Contract

Expected card routes and title order:

1. `players` - Players
2. `web-services` - Web Services
3. `music-files` - Music Files
4. `dsp-programs` - DSP Programs
5. `dsp-backends` - DSP Backends
6. `system-info` - System Information
7. `display` - Display
8. `bluetooth-settings` - Bluetooth
9. `system-tools` - System Tools
10. `extensions` - Extensions
11. `security` - Security

## Notes for Future Changes

- If a new services subroute is added, update this view and the expected route/title contract tests together.
- Keep card ordering intentional; ordering changes are user-visible and should be treated as product-level changes.

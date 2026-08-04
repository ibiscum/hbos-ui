# Bluetooth Settings View

## Scope

src/views/services/bluetooth-settings.vue is the route-level services page that composes BluetoothSettings and BluetoothDevices under a common PageContent shell.

## Inconsistencies Fixed

- Added semantic section heading (Bluetooth) to match existing styles and improve structure.
- Normalized helper copy capitalization and punctuation (Adjust Bluetooth settings.).
- Simplified child component markup to self-closing component tags for readability.

## Consolidated Tests

src/views/services/__tests__/bluetooth-settings.test.ts combines unit and regression coverage for:

- PageContent contract (title and back route to services).
- Header semantics and user-facing copy.
- Presence of both child sections exactly once.
- Render ordering contract: settings section before devices section.

## Why This Matters

This view is a composition shell for two complex Bluetooth management components. If wrapper structure or routing metadata regresses, the page can lose navigation context or show sections out of order. These tests lock in the route-level contract while keeping component internals independently testable.

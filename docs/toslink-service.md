# TOSLink Service

## Overview

The TOSLink service in src/services/toslink.ts provides DSP-backed status and control for optical input (SPDIF/TOSLink).

It is responsible for:

- checking DSP availability
- validating required register addresses from DSP metadata
- reading enable/signal/sensitivity state from DSP memory
- writing enable/disable and sensitivity changes back to memory

## Public API

- checkDSPAvailability() -> Promise<boolean>
- checkTOSLinkAvailable() -> Promise<boolean>
- getTOSLinkStatus() -> Promise<TOSLinkStatus>
- enableTOSLink() -> Promise<void>
- disableTOSLink() -> Promise<void>
- getTOSLinkSensitivity() -> Promise<'low' | 'medium' | 'high'>
- setTOSLinkSensitivity(level) -> Promise<void>
- TOSLINK_CONFIG constant

## DSP Metadata Contract

The service expects the DSP metadata object to include three register address fields:

- enableSPDIFRegister
- readSPDIFOnRegister
- sensitivitySPDIFRegister

If any are missing/empty, availability is reported as false with an explanatory error.

## Status Semantics

getTOSLinkStatus() returns:

- available: true only when DSP exists and all required register addresses are present
- allowChange: true only when available is true
- enabled: derived from enable register memory value > 0
- signalDetected: derived from signal register memory value > 0
- sensitivity: mapped to low/medium/high from the closest configured float value
- requiresDSP: always true

If DSP is unavailable:

- available: false
- allowChange: false
- error: DSP sound card with TOSLink input required

## Memory Value Parsing

The service accepts memory values returned as either number or string.

Supported inputs include:

- decimal number values (for example 1)
- decimal strings (for example "1", "0.001")
- hex strings prefixed with 0x (for example "0x1")

Invalid or missing values do not throw; they degrade safely:

- boolean reads become false
- sensitivity falls back to medium

## Write Operations

- enableTOSLink() writes value 1 to enableSPDIFRegister
- disableTOSLink() writes value 0 to enableSPDIFRegister
- setTOSLinkSensitivity(level) writes:
  - low -> 0.01
  - medium -> 0.001
  - high -> 0.00005

All writes use store: true so settings persist for startup restore.

## Error Handling

Control methods reject when status is unavailable or not changeable.

Write path errors are wrapped in clear messages:

- Failed to enable TOSLink: <reason>
- Failed to disable TOSLink: <reason>
- Failed to set TOSLink sensitivity: <reason>

Read paths prefer resilience:

- check methods return false on backend errors
- getTOSLinkStatus returns a structured status object instead of throwing
- getTOSLinkSensitivity returns medium on failures

## Unit and Regression Tests

Coverage is implemented in src/services/__tests__/toslink.test.ts, including:

- DSP availability mapping and backend failure handling
- metadata register presence checks
- full status behavior for DSP unavailable and DSP available paths
- regression for numeric memory value parsing (number + hex string)
- sensitivity nearest-value mapping and fallback behavior
- enable/disable/sensitivity write payloads with store flag
- mutation guards when TOSLink is unavailable

Run this test file:

```bash
pnpm vitest src/services/__tests__/toslink.test.ts
```

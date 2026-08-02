# Musicbrainz Component - Purpose, Flow & Inconsistencies

## Component Purpose

The Musicbrainz component in [src/components/Musicbrainz.vue](src/components/Musicbrainz.vue) renders a web-service status card for the MusicBrainz integration.

It is responsible for:
- presenting service identity (title, icon, description),
- exposing current status text/variant,
- rendering status information with accessible semantics.

## Render Flow

Component props
→ title/icon/description/status values
→ status class + status aria label
→ card presentation inside ContentBox

## Inconsistencies Identified and Fixed

### 1. Service identity content was hard-coded

Issue:
- Title, description, and icon were fixed in template literals.
- Component could not be safely reused/configured in tests or future service-card composition.

Fix:
- Added props with defaults for `title`, `description`, and `icon`.
- Preserved current visual defaults while allowing controlled overrides.

### 2. Status badge lacked accessibility semantics

Issue:
- Status used static text/class and did not expose explicit status semantics.
- No `role="status"` or contextual `aria-label` was provided.

Fix:
- Added configurable `statusText` and `statusVariant` props.
- Added `role="status"` and dynamic `aria-label` (`<title> service status: <statusText>`).
- Status class is now derived from status variant.

## Regression Test Coverage

Regression tests in [src/components/__tests__/Musicbrainz.test.ts](src/components/__tests__/Musicbrainz.test.ts) cover:
- default rendering contract (title/description/active status),
- prop-driven overrides for title, description, and icon,
- accessible status semantics and variant class output.

Status:
- Targeted Musicbrainz tests pass.
- Full project suite passes after fixes.

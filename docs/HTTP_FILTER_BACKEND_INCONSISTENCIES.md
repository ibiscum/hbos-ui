# HTTP Filter Backend - Purpose, Flow & Inconsistencies

## Module Purpose

The HTTP filter backend in [src/stores/http_filter_backend.ts](src/stores/http_filter_backend.ts) translates filter operations into REST API requests.

It is responsible for:
- endpoint construction,
- method/body mapping,
- converting HTTP failures into predictable store-level behavior.

## Data Flow

filter operation (add/update/remove/create)
→ build endpoint path
→ call shared apiCall helper
→ parse response / surface errors

## Inconsistencies Identified and Fixed

### 1. Bank names were interpolated without URL encoding

Issue:
- Bank names with spaces or slashes (for example `C 1/Left`) were inserted directly into endpoint paths.
- This produced malformed or ambiguous routes and could target wrong server paths.

Fix:
- Added `encodeBankName()` helper using `encodeURIComponent`.
- Applied encoded bank names to all bank-path endpoints:
  - addFilter
  - updateFilter
  - removeFilter
  - clearFiltersFromBank
  - createFilterBank
  - removeFilterBank

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/http-filter-backend.regression.test.ts](src/stores/__tests__/http-filter-backend.regression.test.ts) cover:
- encoded path for addFilter with special characters,
- encoded paths for update/remove/create with special characters.

Status:
- HTTP backend regression suite passes.
- Full project suite passes after fixes.

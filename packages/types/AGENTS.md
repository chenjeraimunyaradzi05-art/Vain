# Shared Types (packages/types)

## Purpose

This package is the single source of truth for shared types across web, api, and mobile.

## Rules

- Prefer domain folders:
  - opportunities, learn, connect, business, finance, housing, partners, auth
- Export stable public types via index.ts files.
- Do not break existing exported types; add new fields instead.

## Validation pairing

- When creating or changing a type that crosses boundaries, also create or update:
  - a Zod schema for validation (where appropriate)
  - inferred types from schema when possible

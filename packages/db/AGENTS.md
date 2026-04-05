# Database (packages/db) — Prisma

## Prisma rules

- schema.prisma is the source of DB truth.
- Use clear model names and relations.
- Add migrations for every schema change.

## Conventions

- Timestamps: createdAt, updatedAt on all major models.
- Soft-delete only if explicitly required; otherwise hard delete.
- Add indexes for:
  - foreign keys
  - high-read filters (e.g., opportunity status, createdAt)

## Access

- apps/api uses Prisma client from this package only.
- No direct DB access from apps/web or apps/mobile.

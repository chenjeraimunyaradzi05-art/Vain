# Vantage API (Node.js + TypeScript)

## API rules

- REST endpoints with consistent routing and versioning strategy (e.g., /api/v1).
- Every endpoint must:
  - validate input with Zod
  - enforce RBAC/permissions
  - return consistent error shape

## Modules

Use domain-based modules (one folder per domain):

- opportunities, learn, connect, business, finance, housing, partners, admin

Each module should have:

- routes/controller
- service (business logic)
- schema (Zod input/output)
- repository (DB access via Prisma)

## Database

- All DB access uses Prisma client from packages/db.
- No direct SQL unless explicitly requested.
- Migrations must be created for schema changes.

## Security

- Never log tokens, credentials, or sensitive personal data.
- Use least-privilege checks in each handler.
- Prefer allow-lists for role permissions.

## Quality

- Add tests for critical logic (permissions, matching/scoring, workflows).

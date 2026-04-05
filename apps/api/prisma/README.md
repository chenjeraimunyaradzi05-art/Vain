# Prisma migrations & seeding (dev)

This folder contains the Prisma schema and a ready-to-run migration to bootstrap a Postgres database for local/dev use.

Quick steps (dev):

1. Ensure your `apps/api/.env.local` has a valid `DATABASE_URL` pointing at Postgres.

1. Generate the Prisma client (optional but recommended):

```bash
cd apps/api
npx prisma generate
```

1. Run migrations (production / deploy):

```bash
# Applies migrations found in prisma/migrations (recommended for CI / deploy)
npm run prisma:migrate:deploy
```

1. For local iterative development (create & apply migration):

```bash
# Create a new migration from current schema and apply it to your local DB
npm run prisma:migrate:dev
```

1. If you prefer to push the schema without creating migrations (fast, destructive for history):

```bash
npm run prisma:push
```

1. Seed the database with the provided demo data:

```bash
npm run seed
```

## Optional: import real (approved) public data

If you have a JSON API/feed that you are allowed to use (license/terms OK) you can import non-PII listings into the platform.

This is **opt-in** and intended for dev/staging. In production it is blocked unless `ALLOW_WEB_IMPORT=1`.

```bash
cd apps/api

# Jobs JSON array import
WEB_IMPORT_SOURCE=my-source \
WEB_IMPORT_JOBS_URL="https://example.com/jobs.json" \
npm run seed:web

# Courses JSON array import
WEB_IMPORT_SOURCE=my-source \
WEB_IMPORT_COURSES_URL="https://example.com/courses.json" \
npm run seed:web
```

Expected formats are documented in `prisma/import-web-data.js`.

Convenience: single command to generate client, create/apply a dev migration and seed the DB

```bash
npm run setup-db
```

Notes:

- The repository includes a pre-built migration in `migrations/000001_init/migration.sql` so `prisma migrate deploy` will work when pointed to a clean database.
- If you change `schema.prisma` in development, prefer `npx prisma migrate dev` to generate and apply a migration and keep a history of schema changes.

## Quick verification — run migrations and seed using Docker

If you want to test quickly on your machine (recommended) you can use the repository-provided docker-compose which starts Postgres + Redis:

```pwsh
# From repo root
docker compose up -d

# Confirm Postgres is ready
docker compose ps
```

Then from `apps/api` set up `.env.local` (copy from `.env.example`) and run the convenience setup command:

```pwsh
cd apps/api
npm run setup-db
# now start the api
npm run dev
```

After the seed finishes you can check the seeded user exists (via Prisma Studio or API):

```pwsh
# Prisma studio
npm run prisma:studio
# or check via HTTP after server started
curl -s http://localhost:3001/ | jq .
```

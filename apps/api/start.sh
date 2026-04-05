#!/bin/sh
set -e

echo "========================================"
echo "  Ngurra Pathways API - Starting..."
echo "========================================"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "PORT: ${PORT:-not set}"
echo "DATABASE_URL: ${DATABASE_URL:+SET}"
echo "========================================"

# Run Prisma migrations (non-blocking: server starts even if migrations fail)
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Running Prisma migrations..."
  npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 || {
    echo "⚠️  Prisma migrate deploy failed (non-fatal). Server will still start."
    echo "⚠️  You may need to check DATABASE_URL or run migrations manually."
  }
  echo "✅ Migration step complete."
else
  echo "⚠️  DATABASE_URL not set — skipping migrations."
fi

# Start the server
echo "🚀 Starting Node.js server..."
exec node dist/index.js

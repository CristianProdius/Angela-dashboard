#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || echo "No migrations to run or migration failed (might need prisma db push instead)"

echo "Pushing database schema..."
npx prisma db push --skip-generate 2>/dev/null || true

echo "Starting application..."
exec node server.js

#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Pushing database schema..."
npx prisma db push

echo "Starting application..."
exec node server.js

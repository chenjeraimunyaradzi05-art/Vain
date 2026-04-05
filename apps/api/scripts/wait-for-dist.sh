#!/bin/sh
set -e

MAX_TRIES=${WAIT_TRIES:-15}
SLEEP=${WAIT_SLEEP:-1}

n=0
until [ -f /app/dist/src/index.js ] || [ "$n" -ge "$MAX_TRIES" ]; do
  n=$((n+1))
  echo "Waiting for /app/dist/src/index.js ($n/$MAX_TRIES)..."
  sleep "$SLEEP"
done

if [ ! -f /app/dist/src/index.js ]; then
  echo "ERROR: /app/dist/src/index.js not found; exiting."
  exit 1
fi

# Exec the passed command (pm2 runtime)
exec "$@"

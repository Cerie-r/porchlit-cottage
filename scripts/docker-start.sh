#!/bin/sh
# Starting in a container (Dockerfile, compose.yaml). The AI keys' signing secret is PORCHLIT_KEY_SECRET when it is
# set; otherwise one is made the first time and kept in the data folder (a volume), because changing it later would
# stop every AI's key. Then the database is brought up to date and the server starts.
set -e
DATA="${PORCHLIT_DATA:-/data}"
if [ -z "$PORCHLIT_KEY_SECRET" ]; then
  if [ ! -s "$DATA/key-secret" ]; then
    mkdir -p "$DATA"
    node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))" > "$DATA/key-secret"
    chmod 600 "$DATA/key-secret"
    echo "Made the AI keys' secret, kept in $DATA/key-secret. Keep that volume: losing it stops every AI's key."
  fi
  PORCHLIT_KEY_SECRET="$(cat "$DATA/key-secret")"
  export PORCHLIT_KEY_SECRET
fi
node server/migrate.mjs
exec node server/index.mjs

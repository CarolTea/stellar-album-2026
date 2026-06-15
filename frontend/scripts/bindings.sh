#!/usr/bin/env bash
# Generate typed TS clients for each contract from the deployed IDs in
# .env.local. Run AFTER `make bootstrap` (repo root) has produced .env.local.
#
# Note: we do NOT `source` .env.local — the network passphrase contains spaces
# and a ';', which is fine for Vite but not valid shell. We read each value.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "error: frontend/.env.local not found — run 'make bootstrap' at the repo root first." >&2
  exit 1
fi

env_get() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2-; }

gen() { # gen <name> <contract-id>
  echo "bindings: $1"
  stellar contract bindings typescript \
    --network testnet \
    --contract-id "$2" \
    --output-dir "src/contracts/$1" \
    --overwrite
}

gen coin    "$(env_get VITE_COIN)"
gen faucet  "$(env_get VITE_FAUCET)"
gen store   "$(env_get VITE_STORE)"
gen pack    "$(env_get VITE_PACK)"
# Sticker, Album, Escrow clients are generated too, for v2 screens.
gen sticker "$(env_get VITE_STICKER)"
gen album   "$(env_get VITE_ALBUM)"
gen escrow  "$(env_get VITE_ESCROW)"

echo "Done. Clients in src/contracts/*"

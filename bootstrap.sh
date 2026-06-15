#!/usr/bin/env bash
#
# bootstrap.sh — deploy + wire all 7 stellar-album contracts on testnet and
# emit the frontend config. Re-running redeploys fresh (acceptable for testnet).
#
# Usage: ./bootstrap.sh
# Requires: stellar CLI 26+, the release wasms built (the script builds them).
set -euo pipefail

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
PASSPHRASE="Test SDF Network ; September 2015"
WASM_DIR="target/wasm32v1-none/release"
ENV_OUT="frontend/.env.local"

# Demo economy (raw token units; Coin metadata decimals are cosmetic and the
# UI renders these counts directly).
COOLDOWN=60
SEED=1000
DRIP=100
PRICE=100

say() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }

# --- network + deployer identity ---------------------------------------------
say "Configuring $NETWORK network"
stellar network add "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" 2>/dev/null || true

say "Generating + funding deployer key (admin/treasury)"
stellar keys generate deployer --network "$NETWORK" --fund --overwrite
DEPLOYER=$(stellar keys address deployer)
echo "deployer: $DEPLOYER"

# --- build -------------------------------------------------------------------
say "Building contract wasms"
stellar contract build

deploy() { # deploy <wasm-name> -- <constructor args...>
  local name="$1"; shift
  stellar contract deploy \
    --wasm "$WASM_DIR/$name.wasm" \
    --source deployer --network "$NETWORK" \
    "$@" | tail -n1
}

invoke() { # invoke <contract-id> -- <fn + args...>
  stellar contract invoke --id "$1" --source deployer --network "$NETWORK" "${@:2}" >/dev/null
}

# --- phase 1: deploy (minter/burner placeholders = deployer, rewired below) ---
say "Deploying contracts"
COIN=$(deploy coin       -- --admin "$DEPLOYER" --minter "$DEPLOYER")
echo "coin:    $COIN"
STICKER=$(deploy sticker -- --admin "$DEPLOYER" --minter "$DEPLOYER" --burner "$DEPLOYER")
echo "sticker: $STICKER"
FAUCET=$(deploy faucet   -- --coin "$COIN" --cooldown "$COOLDOWN" --seed "$SEED" --drip "$DRIP")
echo "faucet:  $FAUCET"
PACK=$(deploy pack       -- --admin "$DEPLOYER" --minter "$DEPLOYER" --sticker "$STICKER")
echo "pack:    $PACK"
ALBUM=$(deploy album     -- --admin "$DEPLOYER" --sticker "$STICKER")
echo "album:   $ALBUM"
STORE=$(deploy store     -- --admin "$DEPLOYER" --coin "$COIN" --pack "$PACK" --treasury "$DEPLOYER" --price "$PRICE")
echo "store:   $STORE"
ESCROW=$(deploy escrow   -- --sticker "$STICKER")
echo "escrow:  $ESCROW"

# --- phase 2: wire authority edges (admin-signed) ----------------------------
say "Wiring authority edges"
invoke "$COIN"    -- set_minter --new_minter "$FAUCET"   # Faucet mints Coin
invoke "$PACK"    -- set_minter --new_minter "$STORE"    # Store mints Packs
invoke "$STICKER" -- set_minter --new_minter "$PACK"     # Pack mints Stickers
invoke "$STICKER" -- set_burner --new_burner "$ALBUM"    # Album burns Stickers
# Escrow needs no role: sticker↔sticker custody uses transfer with owner auth.

# --- emit frontend config ----------------------------------------------------
say "Writing $ENV_OUT"
mkdir -p "$(dirname "$ENV_OUT")"
cat > "$ENV_OUT" <<EOF
VITE_COIN=$COIN
VITE_FAUCET=$FAUCET
VITE_STICKER=$STICKER
VITE_PACK=$PACK
VITE_ALBUM=$ALBUM
VITE_STORE=$STORE
VITE_ESCROW=$ESCROW
VITE_RPC_URL=$RPC_URL
VITE_NETWORK_PASSPHRASE="$PASSPHRASE"
EOF

say "Done. Contract IDs written to $ENV_OUT"

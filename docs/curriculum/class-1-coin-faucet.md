# Class 1 — Coin: the pure fungible (and who gets to create value)

**Spectrum anchor:** total fungibility — every unit is identical; only a balance exists.
**Contracts built:** `Coin` (OpenZeppelin `fungible` Base + Mintable) and `Faucet` (minter with a parametrizable cooldown, seeding 1000 Coin per student).
**Branch:** `class-1-coin-faucet` · **Tag:** `v0.1-fungible` · **Implements:** Phases 0–2.

## Learning objectives

- Understand what makes a token *fungible*: state is one number per address, with no identity.
- Use the OpenZeppelin `fungible` base (Base + Mintable) instead of reinventing it.
- Model authorization (`require_auth`) and *who* may mint (the Faucet as the sole minter).
- Implement an on-chain cooldown using the ledger timestamp.

## Blockchain concepts taught

- Authorization and caller identity.
- State per address (the essence of fungibility).
- On-chain time (`env.ledger().timestamp()`) as the source of truth for a cooldown.

## What you build

- **Coin** — OZ `fungible` Base + Mintable, storing a `minter: Address`; only the minter can `mint`.
- **Faucet** — `claim(addr)` checks the cooldown, mints Coin, records `last_claim[addr]`. Cooldown is admin-settable (≈60s classroom / 3h campaign).

Deploy wiring (see [bootstrap](../bootstrap-and-deploy.md)):
```
deploy Coin → deploy Faucet(coin_addr) → coin.set_minter(faucet_addr)
```

## Reproduce this ✅

> On a clean checkout of `class-1-coin-faucet`:
> ```bash
> cargo test -p tests reproduce_class_1
> ```

1. Deploy Coin and Faucet and wire `set_minter`.
2. Call the faucet and receive 1000 Coin.
3. Query your balance and confirm it.
4. Call the faucet **again before the cooldown elapses** and observe the transaction fail with the expected error.

## Notes & gotchas

- This is also where you can contrast OZ `fungible` against a classic-asset SAC if you want the advanced detour — see [decision D7](../decisions.md).
- Establish the project's `require_auth` discipline here; every later contract reuses it.

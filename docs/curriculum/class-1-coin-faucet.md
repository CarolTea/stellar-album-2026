# Class 1 — Architecture first, then the pure fungible (Coin + Faucet)

**Focus:** the whole system before any single contract — how the seven contracts fit together, who is allowed to mint and burn what, and where on the fungibility spectrum each one sits. Once the map is clear, we build the first and simplest region of it: the fungible **Coin** and its **Faucet**.

**Spectrum anchor:** the *whole* spectrum (orientation), landing on total fungibility — a coin is one number per address, with no identity.
**Contracts built:** `Coin` (OpenZeppelin `fungible` Base + Mintable) and `Faucet` (minter with a parametrizable cooldown, seeding 1000 Coin per student).
**Branch:** `class-1-coin-faucet` · **Tag:** `v0.1-fungible` · **Implements:** Phases 0–2.

---

## Part A — The architecture

### What we're building

A playable sticker-album dApp. You claim a fungible **coin**, spend it on a sealed **pack**, rip the pack open (it collapses into three **stickers**), paste stickers into a soulbound **album**, and trade your duplicates through a trustless **escrow**. Every object lands on a different point of the fungibility spectrum — that contrast *is* the lesson.

### The through-line: the fungibility spectrum

One question runs across all four classes: *"how fungible is this thing, and where in the contract is that decided?"*

| Object | Position on the spectrum | Where it's decided in code |
|---|---|---|
| **Coin** | Fungible (pure) | A single balance per address; no identity at all. |
| **Pack (sealed)** | Fungible *until opened* | Held as a fungible count; `open` collapses it into unique items. |
| **Sticker** | Semi-fungible | Keyed by `(owner, type_id)` — copies of a *type* are interchangeable, types are not. |
| **Album** | Non-fungible (pure) | One per owner, soulbound, carrying unique slot state. |
| **Escrow** | — (the *reason* a contract exists) | Custody + atomic swap, no trusted intermediary. |

Full version: [`../fungibility-spectrum.md`](../fungibility-spectrum.md).

### The seven contracts at a glance

| Contract | Role | Token kind | Built with |
|---|---|---|---|
| **Coin** | In-game currency | Fungible | OpenZeppelin `fungible` (Base + Mintable) |
| **Sticker** | The collectibles | Semi-fungible (multi-token) | Hand-rolled (`Map<(Address,u32),i128>`) |
| **Pack** | Buyable, opens into 3 stickers | NFT-ish | Custom |
| **Album** | Personal collection | Soulbound NFT | Hand-rolled (no transfer) |
| **Store** | Sells packs for Coin | — | Custom |
| **Escrow** | Sticker↔sticker trade | — | Custom |
| **Faucet** | Drips Coin | — | Custom (mints Coin) |

Full design + rationale: [`../architecture.md`](../architecture.md).

### The authority graph (the part that bites)

A multi-contract system lives or dies on *who may call privileged functions*. Each edge below is a `require_auth` that must check the **right parent contract**, not the end user:

```
Faucet  ──mint──►   Coin       (Faucet is Coin's minter)
Store   ──mint──►   Pack       (Store is Pack's minter)
Pack    ──mint──►   Sticker    (Pack is Sticker's minter)
Album   ──burn──►   Sticker    (Album is Sticker's burner)
Escrow  ──transfer──► Sticker  (custody; Escrow never mints)
```

The #1 cross-contract mistake is leaving `mint`/`burn` open so anyone can call it. Every privileged function verifies the auth of its **configured** caller (e.g. `Sticker.mint` checks the Pack address set at init). You'll establish this discipline in Part B and reuse it in every later class.

### How the project is laid out

A Cargo workspace, one crate per contract, plus shared helpers:

```
contracts/
  coin/  sticker/  pack/  album/  store/  escrow/  faucet/
  common/      # shared constants, the sticker catalog/rarity, TTL helpers
  test-utils/  # integration-test harness
tests/         # cross-contract "reproduce this" checks
```

Build and **ship** order is intentionally non-linear — Store is built before Album but ships in Class 4. The class branches/tags accumulate (see [`README.md`](README.md) and [`../implementation-plan.md`](../implementation-plan.md)).

### Two cross-cutting mechanics to internalize now

- **`require_auth` discipline** — caller identity is everything; decide it deliberately at each boundary.
- **TTL / archival** — balances and album slots live in *persistent* storage and must have their TTL extended on write, or they archive and break silently later. The shared helpers in `common` standardize this. (Verified on testnet, not in unit tests — the default test env doesn't simulate archival.)

---

## Part B — The first build: Coin + Faucet

With the map in hand, we build its simplest region: pure fungibility.

### Learning objectives

- Understand what makes a token *fungible*: state is one number per address, with no identity.
- Use the OpenZeppelin `fungible` base (Base + Mintable) instead of reinventing it.
- Model authorization (`require_auth`) and *who* may mint (the Faucet as the sole minter) — the first real edge of the authority graph above.
- Implement an on-chain cooldown using the ledger timestamp.

### Blockchain concepts taught

- Authorization and caller identity.
- State per address (the essence of fungibility).
- On-chain time (`env.ledger().timestamp()`) as the source of truth for a cooldown.

### What you build

- **Coin** — OZ `fungible` Base + Mintable, storing a `minter: Address`; only the minter can `mint`.
- **Faucet** — `claim(addr)` checks the cooldown, mints Coin, records `last_claim[addr]`. First claim seeds **1000 Coin**; later claims drip **100**. Cooldown is admin-settable (≈60s classroom / 3h campaign).

Deploy wiring — the first edge of the authority graph (see [bootstrap](../bootstrap-and-deploy.md)):
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

- Keep the architecture map from Part A nearby — each later class fills in one more contract and one more edge of the authority graph.
- This is also where you can contrast OZ `fungible` against a classic-asset SAC if you want the advanced detour — see [decision D7](../decisions.md).
- Establish the project's `require_auth` discipline here; every later contract reuses it.

# Class 2 — Sticker: the semi-fungible, built by hand (the star class)

**Spectrum anchor:** semi-fungibility — a *type* ("CEO") has interchangeable copies, but differs from another type ("CTO").
**Contracts built:** `Sticker`, entirely hand-rolled.
**Branch:** `class-2-stickers` · **Tag:** `v0.2-semifungible` · **Implements:** Phase 3.

## Learning objectives

- Understand why a multi-token (1155-style) lives in the *middle* of the spectrum: fungible within a type, non-fungible across types.
- Build the storage by hand: `Map<(Address, u32), i128>` — owner × type_id → quantity.
- Model rarity as contract data (20 types: 12 common / 6 rare / 2 legendary; tier weights 70/25/5).
- Consciously compare: why we do **not** use a ready-made base here (didactic — see the primitive from the inside).

## Blockchain concepts taught

- Storage design and composite keys.
- The trade-off between using a library and understanding the primitive.
- How "quantity per id" produces semi-fungibility (and duplicates).

## What you build

The hand-rolled multi-token (~150–250 lines with auth, events, and overflow checks):

```rust
#[contracttype]
enum DataKey {
    Balance(Address, u32),   // (owner, type_id) -> i128
    Supply(u32),             // type_id -> total minted
    Admin,
}
```

Public surface: `balance_of(owner, type_id)`, `mint(to, type_id, amount)` (minter only), `transfer(from, to, type_id, amount)`, `burn(from, type_id, amount)`. Plus the 20-type rarity table (see [economy-and-rarity](../economy-and-rarity.md)).

> This is the contract that has **no OpenZeppelin equivalent** — there is no ERC-1155 in `stellar-tokens` (see [decision D8](../decisions.md)). Building it from scratch is the point.

## Reproduce this ✅

> On a clean checkout of `class-2-stickers`:
> ```bash
> cargo test -p tests reproduce_class_2
> ```

1. Mint 3 copies of the "CEO" type and 1 copy of a legendary type to yourself.
2. Query the balances per id and confirm them.
3. Transfer 1 "CEO" to another address and confirm both balances reconcile.
4. In one sentence, explain why two "CEO" stickers are interchangeable but "CEO" ≠ "legendary".

## Notes & gotchas

- **TTL / archival:** Sticker balances are *persistent* storage. Introduce a `extend_ttl` helper here and reuse it everywhere — skipping it silently breaks balances after some ledgers.
- Emit events (`mint` / `transfer` / `burn`) so later UI / tests can observe state changes.

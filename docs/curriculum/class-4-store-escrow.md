# Class 4 — Store + Escrow: the economy and the reason a smart contract exists

**Spectrum anchor:** the trustless trade — atomic custody that ties all the pieces together with no intermediary.
**Contracts built:** `Store` and `Escrow`.
**Branch:** `class-4-store-escrow` · **Tag:** `v0.4-marketplace` · **Implements:** Phases 5 & 7.

## Learning objectives

- Close the economic loop: buy a Pack by paying Coin (pack price = 100 Coin) at the `Store`.
- Understand atomicity: a sticker↔sticker swap that either happens entirely or not at all (custody held by the contract).
- Articulate *why this requires a smart contract*: trustless custody with no trusted intermediary.

## Blockchain concepts taught

- Contract composition (Coin → Store → Pack → Sticker).
- Atomicity and custody.
- The "trustless" argument as the justification for a contract's existence.

## What you build

- **Store** — `buy_pack(buyer)` pulls 100 Coin from the buyer and mints a Pack to them. Must be Pack's configured minter.
- **Escrow** — sticker↔sticker only:

```rust
struct Trade {
    maker: Address,
    give_type: u32,   // deposited into custody on create
    give_amount: i128,
    want_type: u32,
    want_amount: i128,
}
```

  - `create_offer(...)` — maker authorizes; contract pulls the offered sticker into custody. It leaves the maker's balance immediately.
  - `accept_offer(taker, offer_id)` — checks-effects-interactions (mark filled *before* moving assets), then two atomic transfers: custody→taker and taker→maker.
  - `cancel_offer(maker, offer_id)` — returns the custodied sticker.

Wiring:
```
deploy Store(coin_addr, pack_addr)  →  pack.set_minter(store_addr)
deploy Escrow(sticker_addr)
```

## Reproduce this ✅

> On a clean checkout of `class-4-store-escrow` (or `main`):
> ```bash
> cargo test -p tests reproduce_class_4
> ```

1. Buy a Pack by spending 100 Coin at the Store.
2. Create an Escrow offer giving one of your stickers for a type another address holds; have that address accept.
3. Confirm the swap was **atomic** — both sides changed, or neither did.
4. Finally, **describe the whole spectrum**, pointing to where each of the 7 contracts lives on it. (This is the course's success check.)

## Notes & gotchas

- **Escrow custody UX:** while an offer is open, the offered sticker is *not* in the maker's inventory — emit `offer_created` / `offer_accepted` / `offer_cancelled` events so a UI can reflect custody clearly.
- **Double-accept:** check `status != Open` before moving any assets.
- **Orphaned offers:** with no expiry, abandoned offers linger; `cancel_offer` is the manual remedy. Note the TTL trade-off.
- This class composes everything from Classes 1–3, so it's also the natural place for the final end-to-end integration test across all 7 contracts.

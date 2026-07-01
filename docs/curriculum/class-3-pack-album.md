# Class 3 — Pack + Album: the collapse and the soulbound (+ randomness module)

**Spectrum anchor:** the Pack is fungible *until opened*, when it collapses into unique items; the Album is the pure non-fungible, soulbound.
**Contracts built:** `Pack` and `Album`.
**Branch:** `class-3-packs-album` · **Tag:** `v0.3-collectibles` · **Implements:** Phases 4 & 6.

> **Self-contained demo:** this class does **not** require the Store (Class 4). Pack has a direct-mint path so the reproduce-this runs as mint Pack → open → paste. See [decision D14](../decisions.md).

## Learning objectives

- Understand the "collapse of fungibility": opening a Pack = burn + minting 3 stickers (repetition allowed) via a cross-contract call to Sticker.
- Implement a soulbound NFT with OZ `non-fungible` Base, blocking transfer; pasting = **burn** the sticker and mark the slot (irreversible).
- **Randomness module (the course's differentiator):** understand that a single-tx `env.prng()` draw is *grindable/predictable* — demonstrate the re-roll-by-simulation attack, then ship the mitigation: a **commit–reveal** open.

## Blockchain concepts taught

- Cross-contract calls and inter-contract authorization.
- Burn as a design mechanism.
- Soulbound / non-transferability and state carried in a token.
- **On-chain randomness and its security limits.**

## What you build

- **Pack** — an NFT opened in two steps (commit–reveal): `commit_open(owner)` burns the pack and records a commitment bound to the commit's ledger; `reveal_open(owner)` draws 3 results from a seed fixed at commit time and cross-contract-calls `Sticker.mint` three times. The Pack must be Sticker's configured minter.
- **Album** — a soulbound NFT (OZ `non-fungible` Base, transfer blocked); `paste(owner, type_id)` burns the sticker (cross-contract call to `Sticker.burn`) and marks the slot. The Album must be Sticker's configured burner.

Wiring:
```
deploy Pack(sticker_addr)   →  sticker.set_minter(pack_addr)
deploy Album(sticker_addr)  →  sticker.set_burner(album_addr)
```

## The randomness module (don't skip — it's the differentiator)

`env.prng()` is convenient but **grindable**. The attack:

1. The user **simulates** the `open` transaction locally.
2. They inspect the random outcome.
3. If it's bad, they simply **don't submit** — and retry. A free re-roll.

Because simulation reproduces the same PRNG result the real execution would use, naive on-chain randomness can be ground until the user gets the legendary.

**In class:** first show the naive single-tx draw and run a re-roll script live to force a rare result. Then ship the mitigation we now use: **commit–reveal**.

- `commit_open(owner)` **consumes the pack** and stores a commitment bound to the ledger it lands in (`commit_ledger`). Nothing is drawn yet.
- `reveal_open(owner)` draws from `sha256(opener ++ commit_ledger ++ nonce)` and mints.

Why this defeats the grind: every seed input is on-chain state fixed at commit time, so the draw is identical in simulation and execution (the sticker-mint **footprint must be stable** — see [decision D22](../decisions.md)). But `commit_ledger` is decided by *when the commit is included*, which the opener can't choose or predict before paying — so they can't preview or re-roll for free; every attempt already cost a pack. See [decision D24](../decisions.md).

**Honest limit (teach it):** `commit_ledger` is weak entropy — a party that controls transaction inclusion (e.g. a validator) could still bias it. Production-grade unpredictability needs a randomness beacon / VRF. The point of the lesson is the *shape* of the fix, not perfect entropy. See [decision D4](../decisions.md).

## Reproduce this ✅

> On a clean checkout of `class-3-packs-album`:
> ```bash
> cargo test -p tests reproduce_class_3
> ```

1. Open a Pack; watch 3 stickers appear in Sticker and the Pack disappear.
2. Paste a sticker into the Album; confirm it was burned and the slot marked.
3. Try to transfer the Album and confirm the transaction fails (soulbound).
4. **Bonus:** run the re-roll attack against a naive single-tx draw, then switch to `commit_open` → `reveal_open` and confirm the free re-roll is gone (the outcome is fixed once you commit, and committing costs a pack).

## Notes & gotchas

- This class is **dense** (two contracts + the randomness module). Open question: keep together, or split the re-roll attack into an optional lab? (See [open questions](../decisions.md).)
- Cross-contract authority is the thing most likely to break here — `Sticker.mint`/`burn` must check the auth of the *configured* Pack/Album address, not the end user.

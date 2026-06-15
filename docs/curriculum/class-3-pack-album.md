# Class 3 — Pack + Album: the collapse and the soulbound (+ randomness module)

**Spectrum anchor:** the Pack is fungible *until opened*, when it collapses into unique items; the Album is the pure non-fungible, soulbound.
**Contracts built:** `Pack` and `Album`.
**Branch:** `class-3-packs-album` · **Tag:** `v0.3-collectibles` · **Implements:** Phases 4 & 6.

> **Self-contained demo:** this class does **not** require the Store (Class 4). Pack has a direct-mint path so the reproduce-this runs as mint Pack → open → paste. See [decision D14](../decisions.md).

## Learning objectives

- Understand the "collapse of fungibility": opening a Pack = burn + minting 3 stickers (repetition allowed) via a cross-contract call to Sticker.
- Implement a soulbound NFT with OZ `non-fungible` Base, blocking transfer; pasting = **burn** the sticker and mark the slot (irreversible).
- **Randomness module (the course's differentiator):** understand that `env.prng()` is *grindable* — demonstrate the re-roll-by-simulation attack and discuss mitigations.

## Blockchain concepts taught

- Cross-contract calls and inter-contract authorization.
- Burn as a design mechanism.
- Soulbound / non-transferability and state carried in a token.
- **On-chain randomness and its security limits.**

## What you build

- **Pack** — an NFT; `open(owner)` burns the pack, draws 3 results with `env.prng()`, and cross-contract-calls `Sticker.mint` three times. The Pack must be Sticker's configured minter.
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

**In class:** open a pack with `env.prng()`, show it working, then run a re-roll script live and force a rare result. Then present mitigations: commit-reveal (two transactions), a future-entropy / oracle source, or making the grind economically unprofitable. Mark the `open` function with a loud comment: `// EXPLOITABLE BY SIMULATION — see Class 3`.

This is acceptable precisely because it's a testnet demo for developers — the exploit is *the best lesson in the course*. See [decision D4](../decisions.md).

## Reproduce this ✅

> On a clean checkout of `class-3-packs-album`:
> ```bash
> cargo test -p tests reproduce_class_3
> ```

1. Open a Pack; watch 3 stickers appear in Sticker and the Pack disappear.
2. Paste a sticker into the Album; confirm it was burned and the slot marked.
3. Try to transfer the Album and confirm the transaction fails (soulbound).
4. **Bonus:** run the re-roll attack script, observe you can force a rare outcome, then describe which mitigation you'd apply.

## Notes & gotchas

- This class is **dense** (two contracts + the randomness module). Open question: keep together, or split the re-roll attack into an optional lab? (See [open questions](../decisions.md).)
- Cross-contract authority is the thing most likely to break here — `Sticker.mint`/`burn` must check the auth of the *configured* Pack/Album address, not the end user.

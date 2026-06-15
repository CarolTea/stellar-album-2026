# stellar-album

An educational sticker-album dApp on **Stellar / Soroban**, built to teach developers the **full spectrum of fungibility** — from a purely fungible coin to a purely non-fungible, soulbound album — through a single, coherent collectible game.

The album collects the people who work at the **Stellar Development Foundation (SDF)**. You buy packs with an in-game coin, rip them open into random stickers, trade duplicates with other collectors, and paste stickers into your personal album.

> **Audience:** developers.
> **Format:** a project explored across **4 classes**, building the contracts incrementally.
> **Network:** Stellar (Soroban smart contracts), testnet for the course.

---

## Why this project exists

Most "what is an NFT" explainers stop at *fungible vs. non-fungible*. This project teaches the **whole spectrum** because every game object lands on a different point of it:

| Object | Position on the spectrum | What it teaches |
|---|---|---|
| **Coin** | Fungible (pure) | Every unit is identical; only a balance exists. |
| **Pack (sealed)** | Fungible *until opened* | Every sealed pack of a series is interchangeable; opening **collapses** it into unique items. |
| **Sticker** | Semi-fungible | A *type* ("CEO") has interchangeable copies (duplicates), but differs from another type ("CTO"). |
| **Album** | Non-fungible (pure) | One per person, soulbound, carries unique state (which slots are filled). |
| **Trade (Escrow)** | — (the *reason* a smart contract exists) | Trustless atomic swap, no intermediary. |

This table is the spine of the whole course. See [`docs/fungibility-spectrum.md`](docs/fungibility-spectrum.md).

---

## Documentation map

| Document | What's inside |
|---|---|
| [`docs/fungibility-spectrum.md`](docs/fungibility-spectrum.md) | The conceptual spine: the spectrum and where each contract sits. |
| [`docs/architecture.md`](docs/architecture.md) | The 7 contracts, the mint/burn authority graph, and key technical mechanics. |
| [`docs/economy-and-rarity.md`](docs/economy-and-rarity.md) | Rarity tiers, weights, pack price, faucet, and the "how long to complete" math. |
| [`docs/bootstrap-and-deploy.md`](docs/bootstrap-and-deploy.md) | Workspace layout, build order, deploy sequence, and the cross-contract wiring. |
| [`docs/glossary.md`](docs/glossary.md) | Shared vocabulary (fungible, semi-fungible, soulbound, burn, atomic, grindable…). |
| [`docs/decisions.md`](docs/decisions.md) | Decision log — what was decided and why (ADR-style). |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Phased build plan, test gates, branch/tag scheme, and live status. |
| [`docs/curriculum/`](docs/curriculum/) | The 4-class syllabus, one file per class. |

---

## The 7 contracts at a glance

```
Coin (OZ fungible)   Sticker (multi-token, hand-rolled)   Pack (NFT)
Album (soulbound NFT)   Store   Escrow   Faucet
```

- **Coin** — OpenZeppelin `fungible` (Base + Mintable). The Faucet is its minter.
- **Sticker** — a hand-rolled semi-fungible multi-token (`Map<(Address, u32), i128>`). 20 types.
- **Pack** — an NFT; opening burns it and mints 3 random stickers.
- **Album** — a soulbound NFT (OZ `non-fungible`, transfer blocked); pasting **burns** a sticker.
- **Store** — sells packs for Coin.
- **Escrow** — sticker↔sticker atomic trade with custody.
- **Faucet** — mints Coin on a parametrizable cooldown.

See [`docs/architecture.md`](docs/architecture.md) for the full design.

---

## Quick start

```bash
# scaffold the workspace + first contract (Class 1)
stellar contract init stellar-album --name coin
```

Then follow [`docs/bootstrap-and-deploy.md`](docs/bootstrap-and-deploy.md) and the [Class 1 guide](docs/curriculum/class-1-coin-faucet.md).

---

## Status

**Phase 0 — scaffolding.** See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the live phase status and test gates; open questions are tracked at the bottom of [`docs/decisions.md`](docs/decisions.md).

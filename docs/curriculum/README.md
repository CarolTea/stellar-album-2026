# Curriculum — The Fungibility Spectrum in Soroban

A 4-class course. Each class anchors on one region of the [fungibility spectrum](../fungibility-spectrum.md), builds one or two contracts, and ends with a runnable **"reproduce this"** acceptance check. Classes build incrementally — each one compiles and runs.

**Audience:** developers (basic Rust helps; Soroban is not a prerequisite).
**Through-line:** one question runs across all four classes — *"how fungible is this thing, and where in the contract is that decided?"*

| Class | Title | Spectrum anchor | Contracts |
|---|---|---|---|
| [1](class-1-coin-faucet.md) | Coin — the pure fungible | Fungible (pure) | Coin, Faucet |
| [2](class-2-sticker.md) | Sticker — semi-fungible, by hand | Semi-fungible | Sticker |
| [3](class-3-pack-album.md) | Pack + Album — the collapse & the soulbound | Fungible→unique; non-fungible | Pack, Album |
| [4](class-4-store-escrow.md) | Store + Escrow — the economy & the trustless trade | The trade | Store, Escrow |

## Delivery (proposed)

- One folder of material per class (objectives, step-by-step, the "reproduce this" checklist).
- **One cumulative git branch per class**, each the accumulated state up to that point and compiling/running. `main` is the complete project. A student can check out any point and reproduce from scratch:

  | Class | Branch | Tag | Ships |
  |---|---|---|---|
  | 1 | `class-1-coin-faucet` | `v0.1-fungible` | Coin + Faucet |
  | 2 | `class-2-stickers` | `v0.2-semifungible` | + Sticker |
  | 3 | `class-3-packs-album` | `v0.3-collectibles` | + Pack + Album |
  | 4 | `class-4-store-escrow` | `v0.4-marketplace` | + Store + Escrow |

  Build/ship order is intentionally non-linear (Store is built before Album but ships in Class 4); see [implementation-plan.md](../implementation-plan.md).
- Supporting artifacts at the docs root: the [fungibility spectrum diagram](../fungibility-spectrum.md), the [bootstrap/deploy guide](../bootstrap-and-deploy.md), and the [glossary](../glossary.md), linked at the top of each class.

## Success criterion

By the end of the four classes, a developer can:
1. **Explain the whole spectrum**, pointing to where each contract lives.
2. **Reproduce the contracts** from scratch.

If a student only watched but can't rebuild, the course failed — hence the per-class "reproduce this".

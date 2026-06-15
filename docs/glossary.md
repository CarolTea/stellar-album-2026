# Glossary

Shared vocabulary for the course, so terms mean the same thing across all four classes.

**Fungible** — Every unit is identical and interchangeable; only a quantity (balance) matters. Example: the **Coin**. One Coin is worth exactly any other Coin.

**Non-fungible (NFT)** — A unique, individually identifiable token. Example: the **Album** — one per person, carrying its own state.

**Semi-fungible** — A token that is fungible *within a type* but non-fungible *across types*. Example: the **Sticker** — your two "CEO" copies are interchangeable, but a "CEO" differs from a "CTO". Modeled as a multi-token (ERC-1155-style): a balance per `(owner, type_id)`.

**Multi-token (ERC-1155-style)** — A single contract that tracks balances for many token IDs at once. Here, hand-rolled over `Map<(Address, u32), i128>`.

**Soulbound** — A non-fungible token that **cannot be transferred**. It is bound to its owner. The **Album** is soulbound: you can't sell or send a completed album.

**Mint** — Creating new tokens. In this project the **Faucet** mints Coin, the **Store** mints Packs, and the **Pack** mints Stickers (on open).

**Burn** — Permanently destroying tokens. Opening a **Pack** burns it; pasting a sticker into the **Album** burns the sticker. Burning is **irreversible**.

**Custody (escrow)** — When a contract *holds* an asset on a user's behalf. The **Escrow** takes custody of the maker's sticker while an offer is open; the maker can cancel to get it back.

**Atomic** — A multi-step operation that either completes entirely or not at all. An Escrow swap is atomic: both sides change, or neither does.

**Trustless** — No trusted intermediary is required; the contract's code enforces the rules. The reason the **Escrow** exists.

**SAC (Stellar Asset Contract)** — A Soroban contract that exposes a classic Stellar asset as a token. We considered it for the Coin but chose an OpenZeppelin `fungible` contract instead, so the Faucet could be a contract-level minter (a SAC's mint is admin-only). See [decisions](decisions.md).

**`env.prng()`** — Soroban's pseudo-random number generator. Convenient but **grindable**: a caller can simulate a transaction, inspect the random outcome, and only submit when it's favorable (a free re-roll). Acceptable for a testnet demo; treated as explicit course content rather than hidden.

**Grindable** — A randomness mechanism a user can repeatedly retry (via simulation) until they get a result they like. The weakness of naive on-chain randomness.

**Cooldown** — A minimum time between actions, enforced on-chain via `env.ledger().timestamp()`. The **Faucet** uses one to pace coin claims.

**Cross-contract call** — One contract invoking a function on another. E.g. the Pack calls `Sticker.mint`. Requires the calling contract to hold the right authority.

**Authority edge** — A cross-contract relationship where one contract is allowed to call a privileged function on another (e.g. Pack→Sticker mint). Each edge is enforced by a settable, admin-gated `Address` field and tested the moment both endpoints exist. See [implementation-plan.md](implementation-plan.md) Hard Rule 1.

**Class branch** — A cumulative git branch holding the project state up to a given class (`class-1-coin-faucet` … `class-4-store-escrow`). A student checks one out to follow that class.

**Definition of Done (DoD)** — The three-part bar a phase must clear: unit tests green, the class "reproduce this" runnable on a clean checkout, and /docs updated.

**TTL gate** — The rule that persistent-storage archival safety is verified on testnet, not in unit tests (the test env doesn't simulate archival). See [implementation-plan.md](implementation-plan.md) Hard Rule 2.

**test-utils** — The dev-only helper crate (`contracts/test-utils`) providing a shared test `setup()` and the `extend_ttl` convention used across contracts.

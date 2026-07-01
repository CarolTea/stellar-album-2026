# Decision Log

ADR-style record of the decisions made while designing `stellar-album`, and *why*. Each entry is a decision you'd otherwise have to re-derive.

---

## D1 — Soroban contracts, not classic Stellar assets
**Decision:** Build the logic in Soroban smart contracts.
**Why:** "Open pack → 3 stickers", atomic trade, and an album with state all require contract logic that classic assets can't express. The Coin is the only piece that *could* be classic, and even it is a contract (see D7).

## D2 — Sticker model: semi-fungible per type (Model A), not unique serialized NFTs (Model B)
**Decision:** Each sticker **type** is a token id with a balance per owner (`balance > 1` = duplicate). Not "CEO #0042"-style unique tokens.
**Why:** Model A materializes the *semi-fungible* concept, which is the richest teaching point — fungible within a type, non-fungible across types. Storage stays lean and duplicates (the fuel for trading) emerge naturally.
**Trade-off:** No per-unit provenance ("the 7th CEO ever minted"). Acceptable, because the object that carries uniqueness/state in this design is the **Album**, not the sticker — the sticker is consumable input (it gets burned).

## D3 — Album: soulbound, and "paste" = burn
**Decision:** The Album is a soulbound (non-transferable) NFT, one per person. Pasting a sticker **burns** it and marks the slot.
**Why:** Soulbound makes the album a personal "progress account" nobody can buy complete. Burn-on-paste removes the sticker from circulation, accumulates permanent album state, and naturally deflates sticker supply as people complete albums.
**Consequence:** A pasted sticker can never be traded again — which *strengthens* the trade narrative ("trade while it's loose; pasting is final"). UX must make this finality explicit.

## D4 — Randomness via `env.prng()`, with the exploit taught, not hidden
**Decision:** Use `env.prng()` for pack opening.
**Why / caveat:** `env.prng()` is **grindable** — a user can simulate the open, see the result, and only submit when favorable (free re-roll). It does **not** provide caller-unmanipulable randomness. This is **fine for a testnet demo** and is turned into a course module (demonstrate the re-roll attack live, then discuss mitigations: commit-reveal, future-entropy sources, economic cost). **Would not ship to mainnet with real value.** A loud code comment marks the open function.

## D5 — Trade via Escrow (custody), sticker↔sticker only
**Decision:** Asynchronous escrow: maker deposits a sticker into the contract and lists an offer; a taker accepts later. Sticker↔sticker only — no Coin on either side.
**Why:** Escrow is async (parties needn't be online together) and far simpler UX than a two-signer atomic swap. Custody-while-open is itself the lesson: the contract is the neutral, trustless custodian. Restricting to sticker↔sticker keeps the struct and code minimal.
**Rejected alternative:** Two-signers-in-one-transaction (no custody, but requires both parties online and coordinating the same tx — poor UX, and multi-auth is the part that breaks most).

## D6 — Faucet mints Coin (not a pre-funded treasury)
**Decision:** The Faucet is the Coin's minter.
**Why:** Simpler to operate (no refunding). Supply inflating on-chain is itself didactic.
**Trade-off:** Supply is effectively infinite; a pre-funded treasury would be finite/"more real". Accepted for a demo.

## D7 — Coin is an OpenZeppelin `fungible` contract, not a SAC
**Decision:** Implement the Coin as an OZ `fungible` (Base + Mintable) contract; the Faucet is the configured minter.
**Why:** This decision follows from D6. In a **SAC** (Stellar Asset Contract), `mint` is the **admin's exclusive privilege** (one account) — for a *contract* (the Faucet) to mint, it would have to become the SAC admin via `set_admin`, mixing the classic and Soroban worlds and confusing students. An OZ `fungible` contract lets the Faucet be a minter naturally, entirely within Soroban.
**Note:** If a class ever wants to teach "classic asset + SAC" explicitly, that can be an advanced topic showing `set_admin`.

## D8 — OpenZeppelin has no multi-token; Sticker is hand-rolled
**Finding (verified against OZ docs):** `stellar-tokens` ships `fungible`, `non-fungible` (Base/Consecutive/Enumerable), `RWA`, and `vault`. The `vault` is an **ERC-4626 fungible vault** (deposit fungible → shares) with no `token_id` — it does **not** fit a semi-fungible sticker. There is **no ERC-1155 / multi-token** module.
**Decision:** Hand-roll the Sticker multi-token over `Map<(Address, u32), i128>`. Reuse OZ `non-fungible` for the **Album** and OZ `fungible` for the **Coin**.
**Why it's good:** Building the "1155 from scratch" is the star teaching moment — students see what an abstraction would hide. Only 1 of the 3 tokens is artisanal; the library carries the other 2.

## D9 — Audience and format: developers, 4 classes, hybrid pacing
**Decision:** The audience is **developers** exploring the complete project across **4 classes**. Format: a live conceptual session per class plus a self-paced lab between classes.
**Why it matters:** This flipped an earlier scoping instinct to *cut* the album and the trade. For a dev audience over 4 classes, **completeness is the feature** — each of the 5 elements teaches a distinct point on the fungibility spectrum. The job became *sequencing the curriculum*, not trimming features.
**Success criterion:** by the end, a dev can (a) explain the whole spectrum, pointing to where each piece lives, and (b) reproduce the contracts from scratch. Each class has a "reproduce this" acceptance check.

---

## D10 — Cumulative class branches + milestone tags
**Decision:** Build in dependency order, but ship **cumulative** class branches: `class-1-coin-faucet` → `class-2-stickers` → `class-3-packs-album` → `class-4-store-escrow`, each branching from the previous. Tags mark the spectrum milestone reached: `v0.1-fungible`, `v0.2-semifungible`, `v0.3-collectibles`, `v0.4-marketplace`. `main` integrates everything.
**Why:** Branch names communicate *which contracts* ship; tags communicate *which point on the fungibility spectrum* is reached. A student checks out any class branch and gets a compiling, runnable project up to that lesson. See [implementation-plan.md](implementation-plan.md).

## D11 — Three-part Definition of Done per phase
**Decision:** A phase is done only when (1) unit tests are green, (2) the class "reproduce this" runs end-to-end on a clean checkout via one documented command, and (3) the relevant /docs are updated (including the plan's Status column).
**Why:** "Testable" alone produces a pile of green tests with no demoable narrative. Tying done-ness to the runnable class demo keeps the build aligned with the course.

## D12 — Authority edges tested the moment both endpoints exist
**Decision:** Each cross-contract authority edge gets a dedicated integration test as soon as both contracts exist — never deferred. The privileged authority (minter/burner) is a settable, admin-gated `Address`; unit tests point it at a test address, integration tests rewire it to the real contract.
**Why:** The authority seam is the #1 thing that breaks, and the bug lives in the wiring, not either contract. The unit-vs-integration address swap *is* the auth test harness. See [implementation-plan.md](implementation-plan.md) Hard Rule 1.

## D13 — TTL/archival is a testnet runtime gate, not a unit test
**Decision:** Treat persistent-storage TTL/archival safety as a testnet/deploy-gate checklist item, not a unit-test assertion.
**Why:** The default Soroban test env does **not** simulate archival — green CI does not prove archival safety. In-contract `extend_ttl` policy is applied from Phase 3 (Sticker) onward; verification happens on testnet. See [implementation-plan.md](implementation-plan.md) Hard Rule 2.

## D14 — Album's Class-3 demo stands without Store
**Decision:** Although Store (Phase 5) is built before Album (Phase 6) in dependency order, Store ships in `class-4`, not `class-3`. Pack gets a **direct-mint path** so Album's Class-3 "reproduce this" (mint Pack → open → paste) runs without a Store purchase.
**Why:** Keeps the Class-3 narrative self-contained (collectibles) and Class-4 focused on the marketplace. The build/ship non-linearity is intentional.

## D15 — Art & consent is a parallel launch-gate milestone
**Decision:** The 20 sticker artworks + consent from featured SDF people is tracked as a separate milestone, owned and dated independently of the contract work. Placeholders (numbered/generated images, dummy metadata) unblock all code.
**Why:** It blocks public Class-2 *launch*, not engineering. Decoupling it prevents a content dependency from stalling the build.

---

## D16 — Sealed packs are a fungible count, not per-id NFTs
**Decision:** A holder owns a *count* of sealed packs (`Balance(Address) -> i128`), not individually-numbered NFT tokens. `open()` decrements the count by one and mints 3 stickers.
**Why:** The spectrum framing already says a sealed pack is *fungible until opened* — every sealed pack of the series is interchangeable. Modelling them as a fungible count makes that literally true, and makes `open()` the fungible→unique **collapse** in one call, which is the Class 3 teaching hook. Per-id NFTs would add provenance the design doesn't use (the Album carries uniqueness, not the pack). This refines the earlier "Pack = NFT" wording in architecture.md.

---

## D17 — Album is hand-rolled, not OZ `non-fungible`
**Decision:** Implement the Album as a hand-rolled soulbound, per-owner stateful contract rather than on the OpenZeppelin `non-fungible` Base. Soulbound is enforced by construction — there is **no transfer function**.
**Why:** OZ `non-fungible` 0.7.2 has no soulbound extension (making it non-transferable means overriding the `contracttrait`-exported `transfer`), and the album's meaningful state is the per-owner slot bitmap, which `non-fungible` doesn't model — it would be hand-rolled regardless. A contract with no transfer entrypoint is the cleanest possible soulbound. (Net: only Coin reuses an OZ token Base; Sticker and Album are hand-rolled — Sticker because no multi-token exists, Album for the reasons here.)

---

## D18 — Frontend stack: Vite + React + TypeScript + Tailwind, generated bindings
**Decision:** The frontend is a client-only Vite + React + TypeScript app, styled with Tailwind. Contract access uses **generated TypeScript bindings** (`stellar contract bindings typescript` per deployed contract) on top of `@stellar/stellar-sdk`.
**Why:** It's a testnet demo with all reads/writes against RPC — no need for SSR/Next. Generated bindings give a typed client per contract (`pack.open` → `AssembledTransaction<Array<u32>>`), eliminating hand-written XDR/ScVal. See [frontend-and-testnet.md](frontend-and-testnet.md).

## D19 — Wallet: Freighter via Stellar Wallets Kit (passkeys later)
**Decision:** v1 uses **Freighter** through `@creit.tech/stellar-wallets-kit`. Passkey / smart-account login is deferred.
**Why:** Path of least resistance for a dev-facing testnet build — one connect step, no infra. Passkeys are a better end-user experience but require a smart-wallet factory + sponsor/relay + recovery handling (a week-plus); they belong to the same future milestone as real fee sponsorship (D20).

## D20 — Fees: friendbot auto-fund now; Launchtube / OZ relay later
**Decision:** The product intent is "the user never deals with XLM/gas." For v1 (Freighter + testnet) this is met by **auto-funding the connected account via friendbot on connect** — no fee-sponsorship backend. All transaction submission is isolated behind a single `submit(tx)` helper so the submitter can be swapped without touching contract calls.
**Why:** On testnet a Freighter account is friendbot-funded and pays its own trivial fee; true fee sponsorship (a fee-bump endpoint with a hot sponsor key) would add a keyed backend that buys nothing here. **Real sponsorship — via Launchtube or an OpenZeppelin relayer — is deferred to the mainnet / passkey phase**, where users genuinely start at zero balance and no friendbot exists. The `submit()` indirection makes that swap a contained, few-hours change. Note: classic "sponsored reserves" is account-creation min-balance, not tx fees — not relevant here.

## D21 — v1 frontend scope: the core loop only
**Decision:** The first testable build is **connect → claim (Faucet) → buy (Store) → open (Pack) → reveal 3 stickers (rarity + type)**. Album paste and Escrow trade UIs are v2. Sticker serial numbers are not shown (stickers are per-type counts, not individually serialized — D16).
**Why:** That single path already demonstrates the whole fungibility spectrum (fungible Coin spent → fungible Pack → collapses into semi-fungible stickers). The Album and Escrow *contracts* are built and tested, so deferring their *UI* costs nothing on the backend. Done = "on testnet, connect a wallet, claim, buy, open, and see 3 stickers with rarity, in under 2 minutes." Guard against gilding screens before the loop runs on-chain.

---

## D22 — Pack draw is deterministic (seeded), not network-random
**Decision:** `Pack.open` seeds the PRNG from the **opener's address plus a per-opener nonce** (`sha256(opener ++ nonce)`) and increments the nonce each open, instead of using the raw network PRNG.
**Why (a real bug found on testnet):** `open` uses the draw to choose *which* sticker storage keys to write. Soroban derives a transaction's storage footprint from **simulation**; the raw `env.prng()` produces a *different* draw at execution than at simulation, so execution writes keys absent from the simulated footprint and the tx **traps** (`InvokeHostFunction(Trapped)`) — every open failed. Seeding from stable on-chain state makes the draw identical in simulation and execution, so the footprint matches.
**Update (nonce-only → opener+nonce):** the original seed was `sha256(nonce)` only. Because every player's nonce starts at 0 and counts identically, *everyone* received the **same** global draw sequence — so one legendary (type 18, "Stellar Village") stayed unreachable for all until ~pack #43, and trading was pointless (identical collections and duplicates). Mixing the opener's address into the seed gives each player an independent sequence while keeping the draw a pure function of `(opener, nonce)`, so the footprint stays stable. Regression covered by `different_openers_draw_different_sequences` in `contracts/pack/src/test.rs`.
**Trade-off:** draws are still predictable per `(opener, nonce)` — acceptable for a teaching demo, and a natural hook for the commit-reveal lesson. Proper unpredictable randomness (e.g. commit-reveal, or drawing at mint time into a per-pack record) is future work. Mirrors Tyler's original "deterministic-at-mint" caution.

## D23 — Frontend integration fixes (testnet bring-up)
**Decisions made while getting the v1 app running on testnet:**
- `@stellar/stellar-sdk` pinned to **15.x** (not 13.x): the contracts use protocol-23 types (`ScSpecTypeMuxedAddress`, value 20, from Coin's `transfer`); older SDKs can't parse the spec.
- Vite `define: { global: "globalThis" }` — stellar-wallets-kit bundles wallet modules that reference Node's `global`.
- Contract clients import the generated **source** (`../contracts/<name>/src/index.ts`); the bindings' package `exports` points at an unbuilt `./dist`.
- The pack reveal reads drawn stickers from **on-chain balance diff** (before/after `open`), not the tx return value — robust across SDK result-parsing, and authoritative.
- `bootstrap.sh` reuses an existing funded deployer key (idempotent) and quotes the network passphrase in `.env.local`.

## D24 — Contracts are upgradeable in place (PR-UPG / UPG-1)
**Decision:** every stateful contract (Coin, Sticker, Pack, Album, Store, Faucet, Escrow) exposes an admin-gated `upgrade(new_wasm_hash)` that calls `env.deployer().update_current_contract_wasm(...)` through a shared `common::upgrade(env, admin, hash)` helper.
**Why:** v0.1–v0.4 contracts had no upgrade path, so any fix meant a full redeploy — new contract ids, re-wiring the authority graph, and **loss of all persistent state** (balances, albums, open offers). A one-line bug became a deploy-and-migration problem. In-place upgrade keeps the id and storage; only code changes.
**How:** one audited helper in `common` so all seven gate upgrades identically (admin auth). `make upgrade CONTRACT=<name>` (`upgrade.sh`) installs the new wasm and invokes `upgrade` against the existing id, leaving `frontend/.env.local` untouched.
**Trade-off:** upgradeability widens the trust surface (a compromised admin key can swap code). Accepted for a testnet teaching system; mainnet would gate this behind a timelock/governance. v0.5 upgrades are constrained to **additive** storage-schema changes (no migration hook yet — see open questions).

## D25 — Admin added to Faucet and Escrow constructors (UPG-1/UPG-2)
**Decision:** Faucet and Escrow, which previously stored no admin, now take `admin` as their first constructor arg (matching Coin/Sticker/Pack/Album/Store), exposed via `admin()`.
**Why:** both `upgrade` and the new address setters need an authority to gate them. Without a stored admin there is no on-chain principal to `require_auth`. Constructor call sites updated: `faucet`/`escrow` unit tests and `tests/src/class_1.rs` + `class_4.rs`; `bootstrap.sh` passes `--admin "$DEPLOYER"`.

## D26 — Reconfigurable authority graph via setters (UPG-2)
**Decision:** extend the existing `Sticker.set_minter/set_burner` convention to every cross-contract edge address: `Pack.set_sticker`, `Album.set_sticker`, `Store.set_coin/set_pack/set_treasury`, `Escrow.set_sticker`, `Faucet.set_coin`. Constructors still supply the *initial* wiring.
**Why:** paired with upgradeability, a mis-wire or a contract swap can be repaired without redeploy. Each setter is admin-gated and bumps instance TTL (Hard Rule 2).

## D27 — Self-transfer / self-accept rejected on-chain (SEC-1/SEC-2)
**Decision:** `Sticker.transfer` rejects `from == to`; `Escrow.accept_offer` rejects `taker == maker`. Both panic rather than no-op, enforced in the contract.
**Why (real bug):** with `from == to`, the credit write overwrote the debit on the same `Balance(owner, type)` key, leaving the holder at `balance + amount` — stickers minted from nothing, breaking balance conservation. `accept_offer` with `taker == maker` amplified it via the self-transfer of `want_type`. The escrow guard is independent of the sticker guard (defense in depth: the contract is the trust boundary, not the dApp). Covered by `self_transfer_is_rejected` and `accepting_own_offer_is_rejected`.

## D28 — Events (observability) deferred to a follow-up (OBS-1)
**Decision:** structured per-mutation events are specced ([SPEC.md](../SPEC.md) OBS-1) but **not** shipped in PR-UPG; they land in a separate commit/PR.
**Why:** events are additive observability, not part of "contracts are upgradeable"; keeping them out keeps PR-UPG focused and its diff reviewable. The frontend reveal already reads drawn types from the tx result, so nothing depends on events yet.
## D29 — Pack opening is commit–reveal (anti-grind)
**Decision:** replace the single-tx `open` with a two-step **commit–reveal**. `commit_open(opener)` consumes one pack and stores a `Commit { commit_ledger, nonce }` (one outstanding per opener); `reveal_open(opener)` draws `PACK_SIZE` from `sha256(opener ++ commit_ledger ++ nonce)`, mints, and clears the commitment.
**Why:** the [D22](#d22--pack-draw-is-deterministic-seeded-not-network-random) draw was deterministic per `(opener, nonce)` — fully *predictable* (the opener could foresee every future pack) and the original "grind by simulation" weakness. Binding the seed to `commit_ledger` — the ledger that *happens* to include the commit — adds entropy the opener cannot choose or know before paying, so they can neither preview nor re-roll for free; each attempt already cost a pack at commit.
**Why it stays simulation-stable:** every seed input is on-chain state fixed at commit time, so `reveal_open`'s draw (and thus its sticker-mint storage footprint) is identical in simulation and execution — the hard Soroban constraint that forced D22's determinism still holds.
**Trade-off (taught, not hidden):** `commit_ledger` is weak entropy — a party controlling transaction inclusion (e.g. a validator) could bias it. Production-grade unpredictability needs a randomness beacon / VRF; that remains future work. The two-tx UX also changes the reveal choreography (frontend follow-up). See docs/curriculum/class-3-pack-album.md.

---

## Open questions (not yet decided)

- **Class 3 density.** Pack + Album + the randomness module is a lot for one class. Keep together (strongest hook) or split the re-roll attack into an optional lab?
- **Delivery format.** Live/recorded with an instructor script, vs. written self-paced material — changes whether "reproduce this" is written as an instructor script or a standalone student checklist.
- **Art & consent.** 20 stickers means artwork for 20 real SDF people. This is a *content* dependency (not code) that can stall the project. Who produces the art? Have all featured colleagues consented? Recommended: decouple art from code with numbered placeholder avatars so the contract classes aren't blocked on final PNGs.

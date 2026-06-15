# Implementation Plan

How `stellar-album` gets built: in **dependency order**, in **testable pieces**, shipped as **cumulative class branches**. Every phase ends with a green `cargo test`, and the integration-test crate grows *incrementally* per phase — never bolted on at the end.

- Architecture and the authority graph: [architecture.md](architecture.md).
- The 4-class course the branches map to: [curriculum/README.md](curriculum/).
- Deploy ordering and cross-contract wiring: [bootstrap-and-deploy.md](bootstrap-and-deploy.md).

---

## Phase map

| Phase | Contract(s) | Effort | Branch | Tag | Status |
|---|---|---|---|---|---|
| 0 | Scaffolding (workspace, `test-utils`, CI) | — | — | — | ⬜ |
| 1 | Coin (OZ `fungible`) | Low | `class-1-coin-faucet` | `v0.1-fungible` | ⬜ |
| 2 | Faucet | Low | `class-1-coin-faucet` | `v0.1-fungible` | ⬜ |
| 3 | Sticker (semi-fungible) | **High** | `class-2-stickers` | `v0.2-semifungible` | ⬜ |
| 4 | Pack (randomness) | **Highest** | `class-3-packs-album` | `v0.3-collectibles` | ⬜ |
| 5 | Store | Med | `class-4-store-escrow` | `v0.4-marketplace` | ⬜ |
| 6 | Album (soulbound) | Med | `class-3-packs-album` | `v0.3-collectibles` | ⬜ |
| 7 | Escrow | **High** | `class-4-store-escrow` | `v0.4-marketplace` | ⬜ |

> **Deliberate non-linearity:** the *build* order (dependency-driven) is 0→7. The *ship* order differs: **Store (Phase 5) ships in `class-4`**, **Album (Phase 6) ships in `class-3`**. Store is built before Album because Album's burn path and Store's mint path both depend on lower contracts, but Album belongs to the Class-3 narrative and Store to Class-4. This is intentional — see [decision D14](decisions.md).

Status legend: ⬜ todo · 🔵 in progress · ✅ done. **The Status column is the single source of truth** — update it in the same PR that lands the phase.

---

## Per-phase detail

### Phase 0 — Scaffolding
- **Builds:** Cargo workspace (`[workspace] members = ["contracts/*", "tests"]`); a `[workspace.dependencies]` block pinning `soroban-sdk` and the OZ crates (compatible versions, pinned now); a dev-only `contracts/test-utils` crate exposing `setup() -> Env` (with `mock_all_auths`) and the shared **`extend_ttl` TTL convention** + threshold consts; CI running `fmt` / `clippy -D warnings` / `test --workspace` / `build --target wasm32-unknown-unknown --release`.
- **Tests that prove it:** `cargo test --workspace` runs (zero real tests OK) and the wasm target compiles.
- **Authority edges tested:** none yet.
- **Exit criteria:** empty workspace builds to wasm; CI green on a trivial commit.
- **Definition of Done:** see [DoD](#definition-of-done).
- **Ships as:** — (foundation; lands on `class-1-coin-faucet`).

### Phase 1 — Coin (OZ `fungible` Base + Mintable)
- **Builds:** Coin wrapping OZ `fungible` Base + Mintable; constructor sets metadata + a settable `minter` address; `mint` gated to the minter.
- **Tests that prove it:** mint increases balance + supply; transfer moves balance; **non-minter mint panics** (selective `mock_auths`, not `mock_all_auths`, to prove the gate rejects).
- **Authority edges tested:** none yet (minter is a test address).
- **Exit criteria:** balance/supply/transfer/mint correct; unauthorized mint rejected.
- **Ships as:** `class-1-coin-faucet` / `v0.1-fungible`.

### Phase 2 — Faucet (mints Coin, cooldown)
- **Builds:** Faucet holding the Coin address + parametrizable cooldown (60s class / 3h campaign) + 1000-Coin seed; `claim()` checks per-address last-claim timestamp and cross-calls `Coin::mint`.
- **Tests that prove it:** unit test cooldown math; **first integration test** — deploy Coin + Faucet, set Faucet as minter, claim → balance 1000; advance ledger time and prove second claim fails before cooldown / succeeds after.
- **Authority edges tested:** **Faucet→Coin** (the first and simplest edge — establishes the cross-contract auth harness early).
- **Exit criteria:** claim mints; cooldown enforced both directions; time-travel test green.
- **Ships as:** `class-1-coin-faucet` / `v0.1-fungible`.

### Phase 3 — Sticker (hand-rolled semi-fungible multi-token) — HIGH EFFORT
- **Builds:** `Map<(Address,u32),i128>` balances + per-type supply; `mint`/`burn`/`transfer`/`balance_of`/`supply`; settable `minter` + `burner` addresses; 20 types + rarity weights as `const` data. First contract with non-trivial persistent storage → **TTL convention applied here**.
- **Tests that prove it:** heavy unit coverage — underflow rejected (burn/transfer > held panics), supply tracking across mint+burn, `balance_of` of unminted type == 0, auth gate on mint.
- **Authority edges tested:** none new yet (minter/burner are test addresses until Pack/Album exist).
- **Exit criteria:** full SFT semantics proven; only intended panics.
- **Ships as:** `class-2-stickers` / `v0.2-semifungible`.

### Phase 4 — Pack (NFT; open → prng → cross-mint Stickers) — HIGHEST EFFORT
- **Builds:** Pack NFT; `open(owner)` burns the pack, rolls 3 sticker types via weighted `env.prng()` (repeats allowed), cross-calls `Sticker::mint` 3×. Includes a direct-mint path so the Class-3 demo doesn't need Store (see [D14](decisions.md)).
- **Tests that prove it:** unit-test the weighted-pick function in isolation first; **seed the prng** to assert exact rolls and walk weight boundaries (force legendary / force common).
- **Authority edges tested:** **Pack→Sticker** (mint).
- **Exit criteria:** open burns pack + mints exactly 3 stickers per seeded roll; weight buckets verified.
- **Ships as:** `class-3-packs-album` / `v0.3-collectibles`.

### Phase 5 — Store (sells Pack for Coin)
- **Builds:** `buy_pack(buyer)` pulls 100 Coin and cross-mints a Pack.
- **Tests that prove it:** integration of the left half of the graph (Coin + Faucet + Pack + Store): faucet → buyer gets Coin → buy_pack debits 100 + mints Pack; insufficient balance rejected.
- **Authority edges tested:** **Store→Pack** (mint) and the Coin transfer-in.
- **Exit criteria:** full "earn Coin → buy Pack" path green in one integration test.
- **Ships as:** `class-4-store-escrow` / `v0.4-marketplace`.

### Phase 6 — Album (soulbound NFT, paste = burn)
- **Builds:** OZ `non-fungible` with **transfer overridden to panic** (soulbound); `paste(owner, type)` burns 1 sticker + marks the slot; irreversible (re-paste of a filled slot panics).
- **Tests that prove it:** transfer-blocked test; paste burns + marks; double-paste rejected; completion query works.
- **Authority edges tested:** **Album→Sticker** (burn).
- **Exit criteria:** soulbound enforced; paste semantics correct.
- **Ships as:** `class-3-packs-album` / `v0.3-collectibles`.

### Phase 7 — Escrow (sticker↔sticker custody) — HIGH EFFORT
- **Builds:** `create_offer` (takes maker's sticker into custody), `accept_offer` (atomic swap), `cancel_offer` (returns custody). Checks-effects-interactions on accept.
- **Tests that prove it:** two-user create/accept happy path; create/cancel returns funds; accept with wrong want_type panics; double-accept panics. **Assert sticker balance conservation** (totals before == after across both parties + escrow) — no custody leak.
- **Authority edges tested:** **Escrow→Sticker** (transfer / custody).
- **Exit criteria:** all three paths conserve balances; no locked stickers.
- **Ships as:** `class-4-store-escrow` / `v0.4-marketplace`.

---

## Hard Rule 1 — Authority edges are tested the moment both endpoints exist

The #1 thing that breaks a multi-contract system is the cross-contract authority seam — and the bug lives in neither contract, but in the bootstrap wiring and the boundary `require_auth`. A green unit suite on both sides proves nothing about whether the callee actually accepts the caller's auth.

**Rule:** each authority edge gets a dedicated integration test the moment both endpoints exist. Never defer to an end-of-project "wiring phase."

**Convention (this is also the test harness):** the privileged authority is a settable, admin-gated `Address` field (`set_minter` / `set_burner`). Unit tests point it at a test address; integration tests rewire it to the real contract. The unit-vs-integration address swap *is* the authority test.

| Edge | Privileged op | First testable | Phase |
|---|---|---|---|
| Faucet → Coin | mint | Faucet exists | **2** |
| Pack → Sticker | mint | Pack exists | **4** |
| Store → Pack | mint | Store exists | **5** |
| Album → Sticker | burn | Album exists | **6** |
| Escrow → Sticker | transfer | Escrow exists | **7** |

---

## Hard Rule 2 — TTL / archival is a testnet runtime gate, not a unit test

**The default Soroban test env does NOT simulate state archival / TTL expiry.** Unit and integration suites can be 100% green while a contract's persistent entries archive out from under users on-ledger.

- **Do not** read "tests pass" as "archival-safe."
- **In-contract:** call `extend_ttl` on persistent entries on every touch, with a documented threshold/extend-to policy. The helper + consts live in `contracts/test-utils`. Policy decided at Phase 3 (Sticker), applied consistently in Pack and Album.
- **Verification:** a **testnet checklist item** that lets entries approach expiry and confirms extend behavior — part of the deploy gate, not CI. See [bootstrap-and-deploy.md](bootstrap-and-deploy.md#ttl--archival-a-testnet-gate-not-a-unit-test).

---

## Milestone & branch scheme

Build in dependency order; ship **cumulative** class branches. Each branch is the accumulated state up to that class, compiles, and runs on a clean checkout. `main` integrates everything.

| Class | Branch | Tag | Phases | Ships |
|---|---|---|---|---|
| 1 | `class-1-coin-faucet` | `v0.1-fungible` | 0–2 | Coin + Faucet |
| 2 | `class-2-stickers` | `v0.2-semifungible` | 3 | + Sticker |
| 3 | `class-3-packs-album` | `v0.3-collectibles` | 4, 6 | + Pack + Album |
| 4 | `class-4-store-escrow` | `v0.4-marketplace` | 5, 7 | + Store + Escrow |

**The test IS the demo:** each class's "reproduce this" check (in its [curriculum file](curriculum/)) is the *headline integration test* for that branch — not a separate deliverable.

---

## Definition of Done

A phase is done only when **all three** hold:

1. **Unit tests green** — the contract's own correctness coverage.
2. **"Reproduce this" runnable** — the class's acceptance check runs end-to-end on a clean checkout via one documented command.
3. **/docs updated** — the per-class doc reflects what's on the branch, including the reproduce-this command, and this plan's Status column is current.

Green-but-undocumented, or green-but-doesn't-run-on-clean-checkout, is **not done**.

---

## Parallel track — Art & consent

The **20 sticker artworks + consent** from the featured SDF people is a **launch gate, not a build gate**. Placeholders (numbered/generated images, dummy metadata) fully unblock Sticker, Pack, and Album. Tracked as its own milestone, owned and dated independently, resolved before any public Class-2 delivery. See [decision D15](decisions.md).

---

## Open questions

- **Class 3 density.** Pack + Album + the randomness module is a lot for one class — keep together (strongest hook) or split the re-roll attack into an optional lab? (Mirrors [decisions.md](decisions.md) open questions.)
- **Delivery format.** Live/recorded with an instructor script vs. written self-paced — affects whether "reproduce this" is an instructor script or a standalone student checklist.

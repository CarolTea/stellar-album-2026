#![no_std]
//! Pack — the sealed pack that collapses into stickers (Class 3).
//!
//! A sealed pack is **fungible**: every sealed pack is interchangeable, so a
//! holder simply owns a *count* of them. Opening one **collapses** that
//! fungibility — it is consumed and 3 semi-fungible stickers are minted via the
//! rarity-weighted PRNG. That crossing of the spectrum, in a single call, is
//! the Class 3 hook. See docs/fungibility-spectrum.md and docs/decisions.md D16.
//!
//! ## Randomness is grindable (taught, not hidden)
//! `env.prng()` is convenient but a caller can simulate `open`, inspect the
//! result, and only submit when it's favorable — a free re-roll. This is
//! acceptable for a testnet teaching demo and is itself a lesson; it would NOT
//! be safe on mainnet with real value. See docs/curriculum/class-3-pack-album.md.

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, xdr::ToXdr, Address, Bytes, Env, Vec,
};

/// Minimal view of the Sticker contract Pack mints into. Declared locally to
/// avoid depending on the `sticker` cdylib (which would collide on `__constructor`).
#[contractclient(name = "StickerMint")]
pub trait StickerInterface {
    fn mint(env: Env, to: Address, sticker_type: u32, amount: i128);
}

#[contracttype]
enum DataKey {
    /// May repoint the minter.
    Admin,
    /// The only address allowed to mint sealed packs (the Store, Phase 5).
    Minter,
    /// Address of the Sticker contract opened packs mint into.
    Sticker,
    /// Sealed packs held by an address.
    Balance(Address),
    /// Per-opener counter, used to seed the draw deterministically.
    Nonce(Address),
}

/// Stickers revealed per pack.
const PACK_SIZE: u32 = 3;

#[contract]
pub struct Pack;

#[contractimpl]
impl Pack {
    pub fn __constructor(e: &Env, admin: Address, minter: Address, sticker: Address) {
        let s = e.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Minter, &minter);
        s.set(&DataKey::Sticker, &sticker);
    }

    /// Sealed packs held by `owner`.
    pub fn balance(e: &Env, owner: Address) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    /// Mint `amount` sealed packs to `to`. Minter only (the Store sells packs;
    /// for the Class 3 demo the minter can mint directly — decision D14).
    pub fn mint(e: &Env, to: Address, amount: i128) {
        Self::minter(e).require_auth();
        if amount <= 0 {
            panic!("pack: amount must be positive");
        }
        let bal = Self::balance(e, to.clone());
        set_balance(e, &to, bal + amount);
        common::extend_instance(e);
    }

    /// Open one sealed pack held by `opener`: consume it and mint
    /// `PACK_SIZE` rarity-weighted stickers (repeats allowed). Returns the
    /// drawn types, for the reveal. Authorized by `opener`.
    pub fn open(e: &Env, opener: Address) -> Vec<u32> {
        opener.require_auth();

        let bal = Self::balance(e, opener.clone());
        if bal < 1 {
            panic!("pack: none to open");
        }
        set_balance(e, &opener, bal - 1);

        // Seed the PRNG deterministically from the opener's address AND a
        // per-opener nonce so the draw is IDENTICAL in simulation and execution.
        // The draw picks which sticker storage keys get written; if it were
        // network-random, execution would touch different keys than the
        // simulated footprint and the tx would trap. Determinism keeps the
        // footprint stable.
        //
        // Mixing the opener into the seed makes every player's sequence
        // independent — without it the seed is nonce-only and everyone's n-th
        // pack draws the same types (the same legendary stays unreachable for
        // all). See docs/decisions.md D22.
        //
        // Trade-off: draws are still predictable per (opener, nonce) — a known
        // limitation for a demo, and a teaching hook for commit-reveal.
        let nkey = DataKey::Nonce(opener.clone());
        let nonce: u64 = e.storage().persistent().get(&nkey).unwrap_or(0);
        let mut seed_material = opener.clone().to_xdr(e);
        seed_material.append(&Bytes::from_array(e, &nonce.to_be_bytes()));
        let seed: Bytes = e.crypto().sha256(&seed_material).into();
        e.prng().seed(seed);

        let sticker = StickerMint::new(e, &Self::sticker(e));
        let mut drawn = Vec::new(e);
        for _ in 0..PACK_SIZE {
            let roll: u64 = e.prng().gen_range(0..common::TOTAL_WEIGHT as u64);
            let sticker_type = common::type_for_roll(roll);
            sticker.mint(&opener, &sticker_type, &1);
            drawn.push_back(sticker_type);
        }

        e.storage().persistent().set(&nkey, &(nonce + 1));
        common::extend_persistent(e, &nkey);
        common::extend_instance(e);
        drawn
    }

    pub fn admin(e: &Env) -> Address {
        e.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn minter(e: &Env) -> Address {
        e.storage().instance().get(&DataKey::Minter).unwrap()
    }

    pub fn sticker(e: &Env) -> Address {
        e.storage().instance().get(&DataKey::Sticker).unwrap()
    }

    pub fn set_minter(e: &Env, new_minter: Address) {
        Self::admin(e).require_auth();
        e.storage().instance().set(&DataKey::Minter, &new_minter);
        common::extend_instance(e);
    }
}

fn set_balance(e: &Env, owner: &Address, amount: i128) {
    let key = DataKey::Balance(owner.clone());
    e.storage().persistent().set(&key, &amount);
    common::extend_persistent(e, &key);
}

#[cfg(test)]
mod test;

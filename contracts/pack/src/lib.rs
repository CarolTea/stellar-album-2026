#![no_std]
//! Pack — the sealed pack that collapses into stickers (Class 3).
//!
//! A sealed pack is **fungible**: every sealed pack is interchangeable, so a
//! holder simply owns a *count* of them. Opening one **collapses** that
//! fungibility — it is consumed and 3 semi-fungible stickers are minted via the
//! rarity-weighted PRNG. Opening is commit–reveal. See docs/decisions.md D16/D24
//! and docs/curriculum/class-3-pack-album.md.

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, xdr::ToXdr, Address, Bytes, BytesN, Env,
    Vec,
};

/// Minimal view of the Sticker contract Pack mints into. Declared locally to
/// avoid depending on the `sticker` cdylib (which would collide on `__constructor`).
#[contractclient(name = "StickerMint")]
pub trait StickerInterface {
    fn mint(env: Env, to: Address, sticker_type: u32, amount: i128);
}

#[contracttype]
pub struct Commit {
    pub commit_ledger: u32,
    pub nonce: u64,
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
    /// Per-opener counter, snapshotted into each commitment to vary the draw.
    Nonce(Address),
    /// A committed-but-unrevealed pack for an opener.
    Commit(Address),
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

    /// Commit to opening one pack (phase 1 of commit–reveal). Authorized by `opener`.
    pub fn commit_open(e: &Env, opener: Address) {
        opener.require_auth();

        if Self::has_commit(e, opener.clone()) {
            panic!("pack: reveal your pending pack first");
        }
        let bal = Self::balance(e, opener.clone());
        if bal < 1 {
            panic!("pack: none to open");
        }
        set_balance(e, &opener, bal - 1);

        let nkey = DataKey::Nonce(opener.clone());
        let nonce: u64 = e.storage().persistent().get(&nkey).unwrap_or(0);

        let ckey = DataKey::Commit(opener.clone());
        e.storage().persistent().set(
            &ckey,
            &Commit {
                commit_ledger: e.ledger().sequence(),
                nonce,
            },
        );
        common::extend_persistent(e, &ckey);

        e.storage().persistent().set(&nkey, &(nonce + 1));
        common::extend_persistent(e, &nkey);
        common::extend_instance(e);
    }

    /// Reveal the committed pack (phase 2 of commit–reveal): draw and mint
    /// `PACK_SIZE` stickers, returning the drawn types. Authorized by `opener`.
    pub fn reveal_open(e: &Env, opener: Address) -> Vec<u32> {
        opener.require_auth();

        let ckey = DataKey::Commit(opener.clone());
        let commit: Commit = match e.storage().persistent().get(&ckey) {
            Some(c) => c,
            None => panic!("pack: no pending pack to reveal"),
        };
        e.storage().persistent().remove(&ckey);

        let mut seed_material = opener.clone().to_xdr(e);
        seed_material.append(&Bytes::from_array(e, &commit.commit_ledger.to_be_bytes()));
        seed_material.append(&Bytes::from_array(e, &commit.nonce.to_be_bytes()));
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

        common::extend_instance(e);
        drawn
    }

    /// Whether `opener` has a committed-but-unrevealed pack.
    pub fn has_commit(e: &Env, opener: Address) -> bool {
        e.storage().persistent().has(&DataKey::Commit(opener))
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

    pub fn set_sticker(e: &Env, new_sticker: Address) {
        Self::admin(e).require_auth();
        e.storage().instance().set(&DataKey::Sticker, &new_sticker);
        common::extend_instance(e);
    }

    pub fn upgrade(e: &Env, new_wasm_hash: BytesN<32>) {
        common::upgrade(e, &Self::admin(e), new_wasm_hash);
    }
}

fn set_balance(e: &Env, owner: &Address, amount: i128) {
    let key = DataKey::Balance(owner.clone());
    e.storage().persistent().set(&key, &amount);
    common::extend_persistent(e, &key);
}

#[cfg(test)]
mod test;

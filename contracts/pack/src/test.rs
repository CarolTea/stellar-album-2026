extern crate std;
use crate::{Pack, PackClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use sticker::{Sticker, StickerClient};

/// Deploy Sticker + Pack and wire Pack as Sticker's minter (the Pack→Sticker edge).
/// Pack's own minter is `admin`, so packs can be minted directly for the demo.
fn setup<'a>(e: &'a Env) -> (StickerClient<'a>, PackClient<'a>, Address) {
    let admin = Address::generate(e);
    let sticker_id = e.register(Sticker, (admin.clone(), admin.clone(), admin.clone()));
    let pack_id = e.register(Pack, (admin.clone(), admin.clone(), sticker_id.clone()));

    let sticker = StickerClient::new(e, &sticker_id);
    sticker.set_minter(&pack_id);

    (sticker, PackClient::new(e, &pack_id), admin)
}

fn total_stickers(sticker: &StickerClient, owner: &Address) -> i128 {
    (0..common::TYPE_COUNT)
        .map(|t| sticker.balance(owner, &t))
        .sum()
}

/// Open `n` packs for `who` and collect the flattened sequence of drawn types.
fn drawn_sequence(pack: &PackClient, who: &Address, n: u32) -> std::vec::Vec<u32> {
    let mut seq = std::vec::Vec::new();
    for _ in 0..n {
        for t in pack.open(who).iter() {
            seq.push(t);
        }
    }
    seq
}

/// The draw must be personalized to the opener: two different players must NOT
/// share the identical draw sequence. Before the per-opener seed fix the seed
/// was `sha256(nonce)` only, so everyone's n-th pack drew the same types and
/// this would fail. See docs/decisions.md D22.
#[test]
fn different_openers_draw_different_sequences() {
    let e = test_utils::setup();
    let (_sticker, pack, _admin) = setup(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    pack.mint(&alice, &20);
    pack.mint(&bob, &20);

    assert_ne!(
        drawn_sequence(&pack, &alice, 20),
        drawn_sequence(&pack, &bob, 20),
        "different openers must not share the identical draw sequence"
    );
}

/// The draw must stay deterministic per `(opener, nonce)` so the simulated and
/// executed footprints match (a hard Soroban requirement). The same opener in
/// two fresh environments must reproduce the same sequence — i.e. the seed is a
/// pure function of opener+nonce, with no real entropy. Guards the fix.
#[test]
fn draws_are_deterministic_per_opener() {
    fn seq_for() -> std::vec::Vec<u32> {
        let e = test_utils::setup();
        let (_sticker, pack, _admin) = setup(&e);
        let who = Address::from_string(&String::from_str(
            &e,
            "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
        ));
        pack.mint(&who, &10);
        drawn_sequence(&pack, &who, 10)
    }

    assert_eq!(
        seq_for(),
        seq_for(),
        "the same opener must reproduce the same draw sequence"
    );
}

#[test]
fn mint_increases_pack_balance() {
    let e = test_utils::setup();
    let (_sticker, pack, _admin) = setup(&e);
    let alice = Address::generate(&e);

    pack.mint(&alice, &2);

    assert_eq!(pack.balance(&alice), 2);
}

#[test]
fn open_burns_one_pack_and_mints_three_stickers() {
    let e = test_utils::setup();
    let (sticker, pack, _admin) = setup(&e);
    let alice = Address::generate(&e);
    pack.mint(&alice, &1);

    let drawn = pack.open(&alice);

    // The pack is consumed.
    assert_eq!(pack.balance(&alice), 0);
    // Exactly three stickers were minted, whatever the types.
    assert_eq!(drawn.len(), 3);
    assert_eq!(total_stickers(&sticker, &alice), 3);
    // Every drawn type is a real sticker.
    for t in drawn.iter() {
        assert!(common::is_valid_type(t));
    }
}

#[test]
fn opening_two_packs_mints_six_stickers() {
    let e = test_utils::setup();
    let (sticker, pack, _admin) = setup(&e);
    let alice = Address::generate(&e);
    pack.mint(&alice, &2);

    pack.open(&alice);
    pack.open(&alice);

    assert_eq!(pack.balance(&alice), 0);
    assert_eq!(total_stickers(&sticker, &alice), 6);
}

#[test]
#[should_panic(expected = "none to open")]
fn open_without_a_pack_traps() {
    let e = test_utils::setup();
    let (_sticker, pack, _admin) = setup(&e);
    let alice = Address::generate(&e);

    pack.open(&alice);
}

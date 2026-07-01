use crate::{Store, StoreClient};
use coin::{Coin, CoinClient};
use pack::{Pack, PackClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

const PRICE: i128 = 100;

struct World<'a> {
    coin: CoinClient<'a>,
    pack: PackClient<'a>,
    store: StoreClient<'a>,
    treasury: Address,
}

/// Deploy Coin + Pack + Store and wire the edges: Store mints Pack, Coin's
/// minter is `admin` (so tests can fund buyers directly).
fn setup(e: &Env) -> World<'_> {
    let admin = Address::generate(e);
    let treasury = Address::generate(e);

    let coin_id = e.register(Coin, (admin.clone(), admin.clone()));
    // Pack needs a sticker address; unused here (we never open), so pass admin.
    let pack_id = e.register(Pack, (admin.clone(), admin.clone(), admin.clone()));
    let store_id = e.register(
        Store,
        (
            admin.clone(),
            coin_id.clone(),
            pack_id.clone(),
            treasury.clone(),
            PRICE,
        ),
    );

    let pack = PackClient::new(e, &pack_id);
    pack.set_minter(&store_id); // Store → Pack edge

    World {
        coin: CoinClient::new(e, &coin_id),
        pack,
        store: StoreClient::new(e, &store_id),
        treasury,
    }
}

#[test]
fn buy_pack_debits_coin_and_mints_a_pack() {
    let e = test_utils::setup();
    let w = setup(&e);
    let buyer = Address::generate(&e);
    w.coin.mint(&buyer, &1_000); // fund the buyer

    w.store.buy_pack(&buyer);

    assert_eq!(w.coin.balance(&buyer), 900);
    assert_eq!(w.coin.balance(&w.treasury), PRICE);
    assert_eq!(w.pack.balance(&buyer), 1);
}

#[test]
#[should_panic(expected = "not enough coins")]
fn buy_without_enough_coin_traps() {
    let e = test_utils::setup();
    let w = setup(&e);
    let buyer = Address::generate(&e);
    w.coin.mint(&buyer, &50); // not enough for a 100 pack

    // The Store's explicit pre-check (#14) traps with a clear message before the
    // Coin token's opaque internal-balance panic can fire.
    w.store.buy_pack(&buyer);
}

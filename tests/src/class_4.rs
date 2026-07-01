//! Class 4 — "reproduce this": the economy and the trustless trade.
//!
//! Mirrors docs/curriculum/class-4-store-escrow.md, exercising the whole
//! system: claim Coin (Faucet), buy a Pack (Store), open it (Pack→Sticker),
//! then trade a sticker through the Escrow with no intermediary. The test IS
//! the demo.

use coin::{Coin, CoinClient};
use escrow::{Escrow, EscrowClient};
use faucet::{Faucet, FaucetClient};
use pack::{Pack, PackClient};
use soroban_sdk::{testutils::Address as _, Address};
use sticker::{Sticker, StickerClient};
use store::{Store, StoreClient};
use test_utils::setup;

#[test]
fn reproduce_class_4() {
    let e = setup();
    let admin = Address::generate(&e);
    let treasury = Address::generate(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Deploy the whole system.
    let coin_id = e.register(Coin, (admin.clone(), admin.clone()));
    let faucet_id = e.register(
        Faucet,
        (admin.clone(), coin_id.clone(), 60_u64, 1_000_i128, 100_i128),
    );
    let sticker_id = e.register(Sticker, (admin.clone(), admin.clone(), admin.clone()));
    let pack_id = e.register(Pack, (admin.clone(), admin.clone(), sticker_id.clone()));
    let store_id = e.register(
        Store,
        (
            admin.clone(),
            coin_id.clone(),
            pack_id.clone(),
            treasury.clone(),
            100_i128,
        ),
    );
    let escrow_id = e.register(Escrow, (admin.clone(), sticker_id.clone()));

    let coin = CoinClient::new(&e, &coin_id);
    let faucet = FaucetClient::new(&e, &faucet_id);
    let sticker = StickerClient::new(&e, &sticker_id);
    let pack = PackClient::new(&e, &pack_id);
    let store = StoreClient::new(&e, &store_id);
    let escrow = EscrowClient::new(&e, &escrow_id);

    // Wire the authority edges: Faucet mints Coin, Store mints Packs, Pack mints Stickers.
    coin.set_minter(&faucet_id);
    sticker.set_minter(&pack_id);
    pack.set_minter(&store_id);

    // Economy: each player claims the seed, buys a pack, and opens it.
    faucet.claim(&alice);
    faucet.claim(&bob);
    store.buy_pack(&alice);
    store.buy_pack(&bob);
    assert_eq!(coin.balance(&alice), 900);
    assert_eq!(coin.balance(&bob), 900);

    pack.commit_open(&alice);
    let alice_pull = pack.reveal_open(&alice);
    pack.commit_open(&bob);
    let bob_pull = pack.reveal_open(&bob);
    assert_eq!(alice_pull.len(), 3);
    assert_eq!(bob_pull.len(), 3);
    assert_eq!(pack.balance(&alice), 0);

    // Trade: Alice offers her first sticker for one of Bob's. Each holds at
    // least one of their own first draw, so the swap is always fulfillable.
    let give = alice_pull.get(0).unwrap();
    let want = bob_pull.get(0).unwrap();
    let id = escrow.create_offer(&alice, &give, &want);
    assert_eq!(sticker.balance(&escrow.address, &give), 1); // custody
    escrow.accept_offer(&bob, &id);

    // The trustless swap completed with no intermediary: the offer is consumed
    // and the escrow released the custodied sticker.
    assert!(!escrow.has_offer(&id));
    assert_eq!(sticker.balance(&escrow.address, &give), 0);
}

//! Class 3 — "reproduce this": the collapse and the soulbound album.
//!
//! Mirrors docs/curriculum/class-3-pack-album.md: mint a pack DIRECTLY (no
//! Store — decision D14), open it into 3 stickers, open a soulbound album, and
//! paste a sticker (burning it, filling a slot). The test IS the demo.

use album::{Album, AlbumClient};
use pack::{Pack, PackClient};
use soroban_sdk::{testutils::Address as _, Address};
use sticker::{Sticker, StickerClient};
use test_utils::setup;

#[test]
fn reproduce_class_3() {
    let e = setup();
    let admin = Address::generate(&e);
    let alice = Address::generate(&e);

    // Deploy Sticker + Pack + Album.
    let sticker_id = e.register(Sticker, (admin.clone(), admin.clone(), admin.clone()));
    let pack_id = e.register(Pack, (admin.clone(), admin.clone(), sticker_id.clone()));
    let album_id = e.register(Album, (admin.clone(), sticker_id.clone()));

    let sticker = StickerClient::new(&e, &sticker_id);
    let pack = PackClient::new(&e, &pack_id);
    let album = AlbumClient::new(&e, &album_id);

    // Wire the authority edges: Pack mints stickers, Album burns them.
    sticker.set_minter(&pack_id);
    sticker.set_burner(&album_id);

    // Mint a pack directly to Alice (the Class-3 demo needs no Store) and open it.
    pack.mint(&alice, &1);
    pack.commit_open(&alice);
    let drawn = pack.reveal_open(&alice);
    assert_eq!(drawn.len(), 3);

    // Open a soulbound album and paste one of the drawn stickers.
    album.open_album(&alice);
    let kind = drawn.get(0).unwrap();
    let before = sticker.balance(&alice, &kind);

    album.paste(&alice, &kind);

    // The slot is filled and the sticker was burned (collapsed into the album).
    assert!(album.is_pasted(&alice, &kind));
    assert_eq!(album.filled(&alice), 1);
    assert_eq!(sticker.balance(&alice, &kind), before - 1);
}

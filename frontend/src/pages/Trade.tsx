import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore, type Offer } from "../store";
import { Page, SectionHead, Toast } from "../components/ui";
import { TYPES } from "../lib/catalog";
import { Sticker } from "../components/Sticker";
import { stickerName } from "../lib/stickers";

type Picking = "give" | "want" | null;

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

// A small "give ⇄ want" pair of sticker cards, reused in the confirmation and
// in every marketplace row.
function SwapPair({ give, want, size = "w-20" }: { give: number; want: number; size?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={size}><Sticker typeId={give} /></div>
      <span aria-hidden className="text-lg text-ink-soft">⇄</span>
      <div className={size}><Sticker typeId={want} /></div>
    </div>
  );
}

// One open offer in the marketplace: shows exactly what's traded for what, who
// posted it, and whether you can fill it.
function OfferCard({
  offer,
  mine,
  canAccept,
  busy,
  onAccept,
  onCancel,
}: {
  offer: Offer;
  mine: boolean;
  canAccept: boolean;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-edge">
      <SwapPair give={offer.give} want={offer.want} />
      <div className="text-xs text-ink-soft">
        <span className="font-semibold text-ink">{stickerName(offer.give)}</span> for{" "}
        <span className="font-semibold text-ink">{stickerName(offer.want)}</span>
        <br />
        <span>#{offer.id} · {mine ? "your offer" : `by ${short(offer.maker)}`}</span>
      </div>
      {mine ? (
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-full px-4 py-2 text-sm font-bold text-leaf-deep underline-offset-2 transition hover:underline disabled:opacity-40"
        >
          Take it back
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          <button
            onClick={onAccept}
            disabled={busy || !canAccept}
            className="rounded-full bg-leaf-deep px-4 py-2 text-sm font-bold text-paper transition hover:bg-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-40"
          >
            Accept — trade your {stickerName(offer.want)}
          </button>
          {!canAccept && (
            <span className="text-center text-[11px] font-semibold text-ink-soft">
              You need {stickerName(offer.want)} to accept
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// A tappable slot in the "you give ⇄ you want" preview row.
function Slot({ label, typeId, qty, onClick }: { label: string; typeId?: number; qty?: number; onClick: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      <button
        onClick={onClick}
        className="group relative w-32 rounded-2xl ring-2 ring-transparent transition focus-visible:outline-2 focus-visible:outline-leaf hover:ring-leaf/50 sm:w-36"
      >
        {typeId != null ? (
          <Sticker typeId={typeId} qty={qty} big />
        ) : (
          <span className="grid aspect-[3/4] w-full place-items-center rounded-2xl bg-paper text-sm text-ink-soft ring-1 ring-edge">
            nothing yet
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 z-30 rounded-b-2xl bg-leaf-deep/0 py-1 text-center text-[11px] font-bold text-paper opacity-0 transition group-hover:bg-leaf-deep/80 group-hover:opacity-100">
          Change
        </span>
      </button>
    </div>
  );
}

// Modal sticker grid for choosing a give/want type. Reuses the Shop reveal
// overlay pattern. `items` are the selectable type ids.
function PickerModal({
  title,
  items,
  collection,
  pasted,
  owned,
  onPick,
  onClose,
}: {
  title: string;
  items: number[];
  collection: number[];
  pasted: boolean[];
  owned: boolean;
  onPick: (t: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl ring-1 ring-edge"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-ink-soft transition hover:bg-kraft">
            Close
          </button>
        </div>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            You don't have any stickers to give yet — rip open a pack first.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((t) => {
              // "Have it" means it's in your drawer OR already pasted in your
              // album — a pasted sticker is burned from the collection, so it
              // must still count as owned here, not "missing".
              const has = (collection[t] ?? 0) > 0 || !!pasted[t];
              return (
                <motion.button
                  key={t}
                  layout
                  whileHover={{ y: -4 }}
                  onClick={() => onPick(t)}
                  className="flex flex-col gap-1 rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-leaf"
                >
                  <Sticker typeId={t} qty={owned ? collection[t] : undefined} />
                  {!owned && (
                    <span className={`text-center text-[11px] font-semibold ${has ? "text-leaf-deep" : "text-ink-soft"}`}>
                      {has ? "✓ you have this" : "missing"}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Trade() {
  const { address, collection, pasted, offers, busy, error, createOffer, acceptOffer, cancelOffer, reloadOffers } = useStore();
  const owned = TYPES.filter((t) => (collection[t] ?? 0) > 0);

  const [give, setGive] = useState<number | undefined>();
  const [want, setWant] = useState<number | undefined>();
  const [picking, setPicking] = useState<Picking>(null);
  const [created, setCreated] = useState<{ id: string; give: number; want: number }>();

  // Pull the latest open offers when the page opens (others may have posted
  // since connect). Subsequent create/accept/cancel refresh automatically.
  useEffect(() => {
    reloadOffers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sensible defaults once the collection loads: give = first owned, want =
  // first type you don't own. Re-correct give if it ever points to a type you
  // no longer own (e.g. after an offer is accepted).
  useEffect(() => {
    if (owned.length === 0) {
      setGive(undefined);
      return;
    }
    setGive((g) => (g != null && owned.includes(g) ? g : owned[0]));
    setWant((w) => {
      if (w != null) return w;
      return TYPES.find((t) => !owned.includes(t)) ?? (owned[0] + 1) % TYPES.length;
    });
  }, [collection]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (t: number) => {
    if (picking === "give") {
      setGive(t);
      if (want === t) setWant(TYPES.find((x) => x !== t));
    } else if (picking === "want") {
      setWant(t);
      if (give === t) setGive(owned.find((x) => x !== t));
    }
    setPicking(null);
  };

  const onCreate = async () => {
    if (give == null || want == null) return;
    const id = await createOffer(give, want);
    if (id) setCreated({ id, give, want });
  };
  const onCancel = async (id: string) => {
    await cancelOffer(id);
    setCreated(undefined);
  };

  const ready = give != null && want != null && give !== want;
  const giveItems = owned.filter((t) => t !== want);
  const wantItems = TYPES.filter((t) => t !== give);

  return (
    <Page>
      <SectionHead
        title="Trade"
        sub="A swap runs through an escrow contract: no middleman holds your sticker, the code does. It is why a smart contract earns its place here."
      />

      {/* Make an offer ---------------------------------------------------- */}
      <div className="rounded-2xl bg-cream p-6 ring-1 ring-edge">
        <h3 className="font-display text-lg font-bold text-ink">Make an offer</h3>

        {owned.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">You need a sticker to trade. Rip open a pack, then come back.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 sm:gap-4">
              <Slot label="You give" typeId={give} qty={give != null ? collection[give] : undefined} onClick={() => setPicking("give")} />
              <span aria-hidden className="mt-6 select-none text-2xl text-ink-soft sm:text-3xl">⇄</span>
              <Slot label="You want" typeId={want} onClick={() => setPicking("want")} />
            </div>

            {give != null && collection[give] === 1 && (
              <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft ring-1 ring-edge">
                This is your <b>only copy</b> of {stickerName(give)} — you'll lose it if someone accepts. Duplicates make the safest trade fuel.
              </p>
            )}

            <button
              onClick={onCreate}
              disabled={!!busy || !ready}
              className="mt-4 rounded-full bg-leaf-deep px-5 py-2.5 font-display text-sm font-bold text-paper transition hover:bg-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-40"
            >
              Put it on the table
            </button>
          </>
        )}

        {created && (
          <div className="mt-5 rounded-xl bg-leaf-tint p-4">
            <p className="text-sm font-semibold text-leaf-deep">🔒 Offer #{created.id} is on the table</p>
            <div className="mt-3">
              <SwapPair give={created.give} want={created.want} />
            </div>
            <p className="mt-3 text-xs text-leaf-deep">
              Your {stickerName(created.give)} is held in escrow until someone trades their {stickerName(created.want)} for it — it now shows in
              the offers below, or you can{" "}
              <button onClick={() => onCancel(created.id)} disabled={!!busy} className="font-bold underline disabled:opacity-50">
                take it back
              </button>
              .
            </p>
          </div>
        )}
      </div>

      {/* Open offers (marketplace) ---------------------------------------- */}
      <div className="mt-6 rounded-2xl bg-cream p-6 ring-1 ring-edge">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Open offers</h3>
          <button
            onClick={reloadOffers}
            disabled={!!busy}
            className="rounded-full px-3 py-1 text-sm font-semibold text-ink-soft transition hover:bg-paper disabled:opacity-40"
          >
            ↻ Refresh
          </button>
        </div>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">
          Every swap on the table right now. Accepting is atomic — both stickers move together, or nothing does.
        </p>

        {offers.length === 0 ? (
          <p className="mt-5 rounded-xl bg-paper px-4 py-8 text-center text-sm text-ink-soft ring-1 ring-edge">
            No open offers yet. Put one on the table above, or check back later.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {offers.map((o) => (
              <OfferCard
                key={o.id}
                offer={o}
                mine={o.maker === address}
                canAccept={(collection[o.want] ?? 0) > 0}
                busy={!!busy}
                onAccept={() => acceptOffer(o.id)}
                onCancel={() => onCancel(o.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Toast busy={busy} error={error} />

      <AnimatePresence>
        {picking === "give" && (
          <PickerModal
            title="Choose what you'll give"
            items={giveItems}
            collection={collection}
            pasted={pasted}
            owned
            onPick={onPick}
            onClose={() => setPicking(null)}
          />
        )}
        {picking === "want" && (
          <PickerModal
            title="Choose what you want"
            items={wantItems}
            collection={collection}
            pasted={pasted}
            owned={false}
            onPick={onPick}
            onClose={() => setPicking(null)}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}

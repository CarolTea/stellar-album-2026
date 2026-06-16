import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useStore } from "../store";
import { Page, SectionHead, ProgressMeter, Toast } from "../components/ui";
import { Sticker } from "../components/Sticker";
import { Confetti } from "../components/Confetti";
import { stickerImage, stickerName } from "../lib/stickers";
import {
  ALBUM_PAGES,
  pageOfType,
  pageTypes,
  tier,
  TIER_FACE,
  TIER_GLYPH,
  TYPE_COUNT,
  TYPES,
} from "../lib/catalog";

const TURN = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;
const SETTLE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

const leafVariants = {
  enter: (d: number) => ({ rotateY: d > 0 ? 62 : -62, opacity: 0 }),
  center: { rotateY: 0, opacity: 1 },
  exit: (d: number) => ({ rotateY: d > 0 ? -62 : 62, opacity: 0 }),
};

export default function Album() {
  const { hasAlbum, openAlbum, pasted, collection, paste, busy, error } = useStore();
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [confetti, setConfetti] = useState(0);

  const filled = pasted.filter(Boolean).length;
  const tray = TYPES.filter((t) => (collection[t] ?? 0) > 0 && !pasted[t]);
  const last = ALBUM_PAGES.length - 1;

  if (!hasAlbum) {
    return (
      <Page>
        <SectionHead title="Album" sub="One per collector, yours forever." />
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-cream p-8 text-center ring-1 ring-edge sm:flex-row sm:text-left">
          <div className="grid h-28 w-24 shrink-0 place-items-center rounded-xl bg-kraft ring-1 ring-edge" style={{ transform: "rotate(-3deg)" }}>
            <span className="font-display text-sm font-bold text-ink-soft">EMPTY</span>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Bind your album</h3>
            <p className="mt-1 max-w-sm text-sm text-ink-soft">It is soulbound: it cannot be sold or transferred. Sticking a sticker presses it in permanently and burns it from your drawer, so a finished album is something only you could have made.</p>
            <button onClick={openAlbum} disabled={!!busy} className="mt-4 rounded-full bg-leaf-deep px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-leaf disabled:opacity-40">Start my album</button>
          </div>
        </div>
        <Toast busy={busy} error={error} />
      </Page>
    );
  }

  const leaf = ALBUM_PAGES[page];
  const pageDone = pageTypes(leaf).every((t) => pasted[t]);
  const goto = (p: number) => {
    setDir(p > page ? 1 : -1);
    setPage(p);
  };

  const onStick = async (t: number) => {
    const p = pageOfType(t);
    const willComplete = pageTypes(ALBUM_PAGES[p]).every((s) => s === t || pasted[s]);
    const ok = await paste(t);
    if (ok) {
      goto(p);
      if (tier(t) === "Legendary" || willComplete) setConfetti((n) => n + 1);
    }
  };

  return (
    <Page>
      <SectionHead title="Album" right={`${filled} of ${TYPE_COUNT}`} />

      <div className="relative">
        {/* bound book: kraft cover wrapping a cream leaf */}
        <div className="overflow-hidden rounded-[28px] bg-kraft p-3 shadow-xl ring-1 ring-edge">
          <div className="relative min-h-[24rem] rounded-[20px] bg-cream" style={{ perspective: "1800px" }}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={page} custom={dir} variants={leafVariants} initial="enter" animate="center" exit="exit" transition={TURN} className="relative p-5 sm:p-8" style={{ transformStyle: "preserve-3d" }}>
                <div className="grid items-center gap-5 sm:grid-cols-2">
                  <HeroSlot typeId={leaf.hero} filled={pasted[leaf.hero]} />
                  <div className="grid grid-cols-2 gap-3">
                    {leaf.slots.map((t) => <SmallSlot key={t} typeId={t} filled={pasted[t]} />)}
                  </div>
                </div>
                <div className="mt-7 text-center font-display text-sm font-bold tracking-widest text-ink-soft">PAGE {page + 1} / {ALBUM_PAGES.length}</div>
                {pageDone && <WaxSeal />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <NavArrow side="left" onClick={() => goto(Math.max(0, page - 1))} disabled={page === 0} />
        <NavArrow side="right" onClick={() => goto(Math.min(last, page + 1))} disabled={page === last} />
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {ALBUM_PAGES.map((p, i) => (
          <button key={i} onClick={() => goto(i)} aria-label={`Go to page ${i + 1}`} aria-current={i === page ? "page" : undefined} className={`h-2.5 rounded-full transition-all ${i === page ? "w-7 bg-leaf" : "w-2.5 bg-kraft hover:bg-edge"}`} />
        ))}
      </div>

      <div className="mx-auto mt-5 max-w-sm"><ProgressMeter value={filled} max={TYPE_COUNT} /></div>

      <div className="mt-12">
        <SectionHead title="Ready to stick" right={`${tray.length} loose`} sub="Tap to press a sticker in. The book turns to its page and the slot fills. This burns the sticker, for good." />
        {tray.length === 0 ? (
          <p className="rounded-2xl bg-cream px-5 py-8 text-center text-ink-soft ring-1 ring-edge">Nothing loose to stick. Open more packs to find the slots you are missing.</p>
        ) : (
          <motion.div layout className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <AnimatePresence>
              {tray.map((t) => (
                <motion.button key={t} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -44, scale: 0.5, rotate: -10 }} transition={SETTLE} whileHover={{ y: -5 }} onClick={() => onStick(t)} disabled={!!busy} className="flex flex-col gap-1.5 rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-50">
                  <Sticker typeId={t} qty={collection[t]} />
                  <span className="rounded-lg bg-leaf-tint py-1 text-center text-xs font-bold text-leaf-deep">Stick it in</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Toast busy={busy} error={error} />
      <AnimatePresence>{confetti > 0 && <Confetti key={confetti} onDone={() => setConfetti(0)} />}</AnimatePresence>
    </Page>
  );
}

function HeroSlot({ typeId, filled }: { typeId: number; filled: boolean }) {
  const t = tier(typeId);
  if (filled) {
    return (
      <motion.div initial={{ scale: 1.22, rotate: -4, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={SETTLE} className={`relative aspect-[4/5] overflow-hidden rounded-3xl shadow-lg ${TIER_FACE[t]}`}>
        <img src={stickerImage(typeId)} alt={stickerName(typeId)} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent px-4 pb-4 pt-12">
          <div className="line-clamp-2 font-display text-xl font-extrabold leading-tight text-paper">{stickerName(typeId)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-paper/80"><span aria-hidden>{TIER_GLYPH[t]}</span>{t}</div>
        </div>
      </motion.div>
    );
  }
  return (
    <div className="relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-edge bg-cream">
      <img src={stickerImage(typeId)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 grayscale" />
      <div className="relative z-10 flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-widest text-ink-soft"><span aria-hidden>{TIER_GLYPH[t]}</span>{t}</div>
      <div className="relative z-10 line-clamp-1 px-3 text-center font-display text-base font-extrabold text-ink-soft/70">{stickerName(typeId)}</div>
      <div className="relative z-10 mt-1 text-xs text-ink-soft">Star of this page</div>
    </div>
  );
}

function SmallSlot({ typeId, filled }: { typeId: number; filled: boolean }) {
  if (filled) {
    return (
      <motion.div initial={{ scale: 1.18, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SETTLE} className={`relative aspect-[3/4] overflow-hidden rounded-xl shadow-sm ${TIER_FACE[tier(typeId)]}`}>
        <img src={stickerImage(typeId)} alt={stickerName(typeId)} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink/90 to-transparent px-1.5 pb-1 pt-5">
          <div className="line-clamp-2 font-display text-[10px] font-bold leading-tight text-paper">{stickerName(typeId)}</div>
        </div>
      </motion.div>
    );
  }
  return (
    <div className="relative flex aspect-[3/4] items-end justify-center overflow-hidden rounded-xl border border-dashed border-edge">
      <img src={stickerImage(typeId)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10 grayscale" />
      <span className="relative z-10 mb-1 line-clamp-2 px-1 text-center font-display text-[10px] font-semibold leading-tight text-ink-soft">{stickerName(typeId)}</span>
    </div>
  );
}

function WaxSeal() {
  return (
    <motion.div initial={{ scale: 0, rotate: -32, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }} transition={SETTLE} className="pointer-events-none absolute right-5 top-3 grid h-16 w-16 place-items-center rounded-full bg-leaf text-paper shadow-lg legendary-foil">
      <span className="relative z-10 font-display text-[11px] font-extrabold uppercase tracking-wide">Done</span>
    </motion.div>
  );
}

function NavArrow({ side, onClick, disabled }: { side: "left" | "right"; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={side === "left" ? "Previous page" : "Next page"} className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper font-display text-xl font-bold text-ink shadow-md ring-1 ring-edge transition hover:bg-cream disabled:opacity-30 sm:grid ${side === "left" ? "-left-5" : "-right-5"}`}>
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

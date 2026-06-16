import { tier, TIER_FACE, TIER_GLYPH, TIER_LABEL } from "../lib/catalog";
import { stickerImage, stickerName } from "../lib/stickers";

// The collectible itself: an identifiable object with a name + rarity.
// `qty` shows stacked duplicates; legendary carries a holographic sheen.
export function Sticker({ typeId, qty, big }: { typeId: number; qty?: number; big?: boolean }) {
  const t = tier(typeId);
  return (
    <div className={`relative flex aspect-[3/4] flex-col items-center justify-center rounded-2xl px-2 ${TIER_FACE[t]}`}>
      {qty != null && qty > 1 && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-paper">×{qty}</span>
      )}
      <img
        src={stickerImage(typeId)}
        alt={stickerName(typeId)}
        loading="lazy"
        className={`relative z-10 rounded-full object-cover ring-2 ring-paper shadow-sm ${big ? "h-24 w-24" : "h-14 w-14"}`}
      />
      <div className={`relative z-10 mt-1 line-clamp-2 px-1 text-center font-display font-bold leading-tight text-ink ${big ? "text-base" : "text-xs"}`}>{stickerName(typeId)}</div>
      <div className={`relative z-10 mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${TIER_LABEL[t]}`}>
        <span aria-hidden>{TIER_GLYPH[t]}</span>
        {t}
      </div>
    </div>
  );
}

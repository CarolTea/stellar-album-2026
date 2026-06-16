import { tier, TIER_FACE, TIER_GLYPH } from "../lib/catalog";
import { stickerImage, stickerName } from "../lib/stickers";

// The collectible: the photo fills the card, with the name + rarity over a
// legibility scrim. The tier ring frames it; legendary keeps its foil sheen.
// `qty` shows stacked duplicates.
export function Sticker({ typeId, qty, big }: { typeId: number; qty?: number; big?: boolean }) {
  const t = tier(typeId);
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-2xl ${TIER_FACE[t]}`}>
      <img src={stickerImage(typeId)} alt={stickerName(typeId)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {qty != null && qty > 1 && (
        <span className="absolute right-1.5 top-1.5 z-20 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-paper">×{qty}</span>
      )}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent px-2 pb-2 pt-7">
        <div className={`line-clamp-2 font-display font-bold leading-tight text-paper ${big ? "text-base" : "text-xs"}`}>{stickerName(typeId)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-paper/80">
          <span aria-hidden>{TIER_GLYPH[t]}</span>
          {t}
        </div>
      </div>
    </div>
  );
}

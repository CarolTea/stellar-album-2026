// Mirrors contracts/common: 20 types, tiers 0–11 common / 12–17 rare / 18–19 legendary.
export const TYPE_COUNT = 20;
export const TYPES = Array.from({ length: TYPE_COUNT }, (_, i) => i);

export type Tier = "Common" | "Rare" | "Legendary";

export function tier(typeId: number): Tier {
  if (typeId <= 11) return "Common";
  if (typeId <= 17) return "Rare";
  return "Legendary";
}

// Sticker-face styling per tier. Legendary adds the holographic sheen.
export const TIER_FACE: Record<Tier, string> = {
  Common: "bg-cream ring-1 ring-edge",
  Rare: "bg-rare-tint ring-1 ring-rare/40",
  Legendary: "bg-gold/20 ring-1 ring-gold/70 legendary-foil",
};

export const TIER_LABEL: Record<Tier, string> = {
  Common: "text-ink-soft",
  Rare: "text-rare",
  Legendary: "text-ink",
};

// Non-color cue so rarity does not rely on color alone (a11y).
export const TIER_GLYPH: Record<Tier, string> = {
  Common: "●",
  Rare: "◆",
  Legendary: "✦",
};

// Who / what is on each image, by image index (frontend/images/00..17).
// In the order provided; verify against the per-image descriptions.
// (The 19th list entry, "Stellar Village", has no image.)
export const NAMES = [
  "Nicole Adair",
  "Daniela Henao",
  "Jose Fernandez da Ponte",
  "Laura Martínez",
  "Wlad Mendes",
  "Pedro Pelicioni",
  "Give Colombia 2026",
  "Tyler van der Hoeven",
  "Caio Matos",
  "Shaun Jhonson",
  "Bri Wylde",
  "Elliot Voris",
  "De-Ann Abraham",
  "Teague Kaylor",
  "Kaan Kacar",
  "Danelle Dixon",
  "Bastian Koh",
  "Meridian 2026",
];

// Album leaves: each page is built around a hero (its rarest sticker) plus a
// supporting cast. Two legendary-hero pages, then two rare-hero pages.
export interface AlbumPage {
  hero: number;
  slots: number[];
}
export const ALBUM_PAGES: AlbumPage[] = [
  { hero: 18, slots: [0, 1, 2, 3] }, // legendary
  { hero: 19, slots: [4, 5, 6, 7] }, // legendary
  { hero: 12, slots: [13, 14, 8, 9] }, // rare
  { hero: 16, slots: [15, 17, 10, 11] }, // rare
];

export function pageTypes(page: AlbumPage): number[] {
  return [page.hero, ...page.slots];
}

export function pageOfType(typeId: number): number {
  return ALBUM_PAGES.findIndex((p) => p.hero === typeId || p.slots.includes(typeId));
}

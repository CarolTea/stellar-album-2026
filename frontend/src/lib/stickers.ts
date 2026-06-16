import { NAMES } from "./catalog";

// All sticker art, resolved to hashed URLs by Vite. Files live in
// frontend/images as 00.jpeg .. NN.jpeg (sorted by name = image index).
const modules = import.meta.glob("../../images/*.{jpg,jpeg,png}", {
  eager: true,
  query: "?url",
  import: "default",
});
const urls = Object.keys(modules)
  .sort()
  .map((k) => modules[k] as string);

// Type id maps directly to image index (your provided order). With fewer
// images than the 20 types, the top types wrap back to the first images.
function imageIndex(typeId: number): number {
  return urls.length ? typeId % urls.length : -1;
}

export const HAS_ART = urls.length > 0;

export function stickerImage(typeId: number): string {
  const i = imageIndex(typeId);
  return i >= 0 ? urls[i] : "";
}

export function stickerName(typeId: number): string {
  const i = imageIndex(typeId);
  return (i >= 0 && NAMES[i]) || `#${typeId}`;
}

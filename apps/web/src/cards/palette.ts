import type { Suit } from "@juegos-argentinos/engine";

/** Colores por palo, como en la baraja española tradicional. */
export const SUIT_COLORS: Record<Suit, { main: string; dark: string; light: string; ink: string }> = {
  espada: { main: "#2456b0", dark: "#163872", light: "#e3ebf8", ink: "#1d4796" },
  basto: { main: "#2e7d32", dark: "#1b4d1e", light: "#e4f1e3", ink: "#256b29" },
  oro: { main: "#f2b705", dark: "#9a6a00", light: "#fbf0cc", ink: "#a06c00" },
  copa: { main: "#c62828", dark: "#7f1717", light: "#f8e1df", ink: "#b02020" },
};

export const INK = "#2b2118";
export const GOLD = "#f2b705";
export const GOLD_DARK = "#9a6a00";
export const CREAM = "#fbf6ea";
export const SKIN = "#f2c9a0";
export const NOSE = "#e89a78";
export const BLUSH = "#ef8f7a";
export const HAIR = "#4a2f1a";
export const HAT = "#3b2a1a";
export const SHIRT = "#fffaf0";
export const BOMBACHA = "#cdbb93";
export const WOOD = "#8d5a2b";
export const WOOD_DARK = "#4e2e10";
export const STEEL = "#dbe4ee";
export const SILVER = "#cfd8dc";
export const GRASS = "#8bc34a";
export const CELESTE = "#63b3ed";
export const BORDO = "#7b1e2b";

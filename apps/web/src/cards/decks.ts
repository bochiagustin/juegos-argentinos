import type { Card } from "@juegos-argentinos/engine";

/**
 * Mazos (aspectos visuales de la baraja). La lógica de juego es la misma: solo cambia el dibujo.
 * - "svg": dibujado en código (la Criolla).
 * - "imagen": una imagen por carta en `public/mazos/<id>/<cardId>.webp` + `dorso.webp`.
 */

export const DECK_IDS = ["criolla", "argento-nuevo", "argento-memes", "argento-campeon"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export interface DeckSkin {
  id: DeckId;
  nombre: string;
  descripcion: string;
  tipo: "svg" | "imagen";
  /** Ancho / alto de la carta. */
  aspecto: number;
  creditos?: string;
}

const ARGENTO_CREDITOS = "Mazo Argento — ilustraciones de @gerberhardt. Usado con licencia de sus autores.";

export const DECKS: Record<DeckId, DeckSkin> = {
  criolla: {
    id: "criolla",
    nombre: "La Criolla",
    descripcion: "Peones, gauchos y patrones, con fileteado porteño. La de la casa.",
    tipo: "svg",
    aspecto: 2 / 3,
  },
  "argento-nuevo": {
    id: "argento-nuevo",
    nombre: "Nuevo Mazo Argento",
    descripcion: "Fernet, choris, mate y alto guiso. Acá no nos caben los reyes.",
    tipo: "imagen",
    aspecto: 368 / 600,
    creditos: ARGENTO_CREDITOS,
  },
  "argento-memes": {
    id: "argento-memes",
    nombre: "Mazo Argento Memes",
    descripcion: "En vez de reyes y reinas, memes 100% argentos.",
    tipo: "imagen",
    aspecto: 368 / 600,
    creditos: ARGENTO_CREDITOS,
  },
  "argento-campeon": {
    id: "argento-campeon",
    nombre: "Mazo Argento Campeón del Mundo",
    descripcion: "Homenaje al 18 de diciembre de 2022. Cartas campeonas del mundo.",
    tipo: "imagen",
    aspecto: 368 / 600,
    creditos: ARGENTO_CREDITOS,
  },
};

export function isDeckId(value: unknown): value is DeckId {
  return typeof value === "string" && (DECK_IDS as readonly string[]).includes(value);
}

export function deckImageUrl(deck: DeckId, card: Card | null): string {
  return `${import.meta.env.BASE_URL}mazos/${deck}/${card ? card.id : "dorso"}.webp`;
}

/** Baja todas las imágenes de un mazo para que queden en caché y anden offline. */
export function prefetchDeck(deck: DeckId, cards: readonly Card[]): void {
  if (DECKS[deck].tipo !== "imagen" || typeof fetch !== "function") return;
  for (const url of [deckImageUrl(deck, null), ...cards.map((c) => deckImageUrl(deck, c))]) {
    fetch(url).catch(() => {
      // Sin red: se va a ver la Criolla como respaldo para esa carta.
    });
  }
}

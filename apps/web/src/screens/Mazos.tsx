import { cardFromId, createDeck, SUITS, SUIT_NAMES } from "@juegos-argentinos/engine";
import { useMemo, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { DECK_IDS, DECKS, prefetchDeck, type DeckId } from "../cards/decks.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { SuitBadge } from "../cards/suits.tsx";
import { useNav } from "../nav.tsx";
import { useSave } from "../save/SaveContext.tsx";
import { Screen, Section } from "../ui/ui.tsx";

const PREVIEW = ["1-espada", "1-basto", "7-espada", "7-oro"].map(cardFromId);
const FULL_DECK = createDeck({ size: 48, jokers: 2 });

export function Mazos() {
  const { back } = useNav();
  const { save, update } = useSave();
  const enUso = save.ajustes.mazo;
  const [viendo, setViendo] = useState<DeckId>(enUso);
  const skin = DECKS[viendo];
  const bySuit = useMemo(() => SUITS.map((suit) => ({ suit, cards: FULL_DECK.filter((c) => c.kind === "suited" && c.suit === suit) })), []);

  const usar = (id: DeckId) => {
    update((s) => ({ ...s, ajustes: { ...s.ajustes, mazo: id } }));
    setViendo(id);
    prefetchDeck(id, FULL_DECK);
    playSfx("barajar");
  };

  return (
    <Screen title="Mazos" onBack={back}>
      <div className="flex flex-col gap-3">
        {DECK_IDS.map((id) => {
          const d = DECKS[id];
          const activo = id === enUso;
          return (
            <div
              key={id}
              className={`rounded-2xl border-2 bg-superficie p-3 transition ${viendo === id ? "border-naranja" : "border-borde"}`}
            >
              <button
                onClick={() => {
                  setViendo(id);
                  playSfx("click");
                }}
                className="flex w-full items-center gap-3 text-left"
                aria-label={`Ver ${d.nombre}`}
              >
                <div className="flex shrink-0 -space-x-5">
                  {PREVIEW.map((c, i) => (
                    <div key={c.id} className="rounded-md shadow-md shadow-black/30" style={{ rotate: `${(i - 1.5) * 5}deg` }}>
                      <SpanishCard card={c} width={42} deck={id} />
                    </div>
                  ))}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block font-black">{d.nombre}</span>
                  <span className="block text-sm text-texto-suave">{d.descripcion}</span>
                </span>
              </button>
              <div className="mt-3 flex justify-end">
                {activo ? (
                  <span className="rounded-full bg-pano px-4 py-2 text-sm font-black text-crema">✓ En uso</span>
                ) : (
                  <button onClick={() => usar(id)} className="min-h-11 rounded-full bg-naranja px-5 text-sm font-black text-tinta active:scale-95">
                    Usar este mazo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Section title={`Todas las cartas · ${skin.nombre}`}>
        {skin.creditos && <p className="text-sm text-texto-suave">{skin.creditos}</p>}
        {bySuit.map(({ suit, cards }) => (
          <div key={suit} className="mt-2">
            <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold capitalize">
              <SuitBadge suit={suit} size={22} /> {SUIT_NAMES[suit].plural}
            </h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {cards.map((c) => (
                <SpanishCard key={c.id} card={c} width={160} deck={viendo} className="h-auto w-full" />
              ))}
            </div>
          </div>
        ))}
        <h3 className="mb-2 mt-2 font-display text-lg font-bold">Comodines y dorso</h3>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {FULL_DECK.filter((c) => c.kind === "joker").map((c) => (
            <SpanishCard key={c.id} card={c} width={160} deck={viendo} className="h-auto w-full" />
          ))}
          <SpanishCard card={null} width={160} deck={viendo} className="h-auto w-full" />
        </div>
      </Section>
    </Screen>
  );
}

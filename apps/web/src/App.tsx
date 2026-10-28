import { cardName, createDeck, createRng, deal, shuffle, SUITS, SUIT_NAMES, type Card } from "@la-mesa/engine";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { SpanishCard } from "./cards/SpanishCard.tsx";
import { SuitBadge } from "./cards/suits.tsx";

type DeckKind = "40" | "48" | "48+2";

const DECK_OPTIONS: { value: DeckKind; label: string }[] = [
  { value: "40", label: "40 (truco)" },
  { value: "48", label: "48" },
  { value: "48+2", label: "48 + comodines" },
];

function buildDeck(kind: DeckKind): Card[] {
  if (kind === "40") return createDeck({ size: 40 });
  if (kind === "48") return createDeck({ size: 48 });
  return createDeck({ size: 48, jokers: 2 });
}

/** Vista previa de la Fase 0: el mazo, el diseño de las cartas y el mezclado con semilla. */
export function App() {
  const [deckKind, setDeckKind] = useState<DeckKind>("48+2");
  const [width, setWidth] = useState(88);
  const [seed, setSeed] = useState("truco-en-lo-de-tito");
  const deck = useMemo(() => buildDeck(deckKind), [deckKind]);

  const dealt = useMemo(() => {
    const [shuffled] = shuffle(createDeck({ size: 40 }), createRng(seed));
    return deal(shuffled, { players: 4, cardsEach: 3 });
  }, [seed]);

  return (
    <div className="pano min-h-dvh px-4 pb-16 pt-6">
      <header className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-widest text-oro">Fase 0 · el mazo</p>
        <h1 className="font-display text-4xl font-black sm:text-5xl">La Mesa</h1>
        <p className="mt-1 max-w-prose text-crema/80">
          Baraja española dibujada en SVG, con pausas en el marco como la de toda la vida y figuras propias. Abajo, el mezclado con semilla: la
          misma semilla reparte siempre las mismas manos.
        </p>
      </header>

      <section className="mx-auto mt-8 max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-pano-900/60 p-1" role="radiogroup" aria-label="Mazo">
            {DECK_OPTIONS.map((o) => (
              <button
                key={o.value}
                role="radio"
                aria-checked={deckKind === o.value}
                onClick={() => setDeckKind(o.value)}
                className={`min-h-11 rounded-full px-4 text-sm font-bold transition ${
                  deckKind === o.value ? "bg-oro text-pano-900" : "text-crema/80 hover:text-crema"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            Tamaño
            <input type="range" min={48} max={160} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="accent-oro" />
            <span className="w-12 tabular-nums text-crema/70">{width}px</span>
          </label>
          <span className="text-sm text-crema/70">{deck.length} cartas</span>
        </div>

        {SUITS.map((suit) => (
          <div key={suit} className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-bold capitalize">
              <SuitBadge suit={suit} size={26} /> {SUIT_NAMES[suit].plural}
            </h2>
            <div className="flex flex-wrap gap-2">
              {deck
                .filter((c) => c.kind === "suited" && c.suit === suit)
                .map((c) => (
                  <motion.div key={c.id} whileHover={{ y: -8, rotate: -2 }} className="rounded-xl shadow-lg shadow-black/30">
                    <SpanishCard card={c} width={width} />
                  </motion.div>
                ))}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <h2 className="mb-2 font-display text-xl font-bold">Dorso y comodines</h2>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl shadow-lg shadow-black/30">
              <SpanishCard card={null} width={width} />
            </div>
            {deck
              .filter((c) => c.kind === "joker")
              .map((c) => (
                <div key={c.id} className="rounded-xl shadow-lg shadow-black/30">
                  <SpanishCard card={c} width={width} />
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-5xl">
        <h2 className="font-display text-2xl font-bold">Mezclar con semilla</h2>
        <p className="text-crema/80">Mazo de 40, 4 jugadores, 3 cartas cada uno (como en el truco).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="min-h-11 w-64 rounded-xl border border-crema/20 bg-pano-900/70 px-3 font-mono text-crema outline-none focus:border-oro"
            aria-label="Semilla"
          />
          <button
            onClick={() => setSeed(Math.random().toString(36).slice(2, 10))}
            className="min-h-11 rounded-xl bg-oro px-4 font-bold text-pano-900 active:scale-95"
          >
            Barajar de nuevo
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {dealt.hands.map((hand, p) => (
            <div key={p} className="rounded-2xl bg-pano-900/50 p-3">
              <p className="mb-2 text-sm font-bold text-crema/80">Jugador {p + 1}</p>
              <div className="flex">
                <AnimatePresence mode="popLayout">
                  {hand.map((c, i) => (
                    <motion.div
                      key={`${seed}-${c.id}`}
                      initial={{ opacity: 0, y: -60, rotate: -20 }}
                      animate={{ opacity: 1, y: 0, rotate: (i - 1) * 6 }}
                      transition={{ delay: (i * 4 + p) * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                      className="-ml-3 first:ml-0 rounded-xl shadow-lg shadow-black/40"
                      title={cardName(c)}
                    >
                      <SpanishCard card={c} width={84} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-crema/70">Quedan {dealt.rest.length} cartas en el mazo.</p>
      </section>
    </div>
  );
}

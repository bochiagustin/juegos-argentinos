import { comoSeDesbloquea, comprar, FONDOS, fondoDesbloqueado, TIENDA } from "@juegos-argentinos/career";
import { Art } from "../art/Art.tsx";
import type { ArtId } from "../art/manifest.ts";
import { fondoEnUso, fondoListo } from "../fondos/fondos.tsx";
import { cardFromId, createDeck, SUITS, SUIT_NAMES } from "@juegos-argentinos/engine";
import { useMemo, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { DECK_IDS, DECKS, deckDisponible, prefetchDeck, type DeckId } from "../cards/decks.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { SuitBadge } from "../cards/suits.tsx";
import { useNav } from "../nav.tsx";
import { useSave } from "../save/SaveContext.tsx";
import { FosforoIcono, Fosforos } from "../ui/Modal.tsx";
import { FileteEsquinas, Screen, Section } from "../ui/ui.tsx";

const PREVIEW = ["1-espada", "1-basto", "7-espada", "7-oro"].map(cardFromId);
const FULL_DECK = createDeck({ size: 48, jokers: 2 });

export function Mazos() {
  const { back } = useNav();
  const { save, update } = useSave();
  const enUso = deckDisponible(save.ajustes.mazo, save.carrera) ? save.ajustes.mazo : "criolla";
  const [error, setError] = useState<string | null>(null);
  const [viendo, setViendo] = useState<DeckId>(enUso);
  const skin = DECKS[viendo];
  const bySuit = useMemo(() => SUITS.map((suit) => ({ suit, cards: FULL_DECK.filter((c) => c.kind === "suited" && c.suit === suit) })), []);

  const usar = (id: DeckId) => {
    update((s) => ({ ...s, ajustes: { ...s.ajustes, mazo: id } }));
    setViendo(id);
    prefetchDeck(id, FULL_DECK);
    playSfx("barajar");
  };

  const comprarMazo = (id: DeckId) => {
    const r = comprar(save.carrera, `mazo:${id}`);
    if (!r.ok) {
      setError(r.error);
      playSfx("error");
      return;
    }
    setError(null);
    update((s) => ({ ...s, carrera: r.state }));
    usar(id);
  };

  const usarFondo = (id: string) => {
    update((s) => ({ ...s, ajustes: { ...s.ajustes, fondo: id } }));
    playSfx("click");
  };

  const comprarFondo = (id: string) => {
    const r = comprar(save.carrera, `fondo:${id}`);
    if (!r.ok) {
      setError(r.error);
      playSfx("error");
      return;
    }
    setError(null);
    update((s) => ({ ...s, carrera: r.state, ajustes: { ...s.ajustes, fondo: id } }));
    playSfx("barajar");
  };

  return (
    <Screen title="Mazos y fondos" onBack={back} tab="mazos" right={<Fosforos n={save.carrera.fosforos} />}>
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-bordo/80 px-4 py-2 text-sm font-bold">
          {error}. Ganá partidas y logros para juntar fósforos.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {DECK_IDS.map((id) => {
          const d = DECKS[id];
          const activo = id === enUso;
          const disponible = deckDisponible(id, save.carrera);
          const precio = TIENDA.find((t) => t.id === `mazo:${id}`)?.precio;
          return (
            <div
              key={id}
              className={`cuero cuero-azul rounded-2xl p-4 transition ${viendo === id ? "outline-3 outline-naranja" : ""}`}
            >
              <FileteEsquinas />
              <button
                onClick={() => {
                  setViendo(id);
                  playSfx("click");
                }}
                className="relative z-[1] flex w-full items-center gap-3 text-left"
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
                  <span className="block text-sm text-crema/80">{d.descripcion}</span>
                </span>
              </button>
              <div className="relative z-[1] mt-3 flex justify-end">
                {activo ? (
                  <span className="rounded-full bg-pano px-4 py-2 text-sm font-black text-crema">✓ En uso</span>
                ) : !disponible ? (
                  <button onClick={() => comprarMazo(id)} className="flex min-h-11 items-center gap-1.5 rounded-full bg-black/45 px-4 text-sm font-black text-crema active:scale-95">
                    🔒 Comprar · <FosforoIcono /> {precio}
                  </button>
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

      <Section title="Fondos de mesa">
        <p className="px-1 text-sm text-crema/80">El ambiente detrás de la mesa. Se desbloquean avanzando en la Gira o se compran con fósforos.</p>
        <div className="grid grid-cols-2 gap-3">
          {FONDOS.map((f) => {
            const listo = fondoListo(f);
            const abierto = fondoDesbloqueado(save.carrera, f);
            const activo = fondoEnUso(save) === f.id;
            const venta = f.desbloqueo.tipo === "tienda" ? f.desbloqueo.precio : null;
            return (
              <div key={f.id} className={`cuero overflow-hidden rounded-2xl p-1.5 ${activo ? "outline-3 outline-naranja" : ""}`}>
                <div className="relative z-[1] aspect-video overflow-hidden rounded-xl bg-black/40">
                  {listo ? (
                    <Art id={`fondo-${f.id}-horizontal` as ArtId} className={`size-full object-cover ${abierto ? "" : "blur-[2px] brightness-50 grayscale-[0.4]"}`} fallback={<></>} />
                  ) : (
                    <span className="grid size-full place-items-center text-xs font-bold text-crema/60">Próximamente</span>
                  )}
                  {!abierto && listo && <span className="absolute inset-0 grid place-items-center text-3xl" aria-hidden>🔒</span>}
                  {activo && <span className="absolute left-1.5 top-1.5 rounded-full bg-pano px-2 text-[11px] font-black">✓ En uso</span>}
                </div>
                <div className="relative z-[1] px-1 pb-1 pt-1.5">
                  <p className="text-sm leading-tight font-black">{f.nombre}</p>
                  {!abierto && <p className="text-[11px] leading-tight text-crema/75">{comoSeDesbloquea(f)}</p>}
                  {abierto && listo && !activo && (
                    <button onClick={() => usarFondo(f.id)} className="boton boton-oro mt-1.5 min-h-10 w-full rounded-lg text-sm">
                      Usar
                    </button>
                  )}
                  {!abierto && venta !== null && listo && (
                    <button onClick={() => comprarFondo(f.id)} className="boton boton-cuero mt-1.5 min-h-10 w-full rounded-lg text-sm">
                      Comprar · <FosforoIcono /> {venta}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

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

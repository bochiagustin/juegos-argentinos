import type { Card } from "@juegos-argentinos/engine";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState, type ReactNode } from "react";

/**
 * Botonera fija de las mesas (como la del truco): siempre del mismo alto, para que la mesa no cambie de tamaño.
 * Cada lugar se apaga si no se puede usar. Las `pestanas` (contestar, elegir) aparecen arriba de la barra, sin tapar la mesa.
 * Sin opciones, la barra muestra `vacio` (lo que está pasando).
 */
export interface OpcionBarra {
  key: string;
  contenido: ReactNode;
  onClick: (() => void) | null;
  /** Para resaltar la jugada buena (escoba, robo). */
  destacada?: boolean;
}

export function BarraAcciones({ opciones, pestanas = [], vacio }: { opciones: OpcionBarra[]; pestanas?: OpcionBarra[]; vacio?: ReactNode }) {
  const muchas = opciones.length > 4;
  return (
    <div className="relative z-[1] -mx-3 -mb-[calc(env(safe-area-inset-bottom)+0.75rem)] mt-1">
      <AnimatePresence>
        {pestanas.length > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="absolute inset-x-0 bottom-full flex justify-center gap-1 px-2">
            {pestanas.map((p) => (
              <button key={p.key} disabled={!p.onClick} onClick={p.onClick ?? undefined} className={`boton min-h-11 min-w-28 rounded-b-none rounded-t-2xl px-4 ${p.destacada ? "boton-oro" : "boton-cuero"}`}>
                {p.contenido}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className={`flex min-h-14 divide-x divide-[#e8c27a]/30 border-t-2 border-[#e8c27a]/40 bg-black/45 pb-[env(safe-area-inset-bottom)] ${muchas ? "overflow-x-auto" : ""}`}
        style={muchas ? { scrollbarWidth: "none" } : undefined}
      >
        {opciones.length === 0 ? (
          <p className="flex min-h-14 flex-1 items-center justify-center px-3 text-center text-sm font-bold text-crema/80" aria-live="polite">
            {vacio}
          </p>
        ) : (
          opciones.map((o) => (
            <button
              key={o.key}
              disabled={!o.onClick}
              onClick={o.onClick ?? undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1.5 py-1 font-criolla text-[15px] leading-tight transition active:bg-black/25 disabled:opacity-30 ${
                muchas ? "min-w-[25%] shrink-0" : "flex-1 basis-0"
              } ${o.destacada ? "text-naranja" : "text-crema"}`}
            >
              {o.contenido}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Etiqueta con lo último que hizo un rival, al lado de su nombre. */
export function EtiquetaJugada({ texto }: { texto: string | undefined }) {
  return (
    <AnimatePresence mode="popLayout">
      {texto && (
        <motion.span
          key={texto}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="mt-0.5 max-w-36 truncate whitespace-nowrap rounded-full border border-[#7a4a06] bg-naranja px-2 text-[11px] font-black text-tinta shadow"
        >
          {texto}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Lo último que hizo cada asiento (para `EtiquetaJugada`). */
export function useUltimasJugadas(): [Record<number, string>, (seat: number, texto: string) => void, () => void] {
  const [jugadas, setJugadas] = useState<Record<number, string>>({});
  const anotar = useCallback((seat: number, texto: string) => setJugadas((j) => ({ ...j, [seat]: texto })), []);
  const limpiar = useCallback(() => setJugadas({}), []);
  return [jugadas, anotar, limpiar];
}

/** "el 7 de oro", "el comodín". */
export function laCarta(c: Card): string {
  return c.kind === "joker" ? "el comodín" : `el ${c.rank} de ${c.suit}`;
}

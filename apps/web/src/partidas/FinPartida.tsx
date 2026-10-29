import { REGIONES, TIENDA } from "@juegos-argentinos/career";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import type { ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { nivelNombre } from "../ia/nivel.ts";
import { FosforoIcono, Modal } from "../ui/Modal.tsx";

/** Pantalla de fin de partida, común a todos los juegos: resultado, premio, logros nuevos y revancha. */
export function FinPartida({
  r,
  marcador,
  titulo,
  momentos = [],
  onRevancha,
  onSalir,
  salirTexto = "Volver al menú",
}: {
  r: ResultadoCierre;
  marcador: ReactNode;
  titulo?: string | undefined;
  momentos?: readonly string[];
  onRevancha: () => void;
  onSalir: () => void;
  salirTexto?: string;
}) {
  const armado = useArmado();
  const p = r.premio;
  const region = p.regionDesbloqueada ? REGIONES.find((x) => x.id === p.regionDesbloqueada)?.nombre : null;
  const regalo = p.regalo ? TIENDA.find((t) => t.id === p.regalo)?.nombre : null;
  return (
    <Modal onClose={() => {}}>
      <motion.h2 initial={{ scale: 0.5, rotate: -6 }} animate={{ scale: 1, rotate: -3 }} className="titulo-criollo mb-2 text-center text-5xl">
        {titulo ?? (r.ganada ? "¡Ganaste!" : "Perdiste…")}
      </motion.h2>
      <div className="mb-3 text-center text-lg font-bold">{marcador}</div>
      <Momentos lista={momentos} />

      <div className="mb-3 flex flex-col gap-1.5 text-sm font-semibold">
        <div className="flex items-center justify-center gap-3 rounded-xl bg-black/30 px-3 py-2">
          <span className="inline-flex items-center gap-1">
            <FosforoIcono /> +{p.fosforos}
          </span>
          {r.enGira && p.puntos > 0 && <span>⭐ +{p.puntos} de gira</span>}
        </div>
        {p.giraCompleta && <Aviso>🇦🇷 ¡Completaste la Gira Nacional!</Aviso>}
        {region && <Aviso>🗺️ Se abrió {region}</Aviso>}
        {regalo && <Aviso>🎁 Ganaste el {regalo}</Aviso>}
        {p.logros.map((l) => (
          <motion.div key={l.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-2 rounded-xl bg-naranja/20 px-3 py-2">
            <span className="text-2xl">{l.icono}</span>
            <span className="flex-1">
              <span className="block font-black">Logro: {l.nombre}</span>
              <span className="block text-xs text-crema/80">{l.descripcion}</span>
            </span>
          </motion.div>
        ))}
        {r.adaptativo && (
          <p className="rounded-xl bg-black/30 px-3 py-2 text-center">
            {r.nivelDespues > r.nivelAntes
              ? `La máquina se puso más brava: nivel ${r.nivelDespues} (${nivelNombre(r.nivelDespues)}).`
              : r.nivelDespues < r.nivelAntes
                ? `La máquina afloja un poco: nivel ${r.nivelDespues} (${nivelNombre(r.nivelDespues)}).`
                : `La máquina sigue en nivel ${r.nivelDespues} (${nivelNombre(r.nivelDespues)}).`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button disabled={!armado} className="btn-criollo min-h-14 rounded-2xl font-criolla text-2xl" onClick={onRevancha}>
          <span className="relative z-[1]">Revancha</span>
        </button>
        <button disabled={!armado} className="min-h-12 rounded-xl bg-black/35 font-bold" onClick={onSalir}>
          {salirTexto}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Los botones del final se activan después de un instante: la pantalla aparece justo donde estaba "Ver resultado"
 * y un doble toque no tiene que sacarte de la partida.
 */
export function useArmado(ms = 700) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmado(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return armado;
}

/** Lo más destacado de la partida. */
export function Momentos({ lista }: { lista: readonly string[] }) {
  if (!lista.length) return null;
  return (
    <div className="mb-3 rounded-xl bg-black/25 px-3 py-2">
      <p className="mb-1 text-xs font-black uppercase tracking-wider text-naranja">Momentos de la partida</p>
      <ul className="flex flex-col gap-0.5 text-sm">
        {lista.map((m) => (
          <li key={m}>★ {m}</li>
        ))}
      </ul>
    </div>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-pano/60 px-3 py-2 text-center font-black">{children}</p>;
}

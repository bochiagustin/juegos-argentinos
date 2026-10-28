import type { GameId } from "@juegos-argentinos/engine";
import { useState } from "react";
import { Art } from "../art/Art.tsx";
import { playSfx } from "../audio/sfx.ts";
import { gameInfo, MODOS, type ModoId } from "../games.ts";
import { useNav } from "../nav.tsx";
import { Screen, Section } from "../ui/ui.tsx";
import { GameArtFallback } from "./Juegos.tsx";

export function Juego({ id }: { id: GameId }) {
  const { back } = useNav();
  const game = gameInfo(id);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <Screen title={game.nombre} onBack={back}>
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden rounded-3xl border-2 border-naranja/40 shadow-xl shadow-black/30"
        style={{ background: `linear-gradient(135deg, ${game.colores[0]}, ${game.colores[1]})` }}
      >
        <Art id={game.arte} className="absolute inset-0 size-full object-cover" fallback={<GameArtFallback game={game} size={80} />} />
      </div>
      <p className="mt-3 text-center font-bold text-texto-suave">
        {game.bajada} · {game.jugadores}
      </p>

      <Section title="¿Cómo querés jugar?">
        {(Object.keys(MODOS) as ModoId[]).map((m) => {
          const modo = MODOS[m];
          const disponible = game.modos[m] === "disponible";
          return (
            <button
              key={m}
              onClick={() => {
                playSfx(disponible ? "click" : "error");
                if (!disponible) setAviso(`${modo.nombre} de ${game.nombre} está en camino. ¡Aguantá que ya llega!`);
              }}
              aria-disabled={!disponible}
              className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3 text-left ${disponible ? "active:scale-[0.98]" : "opacity-70"}`}
            >
              <span className="text-3xl" aria-hidden>
                {modo.icono}
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-black">{modo.nombre}</span>
                  {!disponible && <span className="rounded-full bg-naranja/20 px-2 py-0.5 text-[11px] font-black uppercase text-naranja">Próximamente</span>}
                </span>
                <span className="block text-sm text-texto-suave">{modo.bajada}</span>
              </span>
            </button>
          );
        })}
        {aviso && (
          <p role="status" className="rounded-xl bg-celeste/15 px-4 py-3 text-sm font-semibold">
            {aviso}
          </p>
        )}
      </Section>

      <Section title="Cómo se juega">
        <ol className="flex list-decimal flex-col gap-2 rounded-2xl border border-borde bg-superficie py-4 pl-9 pr-4 marker:font-black marker:text-naranja">
          {game.reglas.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </Section>
    </Screen>
  );
}

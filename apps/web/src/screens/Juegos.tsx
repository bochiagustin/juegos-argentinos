import { cardFromId } from "@juegos-argentinos/engine";
import { motion } from "motion/react";
import { Art } from "../art/Art.tsx";
import { playSfx } from "../audio/sfx.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { GAMES, type GameInfo } from "../games.ts";
import { useNav } from "../nav.tsx";
import { Screen } from "../ui/ui.tsx";

/** Lo que se ve en la tarjeta mientras no esté la ilustración del juego: cartas (o letras) en abanico. */
export function GameArtFallback({ game, size = 64 }: { game: GameInfo; size?: number }) {
  if (game.muestra.length === 0) {
    return (
      <div className="flex gap-1.5" aria-hidden>
        {["A", "M", "R"].map((l, i) => (
          <span
            key={l}
            className="madera grid place-items-center rounded-lg font-criolla text-crema shadow-lg shadow-black/40"
            style={{ width: size * 0.62, height: size * 0.62, fontSize: size * 0.38, rotate: `${(i - 1) * 8}deg` }}
          >
            {l}
          </span>
        ))}
      </div>
    );
  }
  const n = game.muestra.length;
  return (
    <div className="relative" style={{ width: size * (1 + (n - 1) * 0.45), height: size * 1.55 }} aria-hidden>
      {game.muestra.map((id, i) => (
        <div
          key={id}
          className="absolute top-0 rounded-md shadow-lg shadow-black/40"
          style={{ left: i * size * 0.45, rotate: `${(i - (n - 1) / 2) * 9}deg` }}
        >
          <SpanishCard card={cardFromId(id)} width={size} />
        </div>
      ))}
    </div>
  );
}

function GameCard({ game, index }: { game: GameInfo; index: number }) {
  const { push } = useNav();
  return (
    <motion.button
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => {
        playSfx("click");
        push({ name: "juego", id: game.id });
      }}
      className={`cuero ${game.cuero} flex min-h-28 w-full items-center gap-4 rounded-2xl p-3 text-left active:scale-[0.98]`}
    >
      <div className="relative z-[1] flex w-28 shrink-0 justify-center">
        <Art id={game.arte} className="h-24 w-28 rounded-xl object-cover" fallback={<GameArtFallback game={game} size={52} />} />
      </div>
      <div className="relative z-[1] min-w-0 flex-1">
        <p className="titulo-criollo text-[1.65rem] leading-tight">{game.nombre}</p>
        <p className="text-sm font-semibold text-crema/90 drop-shadow">{game.bajada}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-wider text-crema/70">{game.jugadores}</p>
      </div>
      <span className="bronce relative z-[1] grid size-10 shrink-0 place-items-center rounded-full text-2xl font-black" aria-hidden>
        ›
      </span>
    </motion.button>
  );
}

export function Juegos() {
  const { back } = useNav();
  return (
    <Screen title="Elegí un juego" onBack={back} tab="juegos">
      <div className="flex flex-col gap-3">
        {GAMES.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} />
        ))}
      </div>
    </Screen>
  );
}

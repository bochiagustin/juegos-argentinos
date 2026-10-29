import { CAREER_GAMES, estadoGira, GIRAS, LOGROS, progresoDe, type CareerGame } from "@juegos-argentinos/career";
import { playSfx } from "../audio/sfx.ts";
import { useNav } from "../nav.tsx";
import { useSave } from "../save/SaveContext.tsx";
import { Fosforos } from "../ui/Modal.tsx";
import { Screen, Section } from "../ui/ui.tsx";

const GRUPOS: { titulo: string; juego?: CareerGame }[] = [
  { titulo: "Generales" },
  { titulo: "Truco", juego: "truco" },
  { titulo: "Chinchón", juego: "chinchon" },
  { titulo: "Casita Robada", juego: "casita-robada" },
  { titulo: "Escoba de 15", juego: "escoba" },
  { titulo: "Tutti-Frutti", juego: "tutti-frutti" },
];

const fecha = (ms: number) => new Date(ms).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

export function Logros() {
  const { back, push } = useNav();
  const { save } = useSave();
  const c = save.carrera;
  const total = LOGROS.length;
  const tengo = LOGROS.filter((l) => c.logros[l.id] !== undefined).length;

  return (
    <Screen title="Logros" onBack={back} tab="logros" right={<Fosforos n={c.fosforos} />}>
      <div className="cuero cuero-mostaza mb-5 rounded-2xl p-4">
        <div className="relative z-[1] flex items-center gap-4">
          <span className="text-5xl" aria-hidden>
            🏆
          </span>
          <div className="flex-1">
            <p className="titulo-criollo text-3xl">
              {tengo} de {total}
            </p>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/35">
              <div className="h-full rounded-full bg-naranja" style={{ width: `${(100 * tengo) / total}%` }} />
            </div>
            <p className="mt-1 text-sm text-crema/85">
              {c.contadores.ganadas ?? 0} ganadas de {c.contadores.partidas ?? 0} partidas
            </p>
          </div>
        </div>
      </div>

      <Section title="Giras">
        {CAREER_GAMES.map((g) => {
          const e = estadoGira(GIRAS[g], progresoDe(c, g));
          const hechas = e.filter((r) => r.completa).length;
          return (
            <button
              key={g}
              onClick={() => {
                playSfx("click");
                push({ name: "gira", game: g });
              }}
              className="cuero flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left"
            >
              <span className="relative z-[1] flex-1 font-bold">{GIRAS[g].nombre}</span>
              <span className="relative z-[1] flex gap-0.5" aria-label={`${hechas} de 6 regiones`}>
                {e.map((r) => (
                  <span key={r.id} className={`size-3 rounded-full ${r.completa ? "bg-naranja" : r.abierta ? "bg-pano" : "bg-black/40"}`} />
                ))}
              </span>
            </button>
          );
        })}
      </Section>

      {GRUPOS.map((grupo) => (
        <Section key={grupo.titulo} title={grupo.titulo}>
          {LOGROS.filter((l) => l.juego === grupo.juego).map((l) => {
            const cuando = c.logros[l.id];
            const ok = cuando !== undefined;
            return (
              <div key={l.id} className={`cuero flex items-center gap-3 rounded-2xl px-4 py-3 ${ok ? "cuero-verde" : "opacity-70"}`}>
                <span className={`relative z-[1] grid size-12 shrink-0 place-items-center rounded-full bg-black/35 text-2xl ${ok ? "" : "grayscale"}`} aria-hidden>
                  {ok ? l.icono : "🔒"}
                </span>
                <span className="relative z-[1] min-w-0 flex-1">
                  <span className="block font-black">{l.nombre}</span>
                  <span className="block text-sm text-crema/80">{l.descripcion}</span>
                  <span className="block text-xs font-bold text-naranja">{ok ? `Conseguido el ${fecha(cuando)}` : `+${l.fosforos} fósforos`}</span>
                </span>
              </div>
            );
          })}
        </Section>
      ))}
    </Screen>
  );
}

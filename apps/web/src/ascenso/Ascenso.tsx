import {
  calendarioDe,
  CATEGORIAS,
  club,
  CLUBES,
  iniciarAscenso,
  miCategoria,
  NOMBRE_CATEGORIA,
  nuevaTemporada,
  PREFIJO_ASCENSO,
  proximoPartido,
  reglasAscenso,
  RONDAS_COPA,
  RONDAS_REDUCIDO,
  tablaOrdenada,
  YO_CLUB,
  type AscensoProgress,
  type CareerGame,
  type Categoria,
  type ResumenTemporada,
} from "@juegos-argentinos/career";
import { randomSeed } from "@juegos-argentinos/engine";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { gameInfo } from "../games.ts";
import { nivelNombre } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { lanzarPartida } from "../partidas/lanzar.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Fosforos } from "../ui/Modal.tsx";
import { Screen } from "../ui/ui.tsx";
import { Escudo, MiClub, useNombreClub } from "./Escudo.tsx";

type Pestana = "tabla" | "copa" | "reducido" | "historial";

/** El Ascenso de un juego: de la Primera C a Primera División, con el Reducido y la Copa Argentina. */
export function Ascenso({ game }: { game: CareerGame }) {
  const { back } = useNav();
  const { save, update } = useSave();
  const p = save.carrera.ascensos[game];
  const guardar = (np: AscensoProgress) => update((s) => ({ ...s, carrera: { ...s.carrera, ascensos: { ...s.carrera.ascensos, [game]: np } } }));

  return (
    <Screen title={`Ascenso · ${gameInfo(game).nombre}`} onBack={back} right={<Fosforos n={save.carrera.fosforos} />}>
      {p ? (
        <MiClub.Provider value={p.miClub}>
          <Torneo game={game} p={p} guardar={guardar} />
        </MiClub.Provider>
      ) : (
        <ElegirClub game={game} onElegir={(id) => guardar(iniciarAscenso(randomSeed(), id))} />
      )}
    </Screen>
  );
}

/** Antes de arrancar: cómo es el torneo y qué club querés llevar de la C a Primera. */
function ElegirClub({ game, onElegir }: { game: CareerGame; onElegir: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const [elegido, setElegido] = useState<string | null>(null);
  const norma = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const lista = useMemo(() => CLUBES.filter((c) => norma(c.nombre).includes(norma(busca.trim()))), [busca]);
  const c = elegido ? club(elegido) : undefined;
  return (
    <>
      <section className="cuero cuero-oscuro rounded-3xl p-5">
        <div className="relative z-[1] flex flex-col gap-3">
          <h2 className="titulo-criollo text-center text-4xl">¡A la cancha!</h2>
          <p>
            Elegí tu club: el que sea, <b>arranca en la Primera C</b>. Cada fecha es una partida de {gameInfo(game).nombre.toLowerCase()} contra otro club: ganar suma
            3 puntos y perder, ninguno (no hay empates).
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>🥇 El 1º asciende directo.</li>
            <li>🔥 Del 2º al 8º juegan el Reducido (cuartos, semis y final): el campeón también sube.</li>
            <li>⬇️ Los dos últimos descienden.</li>
            <li>🏆 En el calendario se mete la Copa Argentina: cruces con clubes de todas las categorías.</li>
            <li>📈 C (28) → B Metro (22) → Primera Nacional (36) → Primera (30). Cuanto más arriba, mejores los rivales.</li>
          </ul>
        </div>
      </section>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscá tu club…"
        aria-label="Buscar club"
        className="mt-4 min-h-12 w-full rounded-2xl border border-borde bg-superficie px-4 font-bold text-texto outline-none placeholder:font-normal placeholder:text-texto-suave/70 focus:border-naranja"
      />
      <div className="mt-3 flex flex-col gap-4 pb-28">
        {[...CATEGORIAS].reverse().map((cat) => {
          const deCat = lista.filter((x) => x.categoria === cat);
          if (!deCat.length) return null;
          return (
            <section key={cat}>
              <h3 className="mb-1.5 px-1 text-xs font-black uppercase tracking-wider text-naranja">{NOMBRE_CATEGORIA[cat]}</h3>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {deCat.map((x) => (
                  <li key={x.id}>
                    <button
                      onClick={() => {
                        playSfx("click");
                        setElegido(x.id);
                      }}
                      aria-pressed={elegido === x.id}
                      className={`flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-center text-xs font-bold leading-tight ${elegido === x.id ? "border-naranja bg-naranja/20" : "border-crema/10 bg-black/25"}`}
                    >
                      <Escudo id={x.id} className="size-14" />
                      <span className="line-clamp-2">{x.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {c && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <button
            className="btn-criollo flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 text-left shadow-xl shadow-black/50"
            onClick={() => {
              playSfx("barajar");
              onElegir(c.id);
            }}
          >
            <Escudo id={c.id} className="relative z-[1] size-12" />
            <span className="relative z-[1] min-w-0 flex-1">
              <span className="block truncate font-criolla text-xl">¡Vamos {c.nombre}!</span>
              <span className="block text-xs font-bold opacity-80">Arranca en la Primera C</span>
            </span>
          </button>
        </motion.div>
      )}
    </>
  );
}

function Torneo({ game, p, guardar }: { game: CareerGame; p: AscensoProgress; guardar: (p: AscensoProgress) => void }) {
  const { push } = useNav();
  const { save } = useSave();
  const nombre = useNombreClub();
  const cat = miCategoria(p);
  const tabla = tablaOrdenada(p);
  const mia = tabla.find((x) => x.id === YO_CLUB)!;
  const prox = proximoPartido(p);
  const [pestana, setPestana] = useState<Pestana>(p.fase === "reducido" ? "reducido" : "tabla");
  const fechas = p.categorias[cat].length - 1;
  const fechasJugadas = calendarioDe(p).slice(0, p.paso).filter((f) => f.tipo === "liga").length;
  const reglas = reglasAscenso(game, cat);

  const jugar = () => {
    if (!prox) return;
    const c = club(prox.rival)!;
    playSfx("barajar");
    const yo = { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar };
    push(lanzarPartida(game, reglas.config, yo, { id: PREFIJO_ASCENSO + c.id, jugador: { nombre: c.nombre, avatar: "⚽" }, skill: c.nivel }));
  };

  const pestanas: { id: Pestana; nombre: string }[] = [
    { id: "tabla", nombre: "Tabla" },
    { id: "copa", nombre: "Copa" },
    ...(p.reducido ? [{ id: "reducido" as const, nombre: "Reducido" }] : []),
    ...(p.historial.length ? [{ id: "historial" as const, nombre: "Historial" }] : []),
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        <span className="rounded-full bg-black/35 px-3 py-1">
          {NOMBRE_CATEGORIA[cat]} · Temporada {p.temporada}
        </span>
        <span className="rounded-full bg-black/35 px-3 py-1">
          {mia.puesto}º · {mia.fila.pts} pts · Fecha {Math.min(fechasJugadas + 1, fechas)}/{fechas}
        </span>
      </div>

      {p.resumen ? (
        <FinTemporada r={p.resumen} onSeguir={() => guardar(nuevaTemporada(p))} />
      ) : prox ? (
        <section className="cuero cuero-verde rounded-3xl p-4">
          <div className="relative z-[1]">
            <p className="text-center text-xs font-black uppercase tracking-wider text-naranja">{prox.titulo}</p>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <EquipoGrande id={YO_CLUB} nombre={nombre(YO_CLUB)} detalle={`${mia.puesto}º en la tabla`} />
              <span className="font-criolla text-3xl text-crema/80">vs</span>
              <EquipoGrande id={prox.rival} nombre={nombre(prox.rival)} detalle={`Nivel ${club(prox.rival)!.nivel} · ${nivelNombre(club(prox.rival)!.nivel)}`} />
            </div>
            <p className="mt-2 text-center text-xs text-crema/75">{reglas.reglas}</p>
            <button className="btn-criollo mt-3 min-h-14 w-full rounded-2xl font-criolla text-2xl" onClick={jugar}>
              <span className="relative z-[1]">¡A jugar!</span>
            </button>
          </div>
        </section>
      ) : null}

      <div className="hundido mt-4 flex gap-1 rounded-2xl p-1" role="tablist">
        {pestanas.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={pestana === t.id}
            onClick={() => {
              playSfx("click");
              setPestana(t.id);
            }}
            className={`min-h-11 flex-1 rounded-xl text-sm font-black ${pestana === t.id ? "bg-naranja text-tinta" : "text-crema/80"}`}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      <section className="cuero cuero-oscuro mt-3 rounded-3xl p-3">
        <div className="relative z-[1]">
          {pestana === "tabla" && <Tabla p={p} cat={cat} />}
          {pestana === "copa" && <Copa p={p} />}
          {pestana === "reducido" && p.reducido && <Cuadro rondas={p.reducido.rondas} nombres={RONDAS_REDUCIDO} bye={p.reducido.sembrados[0]} />}
          {pestana === "historial" && <Historial lista={p.historial} />}
        </div>
      </section>
    </>
  );
}

function EquipoGrande({ id, nombre, detalle }: { id: string; nombre: string; detalle: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Escudo id={id} className="size-20" />
      <span className="mt-1 line-clamp-2 font-black leading-tight">{nombre}</span>
      <span className="text-xs text-crema/75">{detalle}</span>
    </div>
  );
}

function Tabla({ p, cat }: { p: AscensoProgress; cat: Categoria }) {
  const nombre = useNombreClub();
  const zona = (puesto: number) =>
    puesto === 1 ? "border-l-[#4caf50]" : cat !== "primera" && puesto <= 8 ? "border-l-naranja" : cat !== "c" && puesto > p.categorias[cat].length - 2 ? "border-l-[#e53935]" : "border-l-transparent";
  return (
    <>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-[11px] uppercase text-crema/70">
            <th className="w-7 text-center">#</th>
            <th className="text-left">Club</th>
            <th className="w-8 text-center">PJ</th>
            <th className="w-8 text-center">PG</th>
            <th className="w-8 text-center">PP</th>
            <th className="w-10 text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {tablaOrdenada(p).map(({ id, puesto, fila }) => (
            <tr key={id} className={`border-l-4 ${zona(puesto)} ${id === YO_CLUB ? "bg-[#2e7d32]/35 font-black" : "odd:bg-black/20"}`}>
              <td className="py-1 text-center font-criolla">{puesto}</td>
              <td className="py-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Escudo id={id} className="size-7" />
                  <span className="truncate">{nombre(id)}</span>
                  {id !== YO_CLUB && <span className="shrink-0 text-[10px] text-crema/60">N{club(id)!.nivel}</span>}
                </span>
              </td>
              <td className="text-center">{fila.pj}</td>
              <td className="text-center">{fila.pg}</td>
              <td className="text-center">{fila.pp}</td>
              <td className="text-center font-black">{fila.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-crema/75">
        <span>🟩 {cat === "primera" ? "Campeón" : "Ascenso directo"}</span>
        {cat !== "primera" && <span>🟧 Reducido</span>}
        {cat !== "c" && <span>🟥 Descenso</span>}
      </p>
    </>
  );
}

function Copa({ p }: { p: AscensoProgress }) {
  const rondas = p.copa.slice(0, RONDAS_COPA.length).map((vivos, r) =>
    Array.from({ length: vivos.length / 2 }, (_, i) => {
      const a = vivos[2 * i]!;
      const b = vivos[2 * i + 1]!;
      const g = p.copa[r + 1]?.[i];
      return { a, b, ...(g ? { ganador: g } : {}) };
    }),
  );
  const campeon = p.copa[RONDAS_COPA.length]?.[0];
  return (
    <>
      {campeon && <Campeon id={campeon} texto="Campeón de la Copa Argentina" />}
      <Cuadro rondas={rondas} nombres={RONDAS_COPA} soloMiRuta />
    </>
  );
}

function Campeon({ id, texto }: { id: string; texto: string }) {
  const nombre = useNombreClub();
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-naranja/20 px-3 py-2">
      <Escudo id={id} className="size-10" />
      <span>
        <span className="block text-xs font-black uppercase text-naranja">🏆 {texto}</span>
        <span className="font-black">{nombre(id)}</span>
      </span>
    </div>
  );
}

/**
 * Cruces por ronda, de la última a la primera. Con `soloMiRuta`, las rondas viejas muestran solo mis partidos
 * (la Copa tiene 31 cruces).
 */
function Cuadro({ rondas, nombres, bye, soloMiRuta = false }: { rondas: { a: string; b: string; ganador?: string }[][]; nombres: readonly string[]; bye?: string | undefined; soloMiRuta?: boolean }) {
  const nombre = useNombreClub();
  const ultima = rondas.length - 1;
  const [todas, setTodas] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {bye && rondas.length <= 1 && <p className="rounded-xl bg-black/30 px-3 py-2 text-sm">⏭️ {nombre(bye)} (2º) pasa directo a semis.</p>}
      {rondas
        .map((cruces, r) => ({ cruces, r }))
        .reverse()
        .map(({ cruces, r }) => {
          const lista = soloMiRuta && r !== ultima && !todas ? cruces.filter((c) => c.a === YO_CLUB || c.b === YO_CLUB) : cruces;
          if (!lista.length) return null;
          return (
            <div key={r}>
              <p className="mb-1 px-1 text-xs font-black uppercase tracking-wider text-naranja">{nombres[r]}</p>
              <ul className="flex flex-col gap-1">
                {lista.map((c) => (
                  <li key={c.a} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${c.a === YO_CLUB || c.b === YO_CLUB ? "bg-[#2e7d32]/35" : "bg-black/25"}`}>
                    <Lado id={c.a} nombre={nombre(c.a)} gano={c.ganador === c.a} perdio={!!c.ganador && c.ganador !== c.a} />
                    <span className="text-xs text-crema/60">vs</span>
                    <Lado id={c.b} nombre={nombre(c.b)} gano={c.ganador === c.b} perdio={!!c.ganador && c.ganador !== c.b} derecha />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      {soloMiRuta && rondas.length > 1 && (
        <button className="boton boton-fantasma min-h-11 rounded-xl text-sm" onClick={() => setTodas((x) => !x)}>
          {todas ? "Ver solo mis partidos" : "Ver todos los cruces"}
        </button>
      )}
    </div>
  );
}

function Lado({ id, nombre, gano, perdio, derecha = false }: { id: string; nombre: string; gano: boolean; perdio: boolean; derecha?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${derecha ? "flex-row-reverse text-right" : ""} ${perdio ? "opacity-45" : ""} ${gano ? "font-black" : ""}`}>
      <Escudo id={id} className="size-7" />
      <span className="truncate">{nombre}</span>
    </span>
  );
}

const TEXTO_RESULTADO: Record<ResumenTemporada["resultado"], string> = {
  campeon: "👑 ¡Campeón de Primera!",
  ascenso: "🎉 ¡Ascenso directo!",
  "ascenso-reducido": "🎉 ¡Ascenso por el Reducido!",
  reducido: "Se escapó en el Reducido",
  queda: "Te quedás en la categoría",
  descenso: "😞 Descenso",
};

function FinTemporada({ r, onSeguir }: { r: ResumenTemporada; onSeguir: () => void }) {
  const sube = r.resultado === "ascenso" || r.resultado === "ascenso-reducido" || r.resultado === "campeon";
  return (
    <motion.section initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`cuero ${sube ? "cuero-mostaza" : "cuero-oscuro"} rounded-3xl p-4 text-center`}>
      <div className="relative z-[1]">
        <p className="text-xs font-black uppercase tracking-wider text-crema/80">Terminó la temporada {r.temporada}</p>
        <h2 className="titulo-criollo my-1 text-4xl">{TEXTO_RESULTADO[r.resultado]}</h2>
        <p className="font-bold">
          {r.puesto}º en la {NOMBRE_CATEGORIA[r.categoria]} · Copa: {r.copa >= RONDAS_COPA.length ? "¡campeón!" : RONDAS_COPA[r.copa]!.toLowerCase()}
        </p>
        <p className="mt-1 text-sm text-crema/85">La temporada que viene jugás en la {NOMBRE_CATEGORIA[r.nueva]}.</p>
        <button
          className="btn-criollo mt-3 min-h-14 w-full rounded-2xl font-criolla text-2xl"
          onClick={() => {
            playSfx("click");
            onSeguir();
          }}
        >
          <span className="relative z-[1]">Arrancar la temporada {r.temporada + 1}</span>
        </button>
      </div>
    </motion.section>
  );
}

function Historial({ lista }: { lista: ResumenTemporada[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {lista
        .slice()
        .reverse()
        .map((r) => (
          <li key={r.temporada} className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2">
            <span className="w-8 font-criolla text-lg text-naranja">T{r.temporada}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-black">{TEXTO_RESULTADO[r.resultado]}</span>
              <span className="block truncate text-xs text-crema/75">
                {r.puesto}º en la {NOMBRE_CATEGORIA[r.categoria]} · Copa: {r.copa >= RONDAS_COPA.length ? "campeón" : RONDAS_COPA[r.copa]!.toLowerCase()}
              </span>
            </span>
          </li>
        ))}
    </ul>
  );
}

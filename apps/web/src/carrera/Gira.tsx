import { estadoGira, GIRAS, progresoDe, type CareerGame, type EstadoRegion, type EstadoRival, type RegionId } from "@juegos-argentinos/career";
import { Cara } from "../carrera/Cara.tsx";
import { AnimatePresence, motion } from "motion/react";
import type { Rasgos } from "@juegos-argentinos/engine";
import { useState } from "react";
import { Art } from "../art/Art.tsx";
import type { ArtId } from "../art/manifest.ts";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { lanzarPartida } from "../partidas/lanzar.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Fosforos, Modal } from "../ui/Modal.tsx";
import { Screen } from "../ui/ui.tsx";
import { MapaGira } from "./MapaGira.tsx";

export function RivalAvatar({ id, avatar, size = "size-16" }: { id: string; avatar: string; size?: string }) {
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-[#d9a066] bg-black/40 text-3xl shadow-lg shadow-black/40`}>
      <Art id={`rival-${id}` as ArtId} className="size-full object-cover" fallback={<span aria-hidden>{avatar}</span>} />
    </span>
  );
}

export function Gira({ game }: { game: CareerGame }) {
  const { back, push } = useNav();
  const { save } = useSave();
  const gira = GIRAS[game];
  const p = progresoDe(save.carrera, game);
  const regiones = estadoGira(gira, p);
  const ultimaAbierta = [...regiones].reverse().find((r) => r.abierta)!;
  const [sel, setSel] = useState<RegionId>(ultimaAbierta.id);
  const [ficha, setFicha] = useState<EstadoRival | null>(null);
  const region = regiones.find((r) => r.id === sel)!;
  const yo = { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar };

  const jugar = (r: EstadoRival) => {
    const def = gira.regiones[region.index]!;
    playSfx("barajar");
    push(lanzarPartida(game, def.config, yo, { id: r.personaje.id, jugador: { nombre: r.personaje.nombre, avatar: r.personaje.avatar }, skill: r.skill }));
    setFicha(null);
  };

  return (
    <Screen title={gira.nombre} onBack={back} right={<Fosforos n={save.carrera.fosforos} />}>
      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-bold">
        <span className="rounded-full bg-black/35 px-3 py-1">⭐ {p.puntos} puntos de gira</span>
        <span className="rounded-full bg-black/35 px-3 py-1">{regiones.filter((r) => r.completa).length}/6 regiones</span>
      </div>
      <div className="cuero overflow-hidden rounded-3xl p-2">
        <div className="relative z-[1] overflow-hidden rounded-2xl">
          <MapaGira
            regiones={regiones}
            seleccion={sel}
            onSelect={(id) => {
              playSfx("click");
              setSel(id);
            }}
          />
        </div>
      </div>

      <section className="cuero cuero-oscuro mt-4 rounded-3xl p-4" aria-live="polite">
        <div className="relative z-[1]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="titulo-criollo text-3xl">{region.nombre}</h2>
              <p className="text-sm text-crema/80">{region.reglas}</p>
            </div>
            {region.abierta && (
              <span className="shrink-0 rounded-xl bg-black/35 px-3 py-1 text-center text-xs font-bold uppercase leading-tight text-crema/80">
                Tu puesto
                <span className="block font-criolla text-2xl normal-case text-naranja">#{region.miPuesto}</span>
              </span>
            )}
          </div>
          {!region.abierta && (
            <p className="mt-3 rounded-xl bg-black/35 px-3 py-2 text-sm font-semibold">
              🔒 Para entrar: {region.faltaJefeAnterior ? `ganale al jefe de ${regiones[region.index - 1]!.nombre}` : ""}
              {region.faltaJefeAnterior && region.faltanPuntos > 0 ? " y " : ""}
              {region.faltanPuntos > 0 ? `juntá ${region.faltanPuntos} puntos más` : ""}.
            </p>
          )}
          {region.abierta && (
            <p className="mt-2 text-xs text-crema/70">Desafiá al que está justo arriba tuyo para sacarle el puesto. El primero es el jefe: ganale y se abre la región siguiente.</p>
          )}
          <ol className="mt-3 flex flex-col gap-1.5">
            {Array.from({ length: region.rivales.length + 1 }, (_, k) => {
              const puesto = k + 1;
              if (puesto === region.miPuesto)
                return (
                  <li key="yo" className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-[#4caf50] bg-[#2e7d32]/25 px-3 py-1.5">
                    <span className="w-7 text-center font-criolla text-xl text-crema">{puesto}</span>
                    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-[#d9a066] bg-black/40 text-2xl">
                      <Cara avatar={yo.avatar} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-black">{yo.nombre}</span>
                    <span className="text-xs font-black uppercase text-crema/80">Vos</span>
                  </li>
                );
              const r = region.rivales.find((x) => x.puesto === puesto)!;
              return (
                <li key={r.personaje.id}>
                  <button
                    onClick={() => {
                      playSfx("click");
                      setFicha(r);
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-crema/15 px-3 py-1.5 text-left active:scale-[0.98] ${r.abierto ? "bg-black/30" : "bg-black/20"}`}
                  >
                    <span className="w-7 text-center font-criolla text-xl text-crema/80">{puesto}</span>
                    <RivalAvatar id={r.personaje.id} avatar={r.personaje.avatar} size="size-11" />
                    <span className={`min-w-0 flex-1 ${r.abierto ? "" : "opacity-70"}`}>
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-black">{r.personaje.nombre}</span>
                        {r.personaje.slot === "jefe" && <span className="shrink-0 rounded-full bg-bordo px-2 text-[10px] font-black uppercase">Jefe</span>}
                        {r.victorias > 0 && <span className="shrink-0 text-xs" aria-label="Ya le ganaste">✅</span>}
                      </span>
                      <span className="block truncate text-xs text-crema/70">
                        {r.personaje.bajada} · Nivel {r.skill}
                      </span>
                    </span>
                    <span className="shrink-0 text-xl" aria-label={r.abierto ? (r.arriba ? "Desafiar y subir" : "Desafiar") : "Bloqueado"}>
                      {r.abierto ? (r.arriba ? "⚔️" : "🗡️") : "🔒"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <AnimatePresence>
        {ficha && (
          <Modal key="ficha" onClose={() => setFicha(null)}>
            <FichaRival r={ficha} region={region} onDesafiar={() => jugar(ficha)} />
          </Modal>
        )}
      </AnimatePresence>
    </Screen>
  );
}

const RASGOS: { id: keyof Rasgos; nombre: string; explica: string }[] = [
  { id: "mentiroso", nombre: "Mentiroso", explica: "Canta y apuesta sin tener con qué" },
  { id: "pescador", nombre: "Pescador", explica: "Se calla con cartas buenas para que cantes vos" },
  { id: "agresivo", nombre: "Agresivo", explica: "Canta todo y sube siempre" },
];

/** Ficha del rival: quién es, su historia, cómo juega y el botón para desafiarlo. */
function FichaRival({ r, region, onDesafiar }: { r: EstadoRival; region: EstadoRegion; onDesafiar: () => void }) {
  const p = r.personaje;
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4">
        <span className="relative">
          <RivalAvatar id={p.id} avatar={p.avatar} size="size-24" />
          <span className="absolute -bottom-1 -left-1 grid size-9 place-items-center rounded-full border-2 border-[#d9a066] bg-[#3b2a1a] font-criolla text-sm text-crema">#{r.puesto}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="titulo-criollo text-2xl leading-tight">{p.nombre}</h2>
          <p className="text-sm text-crema/80">{p.bajada}</p>
          <p className="text-xs font-bold text-naranja">
            Nivel {r.skill} · {nivelNombre(r.skill)}
            {p.slot === "jefe" ? " · Jefe" : ""}
          </p>
        </div>
      </div>
      <dl className="mt-4 flex flex-col gap-1.5">
        {RASGOS.map((x) => (
          <div key={x.id} className="grid grid-cols-[6.5rem_1fr] items-center gap-2" title={x.explica}>
            <dt className="text-sm font-bold text-crema/85">{x.nombre}</dt>
            <dd className="flex gap-0.5" aria-label={`${x.nombre}: ${p.rasgos[x.id]} de 10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 rounded-sm ${i < p.rasgos[x.id] ? "bg-gradient-to-b from-[#9be37a] to-[#3f9a3a]" : "bg-black/40"}`} />
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 max-h-44 overflow-y-auto rounded-2xl bg-black/30 px-4 py-3 text-[15px] leading-relaxed text-crema/90">{p.historia}</div>
      <motion.p initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="mx-auto my-3 rounded-2xl bg-crema px-4 py-2 text-center font-criolla text-lg text-tinta">
        “{p.frase}”
      </motion.p>
      <p className="mb-3 text-center text-xs text-crema/75">
        {r.victorias > 0 ? `Ya le ganaste ${r.victorias === 1 ? "una vez" : `${r.victorias} veces`} · ` : ""}
        {!region.abierta
          ? "Esta región todavía está cerrada."
          : r.arriba
            ? r.abierto
              ? "Está justo arriba tuyo: si le ganás, te quedás con su puesto."
              : `Para desafiarlo, primero subí hasta el puesto #${r.puesto + 1}.`
            : "Está abajo tuyo: ganarle suma poquito, y si perdés, te pasa."}
      </p>
      {r.abierto ? (
        <button className="btn-criollo min-h-14 w-full rounded-2xl font-criolla text-2xl" onClick={onDesafiar}>
          <span className="relative z-[1]">¡Desafiar!</span>
        </button>
      ) : (
        <p className="rounded-2xl bg-black/30 py-3 text-center font-bold text-crema/70">🔒 Todavía no</p>
      )}
    </div>
  );
}

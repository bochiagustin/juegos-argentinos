import { estadoGira, GIRAS, progresoDe, type CareerGame, type EstadoRival, type RegionId } from "@juegos-argentinos/career";
import { casita } from "@juegos-argentinos/engine/casita";
import { DEFAULT_CASITA_CONFIG, type CasitaConfig } from "@juegos-argentinos/engine/casita";
import { chinchon, DEFAULT_CHINCHON_CONFIG, type ChinchonConfig } from "@juegos-argentinos/engine/chinchon";
import { DEFAULT_ESCOBA_CONFIG, escoba, type EscobaConfig } from "@juegos-argentinos/engine/escoba";
import { DEFAULT_TRUCO_CONFIG, type TrucoConfig } from "@juegos-argentinos/engine/truco";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Art } from "../art/Art.tsx";
import type { ArtId } from "../art/manifest.ts";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { useSave } from "../save/SaveContext.tsx";
import { newMatch, saveMatch } from "../truco/partida.ts";
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
  const [desafio, setDesafio] = useState<EstadoRival | null>(null);
  const region = regiones.find((r) => r.id === sel)!;
  const yo = { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar };

  const jugar = (r: EstadoRival) => {
    const def = gira.regiones[region.index]!;
    const rival = { id: r.personaje.id, jugador: { nombre: r.personaje.nombre, avatar: r.personaje.avatar }, skill: r.skill };
    playSfx("barajar");
    if (game === "truco") {
      saveMatch(newMatch({ ...DEFAULT_TRUCO_CONFIG, ...(def.config as Partial<TrucoConfig>) }, r.skill, false, yo, rival));
      push({ name: "truco-mesa" });
    } else if (game === "chinchon") {
      const config: ChinchonConfig = { ...DEFAULT_CHINCHON_CONFIG, ...(def.config as Partial<ChinchonConfig>), players: 2 };
      saveBotMatch(newBotMatch(chinchon, { config, players: 2, botSkill: r.skill, adaptativo: false, yo, rival }) as never);
      push({ name: "chinchon-mesa" });
    } else if (game === "escoba") {
      const config: EscobaConfig = { ...DEFAULT_ESCOBA_CONFIG, ...(def.config as Partial<EscobaConfig>), players: 2, parejas: false };
      saveBotMatch(newBotMatch(escoba, { config, players: 2, botSkill: r.skill, adaptativo: false, yo, rival }) as never);
      push({ name: "escoba-mesa" });
    } else {
      const config: CasitaConfig = { ...DEFAULT_CASITA_CONFIG, ...(def.config as Partial<CasitaConfig>), players: 2, parejas: false };
      saveBotMatch(newBotMatch(casita, { config, players: 2, botSkill: r.skill, adaptativo: false, yo, rival }) as never);
      push({ name: "casita-mesa" });
    }
    setDesafio(null);
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
          <h2 className="titulo-criollo text-3xl">{region.nombre}</h2>
          <p className="mb-3 text-sm text-crema/80">{region.reglas}</p>
          {!region.abierta && (
            <p className="mb-3 rounded-xl bg-black/35 px-3 py-2 text-sm font-semibold">
              🔒 Para entrar: {region.faltaJefeAnterior ? `ganale al jefe de ${regiones[region.index - 1]!.nombre}` : ""}
              {region.faltaJefeAnterior && region.faltanPuntos > 0 ? " y " : ""}
              {region.faltanPuntos > 0 ? `juntá ${region.faltanPuntos} puntos más` : ""}.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {region.rivales.map((r) => (
              <button
                key={r.personaje.id}
                disabled={!r.abierto}
                onClick={() => {
                  playSfx("click");
                  setDesafio(r);
                }}
                className={`flex min-h-20 items-center gap-3 rounded-2xl border border-crema/15 px-3 py-2 text-left ${r.abierto ? "bg-black/30 active:scale-[0.98]" : "bg-black/20 opacity-60"}`}
              >
                <RivalAvatar id={r.personaje.id} avatar={r.personaje.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-black">{r.personaje.nombre}</span>
                    {r.personaje.slot === "jefe" && <span className="rounded-full bg-bordo px-2 text-[11px] font-black uppercase">Jefe</span>}
                  </span>
                  <span className="block text-sm text-crema/75">{r.personaje.bajada}</span>
                  <span className="block text-xs font-bold text-naranja">
                    Nivel {r.skill} · {nivelNombre(r.skill)}
                  </span>
                </span>
                <span className="shrink-0 text-2xl" aria-label={r.victorias > 0 ? "Vencido" : r.abierto ? "Disponible" : "Bloqueado"}>
                  {r.victorias > 0 ? "✅" : r.abierto ? "⚔️" : "🔒"}
                </span>
              </button>
            ))}
          </div>
          {region.abierta && !region.rivales[2]!.abierto && <p className="mt-2 text-center text-xs text-crema/70">El jefe aparece cuando les ganás a los otros dos.</p>}
        </div>
      </section>

      <AnimatePresence>
        {desafio && (
          <Modal key="desafio" onClose={() => setDesafio(null)}>
            <div className="flex flex-col items-center text-center">
              <RivalAvatar id={desafio.personaje.id} avatar={desafio.personaje.avatar} size="size-28" />
              <h2 className="titulo-criollo mt-2 text-3xl">{desafio.personaje.nombre}</h2>
              <p className="text-sm text-crema/80">{desafio.personaje.bajada}</p>
              <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="my-3 rounded-2xl bg-crema px-4 py-2 font-criolla text-lg text-tinta">
                “{desafio.personaje.frase}”
              </motion.p>
              <p className="mb-4 text-sm font-semibold">
                Nivel {desafio.skill} ({nivelNombre(desafio.skill)}) · {region.reglas}
                {desafio.victorias > 0 && ` · Ya le ganaste ${desafio.victorias === 1 ? "una vez" : `${desafio.victorias} veces`}`}
              </p>
              <button className="btn-criollo min-h-14 w-full rounded-2xl font-criolla text-2xl" onClick={() => jugar(desafio)}>
                <span className="relative z-[1]">¡Desafiar!</span>
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </Screen>
  );
}

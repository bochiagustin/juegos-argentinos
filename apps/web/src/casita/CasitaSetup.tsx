import { casita, DEFAULT_CASITA_CONFIG, type CasitaConfig } from "@juegos-argentinos/engine/casita";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { loadBotMatch, newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";

export function CasitaSetup() {
  const { back, push, replace } = useNav();
  const { save } = useSave();
  const stats = statsDe(save, "casita-robada");
  const nivelAuto = skillForRating(stats.rating);
  const [enCurso] = useState(() => loadBotMatch("casita-robada", () => true));
  const [formato, setFormato] = useState<"2" | "3" | "4" | "parejas">("2");
  const [levantar, setLevantar] = useState<CasitaConfig["levantar"]>(DEFAULT_CASITA_CONFIG.levantar);
  const [prioridad, setPrioridad] = useState<CasitaConfig["prioridad"]>(DEFAULT_CASITA_CONFIG.prioridad);
  const [agrandar, setAgrandar] = useState(DEFAULT_CASITA_CONFIG.agrandarPropia);
  const [sobrantes, setSobrantes] = useState<CasitaConfig["sobrantes"]>(DEFAULT_CASITA_CONFIG.sobrantes);
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;

  const empezar = () => {
    const players = formato === "parejas" ? 4 : (Number(formato) as 2 | 3 | 4);
    const config: CasitaConfig = { players, parejas: formato === "parejas", levantar, prioridad, agrandarPropia: agrandar, sobrantes };
    const m = newBotMatch(casita, { config, players, botSkill: nivel, adaptativo: modoNivel === "auto", yo: { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar } });
    saveBotMatch(m as never);
    playSfx("barajar");
    replace({ name: "casita-mesa" });
  };

  return (
    <Screen title="Casita contra la IA" onBack={back}>
      {enCurso && (
        <div className="cuero cuero-azul mb-5 rounded-2xl p-4">
          <div className="relative z-[1]">
            <p className="font-black">Tenés una partida a medias</p>
            <p className="mb-3 text-sm text-crema/80">
              {enCurso.jugadores.length} jugadores{enCurso.carrera ? " · de la gira" : ""}
            </p>
            <BigButton onClick={() => push({ name: "casita-mesa" })}>Seguir la partida</BigButton>
          </div>
        </div>
      )}
      <Section title="Mesa">
        <Segmented
          label="Jugadores"
          value={formato}
          onChange={setFormato}
          options={[
            { value: "2", label: "Mano a mano" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
            { value: "parejas", label: "2 vs 2" },
          ]}
        />
      </Section>
      <Section title="La máquina">
        <Segmented
          label="Dificultad"
          value={modoNivel}
          onChange={setModoNivel}
          options={[
            { value: "auto", label: "Se adapta a vos" },
            { value: "fijo", label: "Elegir nivel" },
          ]}
        />
        {modoNivel === "auto" ? (
          <p className="px-1 text-sm text-crema/80">
            Juega en nivel <b>{nivelAuto}</b> ({nivelNombre(nivelAuto)}).
          </p>
        ) : (
          <div className="cuero rounded-2xl px-4 py-3">
            <label className="relative z-[1] block">
              <span className="mb-2 flex justify-between font-bold">
                <span>Nivel {nivelFijo}</span>
                <span className="text-naranja">{nivelNombre(nivelFijo)}</span>
              </span>
              <input type="range" min={1} max={10} value={nivelFijo} onChange={(e) => setNivelFijo(Number(e.target.value))} className="w-full accent-naranja" aria-label="Nivel de la máquina" />
            </label>
          </div>
        )}
      </Section>
      <Section title="Reglas">
        <Segmented
          label="Si hay varias iguales en la mesa"
          value={levantar}
          onChange={setLevantar}
          options={[
            { value: "una", label: "Levantás una" },
            { value: "todas", label: "Levantás todas" },
          ]}
        />
        <Segmented
          label="Si podés levantar y robar"
          value={prioridad}
          onChange={setPrioridad}
          options={[
            { value: "eleccion", label: "Elegís" },
            { value: "robar", label: "Robás sí o sí" },
            { value: "mesa", label: "Levantás" },
          ]}
        />
        <Toggle label="Agrandar la propia casita" detail="Tirar una igual a la de arriba de tu casita y sumarla" checked={agrandar} onChange={setAgrandar} />
        <Segmented
          label="Lo que queda en la mesa al final"
          value={sobrantes}
          onChange={setSobrantes}
          options={[
            { value: "ultimo", label: "Del último que levantó" },
            { value: "nadie", label: "De nadie" },
          ]}
        />
      </Section>
      <div className="mt-6">
        <BigButton onClick={empezar}>¡A jugar!</BigButton>
      </div>
    </Screen>
  );
}

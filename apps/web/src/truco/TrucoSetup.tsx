import { DEFAULT_TRUCO_CONFIG, type TrucoConfig } from "@juegos-argentinos/engine/truco";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";
import { loadMatch, newMatch, saveMatch } from "./partida.ts";

type Formato = "2" | "4" | "6";

export function TrucoSetup() {
  const { back, push, replace } = useNav();
  const { save } = useSave();
  const stats = statsDe(save, "truco");
  const nivelAuto = skillForRating(stats.rating);
  const [enCurso] = useState(() => loadMatch());
  const [formato, setFormato] = useState<Formato>("2");
  const [target, setTarget] = useState<"15" | "30">("30");
  const [flor, setFlor] = useState(DEFAULT_TRUCO_CONFIG.flor);
  const [mazoSumaEnvido, setMazoSumaEnvido] = useState(DEFAULT_TRUCO_CONFIG.mazoSumaEnvido);
  const [falta, setFalta] = useState<TrucoConfig["faltaEnvido"]>(DEFAULT_TRUCO_CONFIG.faltaEnvido);
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;

  const empezar = () => {
    const config: TrucoConfig = { players: Number(formato) as 2 | 4 | 6, target: Number(target) as 15 | 30, flor, mazoSumaEnvido, faltaEnvido: falta };
    const m = newMatch(config, nivel, modoNivel === "auto", { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar });
    saveMatch(m);
    playSfx("barajar");
    replace({ name: "truco-mesa" });
  };

  return (
    <Screen title="Truco contra la IA" onBack={back}>
      {enCurso && (
        <div className="cuero cuero-verde mb-5 rounded-2xl p-4">
          <div className="relative z-[1]">
            <p className="font-black">Tenés una partida a medias</p>
            <p className="mb-3 text-sm text-crema/80">
              {enCurso.config.players === 2 ? "1 contra 1" : enCurso.config.players === 4 ? "2 contra 2" : "3 contra 3"} a {enCurso.config.target} · van {enCurso.state.score[0]} a {enCurso.state.score[1]}
            </p>
            <BigButton onClick={() => push({ name: "truco-mesa" })}>Seguir la partida</BigButton>
          </div>
        </div>
      )}

      <Section title="Mesa">
        <Segmented
          label="Jugadores"
          value={formato}
          onChange={setFormato}
          options={[
            { value: "2", label: "1 vs 1" },
            { value: "4", label: "2 vs 2" },
            { value: "6", label: "3 vs 3" },
          ]}
        />
        <Segmented
          label="Puntos"
          value={target}
          onChange={setTarget}
          options={[
            { value: "15", label: "A 15" },
            { value: "30", label: "A 30 (malas y buenas)" },
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
            Juega en nivel <b>{nivelAuto}</b> ({nivelNombre(nivelAuto)}). Cuanto más le ganes, más brava se pone.
            {stats.jugadas > 0 && ` Llevás ${stats.ganadas} ganadas de ${stats.jugadas}.`}
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
        <Toggle label="Con flor" detail="Tres del mismo palo: flor, contraflor y contraflor al resto" checked={flor} onChange={setFlor} />
        <Toggle label="Mazo en primera suma el envido" detail="Si te vas en la primera sin envido cantado, el otro cobra 1 más" checked={mazoSumaEnvido} onChange={setMazoSumaEnvido} />
        <Segmented
          label="Falta envido"
          value={falta}
          onChange={setFalta}
          options={[
            { value: "por-etapa", label: "Lo que falta para la etapa" },
            { value: "partido", label: "Lo que falta para ganar" },
          ]}
        />
      </Section>

      <div className="mt-6">
        <BigButton onClick={empezar}>¡A jugar!</BigButton>
      </div>
    </Screen>
  );
}

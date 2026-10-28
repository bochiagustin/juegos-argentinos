import { chinchon, DEFAULT_CHINCHON_CONFIG, type ChinchonConfig } from "@juegos-argentinos/engine/chinchon";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { loadBotMatch, newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";

export function ChinchonSetup() {
  const { back, push, replace } = useNav();
  const { save } = useSave();
  const stats = statsDe(save, "chinchon");
  const nivelAuto = skillForRating(stats.rating);
  const [enCurso] = useState(() => loadBotMatch("chinchon", () => true));
  const [jugadores, setJugadores] = useState<"2" | "3" | "4" | "6">("2");
  const [comodines, setComodines] = useState(true);
  const [mazo, setMazo] = useState<"48" | "40">("48");
  const [corte, setCorte] = useState<"5" | "7">("5");
  const [suelto, setSuelto] = useState<"50" | "25">("50");
  const [unComodin, setUnComodin] = useState(true);
  const [reenganche, setReenganche] = useState(false);
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;

  const empezar = () => {
    const config: ChinchonConfig = {
      ...DEFAULT_CHINCHON_CONFIG,
      players: Number(jugadores),
      jokers: comodines ? 2 : 0,
      deckSize: Number(mazo) as 40 | 48,
      corteMax: Number(corte) as 5 | 7,
      comodinSuelto: Number(suelto) as 50 | 25,
      unComodinPorCombinacion: unComodin,
      reenganche,
    };
    const m = newBotMatch(chinchon, { config, players: config.players, botSkill: nivel, adaptativo: modoNivel === "auto", yo: { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar } });
    saveBotMatch(m as never);
    playSfx("barajar");
    replace({ name: "chinchon-mesa" });
  };

  return (
    <Screen title="Chinchón contra la IA" onBack={back}>
      {enCurso && (
        <div className="cuero cuero-rojo mb-5 rounded-2xl p-4">
          <div className="relative z-[1]">
            <p className="font-black">Tenés una partida a medias</p>
            <p className="mb-3 text-sm text-crema/80">
              {enCurso.jugadores.length} jugadores{enCurso.carrera ? " · de la gira" : ""}
            </p>
            <BigButton onClick={() => push({ name: "chinchon-mesa" })}>Seguir la partida</BigButton>
          </div>
        </div>
      )}
      <Section title="Mesa">
        <Segmented
          label="Jugadores"
          value={jugadores}
          onChange={setJugadores}
          options={[
            { value: "2", label: "Mano a mano" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
            { value: "6", label: "6" },
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
        <Toggle label="Con comodines" detail="Dos comodines que reemplazan cualquier carta" checked={comodines} onChange={setComodines} />
        {comodines && <Toggle label="Un comodín por combinación" detail="No puede haber dos comodines juntos" checked={unComodin} onChange={setUnComodin} />}
        {comodines && (
          <Segmented
            label="Comodín suelto"
            value={suelto}
            onChange={setSuelto}
            options={[
              { value: "50", label: "Vale 50" },
              { value: "25", label: "Vale 25" },
            ]}
          />
        )}
        <Segmented
          label="Mazo"
          value={mazo}
          onChange={setMazo}
          options={[
            { value: "48", label: "48 cartas" },
            { value: "40", label: "40 (sin 8 ni 9)" },
          ]}
        />
        <Segmented
          label="Se corta con"
          value={corte}
          onChange={setCorte}
          options={[
            { value: "5", label: "5 o menos" },
            { value: "7", label: "7 o menos" },
          ]}
        />
        <Toggle label="Reenganche" detail="El que llega a 100 vuelve una vez con el puntaje del que más tiene" checked={reenganche} onChange={setReenganche} />
      </Section>
      <div className="mt-6">
        <BigButton onClick={empezar}>¡A jugar!</BigButton>
      </div>
    </Screen>
  );
}

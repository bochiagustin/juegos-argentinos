import { generala, type GeneralaConfig } from "@juegos-argentinos/engine/generala";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { loadBotMatch, newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented } from "../ui/ui.tsx";

export function GeneralaSetup() {
  const { back, push, replace } = useNav();
  const { save } = useSave();
  const stats = statsDe(save, "generala");
  const nivelAuto = skillForRating(stats.rating);
  const [enCurso] = useState(() => loadBotMatch("generala", () => true));
  const [jugadores, setJugadores] = useState<"2" | "3" | "4" | "5" | "6">("2");
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;

  const empezar = () => {
    const players = Number(jugadores) as GeneralaConfig["players"];
    const m = newBotMatch(generala, { config: { players }, players, botSkill: nivel, adaptativo: modoNivel === "auto", yo: { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar } });
    saveBotMatch(m as never);
    playSfx("dados");
    replace({ name: "generala-mesa" });
  };

  return (
    <Screen title="Generala contra la IA" onBack={back}>
      {enCurso && (
        <div className="cuero cuero-violeta mb-5 rounded-2xl p-4">
          <div className="relative z-[1]">
            <p className="font-black">Tenés una partida a medias</p>
            <p className="mb-3 text-sm text-crema/80">{enCurso.jugadores.length} jugadores</p>
            <BigButton onClick={() => push({ name: "generala-mesa" })}>Seguir la partida</BigButton>
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
            { value: "5", label: "5" },
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
            Juega en nivel <b>{nivelAuto}</b> ({nivelNombre(nivelAuto)}). Cuanto más le ganes, más brava se pone.
          </p>
        ) : (
          <Segmented
            label={`Nivel ${nivelFijo} · ${nivelNombre(nivelFijo)}`}
            value={String(nivelFijo)}
            onChange={(v) => setNivelFijo(Number(v))}
            options={[1, 3, 5, 7, 10].map((n) => ({ value: String(n), label: String(n) }))}
          />
        )}
      </Section>
      <BigButton onClick={empezar}>¡A tirar los dados!</BigButton>
    </Screen>
  );
}

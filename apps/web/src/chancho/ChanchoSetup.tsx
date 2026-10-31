import { chancho, type ChanchoConfig } from "@juegos-argentinos/engine/chancho";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented } from "../ui/ui.tsx";

export function ChanchoSetup() {
  const { back, replace } = useNav();
  const { save } = useSave();
  const nivelAuto = skillForRating(statsDe(save, "chancho").rating);
  const [jugadores, setJugadores] = useState<"3" | "4" | "5" | "6">("4");
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;

  const empezar = () => {
    const players = Number(jugadores) as ChanchoConfig["players"];
    const m = newBotMatch(chancho, { config: { players }, players, botSkill: nivel, adaptativo: modoNivel === "auto", yo: { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar } });
    saveBotMatch(m as never);
    playSfx("repartir");
    replace({ name: "chancho-mesa" });
  };

  return (
    <Screen title="Chancho va" onBack={back}>
      <Section title="Mesa">
        <Segmented
          label="Jugadores"
          value={jugadores}
          onChange={setJugadores}
          options={[
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
            Nivel <b>{nivelAuto}</b> ({nivelNombre(nivelAuto)}): cuanto más alto, más rápido se tocan la nariz.
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
      <BigButton onClick={empezar}>¡Chancho va!</BigButton>
    </Screen>
  );
}

import { DEFAULT_ESCOBA_CONFIG, escoba, type EscobaConfig } from "@juegos-argentinos/engine/escoba";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { loadBotMatch, newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";

export function EscobaSetup() {
  const { back, push, replace } = useNav();
  const { save } = useSave();
  const stats = statsDe(save, "escoba");
  const nivelAuto = skillForRating(stats.rating);
  const [enCurso] = useState(() => loadBotMatch("escoba", () => true));
  const [formato, setFormato] = useState<"2" | "3" | "4" | "parejas">("2");
  const [target, setTarget] = useState<"15" | "21" | "31">("15");
  const [obligatorio, setObligatorio] = useState(DEFAULT_ESCOBA_CONFIG.levantarObligatorio);
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;

  const empezar = () => {
    const players = formato === "parejas" ? 4 : (Number(formato) as 2 | 3 | 4);
    const config: EscobaConfig = { players, parejas: formato === "parejas", target: Number(target) as 15 | 21 | 31, levantarObligatorio: obligatorio };
    const m = newBotMatch(escoba, { config, players, botSkill: nivel, adaptativo: modoNivel === "auto", yo: { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar } });
    saveBotMatch(m as never);
    playSfx("barajar");
    replace({ name: "escoba-mesa" });
  };

  return (
    <Screen title="Escoba contra la IA" onBack={back}>
      {enCurso && (
        <div className="cuero cuero-violeta mb-5 rounded-2xl p-4">
          <div className="relative z-[1]">
            <p className="font-black">Tenés una partida a medias</p>
            <p className="mb-3 text-sm text-crema/80">
              {enCurso.jugadores.length} jugadores{enCurso.carrera ? " · de la gira" : ""}
            </p>
            <BigButton onClick={() => push({ name: "escoba-mesa" })}>Seguir la partida</BigButton>
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
        <Segmented
          label="Puntos"
          value={target}
          onChange={setTarget}
          options={[
            { value: "15", label: "A 15" },
            { value: "21", label: "A 21" },
            { value: "31", label: "A 31" },
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
        <Toggle label="Levantar es obligatorio" detail="Si podés sumar 15, tenés que levantar" checked={obligatorio} onChange={setObligatorio} />
      </Section>
      <div className="mt-6">
        <BigButton onClick={empezar}>¡A jugar!</BigButton>
      </div>
    </Screen>
  );
}

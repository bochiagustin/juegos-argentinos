import { ALFABETO, CATEGORIAS_DE_FABRICA, DEFAULT_TUTTI_CONFIG, tuttiFrutti, type TuttiConfig } from "@juegos-argentinos/engine/tutti-frutti";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { nivelNombre, skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { loadBotMatch, newBotMatch, saveBotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";

export function TuttiSetup() {
  const { back, push, replace } = useNav();
  const { save } = useSave();
  const nivelAuto = skillForRating(statsDe(save, "tutti-frutti").rating);
  const [enCurso] = useState(() => loadBotMatch("tutti-frutti", () => true));
  const [jugadores, setJugadores] = useState<"2" | "3" | "4" | "6">("2");
  const [fin, setFin] = useState<"r3" | "r5" | "r8" | "p300">("r5");
  const [tiempo, setTiempo] = useState<"90" | "120" | "150" | "180">(String(DEFAULT_TUTTI_CONFIG.tiempoMaximo) as "150");
  const [cuenta, setCuenta] = useState<"3" | "4" | "5">(String(DEFAULT_TUTTI_CONFIG.cuentaRegresiva) as "5");
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_DE_FABRICA);
  const [nueva, setNueva] = useState("");
  const [excluidas, setExcluidas] = useState<string[]>(DEFAULT_TUTTI_CONFIG.excluidas);
  const [votacion, setVotacion] = useState(false);
  const [modoNivel, setModoNivel] = useState<"auto" | "fijo">("auto");
  const [nivelFijo, setNivelFijo] = useState(nivelAuto);
  const nivel = modoNivel === "auto" ? nivelAuto : nivelFijo;
  const letrasLibres = ALFABETO.length - excluidas.length;

  const agregar = () => {
    const c = nueva.trim().replace(/\s+/g, " ");
    if (!c || categorias.length >= 15 || categorias.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    playSfx("click");
    setCategorias([...categorias, c.slice(0, 24)]);
    setNueva("");
  };

  const empezar = () => {
    const players = Number(jugadores);
    const config: TuttiConfig = {
      players,
      categorias,
      excluidas,
      cuentaRegresiva: Number(cuenta) as 3 | 4 | 5,
      tiempoMaximo: Number(tiempo),
      fin: fin === "p300" ? { tipo: "puntos", puntos: 300 } : { tipo: "rondas", rondas: Number(fin.slice(1)) },
      votacion,
    };
    const m = newBotMatch(tuttiFrutti, { config, players, botSkill: nivel, adaptativo: modoNivel === "auto", yo: { nombre: save.perfil.apodo || "Vos", avatar: save.perfil.avatar } });
    saveBotMatch(m as never);
    playSfx("barajar");
    replace({ name: "tutti-mesa" });
  };

  return (
    <Screen title="Tutti-Frutti contra la IA" onBack={back}>
      {enCurso && (
        <div className="cuero cuero-violeta mb-5 rounded-2xl p-4">
          <div className="relative z-[1]">
            <p className="font-black">Tenés una partida a medias</p>
            <p className="mb-3 text-sm text-crema/80">
              {enCurso.jugadores.length} jugadores{enCurso.carrera ? " · de la gira" : ""}
            </p>
            <BigButton onClick={() => push({ name: "tutti-mesa" })}>Seguir la partida</BigButton>
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
        <Segmented
          label="Hasta"
          value={fin}
          onChange={setFin}
          options={[
            { value: "r3", label: "3 rondas" },
            { value: "r5", label: "5 rondas" },
            { value: "r8", label: "8 rondas" },
            { value: "p300", label: "300 pts" },
          ]}
        />
        <Segmented
          label="Tiempo por ronda"
          value={tiempo}
          onChange={setTiempo}
          options={[
            { value: "90", label: "1:30" },
            { value: "120", label: "2:00" },
            { value: "150", label: "2:30" },
            { value: "180", label: "3:00" },
          ]}
        />
        <Segmented
          label="Cuenta después del ¡BASTA!"
          value={cuenta}
          onChange={setCuenta}
          options={[
            { value: "3", label: "3 s" },
            { value: "4", label: "4 s" },
            { value: "5", label: "5 s" },
          ]}
        />
      </Section>

      <Section title="Categorías">
        <div className="cuero rounded-2xl p-3">
          <div className="relative z-[1]">
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <span key={c} className="flex items-center gap-1 rounded-full bg-black/35 py-1 pl-3 pr-1 text-sm font-bold">
                  {c}
                  <button
                    aria-label={`Sacar ${c}`}
                    disabled={categorias.length <= 3}
                    onClick={() => setCategorias(categorias.filter((x) => x !== c))}
                    className="grid size-7 place-items-center rounded-full bg-black/40 text-xs disabled:opacity-30"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregar()}
                maxLength={24}
                placeholder="Agregá una (ej. Club de fútbol)"
                aria-label="Nueva categoría"
                className="min-h-11 min-w-0 flex-1 rounded-xl bg-crema px-3 text-tinta placeholder:text-tinta/50"
              />
              <button onClick={agregar} disabled={categorias.length >= 15} className="btn-criollo min-h-11 rounded-xl px-4 font-black disabled:opacity-50">
                <span className="relative z-[1]">+</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-crema/70">Las categorías propias la máquina no las conoce: ahí casi nunca contesta.</p>
          </div>
        </div>
      </Section>

      <Section title="Letras que no salen">
        <div className="cuero rounded-2xl p-3">
          <div className="relative z-[1] grid grid-cols-7 gap-1.5">
            {ALFABETO.map((l) => {
              const fuera = excluidas.includes(l);
              return (
                <button
                  key={l}
                  aria-pressed={fuera}
                  aria-label={`${l}: ${fuera ? "no sale" : "sale"}`}
                  onClick={() => {
                    if (!fuera && letrasLibres <= 3) return;
                    setExcluidas(fuera ? excluidas.filter((x) => x !== l) : [...excluidas, l]);
                  }}
                  className={`min-h-11 rounded-lg font-criolla text-lg ${fuera ? "bg-black/40 text-crema/35 line-through" : "bg-crema text-tinta"}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
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
        <Toggle label="Votar las dudosas" detail="La máquina puede rechazar lo que no conoce (por mayoría)" checked={votacion} onChange={setVotacion} />
      </Section>
      <div className="mt-6">
        <BigButton onClick={empezar}>¡A jugar!</BigButton>
      </div>
    </Screen>
  );
}

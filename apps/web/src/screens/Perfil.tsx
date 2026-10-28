import { useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { useNav } from "../nav.tsx";
import { APODO_MAX, AVATARES, sanitizeApodo } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section } from "../ui/ui.tsx";

export function Perfil({ bienvenida = false }: { bienvenida?: boolean }) {
  const { back, replace } = useNav();
  const { save, update } = useSave();
  const [apodo, setApodo] = useState(save.perfil.apodo);
  const [avatar, setAvatar] = useState(save.perfil.avatar);
  const limpio = sanitizeApodo(apodo);

  const guardar = () => {
    if (!limpio) return;
    update((s) => ({ ...s, perfil: { apodo: limpio, avatar, creado: true } }));
    vibrate(20);
    if (bienvenida) replace({ name: "juegos" });
    else back();
  };

  return (
    <Screen title={bienvenida ? "¡Hola!" : "Tu perfil"} onBack={back}>
      <div className="flex flex-col items-center gap-2">
        <span className="grid size-28 place-items-center rounded-full border-4 border-naranja bg-superficie text-6xl shadow-xl shadow-black/30">{avatar}</span>
        {bienvenida && <p className="text-center text-lg font-bold">Antes de sentarte a la mesa: ¿cómo te dicen?</p>}
      </div>

      <Section title="Apodo">
        <input
          value={apodo}
          onChange={(e) => setApodo(e.target.value.slice(0, APODO_MAX + 4))}
          onKeyDown={(e) => e.key === "Enter" && guardar()}
          placeholder="Ej: El Tano, La Negra, Pocho…"
          maxLength={APODO_MAX + 4}
          autoFocus={bienvenida}
          aria-label="Apodo"
          className="min-h-14 w-full rounded-2xl border border-borde bg-superficie px-4 text-lg font-bold text-texto outline-none placeholder:font-normal placeholder:text-texto-suave/70 focus:border-naranja"
        />
        <p className="text-right text-xs text-texto-suave">
          {limpio.length}/{APODO_MAX}
        </p>
      </Section>

      <Section title="Avatar">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {AVATARES.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAvatar(a);
                playSfx("click");
              }}
              aria-label={`Avatar ${a}`}
              aria-pressed={avatar === a}
              className={`grid aspect-square place-items-center rounded-2xl border-2 text-4xl transition ${avatar === a ? "border-naranja bg-naranja/15" : "border-borde bg-superficie"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </Section>

      <div className="mt-6">
        <BigButton onClick={guardar} disabled={!limpio}>
          {bienvenida ? "¡A la mesa!" : "Guardar"}
        </BigButton>
      </div>
    </Screen>
  );
}

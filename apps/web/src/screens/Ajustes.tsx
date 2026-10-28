import { useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { DECKS } from "../cards/decks.ts";
import { useNav } from "../nav.tsx";
import type { Tema } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";

const TEMAS: readonly { value: Tema; label: string }[] = [
  { value: "pano", label: "Paño" },
  { value: "claro", label: "Claro" },
  { value: "auto", label: "Automático" },
];

export function Ajustes() {
  const { back, push } = useNav();
  const { save, update, reset } = useSave();
  const [confirmando, setConfirmando] = useState(false);
  const set = <K extends keyof typeof save.ajustes>(key: K, value: (typeof save.ajustes)[K]) =>
    update((s) => ({ ...s, ajustes: { ...s.ajustes, [key]: value } }));

  return (
    <Screen title="Ajustes" onBack={back} tab="ajustes">
      <Section title="Sonido">
        <Toggle
          label="Sonidos"
          detail="Barajar, repartir, tirar carta, cantos"
          checked={save.ajustes.sonido}
          onChange={(v) => {
            set("sonido", v);
            if (v) setTimeout(() => playSfx("repartir"), 0);
          }}
        />
        <Toggle
          label="Vibración"
          detail="Te avisa cuando es tu turno"
          checked={save.ajustes.vibracion}
          onChange={(v) => {
            set("vibracion", v);
            if (v) setTimeout(() => vibrate([30, 60, 30]), 0);
          }}
        />
      </Section>

      <Section title="Mesa">
        <Segmented label="Tema" value={save.ajustes.tema} options={TEMAS} onChange={(v) => set("tema", v)} />
        <button
          onClick={() => {
            playSfx("click");
            push({ name: "mazos" });
          }}
          className="cuero flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
        >
          <span className="relative z-[1] flex-1">
            <span className="block font-bold">Mazo</span>
            <span className="block text-sm text-crema/75">{DECKS[save.ajustes.mazo].nombre}</span>
          </span>
          <span className="bronce relative z-[1] grid size-9 place-items-center rounded-full text-xl font-black">›</span>
        </button>
      </Section>

      <Section title="Datos">
        {confirmando ? (
          <div className="cuero cuero-rojo rounded-2xl p-4"><div className="relative z-[1]">
            <p className="mb-3 font-bold">¿Seguro? Se borran tu perfil y tus ajustes de este dispositivo.</p>
            <div className="grid grid-cols-2 gap-2">
              <BigButton variant="secundario" onClick={() => setConfirmando(false)}>
                Mejor no
              </BigButton>
              <button
                onClick={() => {
                  reset();
                  setConfirmando(false);
                  playSfx("barajar");
                }}
                className="min-h-14 rounded-2xl bg-red-600 px-4 text-lg font-black text-white"
              >
                Borrar
              </button>
            </div>
          </div></div>
        ) : (
          <BigButton variant="secundario" onClick={() => setConfirmando(true)}>
            Borrar mis datos
          </BigButton>
        )}
      </Section>

      <p className="mt-8 text-center text-xs text-texto-suave">Juegos Argentinos · versión {__APP_VERSION__} · hecho con 🧉</p>
    </Screen>
  );
}

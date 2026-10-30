import { useState } from "react";
import { guardarServidor, servidorSalas } from "../online/conexion.ts";
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
  const [servidor, setServidor] = useState(() => servidorSalas() ?? "");
  const [servidorOk, setServidorOk] = useState(false);
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

      <Section title="Accesibilidad">
        <Toggle label="Menos animaciones" detail="Cartas y carteles sin tanto movimiento" checked={save.ajustes.menosAnimaciones} onChange={(v) => set("menosAnimaciones", v)} />
        <Toggle label="Letra más grande" detail="Agranda todos los textos" checked={save.ajustes.textoGrande} onChange={(v) => set("textoGrande", v)} />
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

      <Section title="Online">
        <div className="cuero rounded-2xl p-3">
          <label className="relative z-[1] block">
            <span className="mb-1 block font-bold">Servidor de salas</span>
            <span className="mb-2 block text-sm text-crema/75">Para jugar con amigos. Ej.: wss://juegos-argentinos-salas.tucuenta.workers.dev</span>
            <span className="flex gap-2">
              <input
                value={servidor}
                onChange={(e) => {
                  setServidor(e.target.value);
                  setServidorOk(false);
                }}
                placeholder="wss://…"
                inputMode="url"
                autoCapitalize="off"
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 rounded-xl bg-crema px-3 text-sm text-tinta placeholder:text-tinta/40"
              />
              <button
                className="btn-criollo min-h-11 rounded-xl px-3 font-black"
                onClick={() => {
                  guardarServidor(servidor);
                  setServidorOk(true);
                  playSfx("click");
                }}
              >
                <span className="relative z-[1]">{servidorOk ? "✔" : "Guardar"}</span>
              </button>
            </span>
          </label>
        </div>
      </Section>

      <Section title="Tutti-Frutti: palabras reportadas">
        {save.reportadas.length === 0 ? (
          <p className="px-1 text-sm text-crema/75">Cuando el diccionario te rechace una palabra que está bien, reportala desde el resumen de la ronda. Valen desde ese momento en este dispositivo.</p>
        ) : (
          <div className="cuero rounded-2xl p-3">
            <ul className="relative z-[1] flex max-h-56 flex-col gap-1 overflow-y-auto text-sm">
              {[...save.reportadas].reverse().map((r) => (
                <li key={`${r.categoria}|${r.palabra}`} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-black">{r.palabra}</span> <span className="text-crema/70">· {r.categoria}</span>
                  </span>
                  <span className="shrink-0 text-xs text-crema/70">{r.enviada ? "Enviada ✓" : "Sin enviar"}</span>
                  <button
                    aria-label={`Sacar ${r.palabra}`}
                    onClick={() => update((s) => ({ ...s, reportadas: s.reportadas.filter((x) => x !== r) }))}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-black/35 text-sm"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                const texto = save.reportadas.map((r) => `${r.categoria}: ${r.palabra} (${r.letra})`).join("\n");
                void navigator.clipboard?.writeText(texto).then(() => playSfx("click"), () => playSfx("error"));
              }}
              className="boton boton-cuero relative z-[1] mt-2 min-h-11 w-full rounded-xl"
            >
              Copiar la lista
            </button>
          </div>
        )}
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

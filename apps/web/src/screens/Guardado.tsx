import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { useNav } from "../nav.tsx";
import { aplicarRespaldo, armarRespaldo, CLAVE_ULTIMO_RESPALDO, leerRespaldo, nombreArchivo, resumenActual, type Respaldo, type ResumenRespaldo } from "../save/respaldo.ts";
import { useSave } from "../save/SaveContext.tsx";
import { FosforoIcono, Modal } from "../ui/Modal.tsx";
import { BigButton, Screen, Section } from "../ui/ui.tsx";

/** Cuándo se guardó la última copia (ms), o null. */
export function ultimoRespaldo(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_ULTIMO_RESPALDO));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Hay progreso que valga la pena y no se guardó copia en la última semana. */
export function conviene(partidasJugadas: number): boolean {
  const u = ultimoRespaldo();
  return partidasJugadas > 0 && (u === null || Date.now() - u > 7 * 86_400_000);
}

function haceCuanto(ms: number): string {
  const dias = Math.floor((Date.now() - ms) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function fechaLinda(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "fecha desconocida" : d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function Resumen({ r }: { r: ResumenRespaldo }) {
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm">
      <li className="rounded-xl bg-black/25 px-3 py-2">
        <span className="block text-[11px] font-bold uppercase text-crema/60">Apodo</span>
        <b>{r.apodo || "—"}</b>
      </li>
      <li className="rounded-xl bg-black/25 px-3 py-2">
        <span className="block text-[11px] font-bold uppercase text-crema/60">Fósforos</span>
        <b className="inline-flex items-center gap-1">
          <FosforoIcono /> {r.fosforos}
        </b>
      </li>
      <li className="rounded-xl bg-black/25 px-3 py-2">
        <span className="block text-[11px] font-bold uppercase text-crema/60">Partidas jugadas</span>
        <b>{r.partidas}</b>
      </li>
      <li className="rounded-xl bg-black/25 px-3 py-2">
        <span className="block text-[11px] font-bold uppercase text-crema/60">Logros</span>
        <b>{r.logros}</b>
      </li>
    </ul>
  );
}

/**
 * Guardar y cargar el progreso. El juego guarda solo en este dispositivo después de cada partida; acá se hace una copia
 * en un archivo (para Drive, WhatsApp, mail…) y se recupera en este u otro teléfono.
 */
export function Guardado() {
  const { back } = useNav();
  const { save } = useSave();
  const [ultimo, setUltimo] = useState(ultimoRespaldo);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aCargar, setACargar] = useState<{ respaldo: Respaldo; resumen: ResumenRespaldo } | null>(null);
  const [texto, setTexto] = useState("");
  const archivo = useRef<HTMLInputElement>(null);
  const actual = resumenActual(save);

  // Que el navegador no borre los datos solo cuando le falta lugar.
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => {});
  }, []);

  const marcar = () => {
    try {
      localStorage.setItem(CLAVE_ULTIMO_RESPALDO, String(Date.now()));
    } catch {
      // Sin storage: igual la copia ya está hecha.
    }
    setUltimo(Date.now());
  };

  const contenido = () => {
    const ahora = new Date();
    return { texto: JSON.stringify(armarRespaldo(localStorage, ahora)), nombre: nombreArchivo(ahora) };
  };

  const guardar = async () => {
    setError(null);
    playSfx("click");
    const { texto: json, nombre } = contenido();
    const file = new File([json], nombre, { type: "application/json" });
    // En el celu: compartir el archivo (Drive, WhatsApp, mail…). Si no se puede, se descarga.
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mi progreso de Juegos Argentinos" });
        marcar();
        setAviso("¡Copia guardada! Guardala en un lugar seguro, como Drive o un chat con vos mismo.");
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    marcar();
    setAviso(`¡Copia guardada! Quedó en tus descargas como "${nombre}".`);
  };

  const copiarTexto = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(contenido().texto);
      marcar();
      setAviso("Copiaste tu progreso como texto. Pegalo en un chat con vos mismo o en una nota para guardarlo.");
    } catch {
      setError("No se pudo copiar. Probá con «Guardar copia».");
    }
  };

  const revisar = (t: string) => {
    const r = leerRespaldo(t.trim());
    if (!r.ok) {
      playSfx("error");
      setError(r.error);
      return;
    }
    setError(null);
    setACargar({ respaldo: r.respaldo, resumen: r.resumen });
  };

  const elegirArchivo = async (f: File | undefined) => {
    if (!f) return;
    revisar(await f.text());
    if (archivo.current) archivo.current.value = "";
  };

  const confirmar = () => {
    if (!aCargar) return;
    try {
      aplicarRespaldo(localStorage, aCargar.respaldo);
    } catch {
      setError("No se pudo cargar la copia en este dispositivo.");
      return;
    }
    playSfx("ganar");
    // Se vuelve a abrir la app con el progreso recuperado.
    window.location.replace(window.location.pathname);
  };

  return (
    <Screen title="Guardar progreso" onBack={back}>
      <div className="cuero cuero-verde rounded-2xl p-4">
        <div className="relative z-[1] text-sm">
          <p>
            Tu progreso se guarda <b>solo en este celu</b> después de cada partida. Si borrás los datos del navegador o cambiás de teléfono, se pierde. Para que no
            pase, <b>guardá una copia</b> y tenela en un lugar seguro.
          </p>
          <p className="mt-2 font-bold text-crema/90">Última copia: {ultimo ? haceCuanto(ultimo) : "nunca"}</p>
        </div>
      </div>

      <Section title="Lo que tenés ahora">
        <Resumen r={actual} />
      </Section>

      <Section title="Guardar una copia">
        <BigButton onClick={guardar}>💾 Guardar copia</BigButton>
        <button className="boton boton-cuero min-h-12 w-full rounded-xl" onClick={copiarTexto}>
          Copiar como texto
        </button>
        <p className="px-1 text-xs text-crema/70">En el celu se abre para mandarla a Drive, WhatsApp o mail. En la compu se descarga un archivo.</p>
      </Section>

      <Section title="Cargar una copia">
        <input ref={archivo} type="file" accept=".json,application/json,text/plain" className="hidden" onChange={(e) => void elegirArchivo(e.target.files?.[0])} />
        <BigButton variant="secundario" onClick={() => archivo.current?.click()}>
          📂 Elegir el archivo
        </BigButton>
        <details className="rounded-xl bg-black/20 px-3 py-2">
          <summary className="cursor-pointer text-sm font-bold">La tengo como texto</summary>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Pegá acá el texto de tu copia"
            aria-label="Texto de la copia"
            className="mt-2 w-full rounded-xl border border-borde bg-superficie p-2 text-xs text-texto"
          />
          <button className="boton boton-cuero mt-2 min-h-11 w-full rounded-xl" disabled={!texto.trim()} onClick={() => revisar(texto)}>
            Revisar la copia
          </button>
        </details>
      </Section>

      {aviso && (
        <p role="status" className="mt-4 rounded-xl bg-pano/70 px-4 py-3 text-sm font-bold">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-900/70 px-4 py-3 text-sm font-bold">
          {error}
        </p>
      )}

      <AnimatePresence>
        {aCargar && (
          <Modal key="cargar" onClose={() => setACargar(null)}>
            <h2 className="titulo-criollo mb-2 text-center text-3xl">¿Cargar esta copia?</h2>
            <p className="mb-3 text-center text-sm text-crema/80">Copia del {fechaLinda(aCargar.resumen.fecha)}</p>
            <Resumen r={aCargar.resumen} />
            <p className="my-3 rounded-xl bg-red-900/50 px-3 py-2 text-sm">Lo que tenés ahora en este dispositivo se reemplaza por la copia.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="boton boton-cuero min-h-12 rounded-xl" onClick={() => setACargar(null)}>
                Mejor no
              </button>
              <button className="boton boton-verde min-h-12 rounded-xl font-black" onClick={confirmar}>
                Cargar
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </Screen>
  );
}

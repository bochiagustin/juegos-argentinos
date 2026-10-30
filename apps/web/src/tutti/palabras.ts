import { usarLexico, usarPalabrasPropias } from "@juegos-argentinos/engine/tutti-frutti";
import type { PalabraReportada, Save } from "../save/save.ts";
import { servidorSalas } from "../online/conexion.ts";

/**
 * Las palabras del tutti-frutti que no vienen en el motor: el léxico general del castellano para "Cosa"
 * (public/tutti/palabras.txt, ~180 mil palabras; se baja una vez y queda en caché) y las que reportó el jugador.
 */
let cargando: Promise<void> | null = null;

export function cargarLexico(): Promise<void> {
  cargando ??= fetch(`${import.meta.env.BASE_URL}tutti/palabras.txt`)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((t) => usarLexico(t.split("\n")))
    .catch(() => {
      // Sin léxico, "Cosa" acepta lo que no conoce como dudoso (como antes). Se reintenta la próxima vez.
      cargando = null;
    });
  return cargando;
}

/** Las reportadas valen en este dispositivo. */
export function aplicarPropias(reportadas: readonly PalabraReportada[]): void {
  usarPalabrasPropias(reportadas);
}

/** La URL http(s) del servidor de salas (de donde sale el ws://), o null si no hay servidor. */
function servidorHttp(): string | null {
  const ws = servidorSalas();
  return ws ? ws.replace(/^ws(s?):/, "http$1:").replace(/\/+$/, "") : null;
}

/** Manda al servidor las reportadas que todavía no llegaron. Devuelve cuáles se mandaron bien. */
export async function enviarReportes(reportadas: readonly PalabraReportada[]): Promise<PalabraReportada[]> {
  const base = servidorHttp();
  const pendientes = reportadas.filter((r) => !r.enviada);
  if (!base || pendientes.length === 0) return [];
  try {
    const res = await fetch(`${base}/reportes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pendientes.map(({ categoria, palabra, letra }) => ({ categoria, palabra, letra }))),
    });
    return res.ok ? pendientes : [];
  } catch {
    return [];
  }
}

/** Reporta una palabra: queda guardada (y vale desde ya en este dispositivo) y se intenta mandar. */
export function reportarPalabra(update: (fn: (s: Save) => Save) => void, r: { categoria: string; palabra: string; letra: string }): void {
  const nueva: PalabraReportada = { ...r, palabra: r.palabra.trim(), fecha: Date.now(), enviada: false };
  update((s) => (s.reportadas.some((x) => x.categoria === r.categoria && x.palabra.toLowerCase() === nueva.palabra.toLowerCase()) ? s : { ...s, reportadas: [...s.reportadas, nueva] }));
  void enviarReportes([nueva]).then((ok) => {
    if (ok.length) update((s) => ({ ...s, reportadas: s.reportadas.map((x) => (x.categoria === nueva.categoria && x.palabra === nueva.palabra ? { ...x, enviada: true } : x)) }));
  });
}

/** Reintenta mandar las que quedaron sin enviar (ej. se reportaron sin internet). */
export function reintentarReportes(save: Save, update: (fn: (s: Save) => Save) => void): void {
  void enviarReportes(save.reportadas).then((ok) => {
    if (!ok.length) return;
    const claves = new Set(ok.map((x) => `${x.categoria}|${x.palabra}`));
    update((s) => ({ ...s, reportadas: s.reportadas.map((x) => (claves.has(`${x.categoria}|${x.palabra}`) ? { ...x, enviada: true } : x)) }));
  });
}

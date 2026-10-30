import { FONDO_INICIAL, FONDOS, fondoDesbloqueado, type FondoDef } from "@juegos-argentinos/career";
import { Art } from "../art/Art.tsx";
import type { ArtId } from "../art/manifest.ts";
import type { Save } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";

/** Fondos que ya tienen imagen en `public/arte/fondos/` (los demás aparecen como "Próximamente"). */
export const FONDOS_CON_IMAGEN = new Set(["boliche", "patio", "bodegon", "bodega", "litoral", "pena", "puerto", "fogon", "quincho", "estancia", "costa", "refugio", "cataratas", "vereda", "cafe"]);

export const fondoListo = (f: FondoDef) => FONDOS_CON_IMAGEN.has(f.id);

/** El fondo que se usa: el elegido, si está desbloqueado y tiene imagen; si no, el boliche. */
export function fondoEnUso(save: Save): string {
  const f = FONDOS.find((x) => x.id === save.ajustes.fondo);
  return f && fondoListo(f) && fondoDesbloqueado(save.carrera, f) ? f.id : FONDO_INICIAL;
}

/**
 * El fondo detrás de la mesa. En el celu usa la versión vertical; si todavía no está, recorta la horizontal.
 * Encima va una capa oscura suave para que la mesa y los textos se lean.
 */
export function FondoMesa({ id }: { id?: string }) {
  const { save } = useSave();
  const f = id ?? fondoEnUso(save);
  const horizontal = <Art id={`fondo-${f}-horizontal` as ArtId} className="size-full object-cover" fallback={<></>} />;
  return (
    // Detrás de todo lo de la mesa (la pantalla que lo usa tiene que ser `isolate`).
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 landscape:hidden">
        <Art id={`fondo-${f}-vertical` as ArtId} className="size-full object-cover" fallback={horizontal} />
      </div>
      <div className="absolute inset-0 hidden landscape:block">{horizontal}</div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(0_0_0/0.05),rgb(0_0_0/0.45))]" />
    </div>
  );
}

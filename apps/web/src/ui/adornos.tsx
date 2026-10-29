/**
 * Adornos criollos dibujados en SVG (sin imágenes): Sol de Mayo, banderitas, cinta celeste y blanca,
 * volutas de filete, el mate de respaldo y los íconos de los botones de canto.
 */
import { useId } from "react";

/** Sol de Mayo con cara, para el centro del marcador. */
export function SolDeMayo({ className = "size-12" }: { className?: string }) {
  const id = useId();
  const rayos = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-o`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset="0.55" stopColor="#f4b72c" />
          <stop offset="1" stopColor="#b8770c" />
        </radialGradient>
      </defs>
      {rayos.map((a, i) => (
        <path
          key={a}
          transform={`rotate(${a} 32 32)`}
          d={i % 2 ? "M32 2 C30 8 34 10 32 16" : "M32 1 L35 15 L29 15 Z"}
          fill={i % 2 ? "none" : `url(#${id}-o)`}
          stroke={i % 2 ? "#d99a1c" : "#8a5508"}
          strokeWidth={i % 2 ? 2 : 0.8}
          strokeLinecap="round"
        />
      ))}
      <circle cx="32" cy="32" r="15" fill={`url(#${id}-o)`} stroke="#8a5508" strokeWidth="1.2" />
      <g fill="none" stroke="#7a4a06" strokeWidth="1.3" strokeLinecap="round">
        <path d="M25.5 29 q2.5 -2 5 0 M33.5 29 q2.5 -2 5 0" />
        <path d="M32 30 v5 q-1.5 1 -1 2" />
        <path d="M27.5 38.5 q4.5 3 9 0" />
      </g>
      <circle cx="28" cy="31" r="1.1" fill="#7a4a06" />
      <circle cx="36" cy="31" r="1.1" fill="#7a4a06" />
    </svg>
  );
}

/** Banderita argentina flameando, en un mástil chico. */
export function Banderita({ className = "h-8 w-7", espejo = false }: { className?: string; espejo?: boolean }) {
  return (
    <svg viewBox="0 0 28 32" className={className} style={espejo ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <line x1="3" y1="2" x2="3" y2="31" stroke="#c9962e" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="3" cy="2.5" r="2" fill="#f2c94c" stroke="#7a5410" strokeWidth="0.6" />
      <path d="M4 4 C11 2 17 7 26 5 L26 21 C17 23 11 18 4 20 Z" fill="#fff" stroke="#24476e" strokeWidth="0.8" />
      <path d="M4 4 C11 2 17 7 26 5 L26 10.3 C17 12.3 11 7.3 4 9.3 Z" fill="#74acdf" />
      <path d="M4 14.7 C11 12.7 17 17.7 26 15.7 L26 21 C17 23 11 18 4 20 Z" fill="#74acdf" />
      <circle cx="15" cy="12.4" r="2.1" fill="#f6b40e" stroke="#85340a" strokeWidth="0.5" />
    </svg>
  );
}

/** Cinta celeste y blanca para una esquina de la mesa (arriba a la izquierda; rotarla para las otras). */
export function CintaEsquina({ className = "size-16", rotar = 0 }: { className?: string; rotar?: number }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={{ rotate: `${rotar}deg` }} aria-hidden>
      <path d="M2 30 C14 26 26 14 30 2 L40 2 C35 20 20 35 2 40 Z" fill="#74acdf" stroke="#1d4f86" strokeWidth="0.8" />
      <path d="M2 34 C17 30 30 17 34 2 L36.5 2 C32 19 19 32 2 36.5 Z" fill="#fff" />
    </svg>
  );
}

/** Voluta de filete para los costados de un texto. */
export function VolutaTexto({ className = "h-4 w-10", espejo = false }: { className?: string; espejo?: boolean }) {
  return (
    <svg viewBox="0 0 40 16" className={className} style={espejo ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <path d="M2 8 H22 C26 8 28 4 32 4 C36 4 38 8 35 11 C33 13 30 11 31 9" fill="none" stroke="#e8c27a" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="2.5" cy="8" r="1.6" fill="#e8c27a" />
    </svg>
  );
}

/** Mate con bombilla (de respaldo hasta que llegue la ilustración). */
export function MateDibujo({ className = "size-20" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-c`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#a8693a" />
          <stop offset="0.6" stopColor="#6b3d1c" />
          <stop offset="1" stopColor="#3a1f0c" />
        </radialGradient>
        <linearGradient id={`${id}-b`} x1="0" x2="1">
          <stop offset="0" stopColor="#f1f1f1" />
          <stop offset="0.5" stopColor="#b9b9b9" />
          <stop offset="1" stopColor="#7d7d7d" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="74" rx="22" ry="4" fill="rgb(0 0 0 / 0.35)" />
      <line x1="44" y1="36" x2="64" y2="4" stroke={`url(#${id}-b)`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M16 36 C12 56 22 72 40 72 C58 72 68 56 64 36 Z" fill={`url(#${id}-c)`} stroke="#2a1608" strokeWidth="1.2" />
      <ellipse cx="40" cy="36" rx="24" ry="6" fill="#c9a24a" stroke="#6b4b12" strokeWidth="1.5" />
      <ellipse cx="40" cy="36" rx="19.5" ry="4" fill="#5f7a2a" />
      <path d="M26 35 q3 -2 6 0 M38 34 q3 -2 6 0 M48 35 q3 -2 6 0" stroke="#8aa63c" strokeWidth="1.2" fill="none" />
      <path d="M22 46 C24 56 30 62 38 64" stroke="rgb(255 220 180 / 0.35)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="54" r="5.5" fill="none" stroke="#c9a24a" strokeWidth="1.2" />
    </svg>
  );
}

/** Un fósforo de mesa: palito de madera con cabeza roja. */
function Fosforo({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4a2e14" strokeWidth={4} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f0d49a" strokeWidth={2.4} />
      <circle cx={x2} cy={y2} r={3} fill="#c0392b" stroke="#4d140c" strokeWidth={0.9} />
      <circle cx={x2 - 0.9} cy={y2 - 0.9} r={0.9} fill="#ff9a86" />
    </g>
  );
}

const PALITOS = [
  { x1: 4, y1: 24, x2: 4, y2: 4 },
  { x1: 4, y1: 4, x2: 24, y2: 4 },
  { x1: 24, y1: 4, x2: 24, y2: 24 },
  { x1: 24, y1: 24, x2: 4, y2: 24 },
  { x1: 4, y1: 24, x2: 24, y2: 4 },
];

/** Un cuadradito de hasta 5 fósforos: cuatro haciendo el cuadrado y el quinto cruzado. */
export function GrupoFosforos({ n, className = "size-7" }: { n: number; className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      {n === 0 && <rect x="4" y="4" width="20" height="20" rx="2" fill="none" stroke="rgb(255 236 200 / 0.14)" strokeWidth="1.2" strokeDasharray="2 3" />}
      {PALITOS.slice(0, n).map((s, i) => (
        <Fosforo key={i} {...s} />
      ))}
    </svg>
  );
}

// ───────────────────────────── íconos de los botones ─────────────────────────────

export type IconoCanto = "sombrero" | "copa" | "corona" | "rosa" | "flor" | "mazo" | "si" | "no";

/** Íconos de trazo claro para los botones de canto (heredan el color del texto). */
export function Icono({ tipo, className = "size-5" }: { tipo: IconoCanto; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {tipo === "sombrero" && (
        <>
          <path d="M2.5 15.5 C6 18.5 18 18.5 21.5 15.5 C19 14.8 17.5 14.6 17 14 L16 7.5 C14 6 10 6 8 7.5 L7 14 C6.5 14.6 5 14.8 2.5 15.5 Z" {...p} fill="currentColor" fillOpacity={0.25} />
          <path d="M7.4 11.5 C10 12.5 14 12.5 16.6 11.5" {...p} />
        </>
      )}
      {tipo === "copa" && (
        <>
          <path d="M6 4 H18 C18 10 15.5 12.5 12 12.5 C8.5 12.5 6 10 6 4 Z" {...p} fill="currentColor" fillOpacity={0.25} />
          <path d="M12 12.5 V18 M8 20.5 H16 M9.5 18 H14.5" {...p} />
        </>
      )}
      {tipo === "corona" && (
        <>
          <path d="M3.5 18 L2.5 7.5 L8 11.5 L12 5 L16 11.5 L21.5 7.5 L20.5 18 Z" {...p} fill="currentColor" fillOpacity={0.25} />
          <path d="M4 20.5 H20" {...p} />
        </>
      )}
      {tipo === "rosa" && (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M12 4.5 L14 12 L12 19.5 L10 12 Z" {...p} fill="currentColor" fillOpacity={0.35} />
          <path d="M4.5 12 L12 10 L19.5 12 L12 14 Z" {...p} />
        </>
      )}
      {tipo === "flor" && (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="12" cy="7" rx="3" ry="4.2" transform={`rotate(${a} 12 12)`} {...p} fill="currentColor" fillOpacity={0.2} />
          ))}
          <circle cx="12" cy="12" r="2.2" {...p} fill="currentColor" />
        </>
      )}
      {tipo === "mazo" && (
        <>
          <rect x="7" y="3.5" width="11" height="15" rx="1.8" transform="rotate(10 12 11)" {...p} />
          <rect x="5" y="5" width="11" height="15" rx="1.8" transform="rotate(-6 10 12)" {...p} fill="currentColor" fillOpacity={0.2} />
        </>
      )}
      {tipo === "si" && <path d="M4.5 12.5 L10 18 L19.5 6.5" {...p} strokeWidth={2.6} />}
      {tipo === "no" && <path d="M6 6 L18 18 M18 6 L6 18" {...p} strokeWidth={2.6} />}
    </svg>
  );
}

import type { EstadoRegion, RegionId } from "@juegos-argentinos/career";
import { useState } from "react";
import { ART, artUrl } from "../art/manifest.ts";

/**
 * Mapa de la Gira Nacional: el mapa ilustrado del usuario (arte/mapa/base) con un medallón tocable por región.
 * Si la imagen no carga, cae al mapa dibujado en código (estilizado, no cartográfico).
 */
export function MapaGira(props: { regiones: EstadoRegion[]; seleccion: RegionId; onSelect: (id: RegionId) => void }) {
  const [falla, setFalla] = useState(false);
  return falla ? <MapaDibujado {...props} /> : <MapaIlustrado {...props} onFalla={() => setFalla(true)} />;
}

/** Dónde va el medallón de cada región sobre la ilustración (en píxeles de la imagen). */
const PINES: Record<RegionId, { x: number; y: number }> = {
  norte: { x: 380, y: 400 },
  mesopotamia: { x: 590, y: 540 },
  cuyo: { x: 290, y: 760 },
  "buenos-aires": { x: 520, y: 860 },
  patagonia: { x: 280, y: 1260 },
  malvinas: { x: 590, y: 1420 },
};

function MapaIlustrado({ regiones, seleccion, onSelect, onFalla }: { regiones: EstadoRegion[]; seleccion: RegionId; onSelect: (id: RegionId) => void; onFalla: () => void }) {
  const { width: W, height: H } = ART["mapa-base"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Mapa de la gira">
      <image href={artUrl("mapa-base")} width={W} height={H} onError={onFalla} />
      {regiones.map((r) => {
        const sel = r.id === seleccion;
        const p = PINES[r.id];
        const color = r.completa ? "#e6b13a" : r.abierta ? "#2f7d4a" : "#4a3a2c";
        return (
          <g
            key={r.id}
            role="button"
            tabIndex={0}
            aria-label={`${r.nombre}${r.abierta ? "" : " (bloqueada)"}`}
            aria-pressed={sel}
            onClick={() => onSelect(r.id)}
            onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(r.id)}
            className="cursor-pointer outline-none"
            transform={`translate(${p.x} ${p.y})`}
          >
            {sel && <circle r="70" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="14 10" opacity="0.95" />}
            <circle r="52" fill="rgb(0 0 0 / 0.35)" transform="translate(4 6)" />
            <circle r="52" fill={color} stroke={sel ? "#f59e0b" : "#e8c27a"} strokeWidth={sel ? 9 : 6} />
            <circle r="42" fill="none" stroke="rgb(255 240 200 / 0.35)" strokeWidth="2" />
            <text y={r.abierta && !r.completa ? 13 : 16} textAnchor="middle" fontSize={r.abierta && !r.completa ? 36 : 44} fill="#fbf6ea" fontWeight="900" fontFamily="Nunito Variable, sans-serif">
              {r.completa ? "⭐" : r.abierta ? `#${r.miPuesto}` : "🔒"}
            </text>
            <g transform="translate(0 84)">
              <rect x={-r.nombre.length * 13 - 20} y="-26" width={r.nombre.length * 26 + 40} height="44" rx="10" fill="#1f160f" opacity="0.9" stroke="#e8c27a" strokeWidth="2" />
              <text y="8" textAnchor="middle" fontSize="26" fill="#fbf6ea" fontFamily="Rye, serif">
                {r.nombre.toUpperCase()}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
const FORMAS: Record<RegionId, string[]> = {
  norte: ["M118,30 L170,22 L232,30 L252,58 L246,118 L238,170 L226,236 L112,236 L104,170 L98,110 Z"],
  mesopotamia: ["M246,118 L276,96 L312,64 L342,52 L346,80 L326,120 L304,164 L292,214 L276,252 L250,262 L232,246 L226,236 L238,170 Z"],
  "buenos-aires": ["M170,236 L226,236 L250,262 L276,252 L300,296 L326,330 L318,372 L292,404 L248,424 L206,430 L172,420 L168,340 Z"],
  cuyo: ["M104,236 L170,236 L168,340 L172,420 L132,424 L96,420 L90,330 L98,280 Z"],
  patagonia: [
    "M96,420 L132,424 L172,420 L206,430 L230,446 L226,476 L196,500 L198,540 L176,560 L184,606 L160,640 L166,690 L146,720 L150,770 L132,800 L120,820 L106,790 L104,720 L98,640 L92,560 L88,480 Z",
    "M128,836 L170,840 L190,856 L160,868 L132,858 Z",
  ],
  malvinas: ["M262,792 C272,780 292,782 296,794 C292,806 274,810 262,802 Z", "M302,790 C314,778 334,784 336,796 C330,810 310,810 302,800 Z"],
};

const ETIQUETA: Record<RegionId, { x: number; y: number }> = {
  norte: { x: 172, y: 128 },
  mesopotamia: { x: 300, y: 150 },
  "buenos-aires": { x: 246, y: 336 },
  cuyo: { x: 132, y: 318 },
  patagonia: { x: 146, y: 600 },
  malvinas: { x: 300, y: 762 },
};

function MapaDibujado({ regiones, seleccion, onSelect }: { regiones: EstadoRegion[]; seleccion: RegionId; onSelect: (id: RegionId) => void }) {
  return (
    <svg viewBox="0 0 400 900" className="h-auto w-full" role="group" aria-label="Mapa de la gira">
      <defs>
        <linearGradient id="mar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9cfae" />
          <stop offset="0.55" stopColor="#c9d4c6" />
          <stop offset="1" stopColor="#9fbfc4" />
        </linearGradient>
      </defs>
      <rect width="400" height="900" fill="url(#mar)" />
      <image href={`${import.meta.env.BASE_URL}texturas/papel.webp`} width="400" height="900" preserveAspectRatio="none" opacity="0.55" style={{ mixBlendMode: "multiply" }} />
      {/* rosa de los vientos */}
      <g transform="translate(330 860)" stroke="#3b2a1a" fill="none" opacity="0.7">
        <circle r="22" />
        <path d="M0,-30 L5,0 L0,30 L-5,0 Z M-30,0 L0,5 L30,0 L0,-5 Z" fill="#3b2a1a" />
        <text y="-34" textAnchor="middle" fontSize="12" fill="#3b2a1a" stroke="none" fontFamily="Rye, serif">
          N
        </text>
      </g>
      <text x="300" y="470" textAnchor="middle" fontSize="13" fill="#3b4a5a" fontStyle="italic" fontFamily="Fraunces Variable, serif" opacity="0.8">
        Mar Argentino
      </text>
      {regiones.map((r) => {
        const sel = r.id === seleccion;
        const fill = r.completa ? "#e6c45c" : r.abierta ? "#9fbf6a" : "#d6ccb8";
        const e = ETIQUETA[r.id];
        return (
          <g
            key={r.id}
            role="button"
            tabIndex={0}
            aria-label={`${r.nombre}${r.abierta ? "" : " (bloqueada)"}`}
            aria-pressed={sel}
            onClick={() => onSelect(r.id)}
            onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(r.id)}
            className="cursor-pointer outline-none"
          >
            {FORMAS[r.id].map((d, i) => (
              <path key={i} d={d} fill={fill} stroke={sel ? "#f59e0b" : "#4a3420"} strokeWidth={sel ? 5 : 2.5} strokeLinejoin="round" opacity={r.abierta ? 1 : 0.85} />
            ))}
            <g transform={`translate(${e.x} ${e.y})`}>
              <rect x="-58" y="-15" width="116" height="26" rx="4" fill="#1f160f" opacity="0.88" />
              <text y="4" textAnchor="middle" fontSize="13" fill="#fbf6ea" fontFamily="Rye, serif">
                {r.nombre.toUpperCase()}
              </text>
              {r.completa ? (
                <text y="34" textAnchor="middle" fontSize="20">
                  ⭐
                </text>
              ) : !r.abierta ? (
                <>
                  <circle cy="34" r="13" fill="#3b2a1a" />
                  <text y="40" textAnchor="middle" fontSize="15">
                    🔒
                  </text>
                </>
              ) : (
                <text y="34" textAnchor="middle" fontSize="12" fill="#1f160f" fontWeight="800">
                  #{r.miPuesto}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

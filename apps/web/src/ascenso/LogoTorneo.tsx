import {
  copaInfo,
  type Categoria,
  type CopaId,
} from "@juegos-argentinos/career";
import { useState } from "react";

/** Una liga (`liga-<categoría>`) o una copa. */
export type TorneoId = CopaId | `liga-${Categoria}`;

/** Logos bajados de FootyLogos (`tools/bajar-escudos.py --torneos`); los demás se dibujan. */
const CON_IMAGEN = new Set<TorneoId>([
  "liga-primera",
  "liga-nacional",
  "liga-b",
  "liga-c",
  "libertadores",
  "sudamericana",
]);

export const ligaDe = (cat: Categoria): TorneoId => `liga-${cat}`;

/**
 * Logo de un torneo sobre una chapa clara (varios tienen letras oscuras). Las copas que no tienen logo descargado
 * (Copa Argentina, Copa de la Liga, Supercopa, Recopa) llevan un emblema propio con sus colores.
 */
export function LogoTorneo({
  id,
  className = "size-10",
}: {
  id: TorneoId;
  className?: string;
}) {
  const [falla, setFalla] = useState(false);
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fdf6e3] shadow ring-1 ring-black/20 ${className}`}
    >
      {CON_IMAGEN.has(id) && !falla ? (
        <img
          src={`${import.meta.env.BASE_URL}arte/torneos/${id}.webp`}
          alt=""
          draggable={false}
          className="size-[84%] object-contain"
          onError={() => setFalla(true)}
        />
      ) : (
        <Emblema id={id} />
      )}
    </span>
  );
}

const EMBLEMAS: Partial<
  Record<
    TorneoId,
    {
      texto: [string, string];
      c1: string;
      c2: string;
      figura: "copa" | "estrella" | "globo" | "escudo";
    }
  >
> = {
  "copa-argentina": {
    texto: ["COPA", "ARGENTINA"],
    c1: "#5bb7e8",
    c2: "#ffffff",
    figura: "copa",
  },
  "copa-liga": {
    texto: ["COPA DE", "LA LIGA"],
    c1: "#15803d",
    c2: "#fde68a",
    figura: "escudo",
  },
  supercopa: {
    texto: ["SUPER", "COPA"],
    c1: "#b45309",
    c2: "#fde68a",
    figura: "estrella",
  },
  recopa: {
    texto: ["RECOPA", "SUDAMERICANA"],
    c1: "#0c4a6e",
    c2: "#7dd3fc",
    figura: "globo",
  },
};

function Emblema({ id }: { id: TorneoId }) {
  const e = EMBLEMAS[id];
  if (!e)
    return (
      <span className="text-xl">{copaInfo(id as CopaId)?.icono ?? "🏆"}</span>
    );
  return (
    <svg viewBox="0 0 100 100" className="size-[90%]" aria-hidden>
      <circle cx="50" cy="50" r="47" fill={e.c1} />
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke={e.c2}
        strokeWidth="3"
      />
      <g fill="#fde68a" stroke="#713f12" strokeWidth="2" strokeLinejoin="round">
        {e.figura === "copa" && (
          <path d="M36 22h28v8c0 11-6 17-14 18-8-1-14-7-14-18zM45 48h10v8H45zM39 56h22v6H39z" />
        )}
        {e.figura === "estrella" && (
          <path d="M50 18l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" />
        )}
        {e.figura === "escudo" && (
          <path d="M34 20h32v16c0 13-7 21-16 26-9-5-16-13-16-26z" />
        )}
        {e.figura === "globo" && (
          <>
            <circle cx="50" cy="40" r="20" fill={e.c2} />
            <path
              d="M30 40h40M50 20c-9 10-9 30 0 40M50 20c9 10 9 30 0 40"
              fill="none"
              stroke="#0c4a6e"
            />
          </>
        )}
      </g>
      <text
        x="50"
        y="74"
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fontFamily="Nunito, system-ui, sans-serif"
        fill={e.c2}
      >
        {e.texto[0]}
      </text>
      <text
        x="50"
        y="86"
        textAnchor="middle"
        fontSize={e.texto[1].length > 9 ? 7.5 : 11}
        fontWeight="900"
        fontFamily="Nunito, system-ui, sans-serif"
        fill={e.c2}
      >
        {e.texto[1]}
      </text>
    </svg>
  );
}

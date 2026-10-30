import { club, YO_CLUB, type Club } from "@juegos-argentinos/career";
import { useState } from "react";
import { Cara } from "../carrera/Cara.tsx";
import { useSave } from "../save/SaveContext.tsx";

/** Ruta del escudo que sube el usuario (ver docs/escudos.md). */
export const escudoUrl = (id: string) => `${import.meta.env.BASE_URL}arte/escudos/${id}.webp`;

/**
 * Escudo de un club del Ascenso: la imagen si está, o uno dibujado con sus colores y su sigla.
 * `YO_CLUB` es tu club: tu avatar en un escudo celeste y blanco.
 */
export function Escudo({ id, className = "size-10" }: { id: string; className?: string }) {
  const [falla, setFalla] = useState(false);
  const { save } = useSave();
  if (id === YO_CLUB)
    return (
      <span className={`relative grid shrink-0 place-items-center ${className}`}>
        <EscudoDibujado colores={["#7cc4ef", "#ffffff"]} sigla="" />
        <span className="absolute inset-[18%] grid place-items-center overflow-hidden rounded-full text-xl">
          <Cara avatar={save.perfil.avatar} />
        </span>
      </span>
    );
  const c = club(id);
  if (!c) return null;
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`}>
      {falla ? (
        <EscudoDibujado colores={c.colores} sigla={c.corto} />
      ) : (
        <img src={escudoUrl(id)} alt="" draggable={false} className="size-full object-contain drop-shadow" onError={() => setFalla(true)} />
      )}
    </span>
  );
}

/** Escudo de respaldo: bandas con los colores del club y la sigla. */
function EscudoDibujado({ colores: [c1, c2], sigla }: { colores: Club["colores"]; sigla: string }) {
  const id = `esc-${c1.slice(1)}-${c2.slice(1)}`;
  return (
    <svg viewBox="0 0 100 116" className="size-full drop-shadow" aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d="M8 8h84v46c0 30-20 48-42 58C28 102 8 84 8 54z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="100" height="116" fill={c1} />
        <rect x="38" width="24" height="116" fill={c2} />
      </g>
      <path d="M8 8h84v46c0 30-20 48-42 58C28 102 8 84 8 54z" fill="none" stroke="#2b1a0e" strokeWidth="5" />
      {sigla && (
        <text x="50" y="66" textAnchor="middle" fontSize="27" fontWeight="900" fontFamily="Nunito, system-ui, sans-serif" fill="#fff" stroke="#2b1a0e" strokeWidth="5" paintOrder="stroke">
          {sigla}
        </text>
      )}
    </svg>
  );
}

/** Nombre para mostrar: el del club o, si sos vos, tu apodo. */
export function useNombreClub() {
  const { save } = useSave();
  return (id: string) => (id === YO_CLUB ? save.perfil.apodo || "Tu club" : (club(id)?.nombre ?? id));
}

import { CELESTE, INK } from "./palette.ts";

/**
 * Elementos de fileteado porteño en SVG: volutas, hojas de acanto y cintas.
 * El "look" de filete sale de pintar cada trazo tres veces: contorno oscuro,
 * color y un brillo fino encima.
 */

const VOLUTA_D = "M0,20 C10,-10 40,-22 56,-6 C66,4 60,20 48,20 C40,20 37,12 42,8";
const HOJA_D = "M0,0 C6,-14 22,-20 34,-14 C26,-12 22,-6 24,2 C18,-4 10,-4 8,4 C5,0 2,0 0,0 Z";

export interface FileteProps {
  x: number;
  y: number;
  scale?: number;
  /** Espejo horizontal / vertical. */
  flipX?: boolean;
  flipY?: boolean;
  rotate?: number;
  color: string;
}

function transform({ x, y, scale = 1, flipX = false, flipY = false, rotate = 0 }: FileteProps): string {
  return `translate(${x} ${y}) rotate(${rotate}) scale(${flipX ? -scale : scale} ${flipY ? -scale : scale})`;
}

export function Hoja(props: FileteProps) {
  return (
    <g transform={transform(props)}>
      <path d={HOJA_D} fill={props.color} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M2,0 C10,-8 20,-12 30,-13" fill="none" stroke="#fff" strokeWidth={1} opacity={0.7} />
    </g>
  );
}

/** Voluta en espiral con una hoja de acanto en el arranque. */
export function Voluta(props: FileteProps) {
  return (
    <g transform={transform(props)}>
      <path d={VOLUTA_D} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d={VOLUTA_D} fill="none" stroke={props.color} strokeWidth={6} strokeLinecap="round" />
      <path d={VOLUTA_D} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
      <Hoja x={2} y={20} scale={0.8} rotate={150} color={props.color} />
    </g>
  );
}

/** Cinta celeste y blanca a lo largo de un path (con contorno). */
export function Cinta({ d, width = 10 }: { d: string; width?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={width + 3} />
      <path d={d} stroke={CELESTE} strokeWidth={width} />
      <path d={d} stroke="#fff" strokeWidth={width * 0.36} />
    </g>
  );
}

/** Borla al final de una cinta. */
export function Borla({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
      <circle cx={x} cy={y} r={4} fill={color} />
      <path d={`M${x - 5},${y + 3} L${x + 5},${y + 3} L${x + 7},${y + 16} L${x - 7},${y + 16} Z`} fill={color} />
      <path d={`M${x - 3},${y + 6} V${y + 15} M${x},${y + 6} V${y + 15} M${x + 3},${y + 6} V${y + 15}`} stroke="#fff" strokeWidth={0.8} opacity={0.6} />
    </g>
  );
}

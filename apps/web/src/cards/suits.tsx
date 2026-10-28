import type { Suit } from "@la-mesa/engine";
import { GOLD, GOLD_DARK, INK, STEEL, SUIT_COLORS, WOOD, WOOD_DARK } from "./palette.ts";

/**
 * Íconos de los cuatro palos, dibujados en una caja local de 100×100.
 * Estilo plano con contorno, pensado para leerse bien chiquito en el celular.
 */

function Oro() {
  const c = SUIT_COLORS.oro;
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g>
      <circle cx={50} cy={50} r={46} fill={c.main} stroke={c.dark} strokeWidth={3.5} />
      <circle cx={50} cy={50} r={37} fill="none" stroke={c.dark} strokeWidth={2} opacity={0.6} />
      {rays.map((deg) => (
        <path key={deg} d="M50,16 L55,31 L45,31 Z" fill={c.dark} transform={`rotate(${deg} 50 50)`} opacity={0.85} />
      ))}
      <circle cx={50} cy={50} r={15} fill="#ffd84d" stroke={c.dark} strokeWidth={2.5} />
      <circle cx={44} cy={44} r={4} fill="#fff" opacity={0.6} />
    </g>
  );
}

function Copa() {
  const c = SUIT_COLORS.copa;
  return (
    <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M17,22 H83 C83,52 70,64 50,64 C30,64 17,52 17,22 Z" fill={c.main} />
      <path d="M25,30 C26,44 33,53 42,57" fill="none" stroke="#fff" strokeWidth={3.5} opacity={0.45} strokeLinecap="round" />
      <rect x={13} y={14} width={74} height={10} rx={5} fill={GOLD} />
      <path d="M44,63 H56 L54,79 H46 Z" fill={GOLD} />
      <ellipse cx={50} cy={71} rx={9} ry={4.5} fill={GOLD} />
      <path d="M28,92 C28,82 39,78 50,78 C61,78 72,82 72,92 Z" fill={c.main} />
      <rect x={24} y={89} width={52} height={7} rx={3.5} fill={GOLD} />
    </g>
  );
}

function Espada() {
  const c = SUIT_COLORS.espada;
  return (
    <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M50,3 L58,15 V66 H42 V15 Z" fill={STEEL} />
      <path d="M50,12 V62" stroke="#8fa1b8" strokeWidth={2} />
      <rect x={22} y={63} width={56} height={8} rx={4} fill={c.main} />
      <circle cx={21} cy={67} r={5.5} fill={GOLD} />
      <circle cx={79} cy={67} r={5.5} fill={GOLD} />
      <rect x={44.5} y={71} width={11} height={18} fill={c.main} />
      <path d="M44.5,76 H55.5 M44.5,82 H55.5" stroke={GOLD} strokeWidth={2} />
      <circle cx={50} cy={92} r={6.5} fill={GOLD} />
    </g>
  );
}

function Basto() {
  const c = SUIT_COLORS.basto;
  return (
    <g stroke={WOOD_DARK} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M61,38 C72,30 82,32 86,26 C84,38 72,44 62,44 Z" fill={c.main} stroke={c.dark} />
      <path d="M39,60 C28,54 18,57 13,51 C17,64 29,68 39,66 Z" fill={c.main} stroke={c.dark} />
      <path
        d="M37,9 C47,1 66,4 65,18 L58,88 C57,96 45,96 44,88 L36,24 C35,17 33,13 37,9 Z"
        fill={WOOD}
      />
      <path d="M41,16 C44,12 52,10 56,13" fill="none" stroke="#c48a52" strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={49} cy={31} rx={4} ry={3} fill={WOOD_DARK} stroke="none" />
      <ellipse cx={55} cy={50} rx={3.5} ry={2.6} fill={WOOD_DARK} stroke="none" />
      <ellipse cx={48} cy={68} rx={3} ry={2.4} fill={WOOD_DARK} stroke="none" />
      <rect x={44} y={78} width={14} height={6} rx={2} fill={GOLD} stroke={GOLD_DARK} strokeWidth={1.5} />
    </g>
  );
}

const ICONS: Record<Suit, () => React.JSX.Element> = { oro: Oro, copa: Copa, espada: Espada, basto: Basto };

export interface SuitIconProps {
  suit: Suit;
  /** Centro y tamaño en coordenadas del SVG padre. */
  x: number;
  y: number;
  size: number;
  rotate?: number;
}

export function SuitIcon({ suit, x, y, size, rotate = 0 }: SuitIconProps) {
  const Icon = ICONS[suit];
  const s = size / 100;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-50 -50)`}>
      <Icon />
    </g>
  );
}

/** Ícono suelto (para botones, marcadores, etc.). */
export function SuitBadge({ suit, size = 24, className }: { suit: Suit; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <SuitIcon suit={suit} x={50} y={50} size={100} />
    </svg>
  );
}

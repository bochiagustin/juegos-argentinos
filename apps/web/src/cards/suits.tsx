import type { Suit } from "@juegos-argentinos/engine";
import { GOLD, GOLD_DARK, INK, SILVER, STEEL, SUIT_COLORS, WOOD, WOOD_DARK } from "./palette.ts";

/**
 * Íconos de los cuatro palos, versión criolla, dibujados en una caja local de 100×100.
 * Siempre reconocibles al instante (es lo que mira un jugador de truco), con detalles argentinos:
 * oro con Sol de Mayo, copa con filete, espada con gavilanes de facón, basto de algarrobo.
 */

function Oro() {
  const c = SUIT_COLORS.oro;
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <g strokeLinejoin="round">
      <circle cx={50} cy={50} r={47} fill={c.main} stroke={c.dark} strokeWidth={3.5} />
      <circle cx={50} cy={50} r={40} fill="none" stroke={c.dark} strokeWidth={1.5} opacity={0.6} />
      {rays.map((deg, i) =>
        i % 2 === 0 ? (
          <path key={deg} d="M50,12 L54.5,30 L45.5,30 Z" fill={c.dark} transform={`rotate(${deg} 50 50)`} />
        ) : (
          <path
            key={deg}
            d="M50,15 C54,20 46,24 50,30"
            fill="none"
            stroke={c.dark}
            strokeWidth={2.6}
            strokeLinecap="round"
            transform={`rotate(${deg} 50 50)`}
          />
        ),
      )}
      {/* cara del Sol de Mayo */}
      <circle cx={50} cy={50} r={19} fill="#ffd84d" stroke={c.dark} strokeWidth={2.5} />
      <path d="M40,44 Q43,41 46,44 M54,44 Q57,41 60,44" fill="none" stroke={c.dark} strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={43} cy={47} r={1.8} fill={c.dark} />
      <circle cx={57} cy={47} r={1.8} fill={c.dark} />
      <path d="M50,46 L47.5,54 H52" fill="none" stroke={c.dark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44,58 Q50,62.5 56,58" fill="none" stroke={c.dark} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function Copa() {
  const c = SUIT_COLORS.copa;
  return (
    <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M17,22 H83 C83,52 70,64 50,64 C30,64 17,52 17,22 Z" fill={c.main} />
      {/* banda de filete */}
      <path d="M19,33 H81 C80,38 79,41 77,44 H23 C21,41 20,38 19,33 Z" fill={GOLD} strokeWidth={2} />
      <path d="M28,39 C31,35 35,35 36,39 C37,42 33,43 32,40 M64,39 C67,35 71,35 72,39 C73,42 69,43 68,40" fill="none" stroke={c.dark} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={50} cy={38.5} r={3} fill={c.main} strokeWidth={1.2} />
      <path d="M27,48 C30,54 36,58 43,60" fill="none" stroke="#fff" strokeWidth={3.5} opacity={0.45} strokeLinecap="round" />
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
  const guard = "M20,62 C24,72 36,70 44,66 H56 C64,62 76,60 80,70";
  return (
    <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M50,3 L58,15 V65 H42 V15 Z" fill={STEEL} />
      <path d="M50,12 V60" stroke="#8fa1b8" strokeWidth={2} />
      <path d={guard} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d={guard} fill="none" stroke={GOLD} strokeWidth={5} strokeLinecap="round" />
      <circle cx={20} cy={62} r={4.5} fill={GOLD} strokeWidth={2} />
      <circle cx={80} cy={70} r={4.5} fill={GOLD} strokeWidth={2} />
      <rect x={44.5} y={69} width={11} height={19} rx={2} fill={c.main} />
      <path d="M44.5,74 H55.5 M44.5,80 H55.5" stroke={SILVER} strokeWidth={2.4} />
      <circle cx={50} cy={92} r={6.5} fill={SILVER} />
    </g>
  );
}

function Basto() {
  const c = SUIT_COLORS.basto;
  return (
    <g stroke={WOOD_DARK} strokeWidth={2.5} strokeLinejoin="round">
      {/* hojitas de algarrobo */}
      <g fill={c.main} stroke={c.dark} strokeWidth={1.8}>
        <path d="M62,36 C70,26 82,26 88,22 C86,34 74,42 62,42 Z" />
        <ellipse cx={74} cy={44} rx={7} ry={3.6} transform="rotate(20 74 44)" />
        <path d="M38,60 C28,52 18,54 12,48 C14,62 28,66 38,66 Z" />
        <ellipse cx={24} cy={68} rx={7} ry={3.6} transform="rotate(-25 24 68)" />
      </g>
      <path d="M37,9 C47,1 66,4 65,18 L58,88 C57,96 45,96 44,88 L36,24 C35,17 33,13 37,9 Z" fill={WOOD} />
      <path d="M41,16 C44,12 52,10 56,13" fill="none" stroke="#c48a52" strokeWidth={3} strokeLinecap="round" />
      <path d="M42,40 C46,44 52,38 58,42 M44,58 C48,62 52,56 56,60" fill="none" stroke={WOOD_DARK} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      <ellipse cx={49} cy={30} rx={4} ry={3} fill={WOOD_DARK} stroke="none" />
      <ellipse cx={53} cy={50} rx={3.5} ry={2.6} fill={WOOD_DARK} stroke="none" />
      <ellipse cx={48} cy={70} rx={3} ry={2.4} fill={WOOD_DARK} stroke="none" />
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

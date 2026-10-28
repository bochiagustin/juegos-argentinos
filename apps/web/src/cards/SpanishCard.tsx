import { cardName, type Card, type Rank, type Suit } from "@la-mesa/engine";
import { useId } from "react";
import { Figure } from "./figures.tsx";
import { CREAM, GOLD, GOLD_DARK, INK, SUIT_COLORS } from "./palette.ts";
import { SuitIcon } from "./suits.tsx";

/**
 * Carta española en SVG (viewBox 200×300). Diseño propio:
 * - Índice grande arriba-izquierda y abajo-derecha (legible a 48px de ancho).
 * - Marco con "pausas" como la baraja tradicional: oro 0, copa 1, espada 2, basto 3.
 * - Pips del 1 al 9; figuras ilustradas para 10, 11 y 12.
 */

export const CARD_W = 200;
export const CARD_H = 300;
const FRAME = { x0: 12, y0: 12, x1: 188, y1: 288 };

type Pip = readonly [x: number, y: number];

const PIP_LAYOUTS: Record<Exclude<Rank, 10 | 11 | 12>, { size: number; pips: readonly Pip[] }> = {
  1: { size: 118, pips: [[100, 150]] },
  2: { size: 76, pips: [[100, 90], [100, 210]] },
  3: { size: 62, pips: [[100, 78], [100, 150], [100, 222]] },
  4: { size: 58, pips: [[70, 95], [130, 95], [70, 205], [130, 205]] },
  5: { size: 54, pips: [[70, 88], [130, 88], [100, 150], [70, 212], [130, 212]] },
  6: { size: 52, pips: [[70, 82], [130, 82], [70, 150], [130, 150], [70, 218], [130, 218]] },
  7: { size: 46, pips: [[66, 80], [134, 80], [100, 115], [66, 150], [134, 150], [66, 220], [134, 220]] },
  8: { size: 44, pips: [[64, 80], [136, 80], [100, 115], [64, 150], [136, 150], [100, 185], [64, 220], [136, 220]] },
  9: { size: 42, pips: [[60, 82], [100, 82], [140, 82], [60, 150], [100, 150], [140, 150], [60, 218], [100, 218], [140, 218]] },
};

const PAUSAS: Record<Suit, number> = { oro: 0, copa: 1, espada: 2, basto: 3 };

/** Ángulo de los pips de espada y basto: se cruzan levemente, como en la baraja clásica. */
function pipRotation(suit: Suit, x: number): number {
  if (suit !== "espada" && suit !== "basto") return 0;
  if (x < 100) return -14;
  if (x > 100) return 14;
  return 0;
}

function svgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Línea horizontal del marco con `n` pausas centradas. */
function frameLine(y: number, n: number): string {
  const { x0, x1 } = FRAME;
  if (n === 0) return `M${x0},${y} H${x1}`;
  const gap = 9;
  const step = 20;
  const total = (n - 1) * step;
  const centers = Array.from({ length: n }, (_, i) => 100 - total / 2 + i * step);
  let d = `M${x0},${y}`;
  for (const c of centers) d += ` H${c - gap / 2} M${c + gap / 2},${y}`;
  return `${d} H${x1}`;
}

function Frame({ suit }: { suit: Suit }) {
  const { x0, y0, x1, y1 } = FRAME;
  const color = SUIT_COLORS[suit].main;
  const n = PAUSAS[suit];
  return (
    <path
      d={`${frameLine(y0, n)} ${frameLine(y1, n)} M${x0},${y0} V${y1} M${x1},${y0} V${y1}`}
      stroke={color}
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
    />
  );
}

function CornerIndex({ label, suit, color }: { label: string; suit?: Suit; color: string }) {
  return (
    <g>
      <rect x={14} y={14} width={34} height={suit ? 66 : 44} rx={6} fill={CREAM} />
      <text
        x={31}
        y={50}
        textAnchor="middle"
        fontFamily="'Fraunces Variable', Georgia, serif"
        fontWeight={800}
        fontSize={label.length > 1 ? 32 : 40}
        letterSpacing={label.length > 1 ? -2 : 0}
        fill={color}
      >
        {label}
      </text>
      {suit && <SuitIcon suit={suit} x={31} y={66} size={22} />}
    </g>
  );
}

function Corners({ label, suit, color }: { label: string; suit?: Suit; color: string }) {
  return (
    <>
      <CornerIndex label={label} color={color} {...(suit ? { suit } : {})} />
      <g transform={`rotate(180 ${CARD_W / 2} ${CARD_H / 2})`}>
        <CornerIndex label={label} color={color} {...(suit ? { suit } : {})} />
      </g>
    </>
  );
}

function AceDecoration({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  const ancho = suit === "espada" || suit === "basto";
  return (
    <g>
      <circle cx={100} cy={150} r={70} fill={c.light} />
      <circle cx={100} cy={150} r={70} fill="none" stroke={c.main} strokeWidth={1.5} strokeDasharray="2 5" />
      {ancho &&
        Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d="M100,72 L103,84 L97,84 Z"
            fill={GOLD}
            stroke={GOLD_DARK}
            strokeWidth={0.8}
            transform={`rotate(${i * 22.5} 100 150)`}
          />
        ))}
    </g>
  );
}

function SuitedFace({ rank, suit }: { rank: Rank; suit: Suit }) {
  const c = SUIT_COLORS[suit];
  if (rank === 10 || rank === 11 || rank === 12) {
    return (
      <>
        <rect x={46} y={28} width={108} height={244} rx={8} fill={c.light} />
        <g transform="translate(46 30)">
          <Figure rank={rank} suit={suit} />
        </g>
        <rect x={46} y={28} width={108} height={244} rx={8} fill="none" stroke={c.main} strokeWidth={1.5} />
      </>
    );
  }
  const layout = PIP_LAYOUTS[rank];
  return (
    <>
      {rank === 1 && <AceDecoration suit={suit} />}
      {layout.pips.map(([x, y], i) => (
        <SuitIcon key={i} suit={suit} x={x} y={y} size={layout.size} rotate={pipRotation(suit, x)} />
      ))}
    </>
  );
}

function JokerFace() {
  const colors = [SUIT_COLORS.espada.main, SUIT_COLORS.copa.main, SUIT_COLORS.basto.main];
  return (
    <g stroke={INK} strokeWidth={2} strokeLinejoin="round">
      <circle cx={100} cy={150} r={72} fill={SUIT_COLORS.oro.light} stroke="none" />
      {/* gorro de tres puntas */}
      <path d="M62,138 C50,110 40,92 22,86 C42,80 62,96 78,124 Z" fill={colors[0]} />
      <path d="M138,138 C150,110 160,92 178,86 C158,80 138,96 122,124 Z" fill={colors[2]} />
      <path d="M70,134 C76,100 88,76 100,58 C112,76 124,100 130,134 Z" fill={colors[1]} />
      <circle cx={22} cy={86} r={7} fill={GOLD} />
      <circle cx={178} cy={86} r={7} fill={GOLD} />
      <circle cx={100} cy={56} r={7} fill={GOLD} />
      <path d="M62,134 H138 L134,146 H66 Z" fill={GOLD} />
      {/* cara */}
      <circle cx={100} cy={170} r={28} fill="#f2c9a0" />
      <path d="M86,164 Q90,160 94,164 M106,164 Q110,160 114,164" fill="none" strokeLinecap="round" />
      <path d="M86,178 Q100,194 114,178" fill="#fff" />
      <circle cx={82} cy={176} r={4} fill="#e8957a" stroke="none" opacity={0.7} />
      <circle cx={118} cy={176} r={4} fill="#e8957a" stroke="none" opacity={0.7} />
      {/* gorguera */}
      <path d="M64,200 L76,192 L82,206 L92,196 L100,210 L108,196 L118,206 L124,192 L136,200 L126,218 H74 Z" fill={GOLD} />
      <text x={100} y={240} textAnchor="middle" stroke="none" fontFamily="'Fraunces Variable', Georgia, serif" fontWeight={800} fontSize={20} fill={INK} letterSpacing={1.5}>
        COMODÍN
      </text>
    </g>
  );
}

function CardBack({ patternId }: { patternId: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <g>
      <defs>
        <pattern id={patternId} width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={16} height={16} fill="#7b1e2b" />
          <rect x={5} y={5} width={6} height={6} fill="#9b2d3c" />
          <circle cx={0} cy={0} r={1.5} fill={GOLD} opacity={0.7} />
          <circle cx={16} cy={16} r={1.5} fill={GOLD} opacity={0.7} />
        </pattern>
      </defs>
      <rect x={10} y={10} width={180} height={280} rx={10} fill={`url(#${patternId})`} />
      <rect x={10} y={10} width={180} height={280} rx={10} fill="none" stroke={GOLD} strokeWidth={3} />
      <rect x={17} y={17} width={166} height={266} rx={7} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.7} />
      <circle cx={100} cy={150} r={50} fill="#5c1520" stroke={GOLD} strokeWidth={2.5} />
      {rays.map((deg, i) => (
        <path
          key={deg}
          d={i % 2 === 0 ? "M100,104 L104,122 L96,122 Z" : "M100,110 Q105,116 100,122 Q95,128 100,124"}
          fill={i % 2 === 0 ? GOLD : "none"}
          stroke={GOLD}
          strokeWidth={i % 2 === 0 ? 0 : 2}
          transform={`rotate(${deg} 100 150)`}
        />
      ))}
      <circle cx={100} cy={150} r={22} fill={GOLD} stroke={GOLD_DARK} strokeWidth={2} />
      <text x={100} y={156} textAnchor="middle" fontFamily="'Fraunces Variable', Georgia, serif" fontWeight={900} fontSize={17} fill="#5c1520">
        LM
      </text>
      <text x={100} y={232} textAnchor="middle" fontFamily="'Fraunces Variable', Georgia, serif" fontWeight={700} fontStyle="italic" fontSize={20} fill={GOLD}>
        La Mesa
      </text>
    </g>
  );
}

export interface SpanishCardProps {
  /** `null` o `faceDown` muestran el dorso. */
  card: Card | null;
  faceDown?: boolean;
  /** Ancho en px (el alto sale de la proporción 2:3). */
  width?: number;
  className?: string;
  /** Resalta la carta (jugada válida, selección). */
  highlight?: boolean;
  dimmed?: boolean;
}

export function SpanishCard({ card, faceDown = false, width = 120, className, highlight = false, dimmed = false }: SpanishCardProps) {
  const id = svgId(useId());
  const showBack = faceDown || card === null;
  const label = showBack ? "Carta boca abajo" : cardName(card);
  return (
    <svg
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      width={width}
      height={(width * CARD_H) / CARD_W}
      role="img"
      aria-label={label}
      className={className}
      style={{ display: "block", filter: dimmed ? "grayscale(0.6) brightness(0.7)" : undefined }}
    >
      <title>{label}</title>
      <rect
        x={1.5}
        y={1.5}
        width={CARD_W - 3}
        height={CARD_H - 3}
        rx={14}
        fill={showBack ? "#fff" : CREAM}
        stroke={highlight ? GOLD : "#cbbd9e"}
        strokeWidth={highlight ? 6 : 3}
      />
      {showBack ? (
        <CardBack patternId={`dorso-${id}`} />
      ) : card.kind === "joker" ? (
        <>
          <rect x={FRAME.x0} y={FRAME.y0} width={FRAME.x1 - FRAME.x0} height={FRAME.y1 - FRAME.y0} fill="none" stroke={GOLD_DARK} strokeWidth={2.5} strokeDasharray="10 6" />
          <JokerFace />
          <Corners label="★" color={GOLD_DARK} />
        </>
      ) : (
        <>
          <Frame suit={card.suit} />
          <SuitedFace rank={card.rank} suit={card.suit} />
          <Corners label={String(card.rank)} suit={card.suit} color={SUIT_COLORS[card.suit].ink} />
        </>
      )}
    </svg>
  );
}

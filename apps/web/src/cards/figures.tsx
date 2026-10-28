import type { Suit } from "@la-mesa/engine";
import { GOLD, GOLD_DARK, HAIR, INK, SKIN, SUIT_COLORS } from "./palette.ts";
import { SuitIcon } from "./suits.tsx";

/**
 * Figuras (10 Sota, 11 Caballo, 12 Rey) dibujadas en una caja local de 108×240.
 * Ilustración plana, propia, con el objeto del palo en la mano.
 */

const tall = (suit: Suit) => suit === "espada" || suit === "basto";
const accent = (suit: Suit) => (suit === "copa" ? GOLD : "#e53935");

function Face({ cx, cy, r, beard }: { cx: number; cy: number; r: number; beard?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={SKIN} stroke={INK} strokeWidth={1.8} />
      <circle cx={cx - r * 0.38} cy={cy} r={1.7} fill={INK} />
      <circle cx={cx + r * 0.38} cy={cy} r={1.7} fill={INK} />
      <circle cx={cx - r * 0.55} cy={cy + r * 0.35} r={2.6} fill="#e8957a" opacity={0.55} />
      <circle cx={cx + r * 0.55} cy={cy + r * 0.35} r={2.6} fill="#e8957a" opacity={0.55} />
      {beard ? (
        <>
          <path
            d={`M${cx - r * 0.9},${cy + r * 0.25} Q${cx},${cy + r * 2.1} ${cx + r * 0.9},${cy + r * 0.25} Q${cx + r * 0.45},${cy + r * 0.8} ${cx},${cy + r * 0.75} Q${cx - r * 0.45},${cy + r * 0.8} ${cx - r * 0.9},${cy + r * 0.25} Z`}
            fill="#f3eee6"
            stroke={INK}
            strokeWidth={1.6}
          />
          <path d={`M${cx - 6},${cy + r * 0.5} Q${cx},${cy + r * 0.3} ${cx + 6},${cy + r * 0.5}`} fill="none" stroke={INK} strokeWidth={1.6} />
        </>
      ) : (
        <path d={`M${cx - 5},${cy + r * 0.5} Q${cx},${cy + r * 0.78} ${cx + 5},${cy + r * 0.5}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      )}
    </g>
  );
}

function Sota({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  return (
    <g strokeLinejoin="round">
      <ellipse cx={42} cy={231} rx={9} ry={5} fill="#3b2a1a" />
      <ellipse cx={68} cy={231} rx={9} ry={5} fill="#3b2a1a" />
      <rect x={37} y={176} width={10} height={54} fill={c.dark} stroke={INK} strokeWidth={1.8} />
      <rect x={61} y={176} width={10} height={54} fill={c.dark} stroke={INK} strokeWidth={1.8} />
      <path d="M30,98 L36,108 L20,150 L28,153 Z" fill={c.main} stroke={INK} strokeWidth={1.8} />
      <circle cx={24} cy={153} r={5} fill={SKIN} stroke={INK} strokeWidth={1.5} />
      <path d="M30,96 H78 L90,184 H18 Z" fill={c.main} stroke={INK} strokeWidth={1.8} />
      <rect x={18} y={174} width={72} height={8} fill={GOLD} stroke={INK} strokeWidth={1.5} />
      <rect x={25} y={136} width={58} height={8} fill={GOLD} stroke={INK} strokeWidth={1.5} />
      <circle cx={54} cy={116} r={2.6} fill={GOLD} stroke={INK} strokeWidth={1} />
      <circle cx={54} cy={126} r={2.6} fill={GOLD} stroke={INK} strokeWidth={1} />
      <circle cx={54} cy={158} r={2.6} fill={GOLD} stroke={INK} strokeWidth={1} />
      <path d="M78,98 L94,128 L86,133 L72,110 Z" fill={c.main} stroke={INK} strokeWidth={1.8} />
      <path d="M38,96 Q54,112 70,96 Z" fill="#fff" stroke={INK} strokeWidth={1.5} />
      <rect x={49} y={84} width={10} height={12} fill={SKIN} stroke={INK} strokeWidth={1.5} />
      <Face cx={54} cy={72} r={16} />
      <path d="M38,70 Q38,54 54,54 Q70,54 70,70 Q65,62 54,62 Q43,62 38,70 Z" fill={HAIR} />
      <path d="M64,52 Q86,26 98,36 Q82,40 68,55 Z" fill={accent(suit)} stroke={INK} strokeWidth={1.5} />
      <ellipse cx={54} cy={56} rx={21} ry={6.5} fill={c.main} stroke={INK} strokeWidth={1.8} />
      <ellipse cx={54} cy={50} rx={14} ry={8} fill={c.main} stroke={INK} strokeWidth={1.8} />
      {tall(suit) ? <SuitIcon suit={suit} x={90} y={102} size={64} /> : <SuitIcon suit={suit} x={91} y={116} size={34} />}
      <circle cx={90} cy={131} r={5} fill={SKIN} stroke={INK} strokeWidth={1.5} />
    </g>
  );
}

function Caballo({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  const horse = "#b08968";
  const horseDark = "#6f4e37";
  return (
    <g strokeLinejoin="round" stroke={INK} strokeWidth={1.8}>
      {/* patas */}
      <rect x={22} y={190} width={9} height={42} fill={horse} />
      <rect x={36} y={192} width={9} height={40} fill={horseDark} />
      <rect x={70} y={192} width={9} height={40} fill={horseDark} />
      <rect x={84} y={190} width={9} height={42} fill={horse} />
      {[22, 36, 70, 84].map((x) => (
        <rect key={x} x={x - 1} y={229} width={11} height={6} rx={2} fill="#2b2118" />
      ))}
      {/* cola */}
      <path d="M92,170 C108,172 108,200 100,214 C98,198 96,186 88,180 Z" fill={HAIR} />
      {/* cuerpo */}
      <ellipse cx={57} cy={180} rx={40} ry={22} fill={horse} />
      {/* cuello y cabeza */}
      <path d="M34,176 C24,160 18,146 18,128 L4,142 C-1,147 1,155 8,156 L16,153 C22,164 24,172 26,186 Z" fill={horse} />
      <path d="M18,128 C22,118 30,118 32,128 C30,140 32,154 38,166 L32,172 C26,158 22,144 18,128 Z" fill={HAIR} />
      <path d="M20,124 L22,111 L28,123 Z" fill={horse} />
      <circle cx={14} cy={135} r={1.8} fill={INK} stroke="none" />
      <path d="M6,148 Q10,150 12,148" fill="none" />
      {/* riendas */}
      <path d="M8,150 L46,148" fill="none" stroke={c.dark} strokeWidth={2} />
      {/* manta de montura */}
      <path d="M38,160 H80 L84,194 H34 Z" fill={c.main} />
      <path d="M34,188 H84" stroke={GOLD} strokeWidth={4} />
      {/* jinete */}
      <path d="M48,148 H62 L60,200 H48 Z" fill={c.dark} />
      <path d="M44,198 H62 V206 H44 Z" fill="#3b2a1a" />
      <path d="M40,102 H70 L74,156 H36 Z" fill={c.main} />
      <rect x={37} y={130} width={36} height={7} fill={GOLD} strokeWidth={1.5} />
      <path d="M42,108 L30,140 L37,143 L48,116 Z" fill={c.main} />
      <path d="M68,106 L88,92 L91,99 L72,116 Z" fill={c.main} />
      <path d="M44,102 Q55,114 66,102 Z" fill="#fff" strokeWidth={1.5} />
      <Face cx={55} cy={86} r={14} />
      <path d="M41,84 Q41,70 55,70 Q69,70 69,84 Q64,77 55,77 Q46,77 41,84 Z" fill={HAIR} stroke="none" />
      <ellipse cx={55} cy={72} rx={23} ry={6} fill={c.main} />
      <path d="M43,71 Q44,56 55,56 Q66,56 67,71 Z" fill={c.main} />
      <path d="M64,60 Q80,40 92,48 Q78,52 68,64 Z" fill={accent(suit)} strokeWidth={1.5} />
      {tall(suit) ? <SuitIcon suit={suit} x={90} y={66} size={58} rotate={8} /> : <SuitIcon suit={suit} x={91} y={80} size={30} />}
      <circle cx={89} cy={96} r={4.5} fill={SKIN} strokeWidth={1.5} />
    </g>
  );
}

function Rey({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  const ermineDots = (xs: number[], ys: number[]) =>
    xs.flatMap((x) => ys.map((y) => <path key={`${x}-${y}`} d={`M${x},${y - 2.5} L${x + 1.6},${y + 2} L${x - 1.6},${y + 2} Z`} fill={INK} />));
  return (
    <g strokeLinejoin="round" stroke={INK} strokeWidth={1.8}>
      <path d="M28,100 H80 L96,230 H12 Z" fill={c.main} />
      <rect x={12} y={222} width={84} height={11} fill="#fff" />
      <rect x={49} y={100} width={10} height={123} fill="#fff" />
      <g stroke="none">
        {ermineDots([54], [118, 138, 158, 178, 198])}
        {ermineDots([22, 38, 70, 86], [228])}
      </g>
      <path d="M22,104 Q54,126 86,104 L88,120 Q54,142 20,120 Z" fill="#fff" />
      <g stroke="none">{ermineDots([30, 44, 64, 78], [118])}</g>
      <path d="M80,108 L96,140 L89,145 L74,120 Z" fill={c.main} />
      <path d="M28,108 L16,146 L23,149 L34,120 Z" fill={c.main} />
      <circle cx={19} cy={149} r={5} fill={SKIN} strokeWidth={1.5} />
      <rect x={49} y={88} width={10} height={12} fill={SKIN} strokeWidth={1.5} />
      <Face cx={54} cy={76} r={16} beard />
      <path d="M38,72 Q38,58 54,58 Q70,58 70,72 Q66,66 54,66 Q42,66 38,72 Z" fill="#f3eee6" strokeWidth={1.4} />
      <path d="M36,62 L36,42 L45,52 L54,36 L63,52 L72,42 L72,62 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth={2} />
      <rect x={35} y={58} width={38} height={7} rx={2} fill={GOLD} stroke={GOLD_DARK} strokeWidth={2} />
      <circle cx={54} cy={50} r={3} fill={SUIT_COLORS.copa.main} strokeWidth={1} />
      <circle cx={44} cy={61.5} r={2} fill={SUIT_COLORS.espada.main} strokeWidth={0.8} />
      <circle cx={64} cy={61.5} r={2} fill={SUIT_COLORS.basto.main} strokeWidth={0.8} />
      {tall(suit) ? <SuitIcon suit={suit} x={93} y={114} size={66} /> : <SuitIcon suit={suit} x={92} y={128} size={34} />}
      <circle cx={93} cy={145} r={5} fill={SKIN} strokeWidth={1.5} />
    </g>
  );
}

export function Figure({ rank, suit }: { rank: 10 | 11 | 12; suit: Suit }) {
  if (rank === 10) return <Sota suit={suit} />;
  if (rank === 11) return <Caballo suit={suit} />;
  return <Rey suit={suit} />;
}

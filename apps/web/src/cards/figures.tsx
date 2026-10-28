import type { Suit } from "@juegos-argentinos/engine";
import {
  BLUSH,
  BOMBACHA,
  CELESTE,
  GOLD,
  GOLD_DARK,
  GRASS,
  HAIR,
  HAT,
  INK,
  NOSE,
  SHIRT,
  SILVER,
  SKIN,
  SUIT_COLORS,
} from "./palette.ts";
import { SuitIcon } from "./suits.tsx";

/**
 * Figuras criollas en caricatura, en una caja local de 108×240:
 * 10 Sota = peón de campo, 11 Caballo = gaucho en un overo, 12 Rey = patrón de estancia.
 * Cabezones, ojos grandes y narigones; el color del palo va en la ropa para reconocerlo de un vistazo.
 */

const tall = (suit: Suit) => suit === "espada" || suit === "basto";
/** Pañuelo al cuello: rojo punzó, salvo en copas (que ya es roja) donde va celeste. */
const panuelo = (suit: Suit) => (suit === "copa" ? CELESTE : "#d32f2f");

type Mustache = "none" | "bigote" | "bigoton";

function Face({ cx, cy, r, mustache = "none" }: { cx: number; cy: number; r: number; mustache?: Mustache }) {
  const ex = r * 0.38;
  const ey = cy - r * 0.12;
  const ny = cy + r * 0.3;
  const my = cy + r * 0.52;
  return (
    <g strokeLinejoin="round">
      <circle cx={cx - r * 0.98} cy={cy + 2} r={r * 0.24} fill={SKIN} stroke={INK} strokeWidth={1.6} />
      <circle cx={cx + r * 0.98} cy={cy + 2} r={r * 0.24} fill={SKIN} stroke={INK} strokeWidth={1.6} />
      <circle cx={cx} cy={cy} r={r} fill={SKIN} stroke={INK} strokeWidth={1.9} />
      <circle cx={cx - r * 0.58} cy={cy + r * 0.32} r={r * 0.17} fill={BLUSH} opacity={0.6} />
      <circle cx={cx + r * 0.58} cy={cy + r * 0.32} r={r * 0.17} fill={BLUSH} opacity={0.6} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={cx + s * ex} cy={ey} rx={r * 0.23} ry={r * 0.29} fill="#fff" stroke={INK} strokeWidth={1.5} />
          <circle cx={cx + s * ex + r * 0.07} cy={ey + r * 0.04} r={r * 0.12} fill={INK} />
          <path
            d={`M${cx + s * ex - r * 0.2},${ey - r * 0.38} Q${cx + s * ex},${ey - r * 0.5} ${cx + s * ex + r * 0.2},${ey - r * 0.36}`}
            fill="none"
            stroke={HAIR}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      ))}
      {mustache === "none" && (
        <path d={`M${cx - r * 0.3},${my + 1} Q${cx},${my + r * 0.3} ${cx + r * 0.3},${my + 1}`} fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
      )}
      {mustache !== "none" && (
        <>
          <path d={`M${cx - r * 0.22},${my + 4} Q${cx},${my + r * 0.3} ${cx + r * 0.22},${my + 4}`} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
          {[-1, 1].map((s) => {
            const w = mustache === "bigoton" ? r * 0.95 : r * 0.6;
            const curl = mustache === "bigoton" ? r * 0.35 : r * 0.12;
            return (
              <path
                key={s}
                d={`M${cx},${my - 2} C${cx + s * w * 0.4},${my - 6} ${cx + s * w * 0.8},${my - 2} ${cx + s * w},${my - curl} C${cx + s * w * 0.9},${my + 5} ${cx + s * w * 0.4},${my + 5} ${cx},${my + 2} Z`}
                fill={HAIR}
                stroke={INK}
                strokeWidth={1.4}
              />
            );
          })}
        </>
      )}
      {/* el narigón va arriba del bigote */}
      <ellipse cx={cx} cy={ny} rx={r * 0.27} ry={r * 0.23} fill={NOSE} stroke={INK} strokeWidth={1.6} />
      <circle cx={cx - r * 0.08} cy={ny - r * 0.07} r={r * 0.06} fill="#fff" opacity={0.6} />
    </g>
  );
}

function Ground() {
  return <ellipse cx={54} cy={233} rx={46} ry={7} fill={GRASS} stroke="#558b2f" strokeWidth={1.5} />;
}

/** Guarda pampa en zigzag (para ponchos). */
function Guarda({ x0, x1, y, color }: { x0: number; x1: number; y: number; color: string }) {
  const step = 6;
  let d = `M${x0},${y}`;
  for (let x = x0 + step, up = true; x <= x1; x += step, up = !up) d += ` L${x},${up ? y - 4 : y}`;
  return <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />;
}

function Sota({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  return (
    <g strokeLinejoin="round" stroke={INK} strokeWidth={1.8}>
      <Ground />
      {/* alpargatas y bombachas de campo */}
      <ellipse cx={40} cy={229} rx={10} ry={5} fill="#efe6d2" />
      <ellipse cx={68} cy={229} rx={10} ry={5} fill="#efe6d2" />
      <path d="M30,150 H78 C85,180 83,205 77,226 H60 L54,184 L48,226 H31 C25,205 23,180 30,150 Z" fill={BOMBACHA} />
      <path d="M38,196 C40,206 40,214 38,222 M70,196 C68,206 68,214 70,222" fill="none" strokeWidth={1.2} opacity={0.5} />
      {/* camisa y chaleco */}
      <path d="M32,96 H76 L80,152 H28 Z" fill={SHIRT} />
      <path d="M32,96 H46 L44,152 H28 Z" fill={c.main} />
      <path d="M76,96 H62 L64,152 H80 Z" fill={c.main} />
      <circle cx={46} cy={120} r={2} fill={GOLD} strokeWidth={1} />
      <circle cx={62} cy={120} r={2} fill={GOLD} strokeWidth={1} />
      {/* faja */}
      <rect x={26} y={140} width={56} height={14} rx={3} fill={c.dark} />
      <path d="M28,145 H80 M28,149 H80" stroke={GOLD} strokeWidth={1.2} />
      {/* brazos */}
      <path d="M32,100 L20,140 L28,144 L38,112 Z" fill={SHIRT} />
      <circle cx={24} cy={145} r={5.5} fill={SKIN} strokeWidth={1.5} />
      <path d="M76,100 L92,124 L86,130 L72,112 Z" fill={SHIRT} />
      {/* pañuelo y cuello */}
      <rect x={49} y={86} width={10} height={11} fill={SKIN} strokeWidth={1.5} />
      <path d="M40,95 H68 L54,114 Z" fill={panuelo(suit)} />
      <Face cx={54} cy={68} r={21} />
      {/* boina */}
      <g transform="rotate(-8 54 50)">
        <ellipse cx={54} cy={50} rx={24} ry={8} fill={c.dark} />
        <circle cx={54} cy={42} r={3} fill={c.dark} />
      </g>
      {tall(suit) ? <SuitIcon suit={suit} x={90} y={101} size={62} /> : <SuitIcon suit={suit} x={92} y={112} size={32} />}
      <circle cx={89} cy={128} r={5.5} fill={SKIN} strokeWidth={1.5} />
    </g>
  );
}

function Caballo({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  const white = "#f6f1e7";
  const patch = "#8d5a2b";
  return (
    <g strokeLinejoin="round" stroke={INK} strokeWidth={1.8}>
      <Ground />
      {/* patas */}
      {[24, 38, 72, 86].map((x, i) => (
        <g key={x}>
          <rect x={x} y={188} width={9} height={40} rx={3} fill={i === 1 ? patch : white} />
          <rect x={x - 1} y={224} width={11} height={7} rx={2} fill={HAT} />
        </g>
      ))}
      {/* cola */}
      <path d="M92,168 C110,170 110,198 100,214 C99,200 96,188 88,180 Z" fill={HAIR} />
      {/* cuerpo overo */}
      <ellipse cx={58} cy={180} rx={38} ry={22} fill={white} />
      <path d="M70,166 C80,162 90,170 88,182 C82,188 72,184 70,176 Z" fill={patch} strokeWidth={1.2} />
      <path d="M34,186 C38,180 48,182 46,192 C40,196 34,194 34,186 Z" fill={patch} strokeWidth={1.2} />
      {/* cuello, crin y cabeza */}
      <path d="M22,140 C24,156 28,166 36,176 L46,170 C40,158 36,146 34,132 Z" fill={white} />
      <path d="M30,126 C38,130 40,146 46,164 L40,168 C34,152 32,140 26,132 Z" fill={HAIR} />
      <g transform="rotate(-28 18 134)">
        <ellipse cx={18} cy={134} rx={13} ry={19} fill={white} />
        <ellipse cx={18} cy={150} rx={10} ry={8} fill="#e6dccb" />
        <circle cx={14} cy={152} r={1.5} fill={INK} stroke="none" />
        <circle cx={22} cy={152} r={1.5} fill={INK} stroke="none" />
        <path d="M10,118 L12,106 L18,117 Z M20,116 L26,105 L28,118 Z" fill={white} />
        <path d="M12,140 C14,128 22,126 26,132 C22,130 16,132 12,140 Z" fill={patch} strokeWidth={1} />
      </g>
      <ellipse cx={14} cy={128} rx={4.5} ry={5.5} fill="#fff" strokeWidth={1.4} />
      <circle cx={13} cy={129} r={2.4} fill={INK} stroke="none" />
      {/* riendas */}
      <path d="M8,150 C24,150 38,146 50,140" fill="none" stroke={WOODISH} strokeWidth={2} />
      {/* recado */}
      <path d="M40,160 H80 L82,176 H38 Z" fill={HAT} />
      {/* jinete: pierna con bota y estribo */}
      <path d="M50,150 H64 L62,194 H52 Z" fill={BOMBACHA} />
      <rect x={49} y={190} width={17} height={12} rx={3} fill={HAT} />
      <path d="M48,204 H68" stroke={SILVER} strokeWidth={3} />
      {/* poncho con guarda pampa */}
      <path d="M36,102 H76 L88,160 H24 Z" fill={c.main} />
      <Guarda x0={28} x1={84} y={154} color={GOLD} />
      <path d="M44,104 L36,158 M68,104 L76,158" stroke={c.dark} strokeWidth={1.4} opacity={0.7} />
      {/* brazo levantado */}
      <path d="M72,110 L90,92 L95,98 L78,120 Z" fill={c.main} />
      <path d="M42,96 H70 L56,112 Z" fill={panuelo(suit)} />
      <Face cx={56} cy={80} r={18} mustache="bigote" />
      {/* sombrero de ala ancha */}
      <ellipse cx={56} cy={64} rx={27} ry={5.5} fill={HAT} />
      <path d="M41,63 L44,47 H68 L71,63 Z" fill={HAT} />
      <rect x={43} y={56} width={26} height={5} fill={c.main} strokeWidth={1.2} />
      {tall(suit) ? <SuitIcon suit={suit} x={93} y={70} size={54} rotate={6} /> : <SuitIcon suit={suit} x={94} y={80} size={28} />}
      <circle cx={92} cy={94} r={5} fill={SKIN} strokeWidth={1.5} />
    </g>
  );
}

const WOODISH = "#6d4c41";

function Rey({ suit }: { suit: Suit }) {
  const c = SUIT_COLORS[suit];
  const coins = [34, 42, 66, 74];
  return (
    <g strokeLinejoin="round" stroke={INK} strokeWidth={1.8}>
      <Ground />
      {/* botas de potro y bombachas */}
      <rect x={37} y={204} width={14} height={26} rx={3} fill="#e8dcc4" />
      <rect x={59} y={204} width={14} height={26} rx={3} fill="#e8dcc4" />
      <path d="M26,172 H84 C88,190 84,200 76,208 H58 L55,192 L52,208 H34 C26,200 22,190 26,172 Z" fill="#3e2f23" />
      {/* chaqueta con panza de patrón */}
      <path d="M30,98 H78 C92,128 94,158 86,178 H22 C14,158 16,128 30,98 Z" fill={c.main} />
      <path d="M54,100 V150" stroke={c.dark} strokeWidth={1.4} />
      <circle cx={54} cy={116} r={2.2} fill={GOLD} strokeWidth={1} />
      <circle cx={54} cy={130} r={2.2} fill={GOLD} strokeWidth={1} />
      {/* rastra con monedas de plata */}
      <rect x={22} y={152} width={64} height={11} rx={3} fill="#5b3a1e" />
      {coins.map((x) => (
        <circle key={x} cx={x} cy={157.5} r={3.4} fill={SILVER} strokeWidth={1} />
      ))}
      <rect x={46} y={150} width={16} height={15} rx={3} fill={SILVER} />
      <path d="M50,155 H58 M50,160 H58" stroke={GOLD_DARK} strokeWidth={1} />
      {/* poncho al hombro */}
      <path d="M30,98 C20,112 14,142 12,180 L28,182 C30,150 36,124 46,104 Z" fill="#8d2b1f" />
      <Guarda x0={13} x1={28} y={176} color={GOLD} />
      {/* brazo con el palo */}
      <path d="M78,104 L97,134 L90,140 L74,118 Z" fill={c.main} />
      <path d="M40,96 H68 L54,110 Z" fill={panuelo(suit)} />
      <rect x={48} y={88} width={12} height={10} fill={SKIN} strokeWidth={1.5} />
      {/* patillas */}
      <path d="M32,66 C31,78 33,86 37,90 L40,76 Z M76,66 C77,78 75,86 71,90 L68,76 Z" fill="#d7d2ca" />
      <Face cx={54} cy={72} r={21} mustache="bigoton" />
      {/* sombrero de patrón con coronita en la cinta */}
      <ellipse cx={54} cy={54} rx={31} ry={6} fill={HAT} />
      <path d="M38,53 L41,33 H67 L70,53 Z" fill={HAT} />
      <rect x={40} y={45} width={28} height={6} fill={c.main} strokeWidth={1.2} />
      <path d="M48,49 L48,40 L51,43.5 L54,38 L57,43.5 L60,40 L60,49 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth={1.2} />
      {tall(suit) ? <SuitIcon suit={suit} x={94} y={110} size={60} /> : <SuitIcon suit={suit} x={95} y={124} size={32} />}
      <circle cx={93} cy={138} r={5.5} fill={SKIN} strokeWidth={1.5} />
    </g>
  );
}

export function Figure({ rank, suit }: { rank: 10 | 11 | 12; suit: Suit }) {
  if (rank === 10) return <Sota suit={suit} />;
  if (rank === 11) return <Caballo suit={suit} />;
  return <Rey suit={suit} />;
}

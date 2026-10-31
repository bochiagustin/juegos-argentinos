import { motion } from "motion/react";

const PUNTOS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

/** Un dado de marfil con puntos (el 1, rojo). `rodando` lo hace girar al tirarlo. */
export function Dado({ valor, size = 52, guardado = false, rodando = false, retraso = 0 }: { valor: number; size?: number; guardado?: boolean; rodando?: boolean; retraso?: number }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-label={valor ? `Dado: ${valor}` : "Dado sin tirar"}
      animate={rodando ? { rotate: [0, 200, 340, 360], y: [-30, 6, -4, 0], scale: [0.6, 1.08, 0.97, 1] } : { rotate: 0, y: guardado ? -8 : 0, scale: 1 }}
      transition={rodando ? { duration: 0.6, delay: retraso, ease: "easeOut" } : { type: "spring", stiffness: 400, damping: 22 }}
      className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)]"
    >
      <defs>
        <linearGradient id="marfil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf5" />
          <stop offset="1" stopColor="#e8dcc0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="20" fill="url(#marfil)" stroke={guardado ? "#f59e0b" : "#8a6b3f"} strokeWidth={guardado ? 7 : 3} />
      {(PUNTOS[valor] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={valor === 1 ? 13 : 9.5} fill={valor === 1 ? "#c81e1e" : "#1f1a17"} />
      ))}
      {!valor && <text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="900" fill="#b9a27a">?</text>}
    </motion.svg>
  );
}

/** El cubilete de cuero: se sacude mientras se tiran los dados. */
export function Cubilete({ sacudiendo, size = 70 }: { sacudiendo: boolean; size?: number }) {
  return (
    <motion.svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      aria-hidden
      animate={sacudiendo ? { rotate: [0, -18, 16, -14, 12, -40], x: [0, -6, 6, -5, 5, 10] } : { rotate: 0, x: 0 }}
      transition={sacudiendo ? { duration: 0.55 } : { duration: 0.3 }}
      style={{ originX: 0.5, originY: 0.9 }}
    >
      <path d="M18 14h64l-8 96H26z" fill="#5b3a1e" stroke="#2b1a0e" strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 30h56M24 52h52M26 74h48M28 94h44" stroke="#3b2412" strokeWidth="3" strokeDasharray="5 4" />
      <ellipse cx="50" cy="14" rx="32" ry="7" fill="#3b2412" stroke="#2b1a0e" strokeWidth="4" />
      <path d="M40 40l20 0M50 30v20" stroke="#d9a066" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
    </motion.svg>
  );
}

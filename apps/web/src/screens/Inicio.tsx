import { cardFromId } from "@juegos-argentinos/engine";
import { motion } from "motion/react";
import { Art } from "../art/Art.tsx";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { useNav } from "../nav.tsx";
import { useSave } from "../save/SaveContext.tsx";
import { Fosforos } from "../ui/Modal.tsx";

/** Pampa al atardecer dibujada en código, hasta que esté la ilustración de la portada. */
function PampaFallback() {
  const nube = (x: number, y: number, k: number) => (
    <g transform={`translate(${x} ${y}) scale(${k})`} fill="#f6c27a" opacity="0.85">
      <ellipse cx="0" cy="0" rx="120" ry="34" />
      <ellipse cx="-70" cy="10" rx="70" ry="26" />
      <ellipse cx="80" cy="12" rx="80" ry="24" />
      <ellipse cx="10" cy="-22" rx="70" ry="30" />
      <ellipse cx="0" cy="18" rx="150" ry="16" fill="#c97b44" opacity="0.5" />
    </g>
  );
  const ceibo = (x: number, y: number, flip: number) => (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <path d="M0,0 C30,-80 60,-160 40,-260" stroke="#3d2a14" strokeWidth="10" fill="none" />
      <path d="M30,-120 C70,-150 110,-150 140,-190" stroke="#3d2a14" strokeWidth="7" fill="none" />
      {[
        [40, -260],
        [140, -190],
        [70, -200],
        [100, -160],
        [20, -190],
        [120, -230],
      ].map(([fx, fy], i) => (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <path d="M0,0 C-14,-20 -10,-44 0,-56 C10,-44 14,-20 0,0 Z" fill="#c62828" />
          <path d="M0,0 C-26,-10 -36,-30 -34,-42 C-20,-34 -8,-18 0,0 Z" fill="#e53935" />
          <path d="M0,0 C26,-10 36,-30 34,-42 C20,-34 8,-18 0,0 Z" fill="#b71c1c" />
          <ellipse cx="0" cy="10" rx="30" ry="10" fill="#2e5a1c" />
        </g>
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#173a4a" />
          <stop offset="0.3" stopColor="#5e6b5a" />
          <stop offset="0.5" stopColor="#e3974b" />
          <stop offset="0.62" stopColor="#ffd27a" />
        </linearGradient>
        <radialGradient id="sol" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#ffd05a" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="loma1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d8f3a" />
          <stop offset="1" stopColor="#4c6a26" />
        </linearGradient>
        <linearGradient id="loma2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f8a2e" />
          <stop offset="1" stopColor="#2f5a1e" />
        </linearGradient>
        <linearGradient id="loma3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f7a2a" />
          <stop offset="1" stopColor="#123515" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#cielo)" />
      <circle cx="540" cy="1040" r="420" fill="url(#sol)" />
      <circle cx="540" cy="1040" r="170" fill="#ffe08a" />
      {nube(220, 560, 1.1)}
      {nube(880, 470, 0.9)}
      {nube(760, 760, 0.7)}
      {nube(160, 860, 0.6)}
      <path d="M0,1120 C180,1080 360,1110 540,1095 C720,1080 900,1100 1080,1085 V1920 H0 Z" fill="url(#loma1)" opacity="0.9" />
      <path d="M0,1190 C220,1140 420,1200 640,1170 C820,1146 960,1170 1080,1160 V1920 H0 Z" fill="url(#loma2)" />
      {/* camino de tierra */}
      <path d="M560,1172 C520,1230 380,1270 330,1340 C280,1410 380,1470 300,1560 L420,1560 C470,1470 380,1410 430,1350 C480,1290 600,1240 590,1172 Z" fill="#b8925a" opacity="0.85" />
      <path d="M0,1330 C260,1290 520,1350 780,1310 C900,1292 1000,1300 1080,1296 V1920 H0 Z" fill="url(#loma3)" />
      {/* molino */}
      <g stroke="#2a1b10" strokeWidth="7" fill="none" strokeLinejoin="round">
        <path d="M820,1330 L880,960 L940,1330 M836,1240 H924 M852,1140 H908 M866,1050 H894 M836,1240 L908,1140 M924,1240 L852,1140" />
        <g transform="translate(880 950)">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0,-12 L-10,-96 L10,-96 Z" transform={`rotate(${i * 30})`} fill="#4a3a2a" stroke="#2a1b10" strokeWidth="3" />
          ))}
          <circle r="16" fill="#2a1b10" />
          <path d="M14,0 L130,-6 L130,22 L60,16 Z" fill="#4a3a2a" stroke="#2a1b10" strokeWidth="3" />
        </g>
      </g>
      {/* alambrado */}
      <g stroke="#2a1b10">
        {[40, 170, 300, 430, 640, 760].map((x) => (
          <path key={x} d={`M${x},${1380 + (x % 3) * 4} V${1290 + (x % 3) * 4}`} strokeWidth="9" />
        ))}
        <path d="M30,1310 C250,1300 500,1318 780,1306 M30,1345 C250,1336 500,1352 780,1340" strokeWidth="3" fill="none" />
      </g>
      {/* pasto y ceibos en primer plano */}
      <path d="M0,1650 C200,1610 400,1640 540,1620 C700,1600 900,1630 1080,1610 V1920 H0 Z" fill="#0c2a12" />
      {ceibo(-20, 1920, 1)}
      {ceibo(1100, 1920, -1)}
    </svg>
  );
}

function LogoFallback() {
  return (
    <div className="text-center">
      <p className="titulo-criollo text-[3.4rem] leading-[0.95] sm:text-7xl">Juegos</p>
      <p className="titulo-criollo text-[3.4rem] leading-[0.95] sm:text-7xl">Argentinos</p>
      <p className="mt-2 text-sm font-black uppercase tracking-[0.25em] text-crema drop-shadow-[0_2px_2px_rgb(0_0_0_/_0.8)]">Más que un juego, una juntada</p>
    </div>
  );
}

const FAN = ["1-espada", "1-basto", "7-oro"].map(cardFromId);

function CardsFallback() {
  return (
    <div className="relative mx-auto h-48 w-56">
      {FAN.map((c, i) => (
        <motion.div
          key={c.id}
          className="absolute left-1/2 top-2 -ml-14 rounded-xl shadow-xl shadow-black/40"
          initial={{ y: 80, opacity: 0, rotate: 0 }}
          animate={{ y: 0, opacity: 1, rotate: (i - 1) * 16, x: (i - 1) * 42 }}
          transition={{ delay: 0.25 + i * 0.12, type: "spring", stiffness: 180, damping: 18 }}
        >
          <SpanishCard card={c} width={112} />
        </motion.div>
      ))}
    </div>
  );
}

export function Inicio() {
  const { push } = useNav();
  const { save } = useSave();

  const jugar = () => {
    vibrate(15);
    playSfx("barajar");
    push(save.perfil.creado ? { name: "juegos" } : { name: "perfil", bienvenida: true });
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0">
        <Art id="portada-fondo-vertical" className="absolute inset-0 size-full object-cover" fallback={<PampaFallback />} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
      </div>

      <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10">
        <Fosforos n={save.carrera.fosforos} />
      </div>
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <motion.div className="mt-10" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Art id="logo" alt="Juegos Argentinos" className="mx-auto w-full max-w-sm" fallback={<LogoFallback />} />
        </motion.div>

        <div className="flex flex-1 items-end justify-center">
          <Art id="portada-gaucho" alt="" className="max-h-[42dvh] w-auto" fallback={<CardsFallback />} />
        </div>

        <div className="mb-6 mt-4 flex flex-col gap-3">
          <button onClick={jugar} className="btn-criollo flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl font-criolla text-4xl tracking-wider">
            <span className="relative z-[1]">JUGAR</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                playSfx("click");
                push({ name: "perfil" });
              }}
              className="cuero cuero-oscuro flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 font-bold"
            >
              <span className="relative z-[1] text-2xl">{save.perfil.avatar}</span>
              <span className="relative z-[1] truncate">{save.perfil.apodo || "Perfil"}</span>
            </button>
            <button
              onClick={() => {
                playSfx("click");
                push({ name: "ajustes" });
              }}
              className="cuero cuero-oscuro flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 font-bold"
            >
              <span className="relative z-[1]">⚙️ Ajustes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

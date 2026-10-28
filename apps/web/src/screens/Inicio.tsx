import { cardFromId } from "@juegos-argentinos/engine";
import { motion } from "motion/react";
import { Art } from "../art/Art.tsx";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { useNav } from "../nav.tsx";
import { useSave } from "../save/SaveContext.tsx";

/** Pampa al atardecer dibujada en código, hasta que esté la ilustración de la portada. */
function PampaFallback() {
  return (
    <svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3f6b" />
          <stop offset="0.45" stopColor="#e9894a" />
          <stop offset="0.62" stopColor="#f7c46c" />
        </linearGradient>
        <linearGradient id="campo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f6b2a" />
          <stop offset="1" stopColor="#1b3a1e" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#cielo)" />
      <circle cx="540" cy="1120" r="190" fill="#ffd56b" opacity="0.9" />
      <path d="M0,1180 C200,1120 420,1170 620,1140 C820,1110 960,1150 1080,1130 V1920 H0 Z" fill="#6b5a2e" opacity="0.6" />
      <path d="M0,1230 C260,1190 520,1250 780,1210 C900,1192 1000,1205 1080,1200 V1920 H0 Z" fill="url(#campo)" />
      {/* molino */}
      <g stroke="#2a1b10" strokeWidth="8" fill="none">
        <path d="M860,1215 L900,960 L940,1215 M872,1140 H928 M884,1060 H916" />
        <g transform="translate(900 950)">
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M0,0 L0,-80" transform={`rotate(${i * 45})`} strokeWidth="10" />
          ))}
        </g>
      </g>
      {/* alambrado */}
      <g stroke="#2a1b10" strokeWidth="6">
        {[80, 220, 360, 500].map((x) => (
          <path key={x} d={`M${x},1290 V1200`} />
        ))}
        <path d="M60,1220 L520,1225 M60,1250 L520,1255" strokeWidth="3" />
      </g>
    </svg>
  );
}

function LogoFallback() {
  return (
    <div className="text-center drop-shadow-[0_4px_0_rgb(0_0_0_/_0.35)]">
      <p className="font-criolla text-5xl leading-none text-crema sm:text-6xl">Juegos</p>
      <p className="font-criolla text-5xl leading-none text-celeste sm:text-6xl">Argentinos</p>
      <p className="mt-2 text-sm font-black uppercase tracking-[0.25em] text-crema/90">Más que un juego, una juntada</p>
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

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <motion.div className="mt-10" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Art id="logo" alt="Juegos Argentinos" className="mx-auto w-full max-w-sm" fallback={<LogoFallback />} />
        </motion.div>

        <div className="flex flex-1 items-end justify-center">
          <Art id="portada-gaucho" alt="" className="max-h-[42dvh] w-auto" fallback={<CardsFallback />} />
        </div>

        <div className="mb-6 mt-4 flex flex-col gap-3">
          <button onClick={jugar} className="btn-criollo flex min-h-16 items-center justify-center gap-3 rounded-2xl font-criolla text-3xl">
            JUGAR
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                playSfx("click");
                push({ name: "perfil" });
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-3 font-bold text-crema backdrop-blur"
            >
              <span className="text-2xl">{save.perfil.avatar}</span>
              <span className="truncate">{save.perfil.apodo || "Perfil"}</span>
            </button>
            <button
              onClick={() => {
                playSfx("click");
                push({ name: "ajustes" });
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-3 font-bold text-crema backdrop-blur"
            >
              ⚙️ Ajustes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

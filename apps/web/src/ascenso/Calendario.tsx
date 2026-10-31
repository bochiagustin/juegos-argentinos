import {
  agenda,
  anioTemporada,
  club,
  CATEGORIAS,
  copaInfo,
  hoy,
  miCategoria,
  NOMBRE_CATEGORIA,
  nivelClub,
  tablaGrupo,
  tablaOrdenada,
  type AscensoProgress,
  type DiaDePartido,
} from "@juegos-argentinos/career";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { Escudo, useNombreClub } from "./Escudo.tsx";
import { ligaDe, LogoTorneo } from "./LogoTorneo.tsx";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DIAS_LARGOS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const fecha = (s: string) => new Date(`${s}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const sumarDias = (s: string, n: number) => {
  const d = fecha(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const diasEntre = (a: string, b: string) =>
  Math.round((fecha(b).getTime() - fecha(a).getTime()) / 86400000);

export function fechaLarga(s: string): string {
  const d = fecha(s);
  const t = `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]!.toLowerCase()}`;
  return t[0]!.toUpperCase() + t.slice(1);
}

function etiquetaTorneo(d: DiaDePartido): string {
  return d.etapa === "liga"
    ? "LIGA"
    : d.etapa === "reducido"
      ? "REDUCIDO"
      : copaInfo(d.copa!).corto.toUpperCase();
}

/**
 * El calendario de la temporada, de enero a diciembre, como el de los juegos de fútbol: un mes por pantalla, los días
 * con partido muestran el escudo del rival, local o visitante, el torneo y el resultado. "Hoy" es el día del partido que
 * viene: al volver de jugar, los días pasan solos hasta ahí. Al costado (abajo en el celu), el rival elegido.
 */
export function Calendario({
  p,
  guardarClave,
}: {
  p: AscensoProgress;
  guardarClave: string;
}) {
  const dias = useMemo(() => agenda(p), [p]);
  const porFecha = useMemo(
    () => new Map(dias.map((d) => [d.fecha, d])),
    [dias],
  );
  const anio = anioTemporada(p);
  const hoyReal = hoy(p);
  const [cursor, setCursor] = useState(hoyReal);
  const [mes, setMes] = useState(fecha(hoyReal).getUTCMonth());
  const [sel, setSel] = useState<string | null>(null);
  const [pasando, setPasando] = useState(0);

  // Los días pasan solos desde la última vez que viste el calendario hasta hoy.
  useEffect(() => {
    let desde: string | null = null;
    try {
      desde = localStorage.getItem(guardarClave);
    } catch {
      // Sin storage: no hay animación.
    }
    const guardar = () => {
      try {
        localStorage.setItem(guardarClave, hoyReal);
      } catch {
        // Nada.
      }
    };
    const total =
      desde && desde.startsWith(String(anio)) ? diasEntre(desde, hoyReal) : 0;
    if (!desde || total <= 0 || total > 200) {
      setCursor(hoyReal);
      setMes(fecha(hoyReal).getUTCMonth());
      guardar();
      return;
    }
    const paso = Math.max(1, Math.ceil(total / 24));
    let dia = desde;
    setCursor(dia);
    setMes(fecha(dia).getUTCMonth());
    const t = window.setInterval(() => {
      const quedan = diasEntre(dia, hoyReal);
      dia = sumarDias(dia, Math.min(paso, quedan));
      setCursor(dia);
      setMes(fecha(dia).getUTCMonth());
      setPasando(total - diasEntre(dia, hoyReal));
      playSfx("tic");
      if (dia >= hoyReal) {
        clearInterval(t);
        guardar();
        window.setTimeout(() => setPasando(0), 900);
      }
    }, 60);
    return () => clearInterval(t);
  }, [hoyReal, guardarClave, anio]);

  // La grilla del mes, de lunes a domingo.
  const primero = new Date(Date.UTC(anio, mes, 1));
  const corrimiento = (primero.getUTCDay() + 6) % 7;
  const inicio = sumarDias(iso(primero), -corrimiento);
  const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
  const semanas = celdas[35]!.startsWith(
    `${anio}-${String(mes + 1).padStart(2, "0")}`,
  )
    ? 6
    : 5;

  const elegido =
    (sel && porFecha.get(sel)) || dias.find((d) => d.proximo) || null;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_17rem]">
      <section className="rounded-3xl bg-gradient-to-br from-[#211a52] via-[#2a1f63] to-[#1a1440] p-3 shadow-xl ring-1 ring-white/10">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            className="grid size-11 place-items-center rounded-full bg-white/10 text-xl disabled:opacity-30"
            disabled={mes === 0}
            onClick={() => setMes((m) => m - 1)}
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <div className="text-center leading-tight">
            <p className="font-criolla text-2xl tracking-wide text-[#5eead4]">
              {MESES[mes]}
            </p>
            <p className="text-sm font-black text-white/50">{anio}</p>
          </div>
          <button
            className="grid size-11 place-items-center rounded-full bg-white/10 text-xl disabled:opacity-30"
            disabled={mes === 11}
            onClick={() => setMes((m) => m + 1)}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
        {pasando > 0 && (
          <p
            className="mb-2 rounded-xl bg-[#7c3aed]/40 py-1 text-center text-xs font-black text-white"
            aria-live="polite"
          >
            ⏩ Pasaron {pasando} {pasando === 1 ? "día" : "días"}…
          </p>
        )}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-white/10">
          {DIAS.map((d) => (
            <div
              key={d}
              className="bg-[#1a1440] py-1 text-center text-[10px] font-black text-white/60"
            >
              {d}
            </div>
          ))}
          {celdas.slice(0, semanas * 7).map((dia) => (
            <Celda
              key={dia}
              dia={dia}
              delMes={fecha(dia).getUTCMonth() === mes}
              partido={porFecha.get(dia)}
              esHoy={dia === cursor}
              pasado={dia < cursor}
              elegido={dia === elegido?.fecha}
              onElegir={() => {
                playSfx("click");
                setSel(dia);
              }}
            />
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px] font-bold text-white/60">
          <span>
            <span className="mr-1 inline-block size-2.5 rounded-sm bg-[#dc2626]" />
            De local
          </span>
          <span>
            <span className="mr-1 inline-block size-2.5 rounded-sm bg-[#312e81]" />
            De visitante
          </span>
          <span>
            <span className="mr-1 inline-block size-2.5 rounded-sm bg-[#7c3aed]" />
            Hoy
          </span>
          <span>G ganado · P perdido</span>
        </p>
      </section>
      {elegido && <FichaRival p={p} d={elegido} />}
    </div>
  );
}

function Celda({
  dia,
  delMes,
  partido,
  esHoy,
  pasado,
  elegido,
  onElegir,
}: {
  dia: string;
  delMes: boolean;
  partido: DiaDePartido | undefined;
  esHoy: boolean;
  pasado: boolean;
  elegido: boolean;
  onElegir: () => void;
}) {
  const n = fecha(dia).getUTCDate();
  const fondo = esHoy
    ? "bg-[#7c3aed]"
    : partido && delMes && !pasado && partido.gane === undefined
      ? partido.local
        ? "bg-[#b91c1c]"
        : "bg-[#312e81]"
      : "bg-[#1f1950]";
  const contenido = (
    <>
      <span
        className={`absolute left-1 top-0.5 text-xs font-black ${delMes ? (pasado && !esHoy ? "text-white/40" : "text-[#5eead4]") : "text-white/20"}`}
      >
        {n}
      </span>
      {esHoy && (
        <motion.span
          layoutId="hoy"
          className="absolute inset-0 rounded-[3px] ring-2 ring-[#c4b5fd]"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      {partido && delMes && (
        <>
          <span className="absolute right-0.5 top-0.5">
            {partido.rival ? (
              <Escudo id={partido.rival} className="size-5 sm:size-7 lg:size-11" />
            ) : (
              <span className="text-xs text-white/60">?</span>
            )}
          </span>
          {partido.gane !== undefined && (
            <span
              className={`absolute left-1 top-4 grid size-4 place-items-center rounded-full text-[9px] font-black ${partido.gane ? "bg-[#16a34a]" : "bg-[#dc2626]"}`}
            >
              {partido.gane ? "G" : "P"}
            </span>
          )}
          <span className="absolute inset-x-0.5 bottom-0.5 truncate text-left text-[8px] font-black leading-tight text-white/90 sm:text-[10px]">
            {partido.local === null ? "" : partido.local ? "Local" : "Visit."}
            <span className="block truncate text-white/70">
              {etiquetaTorneo(partido)}
            </span>
          </span>
        </>
      )}
    </>
  );
  const clases = `relative h-16 sm:h-20 lg:h-24 ${fondo} ${elegido ? "outline outline-2 -outline-offset-2 outline-[#5eead4]" : ""}`;
  return partido && delMes ? (
    <button
      className={clases}
      onClick={onElegir}
      aria-label={`${n}: ${partido.titulo}`}
    >
      {contenido}
    </button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/** El rival del día elegido: escudo, torneo, cuándo y dónde, y cómo viene. */
function FichaRival({ p, d }: { p: AscensoProgress; d: DiaDePartido }) {
  const nombre = useNombreClub();
  const mia = miCategoria(p);
  const rival = d.rival;
  const c = rival ? club(rival) : undefined;
  const torneo = d.copa ?? ligaDe(mia);
  const fila = rival ? tablaOrdenada(p).find((x) => x.id === rival) : undefined;
  const suCategoria = rival
    ? CATEGORIAS.find((cat) => p.categorias[cat].includes(rival))
    : undefined;
  const copa = d.copa ? p.copas[d.copa] : undefined;
  const grupo =
    copa?.grupos?.findIndex((g) => rival !== null && g.includes(rival)) ?? -1;
  const enGrupo = copa && grupo >= 0 ? tablaGrupo(copa, grupo) : null;
  const filaGrupo = enGrupo?.findIndex((x) => x.id === rival) ?? -1;
  const cruces = (p.jugados ?? []).filter((j) => j.rival === rival);
  return (
    <aside className="rounded-3xl bg-gradient-to-b from-[#2a1f63] to-[#1a1440] p-4 text-white shadow-xl ring-1 ring-white/10">
      <p className="text-center text-xs font-black uppercase tracking-wider text-[#5eead4]">
        {d.proximo
          ? "Próximo partido"
          : d.gane !== undefined
            ? "Partido jugado"
            : "Más adelante"}
      </p>
      <div className="mt-2 flex flex-col items-center gap-1 text-center">
        {rival ? (
          <Escudo id={rival} className="size-24" />
        ) : (
          <span className="grid size-24 place-items-center rounded-full border-2 border-dashed border-white/30 text-4xl text-white/40">
            ?
          </span>
        )}
        <p className="font-criolla text-2xl leading-tight">
          {rival ? nombre(rival) : "A definir"}
        </p>
        {c?.pais && <p className="text-sm text-white/70">{c.pais}</p>}
        <div className="mt-1 flex items-center gap-2">
          <LogoTorneo id={torneo} className="size-9" />
          <span className="text-left text-xs font-bold leading-tight">
            {d.etapa === "reducido"
              ? d.titulo
              : `${d.copa ? copaInfo(d.copa).nombre : NOMBRE_CATEGORIA[mia]}`}
            <span className="block text-white/70">
              {d.etapa === "reducido" ? "" : d.titulo}
            </span>
          </span>
        </div>
        <p className="text-sm font-bold text-white/85">
          {fechaLarga(d.fecha)}
          {d.local !== null && (
            <span> · {d.local ? "de local" : "de visitante"}</span>
          )}
        </p>
        {d.gane !== undefined && (
          <p
            className={`mt-1 rounded-full px-3 py-0.5 text-sm font-black ${d.gane ? "bg-[#16a34a]" : "bg-[#dc2626]"}`}
          >
            {d.gane ? "Ganaste" : "Perdiste"}
          </p>
        )}
      </div>
      {rival && (
        <dl className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
          {fila ? (
            <>
              <Dato t="Posición" v={`${fila.puesto}º`} />
              <Dato t="Puntos" v={String(fila.fila.pts)} />
              <Dato t="Jugados" v={String(fila.fila.pj)} />
              <Dato
                t="Ganados / perdidos"
                v={`${fila.fila.pg} / ${fila.fila.pp}`}
              />
            </>
          ) : suCategoria ? (
            <Dato t="Juega en" v={NOMBRE_CATEGORIA[suCategoria]} ancho />
          ) : null}
          {enGrupo && filaGrupo >= 0 && (
            <>
              <Dato
                t={copa!.grupos!.length === 2 ? "En la zona" : "En el grupo"}
                v={`${filaGrupo + 1}º`}
              />
              <Dato
                t="Puntos en la copa"
                v={String(enGrupo[filaGrupo]!.fila.pts)}
              />
            </>
          )}
          <Dato
            t="Nivel"
            v={`${nivelClub(rival)}${d.copa === "libertadores" ? " (+1 en la Libertadores)" : ""}`}
            ancho
          />
          {cruces.length > 0 && (
            <Dato
              t="Esta temporada"
              v={cruces.map((j) => (j.gane ? "G" : "P")).join(" · ")}
              ancho
            />
          )}
        </dl>
      )}
    </aside>
  );
}

function Dato({
  t,
  v,
  ancho = false,
}: {
  t: string;
  v: string;
  ancho?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-white/10 px-3 py-1.5 ${ancho ? "col-span-2" : ""}`}
    >
      <dt className="text-[10px] font-black uppercase tracking-wider text-white/60">
        {t}
      </dt>
      <dd className="font-black">{v}</dd>
    </div>
  );
}

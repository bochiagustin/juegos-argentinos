import type { ReactNode } from "react";
import { playSfx } from "../audio/sfx.ts";
import { useNav, type Route } from "../nav.tsx";

export type Tab = "inicio" | "juegos" | "mazos" | "ajustes";

const TABS: { id: Tab; label: string; icon: string; route: Route }[] = [
  { id: "inicio", label: "Inicio", icon: "🏠", route: { name: "inicio" } },
  { id: "juegos", label: "Jugar", icon: "▶️", route: { name: "juegos" } },
  { id: "mazos", label: "Mazos", icon: "🃏", route: { name: "mazos" } },
  { id: "ajustes", label: "Ajustes", icon: "⚙️", route: { name: "ajustes" } },
];

function TabBar({ active }: { active: Tab }) {
  const { goTo } = useNav();
  return (
    <nav className="cuero cuero-oscuro sticky bottom-0 z-10 grid grid-cols-4 rounded-t-2xl pb-[env(safe-area-inset-bottom)]" aria-label="Secciones">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            if (t.id === active) return;
            playSfx("click");
            goTo(t.route);
          }}
          aria-current={t.id === active ? "page" : undefined}
          className={`relative z-[1] flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-black uppercase tracking-wider ${
            t.id === active ? "text-naranja" : "text-crema/75"
          }`}
        >
          <span className={`text-2xl leading-none ${t.id === active ? "" : "grayscale-[0.4]"}`} aria-hidden>
            {t.icon}
          </span>
          {t.label}
          {t.id === active && <span className="absolute inset-x-6 top-1.5 h-1 rounded-full bg-naranja" />}
        </button>
      ))}
    </nav>
  );
}

export function Screen({ title, onBack, right, tab, children }: { title?: string; onBack?: () => void; right?: ReactNode; tab?: Tab; children: ReactNode }) {
  return (
    <div className="pano flex min-h-dvh flex-col">
      {(title || onBack) && (
        <header className="cuero cuero-oscuro sticky top-0 z-10 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          {onBack ? (
            <IconButton label="Volver" onClick={onBack}>
              ←
            </IconButton>
          ) : (
            <span className="w-11" />
          )}
          <h1 className="titulo-criollo relative z-[1] flex-1 truncate py-1 text-center text-[1.7rem]">{title}</h1>
          {right ?? <span className="w-11" />}
        </header>
      )}
      <main className={`mx-auto w-full max-w-2xl flex-1 px-4 py-5 ${tab ? "" : "pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"}`}>{children}</main>
      {tab && <TabBar active={tab} />}
    </div>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => {
        playSfx("click");
        onClick();
      }}
      className="bronce relative z-[1] grid size-11 shrink-0 place-items-center rounded-full text-xl font-black active:scale-95"
    >
      {children}
    </button>
  );
}

export function BigButton({ children, onClick, disabled = false, variant = "criollo" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "criollo" | "secundario" }) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        playSfx("click");
        onClick?.();
      }}
      className={`flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 text-xl font-black tracking-wide transition disabled:opacity-50 ${
        variant === "criollo" ? "btn-criollo font-criolla" : "cuero cuero-oscuro active:scale-[0.98]"
      }`}
    >
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}

/** Fila con aspecto de ajuste: panel de cuero. */
function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cuero rounded-2xl px-4 py-3 ${className}`}>{children}</div>;
}

export function Toggle({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked);
        playSfx("click");
      }}
      className="cuero flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
    >
      <span className="relative z-[1] flex-1">
        <span className="block font-bold">{label}</span>
        {detail && <span className="block text-sm text-crema/75">{detail}</span>}
      </span>
      <span className={`relative z-[1] h-7 w-12 shrink-0 rounded-full border border-black/40 transition ${checked ? "bg-pano" : "bg-black/35"}`}>
        <span className={`bronce absolute top-0.5 size-5.5 rounded-full transition-all ${checked ? "left-6" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Row>
      <p className="relative z-[1] mb-2 font-bold">{label}</p>
      <div className="relative z-[1] flex gap-1 rounded-full bg-black/35 p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => {
              onChange(o.value);
              playSfx("click");
            }}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-bold transition ${value === o.value ? "bg-naranja text-tinta" : "text-crema/80"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Row>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2 font-criolla text-lg tracking-wide text-naranja drop-shadow">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** Esquinas de filete para decorar paneles (se ubican absolutas). */
export function FileteEsquinas({ color = "#e8c27a" }: { color?: string }) {
  const corner = (rot: number, pos: string) => (
    <svg viewBox="0 0 40 40" className={`pointer-events-none absolute size-9 ${pos}`} style={{ rotate: `${rot}deg` }} aria-hidden>
      <path d="M4,36 C4,18 12,6 30,4 C22,10 20,16 24,20 C18,18 14,22 16,28 C12,24 8,28 4,36 Z" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={30} cy={4} r={2.2} fill={color} />
    </svg>
  );
  return (
    <>
      {corner(0, "left-1 top-1")}
      {corner(90, "right-1 top-1")}
      {corner(180, "bottom-1 right-1")}
      {corner(270, "bottom-1 left-1")}
    </>
  );
}

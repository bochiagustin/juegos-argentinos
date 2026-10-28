import type { ReactNode } from "react";
import { playSfx } from "../audio/sfx.ts";

export function Screen({ title, onBack, right, children }: { title?: string; onBack?: () => void; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="pano flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      {(title || onBack) && (
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-borde bg-fondo-2/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
          {onBack ? (
            <IconButton label="Volver" onClick={onBack}>
              ←
            </IconButton>
          ) : (
            <span className="w-11" />
          )}
          <h1 className="flex-1 truncate py-3 text-center font-criolla text-2xl text-naranja">{title}</h1>
          {right ?? <span className="w-11" />}
        </header>
      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">{children}</main>
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
      className="grid size-11 place-items-center rounded-full border border-naranja/60 text-xl text-naranja active:scale-95"
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
        variant === "criollo" ? "btn-criollo" : "border border-borde bg-superficie-2 text-texto active:scale-[0.98]"
      }`}
    >
      {children}
    </button>
  );
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
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3 text-left"
    >
      <span className="flex-1">
        <span className="block font-bold">{label}</span>
        {detail && <span className="block text-sm text-texto-suave">{detail}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-pano" : "bg-texto-suave/30"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-crema shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie px-4 py-3">
      <p className="mb-2 font-bold">{label}</p>
      <div className="flex gap-1 rounded-full bg-fondo-2/60 p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => {
              onChange(o.value);
              playSfx("click");
            }}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-bold transition ${value === o.value ? "bg-naranja text-tinta" : "text-texto-suave"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-texto-suave">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

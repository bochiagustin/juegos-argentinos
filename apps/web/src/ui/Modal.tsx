import { Art } from "../art/Art.tsx";
import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/** Ventana encima de la pantalla: diálogo accesible (foco adentro, Escape cierra si se puede cerrar). */
export function Modal({ children, onClose, grande = false }: { children: ReactNode; onClose: () => void; grande?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    // El foco va al primer botón (o a la caja) para que el lector de pantalla y el teclado arranquen acá.
    const primero = caja.current?.querySelector<HTMLElement>("button:not([disabled]), input, [href]");
    (primero ?? caja.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      antes?.focus?.({ preventScroll: true });
    };
  }, []);
  return (
    <motion.div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        ref={caja}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`cuero w-full rounded-3xl p-5 ${grande ? "max-h-[85dvh] max-w-lg overflow-y-auto" : "max-h-[90dvh] max-w-sm overflow-y-auto"}`}
      >
        <div className="relative z-[1]">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/** Un fósforo dibujado (la moneda del juego). */
export function FosforoIcono({ className = "size-5" }: { className?: string }) {
  return <Art id="ui-fosforos" className={`${className} object-contain`} fallback={<FosforoDibujo className={className} />} />;
}

function FosforoDibujo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <line x1={6} y1={20} x2={17} y2={6} stroke="#5b3a1e" strokeWidth={4} strokeLinecap="round" />
      <line x1={6} y1={20} x2={17} y2={6} stroke="#e9c98e" strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={17.5} cy={5.5} rx={3.2} ry={3.8} transform="rotate(38 17.5 5.5)" fill="#c0392b" stroke="#5b1a10" strokeWidth={1} />
    </svg>
  );
}

export function Fosforos({ n }: { n: number }) {
  return (
    <span className="relative z-[1] inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-sm font-black text-crema" title="Fósforos">
      <FosforoIcono />
      {n}
    </span>
  );
}
